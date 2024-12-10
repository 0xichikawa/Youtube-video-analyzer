import { createClient, PrerecordedSchema } from "@deepgram/sdk";
import * as fs from "fs";
import * as path from "path";
import { downloadVideo } from "./youtube.helpers";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

interface TranscriptionResult {
  transcript: string;
  start: number;
  end: number;
  utterances: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    words: any[];
  }>;
}

async function transcribeAudio(
  audioPath: string
): Promise<TranscriptionResult> {
  try {
    const audioFile = fs.readFileSync(audioPath);

    console.log(`Transcribing audio file: ${audioPath}`);

    const transcriptionOptions: PrerecordedSchema = {
      model: "nova-2-general",
      language: "cs",
      smart_format: false,
      diarize: true,
      utterances: true,
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

    if (!result?.results) {
      throw new Error("No results found in the response");
    }

    const transcript =
      result.results.channels?.[0]?.alternatives?.[0]?.transcript;
    const utterances = result.results.utterances || [];

    if (!transcript) {
      throw new Error("No transcript found in the response");
    }

    // Get start time from the first utterance and end time from the last utterance
    const start = utterances[0]?.start || 0;
    const end = utterances[utterances.length - 1]?.end || 0;

    // Format timed transcript with utterances
    const timedTranscript = utterances.map((utterance) => ({
      text: utterance.transcript,
      start: utterance.start,
      end: utterance.end,
      confidence: utterance.confidence,
      words: utterance.words,
    }));

    return {
      transcript,
      start,
      end,
      utterances: timedTranscript,
    };
  } catch (error) {
    console.error("Error in transcription:", error);
    throw error;
  }
}

export async function processVideo(videoUrl: string): Promise<TranscriptionResult> {
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

    return transcription ;
  } catch (error) {
    console.error(`Error processing video ${videoUrl}:`, error);
    throw error;
  }
}