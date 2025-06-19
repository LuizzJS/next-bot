import { GoogleGenAI, createUserContent } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GMN_KEY });

const translationPrompt = (text) => `
Traduza o texto abaixo para português, mantendo a parte entre aspas exatamente igual, sem repetir o texto original.

Texto para traduzir:
"${text}"

Responda apenas com a *tradução*, nada mais!!!
`;

export default {
  name: 'curiosidade',
  args: false,
  description: 'Envia uma curiosidade aleatória.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const apiNinjasKey = process.env.NJC_KEY;
    if (!apiNinjasKey) {
      return client.reply(
        message.chatId,
        '❌ Chave da API Api Ninjas não configurada.',
        message.id
      );
    }

    try {
      // Faz a requisição para Api Ninjas
      const res = await fetch('https://api.api-ninjas.com/v1/facts', {
        headers: { 'X-Api-Key': apiNinjasKey },
      });

      if (!res.ok) {
        throw new Error(`Api Ninjas error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!data?.[0]?.fact) {
        return client.reply(
          message.chatId,
          '❌ Não consegui obter uma curiosidade agora. Tente novamente mais tarde.',
          message.id
        );
      }

      const fact = data[0].fact;
      const contents = [createUserContent(translationPrompt(fact))];

      // Chama Google Gemini AI para tradução
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });

      const translated =
        response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!translated) {
        return client.reply(
          message.chatId,
          '❌ Erro ao traduzir a curiosidade.',
          message.id
        );
      }

      await client.reply(
        message.chatId,
        `🤓 Curiosidade:\n\n${translated}`,
        message.id
      );
    } catch (error) {
      console.error('Erro no comando curiosidade:', error);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao buscar a curiosidade.',
        message.id
      );
    }
  },
};
