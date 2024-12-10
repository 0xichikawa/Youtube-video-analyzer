import { createClient, PrerecordedSchema } from "@deepgram/sdk";
import * as fs from "fs";
import * as path from "path";
import { downloadVideo } from "./youtube.helpers";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// interface TranscriptionResult {  
//   transcript: string;  
//   start: number;       
//   end: number;         
//   paragraphs: Array<{  
//     text: string;     
//     start: number;      
//     end: number;      
//     confidence: number;   
//     words: Array<{      
//       word: string;  
//       start: number;  
//       end: number;  
//       confidence: number;  
//     }>;  
//   }>;  
// }

// async function transcribeAudio(
//   audioPath: string
// ): Promise<TranscriptionResult> {
//   try {
//     const audioFile = fs.readFileSync(audioPath);

//     console.log(`Transcribing audio file: ${audioPath}`);

//     const transcriptionOptions: PrerecordedSchema = {
//       model: "nova-2-general",
//       language: "cs",
//       smart_format: false,
//       diarize: true,
//       utterances: true,
//       punctuate: true,
//       multichannel: false,
//     };

//     const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
//       audioFile,
//       transcriptionOptions
//     );

//     if (error) {
//       throw new Error(`Deepgram transcription error: ${error}`);
//     }

//     if (!result?.results) {
//       throw new Error("No results found in the response");
//     }

//     const transcript =
//       result.results.channels?.[0]?.alternatives?.[0]?.transcript;
//     const utterances = result.results.utterances || [];

//     if (!transcript) {
//       throw new Error("No transcript found in the response");
//     }

//     // Get start time from the first utterance and end time from the last utterance
//     const start = utterances[0]?.start || 0;
//     const end = utterances[utterances.length - 1]?.end || 0;

//     // Format timed transcript with utterances
//     const timedTranscript = utterances.map((utterance) => ({
//       text: utterance.transcript,
//       start: utterance.start,
//       end: utterance.end,
//       confidence: utterance.confidence,
//       words: utterance.words,
//     }));

//     return {
//       transcript,
//       start,
//       end,
//       utterances: timedTranscript,
//     };
//   } catch (error) {
//     console.error("Error in transcription:", error);
//     throw error;
//   }
// }

interface Word {
  word: string;         // The word text  
  start: number;       // Start timestamp of the word (in seconds)  
  end: number;         // End timestamp of the word (in seconds)  
  confidence: number;  // Confidence score for the word  
}

interface Sentence {
  text: string;         // The sentence text  
  start: number;       // Start timestamp (in seconds)  
  end: number;         // End timestamp (in seconds)  
}

interface Paragraph {
  text: string;             // The paragraph text  
  start: number;           // Start timestamp (in seconds)  
  end: number;             // End timestamp (in seconds)  
  confidence: number;      // Overall confidence score for the paragraph  
  sentences: Sentence[];    // List of sentences in the paragraph  
}

interface TranscriptionResult {
  transcript: string;       // The complete transcript of the audio  
  paragraphs: Paragraph[];   // Array of paragraphs  
}

/**  
 * Function to transcribe an audio file and return a structured response.  
 * @param audioPath - The path to the audio file to be transcribed.  
 * @returns A promise that resolves to an object containing the transcript and its structured details.  
 */
async function transcribeAudio(audioPath: string): Promise<void> {
  try {
    const audioFile = fs.readFileSync(audioPath);

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

    if (error) {
      throw new Error(`Deepgram transcription error: ${error}`);
    }

    console.log("Transcription result:", result);

    // const transcript = result.results.channels?.[0]?.alternatives?.[0]?.transcript;
    // const paragraphs = result.results.channels[0].alternatives[0].paragraphs.paragraphs.map((paragraph: any) => ({
    //   text: paragraph.text,
    //   start: paragraph.start,
    //   end: paragraph.end,
    //   confidence: paragraph.confidence,
    //   sentences: paragraph.sentences.map((sentence: any) => ({
    //     text: sentence.text,
    //     start: sentence.start,
    //     end: sentence.end,
    //   })),
    // }));

    // return {
    //   transcript,
    //   paragraphs,
    // };
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  }
}

export async function processVideo(videoUrl: string): Promise<void> {
  try {
    console.log(`Processing video ${videoUrl}...`);

    const { audioPath, videoId } = await downloadVideo(videoUrl);
    console.log(`Audio downloaded for ${videoId}`);

    // const transcription = await transcribeAudio(audioPath);

    // const outputPath = path.join(__dirname, "..", "data", `${videoId}.json`);
    // await fs.promises.writeFile(
    //   outputPath,
    //   JSON.stringify(transcription, null, 2)
    // );

    // console.log(`Transcription completed and saved to ${outputPath}`);

    // return transcription;
  } catch (error) {
    console.error(`Error processing video ${videoUrl}:`, error);
    throw error;
  }
}