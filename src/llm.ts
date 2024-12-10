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
  violationCheck: string | undefined; // Restricting to specific strings  
  start: number;
  end: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

      const violationCheckResponse = response.choices[0]?.message?.content?.trim();

      const violationCheck: "Violation" | "No Violation" | undefined = 
        violationCheckResponse === "Violation" ? "Violation" :
        violationCheckResponse === "No Violation" ? "No Violation" :
        undefined;

      results.push({
        transcript: text,
        violationCheck,
        start: chunk.start,
        end: chunk.end,
      });
    } catch (error) {
      console.error("Error checking violation:", error);
      results.push({
        transcript: text,
        violationCheck: undefined,
        start: chunk.start,
        end: chunk.end,
      });
    }
  }

  return results;
}