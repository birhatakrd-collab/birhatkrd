export interface TranslationHistoryItem {
    id: string;
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    timestamp: number;
}

export interface FavoriteItem {
    id: string;
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
}

export interface LanguageOption {
    code: string;
    name: string;
    dir: 'rtl' | 'ltr';
    isDialect?: boolean; // For Badini/Sorani distinction
    flagCode?: string;
    customFlag?: string;
}

export enum LoadingState {
    IDLE = 'IDLE',
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR'
}