export default {
  command: 'say',
  args: true,
  description: '',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  commandUsage: 'say <message>',
  execute: async function ({ socket, message, args }) {
    await socket.sendMessage(message.key.remoteJid, args.split('')[1]);
  },
};
