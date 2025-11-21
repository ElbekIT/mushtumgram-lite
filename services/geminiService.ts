import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Contact } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Store active chat sessions in memory
const chatSessions: Record<string, Chat> = {};

export const getChatResponse = async (
  contact: Contact,
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  // Do not reply for saved messages
  if (contact.isSavedMessages) {
    return "";
  }

  if (!apiKey) {
    return "API kaliti topilmadi. Iltimos, sozlamalarni tekshiring.";
  }

  try {
    let chat = chatSessions[contact.id];

    if (!chat) {
      // Initialize a new chat session for this contact with their specific persona
      chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `Sen ${contact.name}san. ${contact.systemInstruction || ''}. Javoblaring qisqa va Telegram uslubida bo'lsin. O'zbek tilida gaplash.`,
        },
        history: history, // Pass existing conversation history context if needed
      });
      chatSessions[contact.id] = chat;
    }

    const response: GenerateContentResponse = await chat.sendMessage({
      message: userMessage,
    });

    return response.text || "...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uzr, hozir javob bera olmayman. Keyinroq yozing.";
  }
};