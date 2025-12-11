import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Search } from 'lucide-react';
import { LanguageOption } from '../types.ts';

interface LanguageSelectProps {
  options: LanguageOption[];
  selected: LanguageOption;
  onChange: (lang: LanguageOption) => void;
  variant?: 'source' | 'target';
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({ options = [], selected, onChange, variant = 'source' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safety check to prevent crashes
  if (!selected) return null;

  const getFlagUrl = (option: LanguageOption) => {
    if (option.customFlag) return option.customFlag;
    if (option.flagCode) return `https://flagcdn.com/w40/${option.flagCode}.png`;
    return null;
  };

  const safeOptions = Array.isArray(options) ? options : [];
  const filteredOptions = safeOptions.filter(opt => 
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    opt.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2">
           {selected.code === 'auto' ? (
              <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center border border-gold-500/30">
                  <Sparkles size={12} className="text-gold-500"/>
              </div>
           ) : (
              <img 
                src={getFlagUrl(selected) || ''} 
                alt={selected.name} 
                className="w-5 h-5 rounded-full object-cover border border-white/10 shadow-sm"
              />
           )}
           <span className={`font-bold text-sm md:text-base ${isOpen ? 'text-gold-400' : 'text-slate-200'} group-hover:text-gold-400 transition-colors`}>
               {selected.name}
           </span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-gold-500' : ''}`} />
      </button>

      {isOpen && (
        <div 
            className="absolute top-full mt-2 right-0 w-64 bg-dark-900 border border-gold-900/50 rounded-xl shadow-2xl shadow-black z-50 overflow-hidden backdrop-blur-xl ring-1 ring-gold-500/10 flex flex-col origin-top-right animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
          
          {/* Search Input - Optimized for RTL */}
          <div className="p-2 border-b border-white/5 sticky top-0 bg-dark-900 z-10">
              <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="لێگەریان..." 
                    className="w-full bg-dark-950 border border-white/10 rounded-lg py-2 pr-9 pl-3 text-xs text-slate-200 focus:outline-none focus:border-gold-500/50 text-right"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    dir="rtl"
                  />
              </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.map((option) => (
              <button
                key={option.code}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`w-full text-start px-4 py-2.5 flex items-center justify-between hover:bg-gold-900/20 transition-colors border-b border-white/5 last:border-0 ${
                  selected.code === option.code ? 'bg-gold-900/10 text-gold-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                    {option.code === 'auto' ? (
                        <div className="w-5 h-5 rounded-full bg-gold-500/10 flex items-center justify-center">
                            <Sparkles size={10} className="text-gold-500"/>
                        </div>
                    ) : (
                        <img 
                            src={getFlagUrl(option) || ''} 
                            alt={option.name} 
                            className="w-5 h-5 rounded-full object-cover border border-white/10 shadow-sm"
                            loading="lazy"
                        />
                    )}
                    <span className="text-sm">{option.name}</span>
                </div>
                {selected.code === option.code && <Check size={14} className="text-gold-500" />}
              </button>
            ))}
            {filteredOptions.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">چو ئەنجام نەهاتنە دیتن</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};