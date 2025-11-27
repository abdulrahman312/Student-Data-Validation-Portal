
/**
 * PRODUCTION READY GOOGLE APPS SCRIPT CODE
 * Copy and paste this into Code.gs in your Google Apps Script project.
 */

// Configuration
const SHEET_NAME = 'Student DB';

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
  lock.tryLock(10000); // Wait up to 10 seconds

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
 * New Structure:
 * 0: Student Number
 * 1: Arabic Name
 * 2: English Name
 * 3: Birth Place (NEW)
 * 4: ID/Iqama
 * 5: PassportNumber
 * 6: Father Mobile
 * 7: Mother Mobile
 * 8: School
 * 9: Grade
 * 10: Passport Expired Date (K)
 * 11: Status (L)
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
 * @param {Object} payload { idIqama, type: 'CORRECT' | 'EDIT', data: { ...fields } }
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
    // We check each update. If updateCellIfChanged returns true, we flag hasChanges.
    
    // B: Arabic Name (Col 2)
    if (updateCellIfChanged(sheet, rowIdx, 2, currentRow[1], newData.arabicName)) hasChanges = true;
    
    // C: English Name (Col 3)
    if (updateCellIfChanged(sheet, rowIdx, 3, currentRow[2], newData.englishName)) hasChanges = true;

    // D: Birth Place (Col 4) - NEW
    if (updateCellIfChanged(sheet, rowIdx, 4, currentRow[3], newData.birthPlace)) hasChanges = true;
    
    // F: Passport (Col 6) - Was E
    if (updateCellIfChanged(sheet, rowIdx, 6, currentRow[5], newData.passportNumber)) hasChanges = true;
    
    // K: Expiry (Col 11) - Index 10
    if (updateCellIfChanged(sheet, rowIdx, 11, currentRow[10], newData.passportExpiry)) hasChanges = true;
    
    // Decide status: 'Edit' if data changed, otherwise 'Done' (treated as confirmation)
    const finalStatus = hasChanges ? 'Edit' : 'Done';
    sheet.getRange(rowIdx, 12).setValue(finalStatus);
  }

  return { success: true };
}

function updateCellIfChanged(sheet, rowIndex, colIndex, oldValue, newValue) {
  let normOld = "";
  
  // Handle Date objects specifically for comparison
  // If oldValue is a Date object (from Sheet), format it to DD-MM-YYYY string
  if (Object.prototype.toString.call(oldValue) === '[object Date]') {
     normOld = formatDate(oldValue);
  } else {
     normOld = String(oldValue || "").trim();
  }
  
  const normNew = String(newValue || "").trim();
  
  // Compare strings
  if (normOld !== normNew) {
    const cell = sheet.getRange(rowIndex, colIndex);
    cell.setValue(newValue);
    cell.setBackground('#FFFF00'); // Yellow
    return true; // Change detected
  }
  return false; // No change
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  if (typeof dateObj === 'string') return dateObj;
  // Convert JS Date to DD-MM-YYYY
  try {
    const d = new Date(dateObj);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    // Return Day-Month-Year
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateObj);
  }
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}
