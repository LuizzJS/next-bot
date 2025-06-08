export default {
  command: 'ratio',
  aliases: [],
  args: false,
  description: 'Configura a proporção das figurinhas (1:1 ou original)',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  commandUsage: '',
  execute: async function ({ socket, message }) {
    const from = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;
    const phoneNumber = senderId.replace('@s.whatsapp.net', '');

    const replyText =
      '📐 *Escolha a proporção para suas figurinhas:* \n\n' +
      '1️⃣ *1:1* (figurinhas esticadas)\n' +
      '2️⃣ *original* (figurinhas com proporção original)\n\n' +
      'Por favor, *responda esta mensagem* com o número da sua escolha (1 ou 2).';

    const sentMsg = await socket.sendMessage(from, { text: replyText });

    if (!socket.awaitingRatioResponse) socket.awaitingRatioResponse = new Map();

    socket.awaitingRatioResponse.set(phoneNumber);
  },
};
