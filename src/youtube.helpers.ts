import * as fs from "fs";
import * as path from "path";
import youtubedl, { youtubeDl, Payload } from "youtube-dl-exec";
import { processVideoForTranscription, processAudioForTranscription } from "./deepgram.helpers";
import { analyzeTranscriptsInParagraphs } from "./llm";
import { saveToGoogleSheets } from "./googleSheet.helper";

interface FailedVideo {
  url: string;
  error: string;
  timestamp: string;
}

const FAILED_VIDEOS_FILE = 'failed_videos.json';

export async function downloadAudio(videoUrl: string): Promise<{ audioPath: string, id: string }> {
  try {
    const videoId = videoUrl.split('v=')[1].split('&')[0];

    // Prepare the data directory  
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const finalAudioPath = path.join(dataDir, `${videoId}.mp3`);
    console.log(`Final Audio Path: ${finalAudioPath}`);

    const proxies = JSON.parse(fs.readFileSync(path.join(__dirname, 'proxies.json'), 'utf-8'));
    const proxyItem = proxies[Math.floor(Math.random() * proxies.length)].trim();
    console.log(`Using proxy: ${proxyItem}`);

    const subprocess = youtubeDl.exec(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      proxy: proxyItem,
      cookies: "cookies.txt",
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      output: finalAudioPath,
    })
    if (subprocess.stdout) {
      subprocess.stdout.on('data', (data) => {
        const message = data.toString();
        console.log(message); // Print the message to the terminal
      });
    }
    await subprocess;
    return { audioPath: finalAudioPath, id:videoId };
  } catch (error) {
    console.error('Error in downloadAudio:', error);
    throw error;
  }
}

export async function getVideoLinks(channelUrl: string): Promise<string[]> {
  const scrapedVideoUrls: string[] = [];

  try {
    // Calculate the date two years ago
    const dateTwoYearsAgo = new Date();
    dateTwoYearsAgo.setFullYear(dateTwoYearsAgo.getFullYear() - 2);
    const formattedDate = dateTwoYearsAgo.toISOString().split('T')[0].replace(/-/g, '');

    // Fetch all video URLs from the channel
    const videoUrlsString: string | Payload = await youtubedl(channelUrl, {
      flatPlaylist: true,
      getUrl: true,
      noWarnings: true,
    });

    if (typeof videoUrlsString === 'string') {
      // Filter out empty URLs and shorts
      const videoUrls = videoUrlsString.split('\n')
        .map(url => url.trim())
        .filter(url => url && !url.includes('short'));

      // Fetch metadata for all videos in parallel
      const fetchPromises = videoUrls.map(async (videoUrl) => {
        const output = await youtubedl(videoUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        });

        return { url: videoUrl, output };
      });

      // Resolve all promises
      const results = await Promise.all(fetchPromises);

      // Filter results based on upload date
      results.forEach(({ url, output }) => {
        if (typeof output === 'object' && output.upload_date > formattedDate) {
          scrapedVideoUrls.push(url);
        }
      });
    }

    console.log('Scraped video URLs:', scrapedVideoUrls);
    return scrapedVideoUrls;
  } catch (error) {
    console.error('Error fetching video links:', error);
    throw error; // Rethrow the error after logging it
  }
}

function saveFailedVideo(videoUrl: string, error: string) {
  let failedVideos: FailedVideo[] = [];

  if (fs.existsSync(FAILED_VIDEOS_FILE)) {
    failedVideos = JSON.parse(fs.readFileSync(FAILED_VIDEOS_FILE, 'utf-8'));
  }

  failedVideos.push({
    url: videoUrl,
    error: error.toString(),
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(FAILED_VIDEOS_FILE, JSON.stringify(failedVideos, null, 2));
}

export async function processSingleVideo(videoUrl: string, extractedRules: string[], maxRetries = 3): Promise<boolean> {
  let audioFilePath: string | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { paragraphs, id, audioPath } = await processVideoForTranscription(videoUrl);
      audioFilePath = audioPath;
      console.log("Processing completed for video:", id);

      const { results } = await analyzeTranscriptsInParagraphs(paragraphs, extractedRules);
      const sheetsData = results.map(result => ({
        id,
        transcript: result.transcript,
        violated_reason: result.violatedReason,
        start: result.start,
        end: result.end,
        video_link: videoUrl
      }));

      // await saveToGoogleSheets(sheetsData, process.env.SHEET_NAME_YOUTUBE);
      console.log("sheetsData--->" ,sheetsData);

      if (audioFilePath && fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
        console.log(`Deleted audio file: ${audioFilePath}`);
      }
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed for video ${videoUrl}:`, error);
      if (attempt === maxRetries) {
        saveFailedVideo(videoUrl, error instanceof Error ? error.message : String(error));
        return false;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

export async function processSingleAudio(audioFile: string, extractedRules: string[], maxRetries = 3): Promise<boolean> {
  let audioFilePath: string | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { paragraphs, id, audioPath } = await processAudioForTranscription(audioFile);
      audioFilePath = audioPath;
      console.log("Processing completed for video:", id);

      const { results } = await analyzeTranscriptsInParagraphs(paragraphs, extractedRules);
      const sheetsData = results.map(result => ({
        id: id,
        transcript: result.transcript,
        violated_reason: result.violatedReason,
        start: result.start,
        end: result.end,
        video_link: `https://www.patreon.com/posts/${id}`
      }));

      // await saveToGoogleSheets(sheetsData, process.env.SHEET_NAME_PATREON);
      console.log("sheetsData--->" ,sheetsData);

      if (audioFilePath && fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
        console.log(`Deleted audio file: ${audioFilePath}`);
      }
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed for video ${audioFile}:`, error);
      if (attempt === maxRetries) {
        saveFailedVideo(audioFile, error instanceof Error ? error.message : String(error));
        return false;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}