import { GoogleGenAI, createUserContent } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GMN_KEY });

// Mapa para guardar o histórico de conversa por usuário (memória curta)
const userMemories = new Map();

export default {
  name: 'ai',
  aliases: ['ia', 'next'],
  description: 'Converse com a IA dentro do WhatsApp.',

  execute: async ({ client, message, args }) => {
    const chatId = message.chatId;
    const senderId = message.sender?.id || message.sender;

    if (!senderId) {
      const msg =
        client.messages?.errors?.userNotIdentified?.pt ??
        '❌ Usuário não identificado.';
      return client.reply(chatId, msg, message.id);
    }

    const userPrompt = args.join(' ').trim();
    const quotedText = message.quotedMsg?.body?.trim();

    if (!userPrompt && !quotedText) {
      const msg =
        client.messages?.errors?.emptyPrompt?.pt ??
        '❌ Por favor, envie uma mensagem ou cite uma mensagem para que eu possa responder.';
      return client.reply(chatId, msg, message.id);
    }

    try {
      // Recupera memória anterior, ou inicia array vazio
      let memory = userMemories.get(senderId) || [];

      // Adiciona contexto citado (de outra pessoa)
      if (quotedText) {
        memory.push({ role: 'partner', content: quotedText });
      }

      // Adiciona prompt do usuário
      if (userPrompt) {
        memory.push({ role: 'user', content: userPrompt });
      }

      // Limita o histórico a últimas 6 mensagens para contexto
      if (memory.length > 6) {
        memory = memory.slice(memory.length - 6);
      }

      // Salva memória atualizada
      userMemories.set(senderId, memory);

      // Prepara conteúdo para a API: concatena textos
      const parts = memory.map((m) => m.content);
      const contents = [createUserContent(parts)];

      // Chama a API Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });

      // Pega resposta da IA
      const textResponse =
        response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        '⚠️ Nenhuma resposta gerada.';

      // Adiciona resposta da IA na memória
      memory.push({ role: 'assistant', content: textResponse });
      if (memory.length > 6) memory.shift(); // mantém o tamanho máximo
      userMemories.set(senderId, memory);

      // Envia resposta para o usuário, formatando o texto para WhatsApp
      await client.reply(
        chatId,
        textResponse.replaceAll('**', '*'),
        message.id
      );
    } catch (error) {
      console.error('Erro na integração com Gemini:', error);
      const msg =
        client.messages?.errors?.aiError?.pt ??
        '❌ Erro ao se comunicar com a Gemini AI.';
      await client.reply(chatId, msg, message.id);
    }
  },
};
