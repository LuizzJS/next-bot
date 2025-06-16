import util from 'util';

export default {
  name: 'eval',
  args: true,
  description:
    'Executa código JavaScript dinamicamente (apenas para o dono do bot)',
  group_only: false,
  bot_owner_only: true,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const chatId = message.chatId;
    const code = args.join(' ');

    try {
      // Função auxiliar para enviar mensagens
      const print = async (msg) => {
        await client.sendText(chatId, String(msg));
      };

      // Avaliação assíncrona com variáveis disponíveis no escopo
      const evaled = await (async () => {
        // Variáveis injetadas no escopo do eval
        const ctx = { client, message, args, print };
        return await eval(
          `(async ({ client, message, args, print }) => { ${code} })`,
        )(ctx);
      })();

      // Processamento da saída
      let output =
        typeof evaled !== 'string'
          ? util.inspect(evaled, { depth: 1 })
          : evaled;

      if (output.length > 3000) output = output.slice(0, 2997) + '...';

      await client.sendText(message.sender.id, `\n\`\`\`\n${output}\n\`\`\``);
    } catch (err) {
      let error = err.stack || err.toString();
      if (error.length > 3000) error = error.slice(0, 2997) + '...';

      await client.sendText(
        message.sender.id,
        `❌ Erro:\n\`\`\`\n${error}\n\`\`\``,
      );
    }
  },
};
