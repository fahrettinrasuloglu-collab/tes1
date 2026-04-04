import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Try multiple sources for the API key to ensure it's picked up on mobile/different environments
    const apiKey = 
      process.env.GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (window as any).GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "" || apiKey === "null") {
      console.error("API Key missing. Checked process.env, import.meta.env, and window.");
      throw new Error("Gemini API anahtarı (GEMINI_API_KEY) bulunamadı. Lütfen AI Studio'nun sol alt köşesindeki 'Settings' (Ayarlar) simgesine tıklayın ve 'Secrets' sekmesinden 'GEMINI_API_KEY' adında bir anahtar ekleyin. Ekledikten sonra sayfayı yenilemeyi unutmayın.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface GameState {
  role: string;
  location: string;
  inventory: string[];
  history: { role: "user" | "model"; text: string; imageUrl?: string }[];
}

export interface Scenario {
  location: string;
  description: string;
  firstMessage: string;
  educationalFact: string;
  imagePrompt: string;
}

export interface AIResponse {
  text: string;
  imagePrompt?: string;
}

export async function generateImage(prompt: string): Promise<string | undefined> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ parts: [{ text: `A vibrant, cinematic, high-quality digital art scene for an RPG game: ${prompt}. Style: Atmospheric, detailed, immersive.` }] }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation error:", error);
  }
  return undefined;
}

export async function generateScenario(role: string): Promise<Scenario> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Sen bir oyun yöneticisisin. Oyuncu "${role}" rolünü seçti. 
      Oyunun başlangıç senaryosunu, mekanını ve oyuncunun karşısındaki ilk durumu belirle. 
      Bu oyun hem eğlenceli hem de bilgi verici olmalı. 
      Yanıtını şu JSON formatında ver:
      {
        "location": "Mekan adı",
        "description": "Mekan ve durum açıklaması",
        "firstMessage": "Oyuncuya yönelik ilk diyalog",
        "educationalFact": "Bu mekan veya rolle ilgili ilginç, gerçek bir bilgi",
        "imagePrompt": "Bu başlangıç sahnesini betimleyen, görsel oluşturma yapay zekası için İngilizce bir prompt"
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("AI yanıtı boş geldi.");
    }

    let cleanText = response.text;
    // Robust JSON extraction
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON parse error. Raw text:", response.text);
      // Fallback if JSON parsing fails but we have some text
      return {
        location: "Bilinmeyen Mekan",
        description: response.text.substring(0, 200),
        firstMessage: "Macera başlıyor...",
        educationalFact: "Bilgi yükleniyor...",
        imagePrompt: "A mysterious adventure scene"
      };
    }
  } catch (error) {
    console.error("Senaryo oluşturma hatası:", error);
    throw error;
  }
}

export async function chatWithAI(gameState: GameState, userInput: string): Promise<AIResponse> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
      { role: "user", parts: [{ text: `Sen dinamik bir macera oyununun yöneticisisin. 
      Oyuncu "${gameState.role}" rolünde ve "${gameState.location}" mekanında. 
      Oyuncunun eylemlerine mantıklı, eğlenceli ve sürükleyici tepkiler ver. 
      Arada bir konuyla ilgili gerçek bilgiler (bilimsel, tarihi vb.) serpiştir.
      Kısa ve öz konuş. Karakterlerin sesinden konuş.
      
      Yanıtını şu JSON formatında ver:
      {
        "text": "Oyun yöneticisinin cevabı (Markdown formatında olabilir)",
        "imagePrompt": "Mevcut durumu veya mekanı betimleyen, görsel oluşturma yapay zekası için İngilizce bir prompt (isteğe bağlı, sadece sahne değiştiğinde veya önemli bir an olduğunda ekle)"
      }` }] },
      ...gameState.history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      { role: "user", parts: [{ text: userInput }] }
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    let cleanText = response.text;
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    return { text: response.text };
  }
} catch (error) {
  console.error("Chat error:", error);
  throw error;
}
}
