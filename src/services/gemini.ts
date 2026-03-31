import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
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
      model: "gemini-2.5-flash-image",
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
      model: "gemini-3-flash-preview",
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

    // JSON bazen markdown blokları içine sarılmış olabilir, temizleyelim
    const cleanText = response.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Senaryo oluşturma hatası:", error);
    throw error;
  }
}

export async function chatWithAI(gameState: GameState, userInput: string): Promise<AIResponse> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
    return JSON.parse(response.text);
  } catch (e) {
    return { text: response.text };
  }
}
