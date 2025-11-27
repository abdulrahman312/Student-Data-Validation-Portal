import React from 'react';
import { Language } from '../types';

interface Props {
  currentLang: Language;
  onToggle: (l: Language) => void;
}

const LanguageToggle: React.FC<Props> = ({ currentLang, onToggle }) => {
  return (
    <div className="flex bg-white/30 backdrop-blur-md rounded-full p-1 border border-white/40 shadow-sm">
      <button
        onClick={() => onToggle('en')}
        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
          currentLang === 'en' 
            ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
            : 'text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onToggle('ar')}
        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-300 font-sans ${
          currentLang === 'ar' 
            ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
            : 'text-white hover:bg-white/10'
        }`}
      >
        عربي
      </button>
    </div>
  );
};

export default LanguageToggle;