import React from 'react';
import { Language } from '../types';
import { TEXT } from '../constants';
import { AlertCircle } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  lang: Language;
}

export const InfoRow: React.FC<Props> = ({ label, value, lang }) => {
  const isMissing = !value || value.trim() === '';

  return (
    <div className="flex flex-col py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </span>
      {isMissing ? (
        <div className="flex items-center text-red-500 font-semibold bg-red-50 p-2 rounded-md border border-red-100 w-fit">
          <AlertCircle size={16} className="ltr:mr-2 rtl:ml-2" />
          <span>{TEXT.val_not_available[lang]}</span>
        </div>
      ) : (
        <span className="text-lg font-medium text-slate-800 break-words">
          {value}
        </span>
      )}
    </div>
  );
};
