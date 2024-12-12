import axios from "axios";
import * as cheerio from "cheerio"; // For extracting text from HTML  
import OpenAI from 'openai'; // Default import  
import { calculateTokenCosts } from "./tokenCosts.helper"; // Adjust the path as needed

// Initialize OpenAI  
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LegalRuleResult {
  legalRules: string[];
  tokenCosts: number;
}

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
export async function extractLegalRules(articleUrl: string): Promise<LegalRuleResult> {
  try {
    const articleContent = await fetchArticleContent(articleUrl);

    const extractLegalRulesPrompt = `  
    You are a legal assistant specializing in Czech law. Your task is to identify and summarize the key legal rules and principles from the following government article. Please provide your summary in detail, listing each legal rule clearly in Czech, and include brief explanations where necessary.  
    
    **Government Article Content:**  
    "${articleContent}"  
    
    - **Focus on Legal Concepts**: Pay particular attention to regulations related to consumer protection, financial markets, and any areas that might affect public advisories on financial transactions.  
    - **Output Format**: Use bullet points for each rule. Ensure that your summary includes:  
      - The legal rule or principle.  
      - A brief explanation of its significance.  
      - Any relevant examples that clarify the application of the rule.  
    
    Emphasize clarity and relevance, particularly in the context of possible violations in financial advisory situations.  
    `; 

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a legal assistant specializing in Czech law." },
        {
          role: "user",
          content: extractLegalRulesPrompt,
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

    const tokenCosts = calculateTokenCosts(extractLegalRulesPrompt, summary);
    return { legalRules, tokenCosts };
  } catch (error) {
    console.error("Error extracting legal rules:", error instanceof Error ? error.message : error);
    throw new Error("Unable to summarize legal rules.");
  }
}