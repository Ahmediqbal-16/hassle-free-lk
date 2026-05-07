"use client";

import { useLanguage } from "./LanguageProvider";
import { Language } from "@/lib/translations";

const options: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'සිං' },
  { code: 'ta', label: 'தமிழ்' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.code}
          onClick={() => setLanguage(opt.code)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            language === opt.code
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
