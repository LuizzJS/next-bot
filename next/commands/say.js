import sanitize from '../functions/sanitize.js';

export default {
  command: 'say',
  args: true,
  description: 'Sends a message as the bot.',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  commandUsage: 'say <message>',
  execute: async function ({ socket, message, args }) {
    const text = sanitize(args.join(' '));
    await socket.sendMessage(message.key.remoteJid, {
      text,
    });
  },
};
