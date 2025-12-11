import React, { useState, useEffect, useRef, Component, ErrorInfo } from 'react';
import { ArrowLeftRight, Sparkles, Copy, Check, RotateCcw, Menu, Volume2, Share2, Info, Instagram, Ghost, X, Loader2, ClipboardPaste, ThumbsUp, Maximize2, WifiOff, Briefcase, GraduationCap, ChevronLeft, ShieldCheck, Book, Star, Trash2, Clock, Image as ImageIcon, Wand2, Download, Construction, Save, Upload, Languages, Send, RefreshCw } from 'lucide-react';
import { LanguageSelect } from './components/LanguageSelect';
import { HistorySidebar } from './components/HistorySidebar';
import { translateText, fixGrammar } from './services/geminiService';
import { SUPPORTED_LANGUAGES, DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from './constants';
import { LanguageOption, LoadingState, TranslationHistoryItem, FavoriteItem } from './types';

// --- Error Boundary Component ---
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  handleReset = () => {
    try {
        localStorage.clear();
        window.location.reload();
    } catch (e) {
        window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 text-slate-200 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
           <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
               <X size={32} className="text-red-500" />
           </div>
           <h2 className="text-2xl font-bold mb-2">بورینە، ئاریشەیەک چێبوو!</h2>
           <p className="text-slate-400 mb-8 max-w-md">
               بەرنامە توشی کێشەیەک بوو. هیڤیە دوگمەیا "نویکرنەوە" ل خوارێ داگرە دا کو ئاریشە چارەسەر بیت.
           </p>
           <button 
             onClick={this.handleReset}
             className="bg-gold-500 hover:bg-gold-400 text-dark-950 font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2"
           >
             <RefreshCw size={20} />
             نویکرنەوە (Reset App)
           </button>
           <p className="mt-8 text-xs text-slate-600 font-mono">
               Error: {this.state.error?.message || "Unknown error"}
           </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [sourceLang, setSourceLang] = useState<LanguageOption>(DEFAULT_SOURCE_LANG || SUPPORTED_LANGUAGES[1]);
  const [targetLang, setTargetLang] = useState<LanguageOption>(DEFAULT_TARGET_LANG || SUPPORTED_LANGUAGES[0]);
  
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'menu' | 'history' | 'tools' | 'seminar'>('menu');
  
  // Modal States
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  
  // Feature States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rating, setRating] = useState<'like' | 'dislike' | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aggressive Sanitization for History
  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    try {
        const saved = localStorage.getItem('translationHistory');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item => item && typeof item === 'object' && item.id);
    } catch (e) {
        console.error("History corrupted, resetting", e);
        localStorage.removeItem('translationHistory');
        return [];
    }
  });

  // Aggressive Sanitization for Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
        const saved = localStorage.getItem('favorites');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item => item && typeof item === 'object' && item.id);
    } catch (e) {
        console.error("Favorites corrupted, resetting", e);
        localStorage.removeItem('favorites');
        return [];
    }
  });

  useEffect(() => {
    try {
        localStorage.setItem('translationHistory', JSON.stringify(history));
    } catch (e) { console.error("Save history failed", e); }
  }, [history]);

  useEffect(() => {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) { console.error("Save favorites failed", e); }
  }, [favorites]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleTranslate();
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputText, sourceLang, targetLang]); 

  // --- Handlers ---

  const handleTranslate = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (!isOnline) {
        alert("هیڤیە هێلا ئینتەرنێتێ پەیدا بکە.");
        return;
    }

    setLoadingState(LoadingState.LOADING);
    setOutputText('');
    setRating(null);
    
    try {
      const result = await translateText(inputText, sourceLang.name, targetLang.name, selectedImage || undefined);
      setOutputText(result);
      setLoadingState(LoadingState.SUCCESS);

      const newItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        sourceText: selectedImage ? "[Wêne] " + inputText : inputText,
        translatedText: result,
        sourceLang: sourceLang.code,
        targetLang: targetLang.code,
        timestamp: Date.now()
      };
      
      setHistory(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return [newItem, ...safePrev].slice(0, 50);
      });

    } catch (error: any) {
      setLoadingState(LoadingState.ERROR);
      console.error(error);
    }
  };

  const handleFixGrammar = async () => {
    if(!inputText.trim()) return;
    setLoadingState(LoadingState.LOADING);
    try {
        const fixed = await fixGrammar(inputText, sourceLang.name);
        setInputText(fixed);
        setLoadingState(LoadingState.IDLE);
    } catch (e: any) {
        setLoadingState(LoadingState.ERROR);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang.code === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText('');
    setOutputText('');
    if(selectedImage) setSelectedImage(null);
  };

  const copyToClipboard = (text: string, isInput: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isInput) {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch (err) {
      alert("بورینە، وێبگەری تە ڕێ نادەت. هیڤیە ب دەستێ خو (Paste) بکە.");
    }
  };

  const handleSpeak = (text: string, langCode: string) => {
    if (!text) return;
    if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode; 
        window.speechSynthesis.speak(utterance);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert("قەبارێ وێنەی گەلەکە (Max 5MB)");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleToggleFavorite = () => {
      if (!outputText) return;
      const safeFavorites = Array.isArray(favorites) ? favorites : [];
      const exists = safeFavorites.find(f => f.translatedText === outputText);
      if (exists) {
          setFavorites(prev => (Array.isArray(prev) ? prev : []).filter(f => f.id !== exists.id));
      } else {
          const newItem: FavoriteItem = {
              id: Date.now().toString(),
              sourceText: inputText,
              translatedText: outputText,
              sourceLang: sourceLang.code,
              targetLang: targetLang.code
          };
          setFavorites(prev => [newItem, ...(Array.isArray(prev) ? prev : [])]);
      }
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Wergêrana Badînî', text: text });
      } catch (err) { console.error('Error sharing:', err); }
    } else {
      copyToClipboard(text, false);
      alert("Copied to clipboard!");
    }
  };
  
  const openMenu = () => { setSidebarView('menu'); setIsSidebarOpen(true); }
  const getDir = (lang: LanguageOption) => (!lang || lang.code === 'auto') ? 'rtl' : lang.dir;
  const isFavorite = Array.isArray(favorites) && favorites.some(f => f.translatedText === outputText);

  if (!sourceLang || !targetLang) {
      return <div className="min-h-screen flex items-center justify-center text-gold-500 bg-dark-950">Loading...</div>;
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-gold-500/30 overflow-x-hidden relative">
      
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>

      {!isOnline && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-500 text-center py-3 text-sm font-medium flex items-center justify-center gap-2 backdrop-blur-md sticky top-0 z-50">
              <WifiOff size={16} /> هیڤیە هێلا ئینتەرنێتێ پەیدا بکە.
          </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 transition-all duration-300 border-b border-white/5 bg-dark-950/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative" dir="rtl">
          <div className="flex items-center justify-start gap-2 md:gap-3 z-10">
            <button onClick={openMenu} className="group p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300">
                <Menu size={24} />
            </button>
          </div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none md:hidden">
             <div className="flex items-center gap-2 pointer-events-auto">
                 <h1 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-gold-400 to-yellow-100 drop-shadow-sm" dir="rtl">
                    وەرگێرانا بادینی
                </h1>
             </div>
          </div>
          <div className="flex items-center justify-end gap-4 z-10">
             <h1 className="text-2xl font-bold tracking-wide hidden md:block bg-clip-text text-transparent bg-gradient-to-r from-gold-400 to-yellow-100 drop-shadow-sm" dir="rtl">
                وەرگێرانا بادینی
            </h1>
             <div className="relative group cursor-pointer" onClick={() => setShowAbout(true)}>
                <div className="absolute inset-0 bg-gold-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform duration-300">
                    <span className="text-xl md:text-2xl font-bold text-gold-500">B</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-4 md:gap-6 relative z-10">
        
        {/* Cards Container */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 relative">
            
            {/* Source Card: z-20 ensures it's above Target (z-10) but below Swap Button (z-30) */}
            <div className="flex-1 flex flex-col glass-panel rounded-3xl shadow-xl focus-within:ring-1 focus-within:ring-gold-500/30 transition-shadow duration-300 min-h-[220px] md:min-h-[450px] relative z-20">
                
                {/* Header */}
                <div className="h-12 md:h-14 border-b border-white/5 bg-black/20 flex items-center justify-between px-3 md:px-4 rounded-t-3xl" dir="rtl">
                    <LanguageSelect options={SUPPORTED_LANGUAGES} selected={sourceLang} onChange={setSourceLang} variant="source" />
                    <div className="flex items-center gap-1">
                        {inputText && (
                            <button onClick={() => setInputText('')} className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 relative flex flex-col rounded-b-3xl">
                    {selectedImage && (
                        <div className="relative w-full h-32 md:h-40 bg-black/40 border-b border-white/5 group">
                            <img src={selectedImage} alt="Upload" className="w-full h-full object-contain p-4" />
                            {loadingState === LoadingState.LOADING && <div className="scan-line"></div>}
                            <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors z-20"><X size={14}/></button>
                        </div>
                    )}
                    
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="نڤێسینا خو لڤێرە بنڤیسە..."
                        dir={getDir(sourceLang)}
                        className="flex-1 w-full bg-transparent p-4 md:p-5 resize-none focus:outline-none placeholder:text-slate-600 text-base md:text-lg leading-relaxed text-slate-200 rounded-b-3xl"
                        spellCheck={false}
                    />

                    {/* Input Toolbar */}
                    <div className="px-3 md:px-4 py-2 md:py-3 flex justify-between items-center" dir="rtl">
                         <div className="flex gap-1">
                             <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                             <button onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-all ${selectedImage ? 'text-gold-500 bg-gold-500/10' : 'text-slate-400 hover:text-gold-400 hover:bg-white/5'}`}><ImageIcon size={18} /></button>
                             <button onClick={handlePaste} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ClipboardPaste size={18} /></button>
                             <button onClick={handleFixGrammar} className="p-2 text-slate-400 hover:text-purple-400 hover:bg-white/5 rounded-lg transition-all"><Wand2 size={18} /></button>
                         </div>
                         <div className="text-slate-600 text-[10px] font-mono self-end pb-2">{inputText.length > 0 && <span>{inputText.length}</span>}</div>
                    </div>
                </div>
            </div>

            {/* Swap Button: z-30 (HIGHEST) ensures it is always clickable */}
            <div className="flex md:flex-col justify-center items-center -my-3 md:-mx-3 relative z-30">
                <button 
                    onClick={handleSwapLanguages}
                    disabled={sourceLang.code === 'auto'}
                    className={`p-2 md:p-3 rounded-full shadow-lg border border-gold-500/30 backdrop-blur-xl transition-all duration-300 ${sourceLang.code === 'auto' ? 'bg-dark-800 text-slate-600 cursor-not-allowed' : 'bg-dark-900 text-gold-500 hover:bg-gold-500 hover:text-dark-950 hover:scale-110 hover:shadow-gold-500/40'}`}
                >
                    <ArrowLeftRight size={20} className="md:rotate-90" />
                </button>
            </div>

            {/* Target Card: z-10 (LOWEST) */}
            <div className={`flex-1 flex flex-col glass-panel rounded-3xl shadow-xl transition-all duration-500 relative min-h-[220px] md:min-h-[450px] z-10 ${loadingState === LoadingState.LOADING ? 'ring-1 ring-gold-500/50' : ''}`}>
                 
                 {/* Header */}
                 <div className="h-12 md:h-14 border-b border-white/5 bg-black/20 flex items-center justify-between px-3 md:px-4 rounded-t-3xl" dir="rtl">
                    <LanguageSelect options={SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto')} selected={targetLang} onChange={setTargetLang} variant="target" />
                     <div className="flex gap-1">
                        {outputText && (
                            <button onClick={() => copyToClipboard(outputText, false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
                                {copiedOutput ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 relative flex flex-col p-4 md:p-5 overflow-auto custom-scrollbar rounded-b-3xl">
                     {loadingState === LoadingState.LOADING ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 bg-black/10 backdrop-blur-[2px] rounded-b-3xl">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gold-500 blur-2xl opacity-20 animate-pulse"></div>
                                <Sparkles size={40} className="text-gold-500 animate-spin-slow relative z-10" />
                            </div>
                            <div className="flex flex-col gap-2 items-center">
                                <p className="text-gold-400 font-bold text-lg animate-pulse" dir="rtl">AI یا کاردکەت</p>
                                <p className="text-gold-500/60 text-sm animate-pulse" dir="rtl">چاڤەرێ بە یا دهێتە وەرگێران...</p>
                            </div>
                        </div>
                     ) : outputText ? (
                        <p dir={getDir(targetLang)} className="text-base md:text-lg leading-relaxed text-slate-100 whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {outputText}
                        </p>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-3 select-none">
                            <ArrowLeftRight size={24} className="opacity-30" />
                            <span className="text-xs font-medium opacity-50" dir="rtl">وەرگێران دێ لڤێرە دیار بیت</span>
                         </div>
                     )}
                </div>

                {/* Toolbar */}
                <div className="px-3 md:px-4 py-2 md:py-3 flex justify-between items-center bg-black/10 rounded-b-3xl" dir="rtl">
                     <div className="flex gap-1">
                         {outputText && (
                            <>
                                <button onClick={() => handleSpeak(outputText, targetLang.code)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"><Volume2 size={18} /></button>
                                <button onClick={() => setIsFullscreen(true)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"><Maximize2 size={18} /></button>
                                <button onClick={() => handleShare(outputText)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"><Share2 size={18} /></button>
                            </>
                         )}
                     </div>
                     <div className="flex gap-1">
                         {outputText && (
                            <>
                                <button onClick={() => setRating(rating === 'like' ? null : 'like')} className={`p-2 rounded-lg transition-all ${rating === 'like' ? 'text-gold-500 bg-gold-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><ThumbsUp size={18} /></button>
                                <button onClick={handleToggleFavorite} className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-white/5'}`}><Save size={18} className={isFavorite ? "fill-current" : ""}/></button>
                            </>
                         )}
                     </div>
                </div>
            </div>
        </div>
        
        {/* Translate Button */}
        <div className="flex justify-center mt-2 pb-6 relative z-30">
            <div className={`absolute inset-0 bg-gold-500/20 blur-3xl transition-opacity duration-500 ${loadingState === LoadingState.LOADING ? 'opacity-50' : 'opacity-0'}`}></div>
            <button
                onClick={handleTranslate}
                disabled={loadingState === LoadingState.LOADING || (!inputText.trim() && !selectedImage)}
                className={`relative z-10 w-full md:w-auto md:px-32 py-4 rounded-2xl font-bold text-lg shadow-2xl overflow-hidden transition-all duration-300 ${(!inputText.trim() && !selectedImage) ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5' : 'bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-dark-950 hover:shadow-gold-500/40 hover:scale-[1.02] border border-gold-400/30'}`}
            >
                {loadingState === LoadingState.LOADING ? (
                     <div className="flex items-center justify-center gap-3"><Loader2 size={22} className="animate-spin" /><span>خەریکە...</span></div>
                ) : (
                    <div className="flex items-center justify-center gap-3"><span>وەرگێران</span><Sparkles size={22} className="animate-pulse" /></div>
                )}
            </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 mt-auto glass-panel relative z-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-right">
                <p className="text-slate-400 font-medium text-sm flex items-center gap-2 justify-center md:justify-start" dir="rtl">ئەڤ وێبسایتە ژ لایێ <span className="text-gold-500 font-bold">(بیرهات)</span> ڤە هاتیە دروستکرن.</p>
                <p className="text-[10px] text-slate-600 mt-1 font-mono tracking-widest text-center md:text-right">v2.5 PRO</p>
            </div>
            <div className="flex items-center gap-3">
                <a href="https://instagram.com/birhatkrd" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 text-slate-400 hover:text-white rounded-xl transition-all"><Instagram size={20} /></a>
                <a href="https://snapchat.com/add/birhatkrd" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-gradient-to-br hover:from-yellow-500 hover:to-gold-500 text-slate-400 hover:text-white rounded-xl transition-all"><Ghost size={20} /></a>
                <a href="https://t.me/birhatkrd" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-gradient-to-br hover:from-blue-500 hover:to-cyan-500 text-slate-400 hover:text-white rounded-xl transition-all"><Send size={20} /></a>
            </div>
        </div>
      </footer>

      {/* Sidebar & Modals... */}
      <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />

      <div className={`fixed inset-y-0 right-0 w-80 max-w-full bg-dark-950/90 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-500 shadow-2xl flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between" dir="rtl">
            <h2 className="text-lg font-bold text-gold-400 flex items-center gap-2">
               {sidebarView === 'menu' && <><Menu size={20} /> لیستە</>}
               {sidebarView === 'history' && <><Clock size={20} /> دیرۆک</>}
               {sidebarView === 'tools' && <><Briefcase size={20} /> ئامراز</>}
               {sidebarView === 'seminar' && <><GraduationCap size={20} /> سمینار</>}
            </h2>
            <button onClick={() => { if (sidebarView === 'menu') setIsSidebarOpen(false); else setSidebarView('menu'); }} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                {sidebarView === 'menu' ? <X size={20} /> : <ChevronLeft size={20} className="rotate-180" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
             {sidebarView === 'menu' && (
                 <div className="space-y-2">
                     <button onClick={() => setSidebarView('tools')} className="w-full bg-white/5 hover:bg-gold-500/10 border border-white/5 hover:border-gold-500/30 p-4 rounded-xl flex items-center gap-4 group transition-all text-right" dir="rtl">
                         <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><Briefcase size={20} /></div>
                         <div className="flex-1"><h3 className="text-slate-200 font-bold group-hover:text-gold-400">خزمەتگوزاری</h3><p className="text-xs text-slate-500">دروستکرنا سمینار و ئامرازێن دی</p></div>
                         <ChevronLeft size={16} className="text-slate-600 group-hover:text-gold-500" />
                     </button>
                     <button onClick={() => setShowFavorites(true)} className="w-full bg-white/5 hover:bg-gold-500/10 border border-white/5 hover:border-gold-500/30 p-4 rounded-xl flex items-center gap-4 group transition-all text-right" dir="rtl">
                         <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform"><Save size={20} /></div>
                         <div className="flex-1"><h3 className="text-slate-200 font-bold group-hover:text-gold-400">وەرگێرانێن پاراستی</h3><p className="text-xs text-slate-500">لیستا پاراستی</p></div>
                     </button>
                     <button onClick={() => setSidebarView('history')} className="w-full bg-white/5 hover:bg-gold-500/10 border border-white/5 hover:border-gold-500/30 p-4 rounded-xl flex items-center gap-4 group transition-all text-right" dir="rtl">
                         <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform"><Clock size={20} /></div>
                         <div className="flex-1"><h3 className="text-slate-200 font-bold group-hover:text-gold-400">دیرۆک</h3><p className="text-xs text-slate-500">دوماهیک وەرگێران</p></div>
                         <ChevronLeft size={16} className="text-slate-600 group-hover:text-gold-500" />
                     </button>
                     <div className="my-6 border-t border-white/5"></div>
                     <button onClick={() => setShowPrivacy(true)} className="w-full p-3 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white flex items-center gap-3 transition-colors text-right" dir="rtl"><ShieldCheck size={18} /><span>مەرج و رێنمایی</span></button>
                     <button onClick={() => setShowAbout(true)} className="w-full p-3 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white flex items-center gap-3 transition-colors text-right" dir="rtl"><Info size={18} /><span>دەربارەی مە</span></button>
                 </div>
             )}
             {sidebarView === 'history' && (
                 <div className="space-y-3">
                     {Array.isArray(history) && history.length === 0 ? (
                        <p className="text-center text-slate-500 mt-10 text-sm">هێشتا چو وەرگێران نەهاتینە کرن</p>
                     ) : (
                         Array.isArray(history) && history.map((item) => (
                            <div key={item.id} onClick={() => { setSourceLang(SUPPORTED_LANGUAGES.find(l => l.code === item.sourceLang) || DEFAULT_SOURCE_LANG); setTargetLang(SUPPORTED_LANGUAGES.find(l => l.code === item.targetLang) || DEFAULT_TARGET_LANG); setInputText(item.sourceText.replace('[Wêne] ', '')); setOutputText(item.translatedText); setIsSidebarOpen(false); }} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-gold-500/30 rounded-lg p-3 cursor-pointer transition-all duration-200" dir="rtl">
                                <div className="flex items-center justify-between mb-2 text-xs text-slate-500"><span className="flex items-center gap-1">{item.sourceLang} <span className="text-gold-500">→</span> {item.targetLang}</span></div>
                                <p className="text-slate-300 text-sm line-clamp-1 mb-1 font-medium">{item.sourceText}</p>
                                <p className="text-gold-500/80 text-sm line-clamp-1">{item.translatedText}</p>
                            </div>
                          ))
                     )}
                     {Array.isArray(history) && history.length > 0 && (
                        <button onClick={() => setHistory([])} className="w-full mt-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 py-2 rounded-lg text-sm"><Trash2 size={16} /> پاقژکرن</button>
                     )}
                 </div>
             )}
             {sidebarView === 'tools' && (
                 <div className="space-y-3">
                     <button onClick={() => setSidebarView('seminar')} className="w-full bg-white/5 p-4 rounded-xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-900/10 transition-all group text-right flex items-center gap-4" dir="rtl">
                         <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><GraduationCap size={24} /></div>
                         <div className="flex-1"><h3 className="text-slate-200 font-bold group-hover:text-purple-400">دروستکرنا سمیناران</h3><p className="text-xs text-slate-500 mt-1">ئامادەکرنا بابەتێن ئەکادیمی</p></div>
                     </button>
                 </div>
             )}
             {sidebarView === 'seminar' && (
                 <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                     <div className="flex flex-col items-center justify-center flex-1 text-center p-6 border border-white/5 rounded-xl bg-white/5">
                          <div className="relative mb-6"><div className="absolute inset-0 bg-gold-500 blur-2xl opacity-10 animate-pulse"></div><Construction size={48} className="text-gold-500 relative z-10 animate-bounce" /></div>
                          <h3 className="text-xl font-bold text-slate-200 mb-2">ل نێزیک...</h3>
                          <p className="text-slate-400 text-sm leading-relaxed" dir="rtl">ئەڤ بەشە ل نێزیک دێ هێتە دروستکرن.</p>
                     </div>
                 </div>
             )}
          </div>
      </div>
      
      {/* Modals */}
      {showFavorites && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowFavorites(false)}>
              <div className="glass-panel rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                       <button onClick={() => setShowFavorites(false)}><X size={20} className="text-slate-500 hover:text-white"/></button>
                       <h3 className="text-xl font-bold text-gold-400 flex items-center gap-2" dir="rtl"><Save size={20}/> وەرگێرانێن پاراستی</h3>
                   </div>
                   {Array.isArray(favorites) && favorites.length === 0 ? <p className="text-slate-500 text-center py-8">هێشتا چ وەرگێران نەهاتینە پاراستن.</p> : (
                       <div className="space-y-3">{Array.isArray(favorites) && favorites.map(fav => (
                               <div key={fav.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-2 relative group">
                                   <button onClick={() => setFavorites(prev => (Array.isArray(prev) ? prev : []).filter(f => f.id !== fav.id))} className="absolute top-2 left-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                                   <div className="text-right pl-6" dir="rtl"><p className="text-gold-500 text-lg font-medium">{fav.translatedText}</p><p className="text-slate-500 text-sm mt-1">{fav.sourceText}</p></div>
                               </div>
                           ))}
                       </div>
                   )}
              </div>
          </div>
      )}
      {isFullscreen && outputText && (
        <div className="fixed inset-0 z-[80] bg-dark-950 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 flex justify-between items-center border-b border-white/5">
                <button onClick={() => setIsFullscreen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={24} className="text-slate-300" /></button>
                <span className="text-gold-500 font-bold text-lg">مۆدا پیشاندانێ</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 md:p-16 overflow-auto">
                 <p className="text-3xl md:text-5xl leading-relaxed text-center text-slate-100 font-medium" dir={getDir(targetLang)}>{outputText}</p>
            </div>
        </div>
      )}
      {showWelcome && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-500">
            <div className="glass-panel border border-gold-500/20 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-6">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gold-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-gold-500/20 to-dark-800 rounded-2xl flex items-center justify-center mx-auto border border-gold-500/20"><Sparkles size={40} className="text-gold-500" /></div>
                    </div>
                    <div className="space-y-2"><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-600" dir="rtl">بخێرهاتی بو وەرگێرانا بادینی AI</h2></div>
                    <p className="text-slate-300 leading-relaxed text-lg font-light" dir="rtl">ئەڤ پلاتفۆرما پێشکەفتی یا وەرگێرانێ، ب پشت بەستن ب تەکنۆلۆژیا ژیریا دەستکرد (AI) هاتیە گەشەپێدان.</p>
                    <button onClick={() => setShowWelcome(false)} className="w-full mt-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-950 font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-gold-900/20">دەستپێکرن</button>
                </div>
            </div>
        </div>
      )}
      {showAbout && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setShowAbout(false)}>
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in fade-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-white/5 hover:bg-red-500/20 p-2 rounded-full transition-colors"><X size={20} /></button>
                <div className="space-y-8 text-center md:text-right" dir="rtl">
                    <div className="border-b border-white/5 pb-4 flex flex-col items-center md:items-start gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-gold-500/20 to-dark-800 rounded-full flex items-center justify-center border border-gold-500/20 text-4xl">👨‍💻</div>
                        <div className="text-center md:text-right"><h2 className="text-2xl font-bold text-gold-400">بیرهات غیاس عمر</h2><p className="text-slate-500 text-sm mt-1">پێشڤەبەرێ پرۆژەی</p></div>
                    </div>
                    <div className="space-y-6 text-slate-300 leading-loose text-lg font-light">
                        <p>سلاڤ، ئەز (<strong className="text-white">بیرهات غیاس عمر</strong>)م، خەلکێ باژێرێ دهۆکێ مە و دەرچوویێ پشکا زمانێ ئنگلیزی مە ل زانکۆیا زاخۆ.</p>
                        <p>مە ئەڤ پلاتفۆرمە ب هاریکاریا تەکنۆلۆژیا ژیریا دەستکرد (AI) گەشە پێ دایە ژبۆ خزمەتکرنا خەلکێ مە. ئارمانجا مە ئەوە ئەم بشێین پرەکێ د ناڤبەرا زمانێ شیرینێ کوردی (دیالێکتا بادینی) و زمانێن جیهانی دا دروست بکەین، دا کو قوتابی، ماموستا و هەر تاکەکێ کورد بشێت ب ساناهی و بێ بەرامبەر مفای ژێ ببینیت بۆ کارێن خۆ یێن رۆژانە.</p>
                    </div>
                </div>
            </div>
        </div>
      )}
      {showPrivacy && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setShowPrivacy(false)}>
            <div className="glass-panel rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl relative flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 rounded-t-3xl">
                     <button onClick={() => setShowPrivacy(false)} className="text-slate-500 hover:text-red-500 p-2 rounded-full transition-colors"><X size={24} /></button>
                    <h2 className="text-xl font-bold text-gold-400 flex items-center gap-3" dir="rtl"><ShieldCheck size={24} className="text-gold-500" /> مەرجێن سیاسەتا نەهێنی</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <p className="text-slate-300 mb-6 font-bold text-lg" dir="rtl">بخێرھاتی بۆ وەرگێرانا بادینی (Birhat).</p>
                    <div className="space-y-4 text-right" dir="rtl">
                        <ul className="list-disc pr-5 space-y-2 text-slate-400 leading-relaxed">
                            <li><strong>پاراستنا نهێنی:</strong> ئەم رێزێ ل نهێنیێن تە دگرین و داتایێن تە بۆ مە گرنگن.</li>
                            <li><strong>کۆمکرنا داتایان:</strong> داتا ب تنێ بۆ مەرەمێن وەرگێرانێ و باشترکرنا خزمەتگوزاریێ دهێنە بکارئینان.</li>
                            <li><strong>هەلگرتنا پێزانینان:</strong> دێرۆکا وەرگێرانێ ب تنێ ل سەر ئامیرێ تە (Local Storage) دهێتە هەلگرتن و مە چو دەستهەلات ل سەر نینە.</li>
                            <li><strong>خزمەتگوزاری:</strong> ئەڤ خزمەتگوزاریە بێ بەرامبەرە بۆ هەموو بەکارهێنەران.</li>
                            <li><strong>هێلا ئینتەرنێتێ:</strong> بۆ بکارئینانا ڤێ بەرنامەی پێدڤیە هێلا ئینتەرنێتێ هەبیت.</li>
                            <li><strong>دروستی:</strong> رەنگە وەرگێران 100% یا دروست نەبیت ژبەر کو هۆشێ دەستکردە، لەورا پێدڤیە پێداچوونێ بکەی.</li>
                            <li><strong>بەرپرسیارەتی:</strong> بکارئینانا ڤێ بەرنامەی ل سەر بەرپرسیارەتیا تە یا کەسی یە.</li>
                            <li><strong>مافێ خاوەنداریێ:</strong> کۆد، دیزاین و ناڤەرۆکا ڤێ وێبسایتی مولکێ (بیرهات)ـە و پاراستیە.</li>
                            <li><strong>گوهارتن:</strong> ئەم مافێ گوهارتنا مەرجان و نویکرنا بەرنامەی بۆ خۆ دپارێزین.</li>
                            <li><strong>بکارئینانا خراپ:</strong> نابیت پەیڤێن نەشیاو یان زیانبەخش بهێنە وەرگێران یان بکارئینان.</li>
                            <li><strong>تەمەن:</strong> ئەڤ بەرنامە گونجایە بۆ هەموو تەمەنان و چو سنور بۆ نینن.</li>
                            <li><strong>سکالا:</strong> بۆ هەر کێشەکێ یان پێشنیارەکێ دشی پەیوەندیێ ب مە بکەی ل رێکا تۆرێن جڤاکی.</li>
                            <li><strong>ڕێکلام:</strong> رەنگە ل پاشەرۆژێ ڕێکلام د ناڤ بەرنامەی دا هەبن بۆ بەردەوامبوونا خزمەتێ.</li>
                            <li><strong>زمان:</strong> ئەڤ وێبسایتە تایبەتمەندە ب دیالێکتا بادینی و بزاڤێ دکەین باشترین ئەنجام بدەین.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}

export default App;