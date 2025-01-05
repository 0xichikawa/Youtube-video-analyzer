import * as fs from "fs";
import { processVideo } from "./src/deepgram.helpers";
import { extractLegalRules } from "./src/article.helper";
import { analyzeTranscriptsInParagraphs } from "./src/llm";
import { saveToGoogleSheets } from "./src/googleSheet.helper";

async function processSingleVideo(videoUrl: string, extractedRules: string[], maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { paragraphs, videoId } = await processVideo(videoUrl);
      console.log("Processing completed for video:", videoId);

      const { results } = await analyzeTranscriptsInParagraphs(paragraphs, extractedRules);

      const sheetsData = results.map(result => ({
        id: videoId,
        transcript: result.transcript,
        violated_reason: result.violatedReason,
        start: result.start,
        end: result.end,
        video_link: videoUrl
      }));

      await saveToGoogleSheets(sheetsData);
      break;

    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function main(videoUrls: string[], articleUrl: string): Promise<void> {
  try {
    // Extract legal rules once  
    const { legalRules, tokenCosts } = await extractLegalRules(articleUrl);

    // Process each video sequentially  
    for (const videoUrl of videoUrls) {
      await processSingleVideo(videoUrl, legalRules);
      await delay(5000); // Delay of 3 seconds after processing each video  
    }

    console.log("Token cost:", tokenCosts);
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const rawData = fs.readFileSync('scrapedVideoLinks.json', 'utf-8');
  // Parse the JSON data  
  const scrapedVideoUrls: string[] = JSON.parse(rawData);

  // const scrapedVideoUrls = await getVideoLinks(CHANNEL_URL);
  console.log("Scraped video URLs:", scrapedVideoUrls);

  if (!scrapedVideoUrls.length) {
    console.error("No video URLs found. Exiting.");
    return; // Exit if no URLs found  
  }

  const articleUrl = "https://www.cnb.cz/cs/dohled-financni-trh/legislativni-zakladna/stanoviska-k-regulaci-financniho-trhu/RS2018-08";
  await main(scrapedVideoUrls, articleUrl);
}

// Start the process  
run().catch(error => {
  console.error("Unexpected error:", error);
});