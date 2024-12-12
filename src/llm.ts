import OpenAI from "openai";

import { calculateTokenCosts } from "./tokenCosts.helper";

interface Paragraph {
  sentences: Sentence[];
  speaker: number;
  num_words: number;
  start: number;
  end: number;
}

interface Sentence {
  text: string;
  start: number;
  end: number;
}

interface AnalysisResult {
  transcript: string;
  violatedReason: string;
  start: number;
  end: number;
}

interface LLMResult {
  results: AnalysisResult[];
  analyzeTotalCost: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to analyze transcripts in paragraphs  
export async function analyzeTranscriptsInParagraphs(paragraphs: Paragraph[], legalRules: string[]): Promise<LLMResult> {
  let analyzeTotalCost = 0;
  const results: AnalysisResult[] = [];

  for (const paragraph of paragraphs) {  
    const { sentences } = paragraph;  
  
    if (sentences.length === 0) continue; // Skip if no sentences  
  
    for (const sentence of sentences) {  
      const { text } = sentence;  
  
      // Create a focused prompt  
      const checkViolationsPrompt = `  
      You are a legal assistant trained in Czech law. Thoroughly review the following YouTube transcript and identify any statements that may violate the legal rules extracted from the government article provided below.   
  
      **YouTube Transcript:** "${text}"  
  
      **Legal Rules to Consider (in Czech):** ${legalRules.join(", ")}  
  
      If you find any violations, respond with "Violation" and explain the reason how they violate the legal rules with the beginning of "violated reason". If there are no violations, respond simply with "No Violations", additional explanation is not required"  
      `;  
  
      try {  
        const response = await openai.chat.completions.create({  
          model: "gpt-4o",  
          messages: [  
            { role: "system", content: "You are a legal assistant specializing in Czech law." },  
            { role: "user", content: checkViolationsPrompt },  
          ],  
        });  
  
        // Validate the response structure  
        if (response.choices && response.choices.length > 0) {  
          const violationCheckResponse = response.choices[0]?.message?.content?.trim() || "";  
          console.log("Violation Check Response:", violationCheckResponse);  
  
          // Check if the response indicates a violation  
          if (violationCheckResponse.startsWith("Violation")) {  
            // Extract the violated reason  
            const violatedReasonIndex = violationCheckResponse.indexOf("violated reason");  
            let violatedReason = "";  
  
            if (violatedReasonIndex !== -1) {  
              violatedReason = violationCheckResponse.substring(violatedReasonIndex + "violated reason".length).trim();  
            }  
  
            // Store the result with the violated reason  
            results.push({  
              transcript: text,  
              violatedReason,               // Add the violated reason   
              start: sentence.start,  
              end: sentence.end,  
            });  
          }  
  
          analyzeTotalCost += calculateTokenCosts(checkViolationsPrompt, violationCheckResponse);  
        } else {  
          console.error("No choices returned in the response for sentence:", text);  
        }  
  
      } catch (error) {  
        console.error("Error checking violation for sentence:", text, "Error:", error);  
      }  
    }  
  }

  return { results, analyzeTotalCost }; // This will only contain violations  
}