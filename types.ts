
export type Language = 'en' | 'ar';

export type StudentStatus = 'Pending' | 'Done' | 'Edit';

export interface Student {
  studentNumber: string;    // Col A
  arabicName: string;       // Col B
  englishName: string;      // Col C
  birthPlace: string;       // Col D
  idIqama: string;          // Col E
  passportNumber: string;   // Col F
  fatherMobile: string;     // Col G
  motherMobile: string;     // Col H
  school: string;           // Col I
  grade: string;            // Col J
  // Section removed based on new structure or ignored if not relevant
  passportExpiry: string;   // Col K (DD-MM-YYYY)
  status: StudentStatus;    // Col L
}

// File upload data structure
export interface FileData {
  base64: string;
  mimeType: string;
  filename: string;
}

// Editable fields for the UI
export interface EditableStudentData {
  arabicName: string;
  englishName: string;
  birthPlace: string;
  passportNumber: string;
  passportExpiry: string; // Format YYYY-MM-DD for input type="date"
  fileData?: FileData | null; // Optional file upload
}

export type AppStep = 
  | 'LANDING' 
  | 'PASSPORT_CHECK' 
  | 'REVIEW' 
  | 'EDIT_FORM' 
  | 'ACKNOWLEDGE_CORRECT' 
  | 'ACKNOWLEDGE_EDIT' 
  | 'SUCCESS';
