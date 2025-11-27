
export type Language = 'en' | 'ar';

export type StudentStatus = 'Pending' | 'Done' | 'Edit';

export interface Student {
  studentNumber: string;    // Col A
  arabicName: string;       // Col B
  englishName: string;      // Col C
  birthPlace: string;       // Col D (NEW)
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

// Editable fields for the UI
export interface EditableStudentData {
  arabicName: string;
  englishName: string;
  birthPlace: string; // NEW
  passportNumber: string;
  passportExpiry: string; // Format YYYY-MM-DD for input type="date"
}

export type AppStep = 
  | 'LANDING' 
  | 'PASSPORT_CHECK' 
  | 'REVIEW' 
  | 'EDIT_FORM' 
  | 'ACKNOWLEDGE_CORRECT' 
  | 'ACKNOWLEDGE_EDIT' 
  | 'SUCCESS';
