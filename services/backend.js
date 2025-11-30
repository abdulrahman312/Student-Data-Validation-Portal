
/**
 * PRODUCTION READY GOOGLE APPS SCRIPT CODE
 * Copy and paste this into Code.gs in your Google Apps Script project.
 */

// Configuration
const SHEET_NAME = 'Student DB';
const DRIVE_FOLDER_ID = '1v2JFmOwKQjUCkXAMuDyXwC1_dBwQBy0_'; // Folder: "Student Passport"

/**
 * Handle GET requests
 */
function doGet(e) {
  return HtmlService.createHtmlOutput("MEIS Backend Service is running. Use POST requests for data.");
}

/**
 * Handle POST requests (JSON API)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); 

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result = null;

    if (action === 'search') {
      result = searchStudent(payload.id);
    } else if (action === 'update') {
      result = updateStudentData(payload);
    } else {
      throw new Error("Invalid action provided");
    }

    return ContentService.createTextOutput(JSON.stringify(result || { error: "Not found" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Search for a student by ID/Iqama
 * MAPPING ASSUMPTION:
 * A(0): Student No
 * B(1): Arabic Name
 * C(2): English Name
 * D(3): Birth Date
 * E(4): Birth Place
 * F(5): Religion
 * G(6): ID/Iqama (Search Key)
 * H(7): Nationality
 * I(8): Passport No
 * ...
 * N(13): Expiry
 * O(14): Status
 * P(15): File Link
 */
function searchStudent(idIqama) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check Index 6 (Column G) for ID
    if (String(row[6]).trim() === String(idIqama).trim()) {
      return {
        found: true,
        rowIndex: i + 1,
        studentNumber: String(row[0]),     // A
        arabicName: String(row[1]),        // B
        englishName: String(row[2]),       // C
        birthDate: row[3] ? formatDate(row[3]) : "", // D
        birthPlace: String(row[4]),        // E
        religion: String(row[5]),          // F
        idIqama: String(row[6]),           // G
        nationality: String(row[7]),       // H
        passportNumber: String(row[8]),    // I
        
        passportExpiry: row[13] ? formatDate(row[13]) : "", // N (Index 13)
        status: String(row[14] || "Pending") // O (Index 14)
      };
    }
  }
  return null;
}

/**
 * Handle updates
 */
function updateStudentData(payload) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  let currentRow = null;

  // Find row by ID (Index 6 / Col G)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][6]).trim() === String(payload.idIqama).trim()) {
      rowIdx = i + 1;
      currentRow = data[i];
      break;
    }
  }

  if (rowIdx === -1) throw new Error("Student not found");
  
  // Status check (Index 14 / Col O)
  const currentStatus = String(currentRow[14] || "Pending");
  if (currentStatus === 'Done' || currentStatus === 'Edit') {
     throw new Error("Record already locked.");
  }

  if (payload.type === 'CORRECT') {
    // Update Status to Done (Col O / 15)
    sheet.getRange(rowIdx, 15).setValue('Done'); 
  } 
  else if (payload.type === 'EDIT') {
    const newData = payload.data;
    let hasChanges = false;
    
    // Update fields and color if changed
    
    // B: Arabic Name (2)
    if (updateCellIfChanged(sheet, rowIdx, 2, currentRow[1], newData.arabicName)) hasChanges = true;
    // C: English Name (3)
    if (updateCellIfChanged(sheet, rowIdx, 3, currentRow[2], newData.englishName)) hasChanges = true;
    // D: Birth Date (4)
    if (updateCellIfChanged(sheet, rowIdx, 4, currentRow[3], newData.birthDate)) hasChanges = true;
    // E: Birth Place (5)
    if (updateCellIfChanged(sheet, rowIdx, 5, currentRow[4], newData.birthPlace)) hasChanges = true;
    // F: Religion (6)
    if (updateCellIfChanged(sheet, rowIdx, 6, currentRow[5], newData.religion)) hasChanges = true;
    // H: Nationality (8) - Note: G is ID (7), H is 8
    if (updateCellIfChanged(sheet, rowIdx, 8, currentRow[7], newData.nationality)) hasChanges = true;
    // I: Passport No (9)
    if (updateCellIfChanged(sheet, rowIdx, 9, currentRow[8], newData.passportNumber)) hasChanges = true;
    // N: Expiry (14) - Column 14 is N
    if (updateCellIfChanged(sheet, rowIdx, 14, currentRow[13], newData.passportExpiry)) hasChanges = true;

    // FILE UPLOAD
    if (newData.fileData && newData.fileData.base64) {
      try {
        const studentNumber = String(currentRow[0]); // Col A
        const fileLink = uploadFileToDrive(newData.fileData, studentNumber);
        if (fileLink) {
          // Save link to Column P (Index 16)
          sheet.getRange(rowIdx, 16).setValue(fileLink);
          hasChanges = true;
        }
      } catch (e) {
        // console.error("File upload failed", e);
      }
    }
    
    // If no data changed but submitted edit, mark as Done (as requested previously)
    // If data changed, mark as Edit
    const finalStatus = hasChanges ? 'Edit' : 'Done';
    sheet.getRange(rowIdx, 15).setValue(finalStatus);
  }

  return { success: true };
}

function updateCellIfChanged(sheet, rowIndex, colIndex, oldValue, newValue) {
  let normOld = "";
  if (Object.prototype.toString.call(oldValue) === '[object Date]') {
     normOld = formatDate(oldValue);
  } else {
     normOld = String(oldValue || "").trim();
  }
  
  const normNew = String(newValue || "").trim();
  
  if (normOld !== normNew) {
    const cell = sheet.getRange(rowIndex, colIndex);
    cell.setValue(newValue);
    cell.setBackground('#FFFF00'); // Yellow
    return true;
  }
  return false;
}

function uploadFileToDrive(fileData, studentNumber) {
  if (!DRIVE_FOLDER_ID) return null;

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const data = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(data, fileData.mimeType, fileData.filename);
  
  const file = folder.createFile(blob);
  
  // Rename: StudentNumber.pdf (Assuming PDF merge always results in PDF)
  // If we merge images on client, we send PDF. If we send single image, we keep extension.
  const ext = fileData.filename.split('.').pop();
  const newName = `${studentNumber}.${ext}`;
  file.setName(newName);
  
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  if (typeof dateObj === 'string') return dateObj;
  try {
    const d = new Date(dateObj);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    // Return DD-MM-YYYY
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateObj);
  }
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}
