
import { Student, EditableStudentData } from '../types';

// ==============================================================================
// CONFIGURATION
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAr8nxAnthNISiYz48X1n1c8b4UjFJYq3h0Pb2fzwaQLzrg3P25xH8OpUhOgQwEJj1/exec" as string; 
// ==============================================================================

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

// MOCK DATA
const MOCK_DB: Student[] = [
  {
    studentNumber: "1001",
    arabicName: "أحمد محمد علي",
    englishName: "Ahmed Mohammed Ali",
    birthDate: "15-05-2015",
    birthPlace: "Riyadh",
    religion: "Muslim",
    idIqama: "1234567890",
    nationality: "Saudi",
    passportNumber: "P123456",
    passportExpiry: "20-07-2029",
    status: "Pending"
  },
  {
    studentNumber: "1002",
    arabicName: "",
    englishName: "Sarah Smith",
    birthDate: "10-10-2014",
    birthPlace: "London",
    religion: "Christian",
    idIqama: "2234567890",
    nationality: "British",
    passportNumber: "P99999",
    passportExpiry: "01-01-2020", // Expired test
    status: "Pending"
  }
];

export const searchStudent = async (id: string): Promise<Student | null> => {
  if (window.google && window.google.script) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler((res) => resolve(res))
        .withFailureHandler((err) => reject(err))
        .searchStudent(id);
    });
  }

  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'search', id: id })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.found) return null;
      return data;
    } catch (e) {
      console.error("API Error", e);
      throw e;
    }
  }

  console.log("Using Mock Data");
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

  if (window.google && window.google.script) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler(() => resolve(true))
        .withFailureHandler((err) => reject(err))
        .updateStudentData(payload);
    });
  }

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

  console.log("Mock Update:", payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
};
