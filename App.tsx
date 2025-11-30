
import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  ShieldCheck, Search, AlertTriangle, Check, Save, Loader2, Calendar, X, 
  Edit3, ChevronLeft, UploadCloud, FileText, UserPlus, Globe, BookOpen
} from 'lucide-react';
import { Language, Student, EditableStudentData, FileData, Religion } from './types';
import { TEXT } from './constants';
import { searchStudent, updateStudent } from './services/api';
import LanguageToggle from './components/LanguageToggle';
import { StudentCard } from './components/StudentCard';

type AppStage = 'LOGIN' | 'PASSPORT_WARNING' | 'DASHBOARD' | 'EDIT' | 'UNDERTAKING' | 'SUCCESS';

function App() {
  const [lang, setLang] = useState<Language>('en');
  const [stage, setStage] = useState<AppStage>('LOGIN');
  const [searchId, setSearchId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUndertakingChecked, setIsUndertakingChecked] = useState(false);

  const [editForm, setEditForm] = useState<EditableStudentData>({
    arabicName: '',
    englishName: '',
    birthDate: '',
    birthPlace: '',
    religion: 'Muslim',
    nationality: '',
    passportNumber: '',
    passportExpiry: ''
  });
  
  // File State: Two separate files
  const [file1, setFile1] = useState<FileData | null>(null);
  const [file2, setFile2] = useState<FileData | null>(null);
  
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'CORRECT' | 'EDIT'>('CORRECT');

  useEffect(() => {
    const savedLang = localStorage.getItem('meis_portal_lang') as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('meis_portal_lang', l);
  };

  const isRTL = lang === 'ar';

  // --- HELPERS ---
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
  };

  const formatDateForStorage = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const isDataComplete = () => {
    if (!student) return false;
    // Check if expired
    if (isPassportExpired()) return false; 
    
    return !!student.arabicName && !!student.englishName && 
           !!student.birthDate && !!student.birthPlace && 
           !!student.religion && !!student.nationality &&
           !!student.passportNumber && !!student.passportExpiry;
  };

  const isMissingData = () => {
    if (!student) return false;
    return !student.arabicName || !student.englishName || 
           !student.birthDate || !student.birthPlace || 
           !student.religion || !student.nationality ||
           !student.passportNumber || !student.passportExpiry;
  };
  
  const isPassportExpired = () => {
    if (!student || !student.passportExpiry) return false;
    // Format DD-MM-YYYY
    const parts = student.passportExpiry.split('-');
    if (parts.length !== 3) return false;
    const expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const today = new Date();
    // Reset time to compare dates only
    today.setHours(0,0,0,0);
    return expiryDate < today;
  }

  const canEdit = student?.status === 'Pending';

  // --- HANDLERS ---
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await searchStudent(searchId.trim());
      if (result) {
        setStudent(result);
        if (result.status === 'Done' || result.status === 'Edit') {
          setStage('DASHBOARD');
        } else {
          setStage('PASSPORT_WARNING');
        }
      } else {
        setErrorMsg(TEXT.error_not_found[lang]);
      }
    } catch (err) {
      if (err instanceof Error) {
         setErrorMsg(err.message === "Not found" ? TEXT.error_not_found[lang] : "Connection Error. Please check your internet.");
      } else {
         setErrorMsg(TEXT.error_not_found[lang]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!student) return;
    setEditForm({
      arabicName: student.arabicName,
      englishName: student.englishName,
      birthDate: formatDateForInput(student.birthDate),
      birthPlace: student.birthPlace || '',
      religion: student.religion as Religion,
      nationality: student.nationality || '',
      passportNumber: student.passportNumber,
      passportExpiry: formatDateForInput(student.passportExpiry)
    });
    setFile1(null);
    setFile2(null);
    setFormErrors({});
    setFileError(null);
    setStage('EDIT');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileNum: 1 | 2) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFileError(TEXT.err_file_size[lang]);
        e.target.value = '';
        if (fileNum === 1) setFile1(null);
        else setFile2(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          const base64String = event.target.result.split(',')[1];
          const data: FileData = {
            base64: base64String,
            mimeType: file.type,
            filename: file.name
          };
          if (fileNum === 1) setFile1(data);
          else setFile2(data);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Merge files into one PDF
  const mergeFiles = async (): Promise<FileData | null> => {
    if (!file1) return null;
    
    // If only file 1 is present and it is a PDF, send it directly? 
    // Or if it is image, convert.
    // Requirement: "If user uploads two files then both... combine... stored as one file... with name Student Number"
    
    // Logic: Create a new PDF document. Embed File 1. Embed File 2 (if exists).
    
    try {
      const pdfDoc = await PDFDocument.create();
      
      const processFile = async (f: FileData) => {
        if (f.mimeType === 'application/pdf') {
          const existingPdfBytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0));
          const loadedPdf = await PDFDocument.load(existingPdfBytes);
          const copiedPages = await pdfDoc.copyPages(loadedPdf, loadedPdf.getPageIndices());
          copiedPages.forEach(page => pdfDoc.addPage(page));
        } else if (f.mimeType.startsWith('image/')) {
          const imageBytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0));
          let image;
          if (f.mimeType === 'image/jpeg' || f.mimeType === 'image/jpg') {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            image = await pdfDoc.embedPng(imageBytes);
          }
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      };

      await processFile(file1);
      if (file2) await processFile(file2);

      const pdfBytes = await pdfDoc.save();
      
      // Convert Uint8Array to Base64
      let binary = '';
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const mergedBase64 = btoa(binary);

      return {
        base64: mergedBase64,
        mimeType: 'application/pdf',
        filename: 'Passport_Copy.pdf' // Backend will rename to Student Number
      };

    } catch (e) {
      console.error("Merge error", e);
      setFileError("Error processing files. Please try again.");
      return null;
    }
  };

  const submitEditForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, boolean> = {};
    if (!editForm.arabicName) errors.arabicName = true;
    if (!editForm.englishName) errors.englishName = true;
    if (!editForm.birthDate) errors.birthDate = true;
    if (!editForm.birthPlace) errors.birthPlace = true;
    if (!editForm.nationality) errors.nationality = true;
    if (!editForm.passportNumber) errors.passportNumber = true;
    if (!editForm.passportExpiry) errors.passportExpiry = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!file1) {
      setFileError(TEXT.err_file_required[lang]);
      return;
    }

    setSubmissionType('EDIT');
    setIsUndertakingChecked(false);
    setStage('UNDERTAKING');
  };

  const finalSubmit = async () => {
    if (!student) return;
    setLoading(true);
    try {
      if (submissionType === 'CORRECT') {
        await updateStudent(student.idIqama, 'CORRECT');
      } else {
        // Prepare merged file
        const mergedFile = await mergeFiles();
        if (!mergedFile && file1) { 
            // Fallback if merge fails or simple single file? 
            // mergeFiles handles single file too.
            throw new Error("File processing failed");
        }

        const payload: EditableStudentData = {
          ...editForm,
          birthDate: formatDateForStorage(editForm.birthDate),
          passportExpiry: formatDateForStorage(editForm.passportExpiry),
          fileData: mergedFile
        };
        await updateStudent(student.idIqama, 'EDIT', payload);
      }
      setStage('SUCCESS');
    } catch (e) {
      alert("Error submitting data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // UI Renders
  const renderBackground = () => (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-gray-50">
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#667eea] to-[#764ba2]"></div>
       <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white opacity-10 blur-[100px] animate-pulse"></div>
       <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400 opacity-10 blur-[100px] animate-pulse"></div>
    </div>
  );

  const renderHeader = () => (
    <header className="sticky top-0 z-50 w-full px-4 py-4 bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-sm relative flex items-center justify-center min-h-[90px] transition-all duration-300">
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
         {stage !== 'LOGIN' && (
           <button 
            onClick={() => { setStudent(null); setStage('LOGIN'); }} 
            className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors shadow-sm backdrop-blur-md"
           >
             <ChevronLeft size={24} className={isRTL ? "rotate-180" : ""} />
           </button>
         )}
      </div>
      <LanguageToggle currentLang={lang} onToggle={handleSetLang} />
    </header>
  );

  return (
    <div className={`min-h-screen relative text-gray-800 font-sans ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {renderBackground()}
      {renderHeader()}

      <main className="container mx-auto px-4 py-8 max-w-lg min-h-[85vh] flex flex-col justify-center">
        
        {stage === 'LOGIN' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 text-center animate-fade-in-up">
             <div className="mb-8 flex flex-col items-center justify-center">
               <div className="h-28 w-28 bg-white rounded-full flex items-center justify-center shadow-lg p-3 mb-4">
                 <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="MEIS Logo" className="h-full w-full object-contain" />
               </div>
               <h2 className="text-xl font-bold text-gray-800 font-serif leading-tight px-4">{TEXT.school_name[lang]}</h2>
             </div>
             <h1 className="text-lg font-bold mb-2 text-indigo-700 uppercase tracking-wide">{TEXT.header_title[lang]}</h1>
             <p className="text-gray-600 mb-8 text-sm">{TEXT.header_helper[lang]}</p>
             <form onSubmit={handleSearch} className="space-y-4">
               <input
                 type="number"
                 value={searchId}
                 onChange={(e) => setSearchId(e.target.value)}
                 placeholder={TEXT.label_id[lang]}
                 className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-center text-lg bg-white/80 shadow-inner"
                 dir="ltr"
               />
               {errorMsg && (
                 <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-center gap-2 animate-fade-in">
                   <AlertTriangle size={16} /> {errorMsg}
                 </div>
               )}
               <button
                 type="submit"
                 disabled={loading || !searchId}
                 className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transform hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                 {loading ? TEXT.loading[lang] : TEXT.btn_search[lang]}
               </button>
             </form>
          </div>
        )}

        {stage === 'PASSPORT_WARNING' && student && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up border-l-8 ${isRTL ? 'border-r-8 border-l-0' : ''} border-red-500`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="text-red-600 w-6 h-6" /></div>
                     <h2 className="text-xl font-bold text-red-600">{TEXT.modal_warning_title[lang]}</h2>
                   </div>
                   <button onClick={() => setStage('LOGIN')} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <h3 className="text-lg font-semibold mb-1 text-center font-sans">{student.englishName}</h3>
                <h3 className="text-lg font-semibold mb-4 text-center">{student.arabicName}</h3>
                <p className="text-gray-600 leading-relaxed mb-6 text-sm bg-red-50 p-4 rounded-xl border border-red-100">{TEXT.modal_warning_body[lang]}</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setStage('DASHBOARD')} className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:translate-y-[-2px] transition-all">{TEXT.btn_proceed[lang]}</button>
                  <button onClick={() => setStage('LOGIN')} className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">{TEXT.btn_back[lang]}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {stage === 'DASHBOARD' && student && (
          <div className="space-y-6 animate-fade-in-up">
            {(student.status === 'Done' || student.status === 'Edit') && (
              <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm">
                 <ShieldCheck className="shrink-0 mt-1" size={20} />
                 <p className="text-sm font-medium">{TEXT.status_locked[lang]}</p>
              </div>
            )}
            <StudentCard student={student} lang={lang} />
            
            {/* Expiry Warning */}
            {isPassportExpired() && student.status === 'Pending' && (
                <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm animate-pulse">
                   <AlertTriangle className="shrink-0 mt-1" size={20} />
                   <p className="text-sm font-bold">{TEXT.err_expired_msg[lang]}</p>
                </div>
            )}

            <div className="flex flex-col gap-4 mt-8 pb-8">
               {(isMissingData() || isPassportExpired()) && student.status === 'Pending' && (
                 <div className="text-red-500 text-xs text-center font-bold bg-white/80 p-2 rounded-lg backdrop-blur shadow-sm">{TEXT.edit_banner[lang]}</div>
               )}
               <button
                 onClick={() => { setSubmissionType('CORRECT'); setIsUndertakingChecked(false); setStage('UNDERTAKING'); }}
                 disabled={!canEdit || !isDataComplete()}
                 className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
               >
                 <Check size={20} />
                 {TEXT.btn_correct[lang]}
               </button>
               {canEdit && (
                 <button onClick={startEdit} className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transform hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
                   <Edit3 size={20} />
                   {TEXT.btn_edit[lang]}
                 </button>
               )}
               <button onClick={() => setStage('LOGIN')} className="text-white/80 text-sm font-medium hover:underline mt-2 shadow-black drop-shadow-md text-center">{TEXT.back_home[lang]}</button>
            </div>
          </div>
        )}

        {stage === 'EDIT' && student && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]">
             <div className="bg-amber-100 p-4 border-b border-amber-200 sticky top-0 z-20">
               <div className="flex items-start gap-3">
                 <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={18} />
                 <p className="text-sm text-amber-800 font-medium leading-tight">{TEXT.edit_banner[lang]}</p>
               </div>
             </div>

             <div className="p-6 overflow-y-auto custom-scrollbar">
               <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Edit3 className="text-rose-500" /> {TEXT.btn_edit[lang]}</h2>
               <form id="editForm" onSubmit={submitEditForm} className="space-y-4">
                 {/* Fields - Enforcing bg-white and text-gray-900 to ensure normal look */}
                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_arabic_name[lang]}</label>
                 <input type="text" value={editForm.arabicName} onChange={(e) => setEditForm({...editForm, arabicName: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.arabicName ? 'border-red-500 bg-red-50' : 'border-gray-300'} text-right font-arabic`} dir="rtl" /></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_english_name[lang]}</label>
                 <input type="text" value={editForm.englishName} onChange={(e) => setEditForm({...editForm, englishName: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.englishName ? 'border-red-500 bg-red-50' : 'border-gray-300'} text-left`} dir="ltr" /></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_birth_date[lang]}</label>
                 <input type="date" lang="en-GB" value={editForm.birthDate} onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.birthDate ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_birth_place[lang]}</label>
                 <input type="text" value={editForm.birthPlace} onChange={(e) => setEditForm({...editForm, birthPlace: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.birthPlace ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_religion[lang]}</label>
                 <select value={editForm.religion} onChange={(e) => setEditForm({...editForm, religion: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.religion ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                    <option value="Muslim">{TEXT.religion_opts.muslim[lang]}</option>
                    <option value="Christian">{TEXT.religion_opts.christian[lang]}</option>
                    <option value="Others">{TEXT.religion_opts.others[lang]}</option>
                 </select></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_nationality[lang]}</label>
                 <input type="text" value={editForm.nationality} onChange={(e) => setEditForm({...editForm, nationality: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.nationality ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></div>

                 <div className="opacity-60"><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_id[lang]}</label>
                 <div className="w-full p-3 rounded-xl bg-gray-100 border border-gray-200 font-mono text-gray-600">{student.idIqama}</div></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_passport[lang]}</label>
                 <input type="text" value={editForm.passportNumber} onChange={(e) => setEditForm({...editForm, passportNumber: e.target.value.toUpperCase()})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.passportNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'} uppercase`} dir="ltr" /></div>

                 <div><label className="text-xs font-bold text-gray-500 uppercase">{TEXT.field_expiry[lang]}</label>
                 <input type="date" lang="en-GB" value={editForm.passportExpiry} min={new Date().toISOString().split('T')[0]} onChange={(e) => setEditForm({...editForm, passportExpiry: e.target.value})} className={`w-full p-3 rounded-xl border bg-white text-gray-900 ${formErrors.passportExpiry ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} /></div>

                 {/* File Uploads */}
                 <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase"><UploadCloud size={16} /> {TEXT.upload_label[lang]}</label>
                      <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors ${fileError && !file1 ? 'border-red-300 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}>
                         <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 1)} className="hidden" id="file-1" />
                         <label htmlFor="file-1" className="cursor-pointer block text-sm text-indigo-600 font-medium">
                            {file1 ? file1.filename : "Select File 1 (Required)"}
                         </label>
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase"><UploadCloud size={16} /> {TEXT.upload_label_2[lang]}</label>
                      <div className="border-2 border-dashed rounded-xl p-3 text-center border-indigo-200 bg-indigo-50/50">
                         <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 2)} className="hidden" id="file-2" />
                         <label htmlFor="file-2" className="cursor-pointer block text-sm text-indigo-600 font-medium">
                            {file2 ? file2.filename : "Select File 2 (Optional)"}
                         </label>
                      </div>
                    </div>
                    {fileError && <p className="text-red-500 text-xs text-center font-bold">{fileError}</p>}
                 </div>
               </form>
             </div>
             <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
               <button type="button" onClick={() => setStage('DASHBOARD')} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl shadow-sm">{TEXT.btn_back[lang]}</button>
               <button form="editForm" type="submit" className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg">{TEXT.btn_continue[lang]}</button>
             </div>
          </div>
        )}

        {stage === 'UNDERTAKING' && student && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><ShieldCheck className="text-green-600" /> Confirmation</h2>
            <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Review Information:</p>
                <StudentCard 
                    lang={lang}
                    student={submissionType === 'EDIT' ? {
                        ...student, 
                        arabicName: editForm.arabicName,
                        englishName: editForm.englishName,
                        birthDate: formatDateForStorage(editForm.birthDate),
                        birthPlace: editForm.birthPlace,
                        religion: editForm.religion,
                        nationality: editForm.nationality,
                        passportNumber: editForm.passportNumber,
                        passportExpiry: formatDateForStorage(editForm.passportExpiry) 
                    } : student}
                />
            </div>
            <div className={`p-4 rounded-xl border-2 transition-colors duration-500 ${isUndertakingChecked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <label className="flex items-start gap-4 cursor-pointer select-none">
                <div className="relative flex items-center pt-1">
                  <input type="checkbox" className="peer sr-only" checked={isUndertakingChecked} onChange={(e) => setIsUndertakingChecked(e.target.checked)} />
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${isUndertakingChecked ? 'bg-green-500 border-green-500' : 'bg-white border-red-300'}`}>
                    {isUndertakingChecked && <Check size={20} className="text-white" />}
                  </div>
                </div>
                <p className={`text-sm md:text-base leading-relaxed font-medium transition-colors duration-300 ${isUndertakingChecked ? 'text-green-800' : 'text-red-700'}`}>{TEXT.ack_warning_initial[lang]}</p>
              </label>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <button onClick={finalSubmit} disabled={!isUndertakingChecked || loading} className={`w-full py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 transition-all duration-300 ${isUndertakingChecked && !loading ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white transform hover:scale-[1.02] animate-pulse-once' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {loading ? <Loader2 className="animate-spin" /> : TEXT.btn_submit[lang]}
              </button>
              <button onClick={() => setStage(submissionType === 'EDIT' ? 'EDIT' : 'DASHBOARD')} disabled={loading} className="text-gray-500 font-medium py-2 hover:text-gray-800 transition-colors">{TEXT.btn_back[lang]}</button>
            </div>
          </div>
        )}

        {stage === 'SUCCESS' && (
          <div className="text-center animate-fade-in-up">
            <div className="bg-white/90 backdrop-blur-xl rounded-full w-32 h-32 mx-auto flex items-center justify-center shadow-2xl mb-8 animate-bounce-subtle">
              <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center"><Check className="w-12 h-12 text-green-600" strokeWidth={3} /></div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-md">{TEXT.success_msg[lang]}</h2>
            <div className="flex flex-col gap-3 mt-12 px-4">
              <button onClick={() => { setStudent(null); setSearchId(''); setStage('LOGIN'); }} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"><UserPlus size={20} />{TEXT.btn_another_child[lang]}</button>
              <button onClick={() => { setStudent(null); setSearchId(''); setStage('LOGIN'); }} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-colors">{TEXT.back_home[lang]}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
