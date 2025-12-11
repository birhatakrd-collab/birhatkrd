import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants.ts';

const getClient = () => {
    // Attempt to retrieve the API key from multiple sources to support both 
    // Vite (local dev/Netlify build) and standard Node environments.
    
    let apiKey = '';

    // 1. Check for standard process.env (Netlify Build / Node)
    if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';
    }

    // 2. Check for Vite's import.meta.env (Client-side)
    // @ts-ignore
    if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';
    }

    // 3. Fallback for manually injected window variables (sometimes used in static sites)
    if (!apiKey && typeof window !== 'undefined') {
        // @ts-ignore
        apiKey = window.ENV?.API_KEY || '';
    }

    if (!apiKey) {
        console.error("API Key is missing. Please set 'API_KEY' in your Netlify Environment Variables.");
        // If you are testing locally without a build step, you might need to temporarily paste your key here
        // apiKey = "YOUR_API_KEY_HERE"; 
    }
    
    return new GoogleGenAI({ apiKey: apiKey });
}

export const translateText = async (
  text: string, 
  sourceLangName: string, 
  targetLangName: string,
  imageBase64?: string
): Promise<string> => {
  if (!text.trim() && !imageBase64) return "";

  let prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
  Text to translate:
  "${text}"
  `;

  if (sourceLangName.includes('Auto') || sourceLangName === 'auto') {
     prompt = `Translate the following text to ${targetLangName}. Detect the source language automatically.
     Text to translate:
     "${text}"
     `;
  }

  // Config for Image content
  let contents: any = prompt;
  if (imageBase64) {
      // Clean base64 string
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      
      contents = {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: `Analyze this image and translate any text found inside it to ${targetLangName}. If there is no text, describe the image in ${targetLangName}. Return ONLY the translation/description.` }
        ]
      };
  }

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3, 
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Translation error:", error);
    // Return a user-friendly error if it's an API key issue
    if (error.message?.includes('API key')) {
        return "Error: API Key is invalid or missing. Please check your Netlify configuration.";
    }
    throw new Error("Translation failed. Please try again.");
  }
};

export const fixGrammar = async (text: string, langName: string): Promise<string> => {
    if (!text.trim()) return "";
    
    const prompt = `Fix the grammar and spelling of the following text in ${langName}. Return ONLY the corrected text, no explanations.
    
    Text: "${text}"`;

    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: "You are a helpful grammar assistant.",
            temperature: 0.1,
          }
        });
    
        return response.text || text;
      } catch (error) {
        return text;
      }
}

export const generateSeminar = async (topic: string, pages: string): Promise<string> => {
    const pageCount = parseInt(pages) || 1;
    const targetWords = pageCount * 300;

    const prompt = `
    Write a complete academic seminar/presentation in **Kurdish Badini Dialect** about: "${topic}".
    
    **Structure Requirements:**
    1.  **Sernivîs (Title)**: Creative title.
    2.  **Pêşgotin (Introduction)**: Introduce the topic clearly.
    3.  **Naverok (Content)**: Detailed explanation covering approximately ${targetWords} words (enough for ${pageCount} pages). Break into points/paragraphs.
    4.  **Encam (Conclusion)**: Summary of main points.
    
    **Tone:** Formal, Academic, Badini Kurdish (Duhok/Zakho style).
    **Output:** Only the seminar text. Do not include any english text.
    `;

    try {
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.7,
            }
        });
        return response.text || "Borîne، şaşiyek çêbû.";
    } catch (error) {
        console.error("Seminar error", error);
        throw error;
    }
};