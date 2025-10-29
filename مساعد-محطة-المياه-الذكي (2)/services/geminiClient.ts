
import { GoogleGenAI } from "@google/genai";

let genAIInstance: GoogleGenAI | null = null;
const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const getApiKey = (): string | null => {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (e) {
        console.error("Could not access localStorage:", e);
        return null;
    }
};

export const initializeGenAI = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API key is required to initialize GoogleGenAI");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (e) {
        console.error("Could not save API key to localStorage:", e);
    }
};

export const getGenAI = (): GoogleGenAI => {
    if (!genAIInstance) {
        const storedApiKey = getApiKey();
        if (storedApiKey) {
            initializeGenAI(storedApiKey);
        } else {
            // This state should ideally be prevented by the UI logic in App.tsx
            throw new Error("GoogleGenAI has not been initialized. An API key must be provided.");
        }
    }
    return genAIInstance!;
};
