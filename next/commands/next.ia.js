import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GMN_KEY,
});

export default {
  name: 'ai',
  aliases: ['ia', 'next_ia'],
  args: true,
  argsLength: Infinity,
  description: 'Integração com a Gemini AI (texto)',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    try {
      const userPrompt = args.join(' ').trim();
      const basePrompt = process.env.NEXTBOT_PROMPT;

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: basePrompt }],
          },
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      });

      const response =
        result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        '⚠️ Nenhuma resposta gerada.';

      await client.reply(message.chatId, response, message.id);
    } catch (error) {
      console.error('Erro na integração com Gemini:', error);
      await client.reply(
        message.chatId,
        '❌ Erro ao se comunicar com a Gemini AI.',
        message.id,
      );
    }
  },
};
