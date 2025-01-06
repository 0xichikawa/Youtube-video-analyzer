import { createClient, PrerecordedSchema } from "@deepgram/sdk";
import * as fs from "fs";
import * as path from "path";
import { downloadVideo } from "./youtube.helpers";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY as string);

interface Sentence {
  text: string;
  start: number;
  end: number;
}

interface Paragraph {
  sentences: Sentence[];
  speaker: number;
  num_words: number;
  start: number;
  end: number;
}

interface TranscriptionResult {
  transcript: string;       // The complete transcript of the audio  
  paragraphs: Paragraph[];   // Array of paragraphs  
  videoId: string;           // The ID of the video
}

/**  
 * Function to transcribe an audio file and return a structured response.  
 * @param audioPath - The path to the audio file to be transcribed.  
 * @returns A promise that resolves to an object containing the transcript and its structured details.  
 */
async function transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
  try {
    if (!fs.existsSync(audioPath)) {  
      console.error("File does not exist:", audioPath);  
  } else {  
      console.log("File exists:", audioPath);  
  }  
    const audioFile = fs.readFileSync(audioPath);
    console.log("audio file Length------->", audioFile.length);
    const transcriptionOptions: PrerecordedSchema = {
      model: "nova-2-general",
      language: "cs",
      smart_format: false,
      diarize: true,
      paragraphs: true,
      punctuate: true,
      multichannel: false,
    };

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioFile,
      transcriptionOptions
    );

    console.log("result-------->", result)

    if (error) {
      throw new Error(`Deepgram transcription error: ${error}`);
    }

    const channel = result.results.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    const transcript = alternative?.transcript || '';

    // Safely handle the paragraphs  
    const paragraphs = alternative?.paragraphs?.paragraphs?.map((paragraph: any) => ({
      start: paragraph.start,
      end: paragraph.end,
      num_words: paragraph.num_words,
      speaker: paragraph.speaker,
      sentences: paragraph.sentences.map((sentence: any) => ({
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
      })),
    })) || [];

    return {
      transcript,
      paragraphs,
      videoId: path.basename(audioPath, ".mp3"),
    };
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  }
}
// : Promise<TranscriptionResult>
export async function processVideo(videoUrl: string) {
  try {
    console.log(`Processing video ${videoUrl}...`);

    const { audioPath, videoId } = await downloadVideo(videoUrl);
    console.log(`Audio downloaded for ${videoId}`);

    // const { transcript, paragraphs } = await transcribeAudio(audioPath);

    // // Optionally save the transcription to a file, if needed  
    // const outputPath = path.join(__dirname, "..", "data", `${videoId}.json`);  
    // await fs.promises.writeFile(  
    //   outputPath,  
    //   JSON.stringify(transcript, null, 2)  
    // );  
    // console.log(`Transcription completed and saved to ${outputPath}`);
    // return {transcript, paragraphs, videoId}  
  } catch (error) {
    console.error(`Error processing video ${videoUrl}:`, error);
    throw error;
  }
}