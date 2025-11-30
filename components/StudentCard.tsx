
import React from 'react';
import { Student, Language } from '../types';
import { TEXT } from '../constants';
import { AlertCircle, User, CreditCard, Calendar, Hash, MapPin, Globe, BookOpen, Clock } from 'lucide-react';

interface Props {
  student: Student;
  lang: Language;
}

export const StudentCard: React.FC<Props> = ({ student, lang }) => {
  const renderRow = (icon: React.ReactNode, label: string, value: string) => {
    const isMissing = !value || value.trim() === '';
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-dashed border-gray-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
        <div className="flex items-center gap-2 mb-1 sm:mb-0 sm:w-1/3">
          <div className="text-indigo-400 opacity-70 scale-90">{icon}</div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
        
        <div className="sm:w-2/3 sm:text-end">
          {isMissing ? (
             <div className="inline-flex items-center text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-md border border-red-100">
               <AlertCircle size={12} className="ltr:mr-1 rtl:ml-1" />
               <span>{TEXT.val_not_available[lang]}</span>
             </div>
          ) : (
             <span className="text-base font-semibold text-slate-700 break-words">
               {value}
             </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/50 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 p-4 border-b border-slate-100">
         <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <User className="text-indigo-500" size={20} />
            {lang === 'en' ? student.englishName : student.arabicName}
         </h3>
         <div className="text-slate-500 text-sm font-mono mt-1 opacity-80 pl-7 rtl:pr-7">
            {student.idIqama}
         </div>
      </div>
      
      <div className="p-4 space-y-1">
        {renderRow(<User />, TEXT.field_arabic_name[lang], student.arabicName)}
        {renderRow(<User />, TEXT.field_english_name[lang], student.englishName)}
        {renderRow(<Clock />, TEXT.field_birth_date[lang], student.birthDate)}
        {renderRow(<MapPin />, TEXT.field_birth_place[lang], student.birthPlace)}
        {renderRow(<BookOpen />, TEXT.field_religion[lang], student.religion)}
        {renderRow(<Globe />, TEXT.field_nationality[lang], student.nationality)}
        {renderRow(<Hash />, TEXT.field_id[lang], student.idIqama)}
        {renderRow(<CreditCard />, TEXT.field_passport[lang], student.passportNumber)}
        {renderRow(<Calendar />, TEXT.field_expiry[lang], student.passportExpiry)}
      </div>
    </div>
  );
};
