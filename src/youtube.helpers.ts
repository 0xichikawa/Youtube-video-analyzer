import ytdl from "@distube/ytdl-core";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import youtubedl, { Payload } from "youtube-dl-exec";

// export async function downloadVideo(
//   videoUrl: string,
// ): Promise<{ audioPath: string; videoId: string }> {
//   try {
//     const agent = ytdl.createAgent(JSON.parse(fs.readFileSync(path.join(__dirname, "cookies.json"), "utf-8")));
//     const videoInfo = await ytdl.getInfo(videoUrl, { agent });
//     const videoId = videoInfo.videoDetails.videoId;

//     const dataDir = path.join(__dirname, "..", "data");

//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }

//     const audioPath = path.join(dataDir, `${videoId}.mp3`);

//     if (fs.existsSync(audioPath)) {
//       console.log(`Audio file already exists for ${videoId}`);
//       return { audioPath, videoId };
//     }

//     return new Promise((resolve, reject) => {
//       const stream = ytdl(videoUrl, {
//         // quality: "highestaudio",
//         // filter: "audioonly",
//         agent,
//       });

//       let lastPercent = 0;
//       stream.on("progress", (_, downloaded, total) => {
//         const percent = Math.floor((downloaded / total) * 100);
//         if (percent > lastPercent) {
//           lastPercent = percent;
//           console.log(`Downloading: ${percent}%`);
//         }
//       });

//       // Rest of the code remains the same...
//       stream.on("error", (error) => {
//         console.error("Stream error:", error);
//         reject(error);
//       });

//       ffmpeg(stream)
//         .toFormat('mp3')
//         .audioBitrate('128k')
//         .audioChannels(2)
//         .audioFrequency(44100)
//         .outputOptions('-y') // Overwrite output file if exists
//         .on('progress', (progress) => {
//           console.log(`Processing: ${progress.percent}%`);
//         })
//         .on('end', () => {
//           console.log(`Successfully converted and saved audio to ${audioPath}`);
//           resolve({ audioPath, videoId });
//         })
//         .on('error', (error) => {
//           console.error('FFmpeg error:', error);
//           reject(error);
//         })
//         .save(audioPath);

//       // const writeStream = fs.createWriteStream(audioPath);

//       // writeStream.on("error", (error) => {
//       //   console.error("Write stream error:", error);
//       //   reject(error);
//       // });

//       // stream
//       //   .pipe(writeStream)
//       //   .on("finish", () => {
//       //     console.log(`Successfully downloaded audio to ${audioPath}`);
//       //     resolve({ audioPath, videoId });
//       //   })
//       //   .on("error", (error) => {
//       //     console.error("Pipe error:", error);
//       //     reject(error);
//       //   });
//     });
//   } catch (error) {
//     console.error("Error in downloadVideo:", error);
//     throw error;
//   }
// }

export async function downloadVideo(
  videoUrl: string,
): Promise<{ audioPath: string; videoId: string }> { 
  try {  
    const agent = ytdl.createAgent(JSON.parse(fs.readFileSync(path.join(__dirname, "cookies.json"), "utf-8")));
    
    const videoInfo = await ytdl.getInfo(videoUrl, { agent });  
    const videoId = videoInfo.videoDetails.videoId.replace(/[^a-zA-Z0-9-_]/g, ''); // Sanitize  
    
    const dataDir = path.join(__dirname, "..", "data");  

    if (!fs.existsSync(dataDir)) {  
      fs.mkdirSync(dataDir, { recursive: true });  
    }  

    const tempAudioPath = path.join(dataDir, `${videoId}.temp.mp4`); // Temporary file path  
    const audioPath = path.join(dataDir, `${videoId}.mp3`);  

    if (fs.existsSync(audioPath)) {  
      console.log(`Audio file already exists for ${videoId}`);  
      return { audioPath, videoId };  
    }  
    
    return new Promise((resolve, reject) => {  
      const stream = ytdl(videoUrl, {  
        filter: format => format.audioBitrate !== null && format.container === 'mp4', // Filter for mp4 formats with audio  
        agent,  
      });  
      
      // Add error handler for the stream
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });

      const writeStream = fs.createWriteStream(tempAudioPath);  
      let lastPercent = 0;  

      // Track download progress  
      stream.on('progress', (chunkLength, downloaded, total) => {  
        const percent = Math.floor((downloaded / total) * 100);  
        if (percent > lastPercent) {  
          lastPercent = percent;  
          console.log(`Downloading: ${percent}%`);  
        }  
      });  
      
            
      // // Add error handler for the pipe operation
      // const pipe = stream.pipe(writeStream);
      // pipe.on('error', (error) => {
      //   console.error('Pipe error:', error);
      //   reject(error);
      // });

      writeStream.on("finish", () => {  
        console.log(`Download completed, now converting to MP3...`);  

        ffmpeg(tempAudioPath)  
          .toFormat('mp3')  
          .audioBitrate(128)  
          .audioChannels(2)  
          .audioFrequency(44100)  
          .outputOptions('-y')  
          .on('progress', (progress) => {  
            console.log(`Processing: ${progress.percent}%`);  
          })  
          .on('end', () => {  
            console.log(`Successfully converted and saved audio to ${audioPath}`);  
            fs.unlinkSync(tempAudioPath); // Clean up temporary file  
            resolve({ audioPath, videoId });  
          })  
          .on('error', (error) => {  
            console.error('FFmpeg error:', error);  
            reject(error);  
          })  
          .save(audioPath);  
      });  

      writeStream.on("error", (error) => {  
        console.error("Write stream error:", error);  
        reject(error);  
      });  
    });  
  } catch (error) {  
    console.error("Error in downloadVideo:", error);  
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