import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library'; // Make sure to import the JWT class  
import dotenv from 'dotenv';

dotenv.config();

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

clearGoogleSheet()
    .then(() => {
        console.log("Data saving process completed.");
    })
    .catch(console.error);;