
import { Student, EditableStudentData } from '../types';

// ==============================================================================
// CONFIGURATION
// ==============================================================================
// 1. Deploy your Google Apps Script as a Web App (Execute as: Me, Access: Anyone).
// 2. Paste the URL inside the quotes below.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAr8nxAnthNISiYz48X1n1c8b4UjFJYq3h0Pb2fzwaQLzrg3P25xH8OpUhOgQwEJj1/exec" as string; 
// ==============================================================================

// Extend window definition for Google Apps Script (Internal mode)
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (response: any) => void) => {
            withFailureHandler: (callback: (error: any) => void) => {
              searchStudent: (id: string) => void;
              updateStudentData: (payload: any) => void;
            };
          };
        };
      };
    };
  }
}

// MOCK DATA FOR DEVELOPMENT (Used if no URL is provided)
const MOCK_DB: Student[] = [
  {
    studentNumber: "1001",
    arabicName: "أحمد محمد علي",
    englishName: "Ahmed Mohammed Ali",
    birthPlace: "Riyadh",
    idIqama: "1234567890",
    passportNumber: "P123456",
    fatherMobile: "0500000000",
    motherMobile: "0511111111",
    school: "MEIS",
    grade: "5",
    // section removed
    passportExpiry: "20-07-2029", // DD-MM-YYYY
    status: "Pending"
  },
  {
    studentNumber: "1002",
    arabicName: "", // Missing data test
    englishName: "Sarah Smith",
    birthPlace: "London",
    idIqama: "2234567890",
    passportNumber: "", // Missing data test
    fatherMobile: "0522222222",
    motherMobile: "0533333333",
    school: "MEIS",
    grade: "3",
    // section removed
    passportExpiry: "", // Missing
    status: "Pending"
  },
  {
    studentNumber: "1003",
    arabicName: "خالد يوسف",
    englishName: "Khaled Yousef",
    birthPlace: "Cairo",
    idIqama: "333",
    passportNumber: "P99999",
    fatherMobile: "055",
    motherMobile: "056",
    school: "MEIS",
    grade: "1",
    // section removed
    passportExpiry: "01-01-2030", // DD-MM-YYYY
    status: "Done"
  }
];

export const searchStudent = async (id: string): Promise<Student | null> => {
  // 1. Production GAS environment (Embedded inside Sheets)
  if (window.google && window.google.script) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler((res) => resolve(res))
        .withFailureHandler((err) => reject(err))
        .searchStudent(id);
    });
  }

  // 2. External Web App (Connecting via URL)
  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
    try {
      // Use text/plain to avoid CORS preflight issues with GAS
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'search', id: id })
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      if (!data.found) return null; // Not found in sheet
      
      return data; // Student object
    } catch (e) {
      console.error("API Error", e);
      throw e;
    }
  }

  // 3. Local Dev / Mock Fallback
  console.log("Using Mock Data (No API URL configured)");
  return new Promise((resolve) => {
    setTimeout(() => {
      const found = MOCK_DB.find(s => s.idIqama === id);
      resolve(found || null);
    }, 800);
  });
};

export const updateStudent = async (
  idIqama: string, 
  type: 'CORRECT' | 'EDIT', 
  data?: EditableStudentData
): Promise<boolean> => {
  const payload = { action: 'update', idIqama, type, data };

  // 1. Production GAS environment
  if (window.google && window.google.script) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler(() => resolve(true))
        .withFailureHandler((err) => reject(err))
        .updateStudentData(payload); // payload structure slightly different for internal func
    });
  }

  // 2. External Web App
  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
     try {
       const response = await fetch(GOOGLE_SCRIPT_URL, {
         method: 'POST',
         body: JSON.stringify(payload)
       });
       const resData = await response.json();
       if (resData.error) throw new Error(resData.error);
       return true;
     } catch (e) {
       console.error("API Error", e);
       throw e;
     }
  }

  // 3. Local Dev
  console.log("Mock Update:", payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
};
