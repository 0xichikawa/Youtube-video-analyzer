import ytdl from "@distube/ytdl-core";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import youtubedl, { youtubeDl, Payload } from "youtube-dl-exec";

// download video but not converted to mp3, fixing
// export async function downloadAudio(
//   videoUrl: string
// ): Promise<{ audioPath: string; videoId: string }> {
//   try {
//     // Create a request agent using cookies  
//     const agent = ytdl.createAgent(
//       JSON.parse(fs.readFileSync(path.join(__dirname, 'cookies.json'), 'utf-8'))
//     );

//     // Fetch video information  
//     const videoInfo = await ytdl.getInfo(videoUrl, { agent });
//     const videoId = videoInfo.videoDetails.videoId;

//     // Prepare the data directory  
//     const dataDir = path.join(__dirname, '..', 'data');
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }

//     const tempVideoPath = path.join(dataDir, `${videoId}.mp4`);
//     const finalAudioPath = path.join(dataDir, `${videoId}.mp3`);

//     console.log(`Temp Video Path: ${tempVideoPath}`);
//     console.log(`Final Audio Path: ${finalAudioPath}`);

//     // Check if audio file already exists  
//     if (fs.existsSync(finalAudioPath)) {
//       console.log("Audio file already exists.");
//       return { audioPath: finalAudioPath, videoId };
//     }

//     // Step 1: Download video  
//     await new Promise<void>((resolve, reject) => {
//       const stream = ytdl(videoUrl, {
//         agent,
//         quality: 'highest', // Uncomment if you want to specify quality  
//       });

//       let lastPercent = 0;
//       stream.on('progress', (_, downloaded, total) => {
//         const percent = Math.floor((downloaded / total) * 100);
//         if (percent > lastPercent) {
//           lastPercent = percent;
//           console.log(`Downloading video: ${percent}%`);
//         }
//       });

//       const writeStream = fs.createWriteStream(tempVideoPath);
//       stream.pipe(writeStream)
//         .on('finish', () => {
//           console.log('Video download completed');
//           resolve();
//         })
//         .on('error', (writeError) => {
//           console.error('Error writing video to file:', writeError);
//           reject(writeError);
//         });
//     });

//     // Step 2: Convert to MP3  
//     await new Promise<void>((resolve, reject) => {
//       const inputStream = fs.createReadStream(tempVideoPath);
//       ffmpeg(inputStream)  // Use the temporary MP4 file as input  
//         .audioCodec('libmp3lame') // Use the MP3 codec  
//         .toFormat('mp3')     // Specify MP3 output format  
//         .audioBitrate('192k') // Set audio bitrate to 192 kbps  
//         .audioChannels(2)     // Set output to stereo  
//         .audioFrequency(44100) // Set sample rate to 44.1 kHz  
//         .outputOptions('-y')   // Overwrite output file if it exists  
//         .on('progress', (progress) => {
//           const percent = progress.percent || 0;
//           console.log(`Converting to MP3: ${Math.round(percent)}%`);
//         })
//         .on('end', () => {
//           // Clean up temporary video file  
//           fs.unlinkSync(tempVideoPath);
//           console.log('Conversion completed');
//           resolve();
//         })
//         .on('error', (ffmpegError) => {
//           console.error('FFmpeg error:', ffmpegError);
//           reject(ffmpegError);
//         })
//         .save(finalAudioPath); // Save output to final audio path  
//     });

//     return { audioPath: finalAudioPath, videoId };

//   } catch (error) {
//     console.error('Error in downloadAudio:', error); // Log general errors  
//     throw error; // Rethrow the error for further handling  
//   }
// }

export async function downloadAudio(videoUrl: string): Promise<{ audioPath: string, videoId: string }> {
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
    return { audioPath: finalAudioPath, videoId };
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