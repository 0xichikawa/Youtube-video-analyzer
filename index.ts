import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
dotenv.config();

import { downloadVideo } from "./src/youtube.helpers";
import { transcribeAudio } from "./src/deepgram.helpers";
import { fetchArticleContent, extractLegalRules } from "./src/article.helper";

async function processVideo(videoUrl: string): Promise<void> {
  try {
    console.log(`Processing video ${videoUrl}...`);

    const { audioPath, videoId } = await downloadVideo(videoUrl);
    console.log(`Audio downloaded for ${videoId}`);

    const transcription = await transcribeAudio(audioPath);

    const outputPath = path.join(__dirname, "data", `${videoId}.json`);
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(transcription, null, 2)
    );

    console.log(`Transcription completed and saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error processing video ${videoUrl}:`, error);
  }
}

async function main(videoUrls: string[], articleUrl: string): Promise<void> {
  try {
    for (const url of videoUrls) {
      await processVideo(url);
    }
    console.log("All videos processed successfully!");

    const content = await fetchArticleContent(articleUrl);
    console.log("Fetched Article content:", content);
    const extractedRules = await extractLegalRules(content);
    console.log("Extracted Legal Rules:", extractedRules);

  } catch (error) {
    console.error("Error in main process:", error);
  }
}

const videoUrls = ["https://www.youtube.com/watch?v=nW6JEbEG7c4"];
const articleUrl = "https://www.cnb.cz/cs/dohled-financni-trh/legislativni-zakladna/stanoviska-k-regulaci-financniho-trhu/RS2018-08";

main(videoUrls, articleUrl);
