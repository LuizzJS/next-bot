export default {
  command: 'say',
  aliases: ['s'],
  args: true,
  groupOnly: false,
  commandUsage: 'say <message>',
  execute: async function ({ socket, message, args }) {
    const textToSend = args.join(' ');
    await socket.sendMessage(message.key.remoteJid, { text: textToSend });
  },
};
