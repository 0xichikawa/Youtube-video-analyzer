import ytdl from "@distube/ytdl-core";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import youtubedl, { Payload } from "youtube-dl-exec";

const CHANNEL_URL = 'https://www.youtube.com/c/Ond%C5%99ejKob%C4%9Brsk%C3%BD'; // Channel videos page  

export async function downloadVideo(
  videoUrl: string
): Promise<{ audioPath: string; videoId: string }> {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const videoId = videoInfo.videoDetails.videoId;

    // Ensure data directory exists
    const dataDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const audioPath = path.join(dataDir, `${videoId}.mp3`);

    // check if the file already exists
    if (fs.existsSync(audioPath)) {
      console.log(`Audio file already exists for ${videoId}`);
      return { audioPath, videoId };
    }

    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, {
        quality: "highestaudio",
        filter: "audioonly",
      });

      // Handle stream errors
      stream.on("error", (error) => {
        console.error("Stream error:", error);
        reject(error);
      });

      // Handle progress
      let lastPercent = 0;
      stream.on("progress", (_, downloaded, total) => {
        const percent = Math.floor((downloaded / total) * 100);
        if (percent > lastPercent) {
          lastPercent = percent;
          console.log(`Downloading: ${percent}%`);
        }
      });

      const writeStream = fs.createWriteStream(audioPath);

      writeStream.on("error", (error) => {
        console.error("Write stream error:", error);
        reject(error);
      });

      stream
        .pipe(writeStream)
        .on("finish", () => {
          console.log(`Successfully downloaded audio to ${audioPath}`);
          resolve({ audioPath, videoId });
        })
        .on("error", (error) => {
          console.error("Pipe error:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error in downloadVideo:", error);
    throw error;
  }
}

export async function downloadVideoInChunks(
  videoUrl: string,
  chunkDurationMinutes: number = 1
): Promise<{ chunksDir: string; videoId: string }> {
  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const videoId = videoInfo.videoDetails.videoId;
    const videoDurationSeconds = parseInt(videoInfo.videoDetails.lengthSeconds);

    // Create directory for chunks
    const dataDir = path.join(__dirname, "..", "data");
    const chunksDir = path.join(dataDir, videoId);
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // First download the complete audio file
    const tempAudioPath = path.join(chunksDir, `complete.mp3`);

    if (!fs.existsSync(tempAudioPath)) {
      await new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, {
          quality: "highestaudio",
          filter: "audioonly",
        });

        const writeStream = fs.createWriteStream(tempAudioPath);

        stream.pipe(writeStream).on("finish", resolve).on("error", reject);
      });
    }

    // Calculate number of chunks
    const chunkDurationSeconds = chunkDurationMinutes * 60;
    const numberOfChunks = Math.ceil(
      videoDurationSeconds / chunkDurationSeconds
    );

    // Split into chunks using ffmpeg
    const splitPromises = Array.from({ length: numberOfChunks }, (_, index) => {
      const startTime = index * chunkDurationSeconds;
      const chunkPath = path.join(chunksDir, `${index}.mp3`);

      // Skip if chunk already exists
      if (fs.existsSync(chunkPath)) {
        console.log(`Chunk ${index} already exists`);
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        ffmpeg(tempAudioPath)
          .setStartTime(startTime)
          .setDuration(chunkDurationSeconds)
          .output(chunkPath)
          .on("end", () => {
            console.log(`Chunk ${index} created successfully`);
            resolve(null);
          })
          .on("error", (err) => {
            console.error(`Error creating chunk ${index}:`, err);
            reject(err);
          })
          .run();
      });
    });

    await Promise.all(splitPromises);

    // Optionally remove the complete file after splitting
    fs.unlinkSync(tempAudioPath);

    return { chunksDir, videoId };
  } catch (error) {
    console.error("Error in downloadVideoInChunks:", error);
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