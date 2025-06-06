import sanitize from '../functions/sanitize.js';

export default {
  command: 'eval',
  aliases: [],
  args: true,
  description: 'Executa código JavaScript no servidor.',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: true,
  commandUsage: 'eval <code>',
  execute: async function ({ socket, message, args }) {
    try {
      const code = args.join(' ');
      const asyncEval = new Function(
        'socket',
        'message',
        'args',
        `return (async () => {${code}})();`
      );
      const result = await asyncEval(socket, message, args);

      if (result === undefined) {
        await socket.sendMessage(message.key.remoteJid, {
          text: '✅ Código executado com sucesso.',
        });
        return;
      }
      const output =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      await socket.sendMessage(message.key.remoteJid, {
        text: sanitize(`N: ${output}`),
      });
    } catch (error) {
      await socket.sendMessage(message.key.remoteJid, {
        text: sanitize(`Error: ${error.message}`),
      });
      console.error('❌ Error while using eval: ', error);
    }
  },
};
