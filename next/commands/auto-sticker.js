export default {
  command: 'autosticker',
  args: false,
  description: 'Toggle automatic sticker creation for images and videos.',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  commandUsage: 'autosticker',
  execute: async function ({ socket, message, args }) {
    const from = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;
    const phoneNumber = senderId.replace('@s.whatsapp.net', '');

    const user = await socket.db.User.findOne({ phone: phoneNumber });

    if (!user) {
      console.warn(`⚠️ Usuário não encontrado: ${phoneNumber}`);
      return;
    }

    user.config.autoSticker = !user.config.autoSticker;
    await user.save();

    const statusMessage = user.config.autoSticker
      ? '✅ Auto-sticker ativado com sucesso!'
      : '❌ Auto-sticker desativado com sucesso!';

    await socket.sendMessage(from, {
      text: statusMessage,
    });

    console.log(
      `📥 Configuração de auto-sticker para ${phoneNumber}: ${user.config.autoSticker}`
    );
  },
};
