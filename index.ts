import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
dotenv.config();

import { downloadVideo } from "./src/youtube.helpers";
import { transcribeAudio } from "./src/deepgram.helpers";

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

async function main(videoUrls: string[]): Promise<void> {
  try {
    for (const url of videoUrls) {
      await processVideo(url);
    }
    console.log("All videos processed successfully!");
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

const videoUrls = ["https://www.youtube.com/watch?v=nW6JEbEG7c4"];

main(videoUrls);
