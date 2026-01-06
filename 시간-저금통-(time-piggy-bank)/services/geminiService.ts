import { GoogleGenAI } from "@google/genai";
import { TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getEncouragementMessage = async (
  childName: string,
  amount: number,
  type: TransactionType
): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    let prompt = "";
    if (type === 'deposit') {
      prompt = `
        You are a cheerful, encouraging older sibling or guardian figure.
        ${childName} just studied for ${amount} minutes!
        Write a very short, enthusiastic message (1-2 sentences) in Korean praising them.
        Use emojis. Make them feel proud.
        Don't be too formal.
      `;
    } else {
      prompt = `
        You are a friendly guardian.
        ${childName} is using ${amount} minutes of their saved time to watch TV.
        Write a very short, friendly message (1 sentence) in Korean saying "Enjoy your break!" or "Have fun!".
        Remind them gently that resting is important too. Use emojis.
      `;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "참 잘했어요! 👍";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback messages in case of API failure
    if (type === 'deposit') return `${childName}, 정말 대단해! 오늘도 열심히 했구나! 👏`;
    return `${childName}, 즐거운 TV 시간 보내! 📺`;
  }
};