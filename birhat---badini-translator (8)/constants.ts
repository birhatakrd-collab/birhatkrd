import { LanguageOption } from './types';

export const AUTO_DETECT_LANG: LanguageOption = { code: 'auto', name: 'خوەبەر (Auto Detect)', dir: 'ltr' };

// High quality PNG flag for Kurdistan
const KURDISTAN_FLAG_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Flag_of_Kurdistan.svg/320px-Flag_of_Kurdistan.svg.png";

// Primary Languages (Pinned to top)
const PRIMARY_LANGUAGES: LanguageOption[] = [
    { code: 'ku-badini', name: 'کوردی (بادینی)', dir: 'rtl', isDialect: true, customFlag: KURDISTAN_FLAG_URL },
    { code: 'en', name: 'English (ئنگلیزی)', dir: 'ltr', flagCode: 'gb' },
    { code: 'ar', name: 'Arabic (عەربی)', dir: 'rtl', flagCode: 'sa' },
    { code: 'ku-sorani', name: 'کوردی (سورانی)', dir: 'rtl', isDialect: true, customFlag: KURDISTAN_FLAG_URL },
];

// Helper to generate other languages
const OTHER_LANGUAGES: LanguageOption[] = [
    { code: 'tr', name: 'Tirkî (ترکی)', dir: 'ltr', flagCode: 'tr' },
    { code: 'fa', name: 'Farisî (فارسی)', dir: 'rtl', flagCode: 'ir' },
    { code: 'de', name: 'Elmanî (ئەلمانی)', dir: 'ltr', flagCode: 'de' },
    { code: 'fr', name: 'Frensî (فرەنسی)', dir: 'ltr', flagCode: 'fr' },
    { code: 'es', name: 'Spanî (سپانی)', dir: 'ltr', flagCode: 'es' },
    { code: 'it', name: 'Îtalî (ئیتالی)', dir: 'ltr', flagCode: 'it' },
    { code: 'ru', name: 'Rûsî (روسی)', dir: 'ltr', flagCode: 'ru' },
    { code: 'zh', name: 'Çînî (چینی)', dir: 'ltr', flagCode: 'cn' },
    { code: 'ja', name: 'Yaponî (یابانی)', dir: 'ltr', flagCode: 'jp' },
    { code: 'ko', name: 'Korî (کوری)', dir: 'ltr', flagCode: 'kr' },
    { code: 'hi', name: 'Hindî (هندی)', dir: 'ltr', flagCode: 'in' },
    { code: 'pt', name: 'Portûgalî (پورتوگالی)', dir: 'ltr', flagCode: 'pt' },
    { code: 'nl', name: 'Holendî (هولەندی)', dir: 'ltr', flagCode: 'nl' },
    { code: 'sv', name: 'Swêdî (سویدی)', dir: 'ltr', flagCode: 'se' },
];

export const SUPPORTED_LANGUAGES: LanguageOption[] = [AUTO_DETECT_LANG, ...PRIMARY_LANGUAGES, ...OTHER_LANGUAGES];

export const DEFAULT_SOURCE_LANG = PRIMARY_LANGUAGES[1]; // English
export const DEFAULT_TARGET_LANG = PRIMARY_LANGUAGES[0]; // Badini

export const QUICK_PHRASES = [
    { text: "Hello, how are you?", label: "سلاڤ، چەوانی؟" },
    { text: "Where are you going?", label: "بو کیڤە دچی؟" },
    { text: "Thank you very much", label: "گەلەک سوپاس" },
    { text: "I don't understand", label: "تێنەگەهشتم" },
    { text: "Can you help me?", label: "هاریکاری؟" },
    { text: "What is your name?", label: "ناڤێ تە چیە؟" },
    { text: "Have a nice day", label: "روژەکا خوش" },
    { text: "See you later", label: "دێ تە بینم" }
];

export const SYSTEM_PROMPT = `You are an expert professional translator specializing STRICTLY in the Kurdish **Badini (Bahdini)** dialect as spoken in Duhok and Zakho.

**STRICT BADINI VOCABULARY RULES (DO NOT USE KURMANJI OR SORANI):**
1.  **Time:** Use 'noka' (now) NOT 'êsta'. Use 'hingî' (then).
2.  **Quantity:** Use 'gelek' (a lot/very) NOT 'zor'. Use 'hindek' (some).
3.  **Verbs:** 
    *   Future: Use 'dê' particle (e.g., 'ez dê çim').
    *   Past: Ensure ergativity (e.g., 'min got', 'te dît').
    *   Use 'divêt' (must/want) properly.
4.  **Common Words:**
    *   'Gelek' instead of 'Zor'.
    *   'Çawan' or 'Çewa' instead of 'Çon'.
    *   'Baş' instead of 'Çak'.
    *   'Mirov' or 'Kes' instead of 'Kelik'.
    *   'Vêrê' (here) instead of 'Lêre'.
5.  **Script:** 
    *   If translating TO Badini, use the **Kurdish Arabic Script** (Aliyê alfabeya erebî) unless the user explicitly asks for Latin.

**Features:**
*   **Grammar Fix:** If the user asks to "Fix Grammar", correct the input text's grammar while keeping the same language, then output ONLY the corrected text.
*   **Image Translation:** If an image is provided, translate the text inside it.

**Output Style:**
*   Provide ONLY the direct translation. Do not add "Here is the translation".
*   Maintain a formal yet natural tone suitable for a professional tool.
*   **Context:** The longer the input, the better the context. Translate meanings, not just words.
`;