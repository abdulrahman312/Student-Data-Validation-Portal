
/**
 * PRODUCTION READY GOOGLE APPS SCRIPT CODE
 * Copy and paste this into Code.gs in your Google Apps Script project.
 */

// Configuration
const SHEET_NAME = 'Student DB';
const DRIVE_FOLDER_ID = '1v2JFmOwKQjUCkXAMuDyXwC1_dBwQBy0_'; // Folder: "Student Passport"

/**
 * Handle GET requests
 * Used to check if the service is running.
 */
function doGet(e) {
  return HtmlService.createHtmlOutput("MEIS Backend Service is running. Use POST requests for data.");
}

/**
 * Handle POST requests (JSON API)
 * This allows external apps (React/Mobile) to communicate with the Sheet.
 */
function doPost(e) {
  // Lock to prevent race conditions during updates
  const lock = LockService.getScriptLock();
  lock.tryLock(30000); // Wait up to 30 seconds for uploads

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

    // Return JSON response
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
 * Search for a student by ID/Iqama (Column E, Index 4)
 */
function searchStudent(idIqama) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  // Headers are row 0, data starts row 1
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Convert both to string to ensure match
    // Checking Index 4 (Column E) for ID/Iqama
    if (String(row[4]).trim() === String(idIqama).trim()) {
      return {
        found: true,
        rowIndex: i + 1, // 1-based index for Sheet operations
        studentNumber: String(row[0]),
        arabicName: String(row[1]),
        englishName: String(row[2]),
        birthPlace: String(row[3]), // Col D
        idIqama: String(row[4]),    // Col E
        passportNumber: String(row[5]), // Col F
        fatherMobile: String(row[6]),
        motherMobile: String(row[7]),
        school: String(row[8]),
        grade: String(row[9]),
        // Index 10 is Col K (Expiry)
        passportExpiry: row[10] ? formatDate(row[10]) : "",
        // Index 11 is Col L (Status)
        status: String(row[11] || "Pending")
      };
    }
  }
  return null;
}

/**
 * Handle updates
 * @param {Object} payload { idIqama, type: 'CORRECT' | 'EDIT', data: { ...fields, fileData? } }
 */
function updateStudentData(payload) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  let currentRow = null;

  // Find the row again for security (Index 4 is ID)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][4]).trim() === String(payload.idIqama).trim()) {
      rowIdx = i + 1;
      currentRow = data[i];
      break;
    }
  }

  if (rowIdx === -1) throw new Error("Student not found");
  
  // Check current status - Security check (Index 11 is Status Col L)
  const currentStatus = String(currentRow[11] || "Pending");
  if (currentStatus === 'Done' || currentStatus === 'Edit') {
     throw new Error("Record already locked.");
  }

  if (payload.type === 'CORRECT') {
    // Just update Status to Done (Col 12/L)
    sheet.getRange(rowIdx, 12).setValue('Done'); 
  } 
  else if (payload.type === 'EDIT') {
    const newData = payload.data;
    let hasChanges = false;
    
    // Check and update fields, coloring yellow if changed
    
    // B: Arabic Name (Col 2)
    if (updateCellIfChanged(sheet, rowIdx, 2, currentRow[1], newData.arabicName)) hasChanges = true;
    
    // C: English Name (Col 3)
    if (updateCellIfChanged(sheet, rowIdx, 3, currentRow[2], newData.englishName)) hasChanges = true;

    // D: Birth Place (Col 4)
    if (updateCellIfChanged(sheet, rowIdx, 4, currentRow[3], newData.birthPlace)) hasChanges = true;
    
    // F: Passport (Col 6)
    if (updateCellIfChanged(sheet, rowIdx, 6, currentRow[5], newData.passportNumber)) hasChanges = true;
    
    // K: Expiry (Col 11) - Index 10
    if (updateCellIfChanged(sheet, rowIdx, 11, currentRow[10], newData.passportExpiry)) hasChanges = true;

    // HANDLE FILE UPLOAD (Only if provided)
    if (newData.fileData && newData.fileData.base64) {
      try {
        const studentNumber = String(currentRow[0]); // Col A
        const fileLink = uploadFileToDrive(newData.fileData, studentNumber);
        if (fileLink) {
          // Save link to Column M (Index 13)
          sheet.getRange(rowIdx, 13).setValue(fileLink);
          hasChanges = true; // Treating file upload as a change
        }
      } catch (e) {
        // Log error but don't fail the whole transaction if file upload fails
        // console.error("File upload failed", e);
      }
    }
    
    // Decide status: 'Edit' if data changed, otherwise 'Done'
    const finalStatus = hasChanges ? 'Edit' : 'Done';
    sheet.getRange(rowIdx, 12).setValue(finalStatus);
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
    return true; // Change detected
  }
  return false; // No change
}

function uploadFileToDrive(fileData, studentNumber) {
  if (!DRIVE_FOLDER_ID) return null;

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const data = Utilities.base64Decode(fileData.base64);
  const blob = Utilities.newBlob(data, fileData.mimeType, fileData.filename);
  
  // Create file
  const file = folder.createFile(blob);
  
  // Rename: StudentNumber.extension (e.g. 1001.pdf)
  const ext = fileData.filename.split('.').pop();
  const newName = `${studentNumber}.${ext}`;
  file.setName(newName);
  
  // Set Permissions: Anyone with link can view
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Return URL
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
