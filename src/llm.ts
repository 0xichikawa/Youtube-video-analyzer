import OpenAI from "openai";

interface Chunk {
  text: string;
  start: number;
  end: number;
  confidence: number;
  words: Word[];
}

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  speaker_confidence: number;
  punctuated_word: string;
}

interface AnalysisResult {
  transcript: string;
  violationCheck: "Violation" | "No Violation" | undefined; // Restricting to specific strings  
  start: number;
  end: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to analyze transcripts in chunks  
export async function analyzeTranscriptsInChunks(chunks: Chunk[], legalRules: string[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const chunk of chunks) {
    const { text } = chunk;

    // Create a prompt for OpenAI  
    const prompt = `  
      You are a legal assistant. Check if the following statement contains any violations of legal rules:  
      Statement: "${text}"  
      Legal Rules: ${legalRules.join(", ")}  
      Please respond with "Violation" if there is a violation and "No Violation" if there isn't.  
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a legal assistant." },
          { role: "user", content: prompt },
        ],
      });

      // Validate the response structure  
      if (response.choices && response.choices.length > 0) {
        const violationCheckResponse = response.choices[0]?.message?.content?.trim() || "";
        console.log("Violation Check Response:", violationCheckResponse);
        
        // Directly check the response to see if it's a violation  
        if (violationCheckResponse === "Violation") {
          results.push({
            transcript: text,
            violationCheck: "Violation",  // Directly set violationCheck  
            start: chunk.start,
            end: chunk.end,
          });
        }
      } else {
        console.error("No choices returned in the response for chunk:", text);
      }
    } catch (error) {
      console.error("Error checking violation for chunk:", text, "Error:", error);
    }
  }

  return results;
}