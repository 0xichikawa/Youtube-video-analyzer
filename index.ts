import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
// import { processVideo } from "./src/deepgram.helpers";
// import { extractLegalRules } from "./src/article.helper";
// import { analyzeTranscriptsInParagraphs } from "./src/llm";
import { scrapeYoutubeVideos } from "./src/youtube.helpers";

// async function processSingleVideo(videoUrl: string, extractedRules: string[]): Promise<void> {
//   try {
//     const { paragraphs, videoId } = await processVideo(videoUrl);
//     console.log("Processing completed for video:", videoId);

//     // Analyze transcripts with the pre-fetched legal rules  
//     const { results, analyzeTotalCost } = await analyzeTranscriptsInParagraphs(paragraphs, extractedRules);

//     // Save results to JSON file  
//     const outputDir = path.join(__dirname, "data");
//     await fs.promises.mkdir(outputDir, { recursive: true });
//     const outputPath = path.join(outputDir, `${videoId} - violation.json`);
//     await fs.promises.writeFile(outputPath, JSON.stringify(results, null, 2));

//     console.log(`Analysis results saved to ${outputPath}`);
//     console.log(`Analyzing Total token cost: ${analyzeTotalCost}`);
//   } catch (error) {
//     console.error(`Error processing video ${videoUrl}:`, error);
//   }
// }

// async function main(videoUrls: string[], articleUrl: string): Promise<void> {
//   try {
//     // Extract legal rules once  
//     const { legalRules, tokenCosts } = await extractLegalRules(articleUrl);
//     console.log("Extracted Legal Rules:", legalRules);

//     // Process each video sequentially or in parallel  
//     await Promise.all(videoUrls.map(videoUrl => processSingleVideo(videoUrl, legalRules)));

//     console.log("Token cost:", tokenCosts);
//   } catch (error) {
//     console.error("Error in main process:", error);
//   }
// }

async function run() {
  const videoUrls = await scrapeYoutubeVideos();
  console.log("Video URLs---------->", videoUrls);

  if (!videoUrls.length) {
    console.error("No video URLs found. Exiting.");
    return; // Exit if no URLs found  
  }

  // const articleUrl = "https://www.cnb.cz/cs/dohled-financni-trh/legislativni-zakladna/stanoviska-k-regulaci-financniho-trhu/RS2018-08";  
  // await main(videoUrls, articleUrl);  
}

// Start the process  
run().catch(error => {
  console.error("Unexpected error:", error);
});