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

    if (sentences.length === 0) continue; // Skip if there are no sentences  

    for (const sentence of sentences) {
      const { text } = sentence;

      // Create a focused prompt  
      // const checkViolationsPrompt = `  
      // You are a legal assistant trained in Czech law. Carefully analyze the following YouTube video transcript for any statements that may violate the legal rules extracted from the government article provided below.  

      // **YouTube Transcript:**  
      // "${text}"  

      // **Legal Rules to Consider (in Czech):**  
      // ${legalRules.join(", ")}  

      // - **Guidance on Violations**: Look for any statements that imply personal financial advice, guarantees of profit, or direct instructions that could mislead viewers regarding investment decisions. For example:  
      //   - "Everyone who bought has made money."  
      //   - "Learn from my exact steps."  
      //   - Any indication that implies assured financial success.  

      // If you identify any violations, respond with "Violation" and provide a clear explanation starting with "Violated reason: ". If there are no violations, respond simply with "No Violations".  
      // `; 
      const checkViolationsPrompt = `  
          You are a legal assistant specializing in Czech law. You have extracted legal rules from the government article written in Czech. And also you have youtube video transcript written in Czech. Please  check the youtube transcript if it has any violations regarding the legal rules      
          **Legal Rules to Consider in Czech:** ${legalRules.join(", ")}

          **YouTube Transcript in Czech:** "${text}" 
      
          If you find any violations, respond with "Violation" and explain the reason how they violate the legal rules with the beginning of "Violated reason". If there are no violations, respond simply with "No Violations", additional explanation is not required"  
          `

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
            // Extract the violated reason using a more robust extraction method  
            const violatedReasonPrefix = "Violated reason: ";
            const violatedReasonIndex = violationCheckResponse.indexOf(violatedReasonPrefix);
            let violatedReason = "";

            if (violatedReasonIndex !== -1) {
              // Extract the reason correctly  
              violatedReason = violationCheckResponse.substring(violatedReasonIndex + violatedReasonPrefix.length).trim();
            }

            // Store the result with the violated reason  
            results.push({
              transcript: text,
              violatedReason,     
              start: sentence.start,
              end: sentence.end,
            });
          }

          // Count the token costs  
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