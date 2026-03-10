import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local (see .env.example). Get a key at aistudio.google.com"
    );
  }
  return new GoogleGenerativeAI(apiKey);
}
