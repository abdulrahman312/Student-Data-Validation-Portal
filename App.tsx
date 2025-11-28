
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Check, 
  Save, 
  Loader2,
  Calendar,
  X,
  Edit3,
  ChevronLeft
} from 'lucide-react';
import { Language, Student, EditableStudentData } from './types';
import { TEXT } from './constants';
import { searchStudent, updateStudent } from './services/api';
import LanguageToggle from './components/LanguageToggle';
import { StudentCard } from './components/StudentCard';

// Mapping stages to the Reference UI flow
type AppStage = 'LOGIN' | 'PASSPORT_WARNING' | 'DASHBOARD' | 'EDIT' | 'UNDERTAKING' | 'SUCCESS';

function App() {
  // --- STATE ---
  const [lang, setLang] = useState<Language>('en');
  const [stage, setStage] = useState<AppStage>('LOGIN');
  
  // Data State
  const [searchId, setSearchId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUndertakingChecked, setIsUndertakingChecked] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState<EditableStudentData>({
    arabicName: '',
    englishName: '',
    birthPlace: '',
    passportNumber: '',
    passportExpiry: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  
  // Track if we are submitting an Edit or a Confirmation in the final step
  const [submissionType, setSubmissionType] = useState<'CORRECT' | 'EDIT'>('CORRECT');

  // --- EFFECTS ---
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
  // Date Conversion: DD-MM-YYYY <-> YYYY-MM-DD
  
  // Converts DB format (DD-MM-YYYY) to Input format (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // DB: DD-MM-YYYY -> parts[0]=Day, parts[1]=Month, parts[2]=Year
      // Input: YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Converts Input format (YYYY-MM-DD) to DB format (DD-MM-YYYY)
  const formatDateForStorage = (dateStr: string) => {
    if (!dateStr) return '';
    // Input is YYYY-MM-DD from date picker
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    // Return DD-MM-YYYY (parts[0]=Year, parts[1]=Month, parts[2]=Day)
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const isDataComplete = () => {
    if (!student) return false;
    return !!student.arabicName && !!student.englishName && !!student.birthPlace && !!student.passportNumber && !!student.passportExpiry;
  };

  const isMissingData = () => {
    if (!student) return false;
    return !student.arabicName || !student.englishName || !student.birthPlace || !student.passportNumber || !student.passportExpiry;
  };

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
        
        // LOGIC CHANGE: Check status immediately.
        if (result.status === 'Done' || result.status === 'Edit') {
          // Skip warning, go straight to locked dashboard
          setStage('DASHBOARD');
        } else {
          // New/Pending student, show warning first
          setStage('PASSPORT_WARNING');
        }
      } else {
        setErrorMsg(TEXT.error_not_found[lang]);
      }
    } catch (err) {
      setErrorMsg(TEXT.error_not_found[lang]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!student) return;
    setEditForm({
      arabicName: student.arabicName,
      englishName: student.englishName,
      birthPlace: student.birthPlace || '',
      passportNumber: student.passportNumber,
      passportExpiry: formatDateForInput(student.passportExpiry)
    });
    setFormErrors({});
    setStage('EDIT');
  };

  const submitEditForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: Record<string, boolean> = {};
    if (!editForm.arabicName) errors.arabicName = true;
    if (!editForm.englishName) errors.englishName = true;
    if (!editForm.birthPlace) errors.birthPlace = true;
    if (!editForm.passportNumber) errors.passportNumber = true;
    if (!editForm.passportExpiry) errors.passportExpiry = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Move to Undertaking
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
        const payload: EditableStudentData = {
          ...editForm,
          passportExpiry: formatDateForStorage(editForm.passportExpiry)
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

  // --- RENDER HELPERS ---

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
            aria-label="Back"
           >
             <ChevronLeft size={24} className={isRTL ? "rotate-180" : ""} />
           </button>
         )}
      </div>
      
      {/* Centered Toggle */}
      <LanguageToggle currentLang={lang} onToggle={handleSetLang} />
    </header>
  );

  return (
    <div className={`min-h-screen relative text-gray-800 font-sans ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {renderBackground()}
      {renderHeader()}

      <main className="container mx-auto px-4 py-8 max-w-lg min-h-[85vh] flex flex-col justify-center">
        
        {/* --- STAGE: LOGIN --- */}
        {stage === 'LOGIN' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 text-center animate-fade-in-up">
             
             {/* Branding Section */}
             <div className="mb-8 flex flex-col items-center justify-center">
               <div className="h-28 w-28 bg-white rounded-full flex items-center justify-center shadow-lg p-3 mb-4">
                 <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="MEIS Logo" className="h-full w-full object-contain" />
               </div>
               <h2 className="text-xl font-bold text-gray-800 font-serif leading-tight px-4">
                 {TEXT.school_name[lang]}
               </h2>
             </div>
             
             <h1 className="text-lg font-bold mb-2 text-indigo-700 uppercase tracking-wide">
               {TEXT.header_title[lang]}
             </h1>
             
             <p className="text-gray-600 mb-8 text-sm">{TEXT.header_helper[lang]}</p>
             
             <form onSubmit={handleSearch} className="space-y-4">
               <div className="relative">
                 <input
                   type="number"
                   value={searchId}
                   onChange={(e) => setSearchId(e.target.value)}
                   placeholder={TEXT.label_id[lang]}
                   className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-center text-lg bg-white/80 shadow-inner"
                   dir="ltr"
                 />
               </div>
               
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

        {/* --- STAGE: PASSPORT WARNING --- */}
        {stage === 'PASSPORT_WARNING' && student && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up border-l-8 ${isRTL ? 'border-r-8 border-l-0' : ''} border-red-500`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full">
                      <AlertTriangle className="text-red-600 w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-red-600">{TEXT.modal_warning_title[lang]}</h2>
                  </div>
                  <button onClick={() => setStage('LOGIN')} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold mb-1 text-center font-sans">{student.englishName}</h3>
                <h3 className="text-lg font-semibold mb-4 text-center">{student.arabicName}</h3>
                
                <p className="text-gray-600 leading-relaxed mb-6 text-sm bg-red-50 p-4 rounded-xl border border-red-100">
                  {TEXT.modal_warning_body[lang]}
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStage('DASHBOARD')}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:translate-y-[-2px] transition-all"
                  >
                    {TEXT.btn_proceed[lang]}
                  </button>
                  <button
                    onClick={() => setStage('LOGIN')}
                    className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    {TEXT.btn_back[lang]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STAGE: DASHBOARD --- */}
        {stage === 'DASHBOARD' && student && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Status Banner */}
            {(student.status === 'Done' || student.status === 'Edit') && (
              <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm">
                 <ShieldCheck className="shrink-0 mt-1" size={20} />
                 <p className="text-sm font-medium">{TEXT.status_locked[lang]}</p>
              </div>
            )}

            <StudentCard student={student} lang={lang} />

            {/* Actions - Removed Sticky to fix mobile overlap */}
            <div className="flex flex-col gap-4 mt-8 pb-8">
               {isMissingData() && student.status === 'Pending' && (
                 <div className="text-red-500 text-xs text-center font-bold bg-white/80 p-2 rounded-lg backdrop-blur shadow-sm">
                   {TEXT.edit_banner[lang]}
                 </div>
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
                 <button
                   onClick={startEdit}
                   className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transform hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                 >
                   <Edit3 size={20} />
                   {TEXT.btn_edit[lang]}
                 </button>
               )}
               
               <button onClick={() => setStage('LOGIN')} className="text-white/80 text-sm font-medium hover:underline mt-2 shadow-black drop-shadow-md text-center">
                 {TEXT.back_home[lang]}
               </button>
            </div>
          </div>
        )}

        {/* --- STAGE: EDIT --- */}
        {stage === 'EDIT' && student && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-fade-in-up flex flex-col max-h-[80vh]">
             <div className="bg-amber-100 p-4 border-b border-amber-200 sticky top-0 z-20">
               <div className="flex items-start gap-3">
                 <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={18} />
                 <p className="text-sm text-amber-800 font-medium leading-tight">{TEXT.edit_banner[lang]}</p>
               </div>
             </div>

             <div className="p-6 overflow-y-auto custom-scrollbar">
               <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                 <Edit3 className="text-rose-500" /> {TEXT.btn_edit[lang]}
               </h2>
               
               <form id="editForm" onSubmit={submitEditForm} className="space-y-5">
                 {/* Arabic Name */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_arabic_name[lang]}</label>
                   <input
                     type="text"
                     value={editForm.arabicName}
                     onChange={(e) => setEditForm({ ...editForm, arabicName: e.target.value })}
                     className={`w-full p-3 rounded-xl border ${formErrors.arabicName ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500'} text-gray-800 outline-none transition-all text-right font-arabic shadow-sm`}
                     dir="rtl"
                   />
                 </div>

                 {/* English Name */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_english_name[lang]}</label>
                   <input
                     type="text"
                     value={editForm.englishName}
                     onChange={(e) => setEditForm({ ...editForm, englishName: e.target.value })}
                     className={`w-full p-3 rounded-xl border ${formErrors.englishName ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500'} text-gray-800 outline-none transition-all text-left shadow-sm`}
                     dir="ltr"
                   />
                 </div>

                 {/* Birth Place */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_birth_place[lang]}</label>
                   <input
                     type="text"
                     value={editForm.birthPlace}
                     onChange={(e) => setEditForm({ ...editForm, birthPlace: e.target.value })}
                     className={`w-full p-3 rounded-xl border ${formErrors.birthPlace ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500'} text-gray-800 outline-none transition-all text-left shadow-sm`}
                   />
                 </div>

                 {/* ID (Read only) */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_id[lang]}</label>
                   <div className="w-full p-3 rounded-xl bg-gray-100 border border-gray-200 font-mono text-gray-600">
                     {student.idIqama}
                   </div>
                 </div>

                 {/* Passport */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_passport[lang]}</label>
                   <input
                     type="text"
                     value={editForm.passportNumber}
                     onChange={(e) => setEditForm({ ...editForm, passportNumber: e.target.value.toUpperCase() })}
                     className={`w-full p-3 rounded-xl border ${formErrors.passportNumber ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500'} text-gray-800 outline-none transition-all uppercase shadow-sm`}
                     dir="ltr"
                   />
                 </div>

                 {/* Expiry */}
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{TEXT.field_expiry[lang]}</label>
                   <div className="relative">
                      {/* Using lang="en-GB" to suggest DD/MM/YYYY format to browser */}
                      <input
                        type="date"
                        lang="en-GB"
                        value={editForm.passportExpiry}
                        min={new Date().toISOString().split('T')[0]} 
                        onChange={(e) => setEditForm({ ...editForm, passportExpiry: e.target.value })}
                        className={`w-full p-3 rounded-xl border ${formErrors.passportExpiry ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500'} text-gray-800 outline-none transition-all appearance-none shadow-sm`}
                        style={{ minHeight: '48px' }}
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                   </div>
                   {formErrors.passportExpiry && <p className="text-red-500 text-xs">{TEXT.err_required[lang]}</p>}
                 </div>

               </form>
             </div>

             <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
               <button 
                  type="button" 
                  onClick={() => setStage('DASHBOARD')}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                  {TEXT.btn_back[lang]}
                </button>
               <button 
                  form="editForm"
                  type="submit" 
                  className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  <Save size={18} />
                  {TEXT.btn_continue[lang]}
                </button>
             </div>
          </div>
        )}

        {/* --- STAGE: UNDERTAKING --- */}
        {stage === 'UNDERTAKING' && student && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <ShieldCheck className="text-green-600" />
              Confirmation
            </h2>

            {/* --- DATA SUMMARY FOR CONFIRMATION --- */}
            <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Review Information:</p>
                <StudentCard 
                    lang={lang}
                    student={submissionType === 'EDIT' ? {
                        ...student, 
                        // Merge edit form data into student view for visual confirmation
                        arabicName: editForm.arabicName,
                        englishName: editForm.englishName,
                        birthPlace: editForm.birthPlace, // NEW
                        passportNumber: editForm.passportNumber,
                        passportExpiry: formatDateForStorage(editForm.passportExpiry) 
                    } : student}
                />
            </div>
            
            <div className={`p-4 rounded-xl border-2 transition-colors duration-500 ${isUndertakingChecked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <label className="flex items-start gap-4 cursor-pointer select-none">
                <div className="relative flex items-center pt-1">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={isUndertakingChecked}
                    onChange={(e) => setIsUndertakingChecked(e.target.checked)}
                  />
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${isUndertakingChecked ? 'bg-green-500 border-green-500' : 'bg-white border-red-300'}`}>
                    {isUndertakingChecked && <Check size={20} className="text-white" />}
                  </div>
                </div>
                <p className={`text-sm md:text-base leading-relaxed font-medium transition-colors duration-300 ${isUndertakingChecked ? 'text-green-800' : 'text-red-700'}`}>
                  {TEXT.ack_warning_initial[lang]}
                </p>
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={finalSubmit}
                disabled={!isUndertakingChecked || loading}
                className={`w-full py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 transition-all duration-300 ${
                  isUndertakingChecked && !loading
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white transform hover:scale-[1.02] animate-pulse-once'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" /> : TEXT.btn_submit[lang]}
              </button>
              
              <button 
                 onClick={() => setStage(submissionType === 'EDIT' ? 'EDIT' : 'DASHBOARD')}
                 disabled={loading}
                 className="text-gray-500 font-medium py-2 hover:text-gray-800 transition-colors"
               >
                 {TEXT.btn_back[lang]}
               </button>
            </div>
          </div>
        )}

        {/* --- STAGE: SUCCESS --- */}
        {stage === 'SUCCESS' && (
          <div className="text-center animate-fade-in-up">
            <div className="bg-white/90 backdrop-blur-xl rounded-full w-32 h-32 mx-auto flex items-center justify-center shadow-2xl mb-8 animate-bounce-subtle">
              <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center">
                 <Check className="w-12 h-12 text-green-600" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-md">{TEXT.success_msg[lang]}</h2>
            
            <button 
              onClick={() => {
                 setStudent(null);
                 setSearchId('');
                 setStage('LOGIN');
              }}
              className="mt-12 bg-white text-indigo-600 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-50 transition-colors"
            >
              {TEXT.back_home[lang]}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
