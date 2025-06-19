export default {
  name: 'autosticker',
  args: false,
  description: 'Alterna o estado de auto sticker do usuário.',
  group_only: false,
  bot_owner_only: false,
  admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    try {
      const senderId = message.sender?.id || message.author || message.from;
      const userPhone = senderId.replace('@c.us', '');

      let user = await client.db.User.findOne({ phone: userPhone });

      if (!user) {
        const sender = await client.getContact(senderId);
        user = await client.db.User.create({
          name: sender?.pushname || 'Desconhecido',
          phone: userPhone,
          config: { autoSticker: true },
        });

        await client.reply(
          message.chatId,
          `✅ Auto-sticker ativado.`,
          message.id
        );
        console.log(
          `[AUTO] Auto-sticker ativado para novo usuário: ${userPhone}`
        );
        return;
      }

      const current = user.config?.autoSticker ?? false;
      user.config = {
        ...user.config,
        autoSticker: !current,
      };

      await user.save();

      const status = user.config.autoSticker ? 'ativado' : 'desativado';
      await client.reply(
        message.chatId,
        `✅ Auto-sticker ${status}.`,
        message.id
      );
      console.log(`[AUTO] Auto-sticker ${status} para usuário ${userPhone}`);
    } catch (err) {
      console.error('❌ Erro ao alternar auto-sticker do usuário:', err);
      await client.reply(
        message.chatId,
        '❌ Erro ao alternar auto-sticker. Tente novamente.',
        message.id
      );
    }
  },
};
