import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { extractLegalRules } from "./src/article.helper";
import { processSingleVideo, processSingleAudio } from "./src/youtube.helpers";
import { delay } from "./src/utils/delay";
import { processAudioForTranscription } from "./src/deepgram.helpers";

dotenv.config();

const CONFIG = {
  VIDEO_LINKS_FILE: 'scrapedVideoLinks.json',
  PROCESS_DELAY: 5000
} as const;

async function main(): Promise<void> {
  try {
    // const scrapedVideoUrls: string[] = JSON.parse(
    //   fs.readFileSync(CONFIG.VIDEO_LINKS_FILE, 'utf-8')
    // );
    const articleUrl = process.env.ARTICLE_URL;
    if (!articleUrl) {
      throw new Error("ARTICLE_URL is not defined in the environment variables.");
    }
    const { legalRules, tokenCosts } = await extractLegalRules(articleUrl);

    const patreonAudioDir = path.join(__dirname, 'data', 'patreonAudio');
    const audioFiles = fs.readdirSync(patreonAudioDir)
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const filePath = file.replace('.mp3', '');
        return path.join(patreonAudioDir, filePath);
      });    
    
    if(!audioFiles.length) {
      console.log("No audio files found in the directory.");
      return;
    }

    for (const [index, audioFile] of audioFiles.entries()) {
      console.log(`Processing audio ${index + 1}/${audioFiles.length}: ${audioFile}`);

      const success = await processSingleAudio(audioFile, legalRules);
      console.log(success ?
        `✅ Successfully processed: ${audioFile}` :
        `❌ Skipping audio due to errors: ${audioFile}`
      );

      if (index < audioFiles.length - 1) {
        await delay(CONFIG.PROCESS_DELAY);
      }
    }

    // const scrapedVideoUrls = [
    //   // "https://www.youtube.com/watch?v=wFw4TovEicE",
    //   // "https://www.youtube.com/watch?v=p76oc2yfcX0"
    // ]

    // if (!scrapedVideoUrls.length) {
    //   throw new Error("No video URLs found. Exiting.");
    // }

    // for (const [index, videoUrl] of scrapedVideoUrls.entries()) {
    //   console.log(`Processing video ${index + 1}/${scrapedVideoUrls.length}: ${videoUrl}`);

    //   const success = await processSingleVideo(videoUrl, legalRules);
    //   console.log(success ?
    //     `✅ Successfully processed: ${videoUrl}` :
    //     `❌ Skipping video due to errors: ${videoUrl}`
    //   );

    //   if (index < scrapedVideoUrls.length - 1) {
    //     await delay(CONFIG.PROCESS_DELAY);
    //   }
    // }

    console.log("Token cost:", tokenCosts);
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

main();
