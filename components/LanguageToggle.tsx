import React from 'react';
import { Language } from '../types';

interface Props {
  currentLang: Language;
  onToggle: (l: Language) => void;
}

const LanguageToggle: React.FC<Props> = ({ currentLang, onToggle }) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-white/80 text-[10px] font-medium tracking-wide uppercase shadow-sm">
        Change Language / تغيير اللغة
      </span>
      <div className="flex bg-white/30 backdrop-blur-md rounded-full p-1.5 border border-white/40 shadow-lg">
        <button
          onClick={() => onToggle('en')}
          className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ${
            currentLang === 'en' 
              ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
              : 'text-white hover:bg-white/10'
          }`}
        >
          English
        </button>
        <button
          onClick={() => onToggle('ar')}
          className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 font-sans ${
            currentLang === 'ar' 
              ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
              : 'text-white hover:bg-white/10'
          }`}
        >
          عربي
        </button>
      </div>
    </div>
  );
};

export default LanguageToggle;