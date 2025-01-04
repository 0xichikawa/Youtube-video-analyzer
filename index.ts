import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { processVideo } from "./src/deepgram.helpers";
import { extractLegalRules } from "./src/article.helper";
import { analyzeTranscriptsInParagraphs } from "./src/llm";
import { getVideoLinks } from "./src/youtube.helpers";

interface VideoData {
  id: string;
  transcript: string;
  violated_reason: string;
  start: number;
  end: number;
  video_link: string;
}

const CHANNEL_URL = 'https://www.youtube.com/c/Ond%C5%99ejKob%C4%9Brsk%C3%BD'; // Channel videos page  

async function processSingleVideo(videoUrl: string, extractedRules: string[]): Promise<void> {
  try {
    const { paragraphs, videoId } = await processVideo(videoUrl);
    console.log("Processing completed for video:", videoId);

    const { results } = await analyzeTranscriptsInParagraphs(paragraphs, extractedRules);

    // Prepare data for Google Sheets
    const sheetsData = results.map(result => ({
      id: videoId,
      transcript: result.transcript,
      violated_reason: result.violatedReason,
      start: result.start,
      end: result.end,
      video_link: videoUrl
    }));

    // Save to Google Sheets
    await saveToGoogleSheets(sheetsData);

  } catch (error) {
    console.error(`Error processing video ${videoUrl}:`, error);
  }
}

async function main(videoUrls: string[], articleUrl: string): Promise<void> {
  try {
    // Extract legal rules once  
    const { legalRules, tokenCosts } = await extractLegalRules(articleUrl);
    console.log("Extracted Legal Rules:", legalRules);

    // Process each video sequentially or in parallel  
    await Promise.all(videoUrls.map(videoUrl => processSingleVideo(videoUrl, legalRules)));

    console.log("Token cost:", tokenCosts);
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

async function saveToGoogleSheets(data: VideoData[]) {
  console.log("Saving to Google Sheets...");

  // Create the JWT auth instance  
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Create the GoogleSpreadsheet instance  
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, serviceAccountAuth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[process.env.SHEET_NAME as string];
  if (!sheet) {
    sheet = await doc.addSheet({ title: process.env.SHEET_NAME, headerValues: ['id', 'transcript', 'violated_reason', 'start', 'end', 'video_link'] });
  }

  const rows = data.map(item => ({
    id: item.id,
    transcript: item.transcript,
    violated_reason: item.violated_reason,
    start: item.start,
    end: item.end,
    video_link: item.video_link
  }));

  await sheet.addRows(rows);
  console.log("Saved data to Google Sheets successfully.");
}

async function run() {
  // const scrapedVideoUrls = await getVideoLinks(CHANNEL_URL);
  const scrapedVideoUrls = [
    'https://www.youtube.com/watch?v=iOmxIV9ehTI',
    'https://www.youtube.com/watch?v=0DThjRo_oBo'
  ];
  console.log("Video URLs---------->", scrapedVideoUrls);

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