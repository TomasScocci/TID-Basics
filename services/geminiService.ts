import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGarmentImages = async (
  frontImageBase64: string, 
  backImageBase64: string | null
): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. Returning mock analysis.");
    return "Analysis: Detected black cotton t-shirt with crew neck. Standard fit estimate. Fabric texture appears matte with high roughness.";
  }

  try {
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: frontImageBase64.split(',')[1] // Remove data URL prefix
        }
      }
    ];

    let promptText = "Analyze this garment for 3D reconstruction. Identify fabric type, fit, key landmarks, and estimated specularity. Keep it brief and technical.";

    if (backImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: backImageBase64.split(',')[1]
        }
      });
    } else {
      promptText += " Note: Only front view provided; infer back construction.";
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: parts
      }
    });

    return response.text || "Analysis complete. Ready for mesh generation.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Analysis failed. Proceeding with default parameters.";
  }
};