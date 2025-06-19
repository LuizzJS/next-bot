import util from 'util';

export default {
  name: 'eval',
  args: true,
  description:
    'Executa código JavaScript dinamicamente (apenas para o dono e administradores do bot)',
  group_only: false,
  bot_owner_only: true,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const chatId = message.chatId;
    const code = args.join(' ');

    try {
      const print = async (msg) => {
        await client.reply(chatId, String(msg), message.id);
      };

      const evaled = await (async () => {
        const ctx = { client, message, args, print, console, process };
        return await eval(
          `(async ({ client, message, args, print, console, process }) => { ${code} })`
        )(ctx);
      })();

      let output =
        typeof evaled !== 'string'
          ? util.inspect(evaled, { depth: 1 })
          : evaled;

      if (output.length > 3000) output = output.slice(0, 2997) + '...';

      await client.reply(client.owner, `\`\`\`\n${output}\n\`\`\``, message.id);
    } catch (err) {
      let error = err.stack || err.toString();
      if (error.length > 3000) error = error.slice(0, 2997) + '...';

      await client.reply(
        chatId,
        `❌ Erro:\n\`\`\`\n${error}\n\`\`\``,
        message.id
      );
    }
  },
};
