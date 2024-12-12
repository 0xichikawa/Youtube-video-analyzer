import OpenAI from "openai";

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
  violationCheck: "Violation"; // Restricting to only "Violation" because we only need violated sentences  
  start: number;
  end: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to analyze transcripts in paragraphs  
export async function analyzeTranscriptsInParagraphs(paragraphs: Paragraph[], legalRules: string[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const paragraph of paragraphs) {
    const { sentences } = paragraph;

    if (sentences.length === 0) continue; // Skip if no sentences  

    for (const sentence of sentences) {
      const { text } = sentence;

      // Create a focused prompt  
      const checkViolationsPrompt = `  
Jste právní asistent specializovaný na české právo. Vaším úkolem je analyzovat přepis a zjistit, zda některé jeho části porušují právní pravidla uvedená níže. Zaměřte se na výroky, které mohou být považovány za přímé porušení pravidel.  

### Postup analýzy:  
1. **Porovnejte obsah přepisu s pravidly** uvedenými níže. Výrok porušuje pravidlo, pouze pokud:  
   - Obsahuje **přímé instrukce** nebo **návodné kroky** týkající se vydělávání peněz.  
   - Naznačuje **zaručený výsledek** (např. jistotu zisku) bez uvedení rizik.  
   - Používá jazyk, který může být **zavádějící** nebo **nepodložený** (např. "učte se z mých přesných kroků").  
2. **Ignorujte nejednoznačné výroky** (např. subjektivní názory nebo obecná doporučení), pokud nelze jednoznačně určit, že porušují pravidlo.  
3. Pokud zjistíte porušení, vysvětlete jasně:  
   - Které konkrétní pravidlo je porušeno.  
   - Jaká část přepisu porušení způsobuje (uveďte celý příslušný text přepisu).  
   - Proč tento výrok jednoznačně porušuje pravidlo.  
4. Pokud pravidlo není porušeno, uveďte pouze: "Žádné porušení."  

### Příklady výroků, které jsou červenými vlajkami:  
- Přímé instrukce: "Postupujte podle těchto kroků a vyděláte peníze."  
- Zaručené výsledky: "Není možné prodělat, pokud použijete tento systém."  
- Nepodložené tvrzení: "Toto je jediný způsob, jak zbohatnout."  
- Jazyk podněcující k akci: "Učte se z mých přesných kroků a uspějete."  

### Právní pravidla ke kontrole:  
${legalRules}  

### Přepis k analýze:  
"${text}"  

### Odpověď:  
- Pokud najdete porušení, napište:  
  "Porušení: [Odůvodnění, které pravidlo je porušeno + konkrétní část přepisu, která problém způsobila]."  
- Pokud nenajdete žádné porušení, napište:  
  "Žádné porušení."  
`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "Jste právní asistent specializovaný na české právo." },
            { role: "user", content: checkViolationsPrompt },
          ],
        });

        // Validate the response structure  
        if (response.choices && response.choices.length > 0) {
          const violationCheckResponse = response.choices[0]?.message?.content?.trim() || "";
          console.log("Violation Check Response:", violationCheckResponse);

          // Check if the response indicates a violation  
          if (violationCheckResponse.startsWith("Porušení")) {
            results.push({
              transcript: text,
              violationCheck: "Violation",  // Only store violations  
              start: sentence.start,
              end: sentence.end,
            });
          }
        } else {
          console.error("No choices returned in the response for sentence:", text);
        }
      } catch (error) {
        console.error("Error checking violation for sentence:", text, "Error:", error);
      }
    }
  }

  return results; // This will only contain violations  
}