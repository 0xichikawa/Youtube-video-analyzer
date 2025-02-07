import OpenAI from "openai"
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from 'dotenv';
import { time, timeStamp } from "console";

dotenv.config();

interface VideoData {
    id: string;
    transcript: string;
    violated_reason: string;
    start: number;
    end: number;
    video_link: string;
    timestamp_link: string;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function saveToGoogleSheets(data: VideoData[], sheetName: string): Promise<void> {
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

    let sheet = doc.sheetsByTitle[sheetName as string];
    if (!sheet) {
        sheet = await doc.addSheet({ title: process.env.SHEET_NAME, headerValues: ['id', 'transcript', 'violated_reason', 'start', 'end', 'video_link'] });
    }

    const rows = data.map(item => ({
        id: item.id,
        transcript: item.transcript,
        violated_reason: item.violated_reason,
        start: item.start,
        end: item.end,
        video_link: item.video_link,
        timeStamp_link: item.timestamp_link
    }));

    await sheet.addRows(rows);
    console.log("Saved data to Google Sheets successfully.");
}

async function clearGoogleSheet() {
    console.log("Clearing Google Sheets...");

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
    await sheet.loadHeaderRow(); // Ensure header values are loaded  

    const rowCount = sheet.rowCount;
    if (rowCount > 1) {
        const clearRange = {
            startRowIndex: 1,  // Starting from the second row (index 1)  
            startColumnIndex: 0,  // Starting from the first column (index 0)  
            endRowIndex: rowCount,  // To the last row  
            endColumnIndex: sheet.headerValues.length,  // To the last column count  
        };

        // Use the update method to set the content in the range to empty strings  
        await sheet.loadCells(clearRange);
        for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) {
            for (let colIndex = 0; colIndex < sheet.headerValues.length; colIndex++) {
                const cell = sheet.getCell(rowIndex, colIndex);
                cell.value = '';  // Clear the existing data  
            }
        }
        await sheet.saveUpdatedCells();  // Save the changes  
    }
}

export async function updateGoogleSheet(): Promise<void> {
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[process.env.SHEET_NAME_PATREON_UPDATED as string];
    // let updatedSheet = doc.sheetsByTitle[process.env.SHEET_NAME_PATREON_UPDATED as string];
    if (!sheet ) {
        throw new Error('Sheets not found');
    }

    await sheet.loadHeaderRow();
    // await updatedSheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const data: VideoData[] = rows.map(row => ({
        id: row.get('id'),
        transcript: row.get('transcript'),
        violated_reason: row.get('violated_reason'),
        start: row.get('start'),
        end: row.get('end'),
        video_link: row.get('video_link'),
        timestamp_link: row.get('timestamp_link')
    }));

    await sheet.clearRows();

    for (const row of data) {
        try {
            const analysisPrompt = `
            Video Transcript: ${row.transcript}
            Current Analysis: ${row.violated_reason}

            Please analyze if this legal analysis is correct or incorrect based on Czech law.
            Provide a clear "CORRECT" or "INCORRECT" at the start of your response, followed by bullet points explaining why.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a legal assistant specializing in Czech law." },
                    { role: "user", content: analysisPrompt },
                ],
            });

            if (response.choices && response.choices.length > 0) {
                const analysis = response.choices[0]?.message?.content?.trim() || "";
                console.log("Analysis for ID:", row.id, ":", analysis);

                if (analysis.startsWith("CORRECT")) {
                    await sheet.addRow({
                        id: row.id,
                        transcript: row.transcript,
                        violated_reason: row.violated_reason,
                        start: row.start,
                        end: row.end,
                        video_link: row.video_link,
                        timestamp_link: row.timestamp_link
                    });
                }
            }
        } catch (error) {
            console.error("Error analyzing violation for ID:", row.id, "Error:", error);
        }
    }

    console.log("Google Sheets updated successfully.");
}
