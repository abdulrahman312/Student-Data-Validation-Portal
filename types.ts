
export type Language = 'en' | 'ar';

export type StudentStatus = 'Pending' | 'Done' | 'Edit';

export type Religion = 'Muslim' | 'Christian' | 'Others' | string;

export interface Student {
  studentNumber: string;    // Col A (0)
  arabicName: string;       // Col B (1)
  englishName: string;      // Col C (2)
  birthDate: string;        // Col D (3) - DD-MM-YYYY
  birthPlace: string;       // Col E (4)
  religion: Religion;       // Col F (5)
  idIqama: string;          // Col G (6)
  nationality: string;      // Col H (7)
  passportNumber: string;   // Col I (8)
  
  // Col N (13)
  passportExpiry: string;   // DD-MM-YYYY
  
  // Col O (14)
  status: StudentStatus;
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
  birthDate: string; // YYYY-MM-DD for input
  birthPlace: string;
  religion: Religion;
  nationality: string;
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD for input
  fileData?: FileData | null; // Merged file upload
}

export type AppStep = 
  | 'LANDING' 
  | 'PASSPORT_CHECK' 
  | 'REVIEW' 
  | 'EDIT_FORM' 
  | 'ACKNOWLEDGE_CORRECT' 
  | 'ACKNOWLEDGE_EDIT' 
  | 'SUCCESS';
