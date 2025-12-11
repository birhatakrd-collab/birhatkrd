import React from 'react';
import { Clock, Trash2, ArrowRight } from 'lucide-react';
import { TranslationHistoryItem } from '../types.ts';

interface HistorySidebarProps {
  history: TranslationHistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: TranslationHistoryItem) => void;
  onClear: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, isOpen, onClose, onSelect, onClear }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-dark-900 border-l border-gold-900/30 z-50 transform transition-transform duration-300 shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-gold-900/20 flex items-center justify-between bg-dark-950/50" dir="rtl">
            <h2 className="text-lg font-bold text-gold-400 flex items-center gap-2">
              <Clock size={18} />
              دیرۆکا وەرگێرانێ
            </h2>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
            >
                <ArrowRight size={20} className="rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-dark-900">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 mt-10 text-sm" dir="rtl">
                <p>هێشتا چو وەرگێران نەهاتینە کرن</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="group bg-dark-800/50 hover:bg-dark-800 border border-gold-900/10 hover:border-gold-500/30 rounded-lg p-3 cursor-pointer transition-all duration-200 shadow-none"
                    dir="rtl"
                >
                    <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            {item.sourceLang} 
                            <span className="text-gold-500">→</span> 
                            {item.targetLang}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gold-600">
                            دوبارە بکە
                        </span>
                    </div>
                    <p className="text-slate-300 text-sm line-clamp-1 mb-1 font-medium">{item.sourceText}</p>
                    <p className="text-gold-500/80 text-sm line-clamp-1">{item.translatedText}</p>
                </div>
              ))
            )}
          </div>

          {history.length > 0 && (
            <div className="p-4 border-t border-gold-900/20 bg-dark-950/30">
              <button 
                onClick={onClear}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2.5 rounded-lg text-sm transition-colors"
                dir="rtl"
              >
                <Trash2 size={16} />
                هەمیان ژێ ببە
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};