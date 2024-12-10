import axios from "axios";
import * as cheerio from "cheerio"; // For extracting text from HTML  
import OpenAI from 'openai'; // Default import  

// Initialize OpenAI  
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**  
 * Fetches and cleans the content of an article from a given URL.  
 * @param url - The URL of the article.  
 * @returns A promise resolving to the extracted article content.  
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);

    // Load the HTML content  
    const $ = cheerio.load(response.data);

    // Extract the main content (adjust selectors as needed)  
    const content = $("body")
      .find("p") // Extract <p> tags (or refine for specific selectors)  
      .map((_, el) => $(el).text())
      .get()
      .join("\n\n"); // Join paragraphs with spacing  

    if (!content) {
      throw new Error("Failed to extract article content.");
    }

    return content;
  } catch (error) {
    console.error("Error fetching article content:", error instanceof Error ? error.message : error);
    throw new Error("Unable to fetch or parse the article content.");
  }
}

/**  
 * Extracts summarized legal rules from the article content using OpenAI.  
 * @param content - The text content of the article.  
 * @returns A promise resolving to an array of legal rules.  
 */
export async function extractLegalRules(articleUrl: string): Promise<string[]> {
  try {
    const content = await fetchArticleContent(articleUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a legal assistant." },
        {
          role: "user",
          content: `Summarize the main legal principles from this article in bullet points in Czech:\n\n${content}`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new Error("Failed to extract legal rules.");
    }

    // Split the summary into an array of rules  
    const legalRules = summary
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines  

    return legalRules;
  } catch (error) {
    console.error("Error extracting legal rules:", error instanceof Error ? error.message : error);
    throw new Error("Unable to summarize legal rules.");
  }
}