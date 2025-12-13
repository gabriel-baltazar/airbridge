import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a cool, memorable session name for the connection (e.g., "Cosmic-Panda")
 */
export const generateSessionName = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a single, fun, two-word code name for a file transfer session (e.g., Cosmic-Panda, Neon-Tiger). Format: Word-Word. No explanations.",
    });
    return response.text?.trim().replace(/\s+/g, '-') || 'Fast-Link';
  } catch (error) {
    console.error("Gemini Naming Error:", error);
    return 'Quick-Share-' + Math.floor(Math.random() * 1000);
  }
};

/**
 * Generates a quick summary or tag for the file being transferred.
 */
export const analyzeFileContent = async (fileName: string, fileType: string): Promise<string> => {
  try {
    const prompt = `I am transferring a file named "${fileName}" of type "${fileType}". Give me a generic, safe 3-word category description for this file (e.g., "Personal Document", "High Res Image", "Source Code"). No formatting.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || 'Arquivo Desconhecido';
  } catch (error) {
    return 'Arquivo Desconhecido';
  }
};