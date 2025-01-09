import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from 'dotenv';

dotenv.config();

interface VideoData {
    id: string;
    transcript: string;
    violated_reason: string;
    start: number;
    end: number;
    video_link: string;
}

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
        video_link: item.video_link
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

// clearGoogleSheet()
//     .then(() => {
//         console.log("Data saving process completed.");
//     })
//     .catch(console.error);;