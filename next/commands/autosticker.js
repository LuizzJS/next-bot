export default {
  name: 'autosticker',
  args: false,
  description: 'Alterna o estado de auto sticker do usuário.',
  group_only: true,
  bot_owner_only: false,
  admin_only: true,

  execute: async ({ client, message }) => {
    try {
      const sender_id = message.sender?.id || message.author || message.from;
      const user_phone = sender_id.replace('@c.us', '');

      let user = await client.db.User.findOne({ phone: user_phone });

      if (!user) {
        const sender = await client.getContact(sender_id);
        user = await client.db.User.create({
          name: sender.pushname || 'Desconhecido',
          phone: user_phone,
        });

        await client.sendText(
          message.chatId,
          `✅ Auto-sticker ativado para @${user_phone}.`,
          { mentions: [sender_id] }
        );
        console.log(
          `[AUTO] Auto-sticker ativado para novo usuário: ${user_phone}`
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
      await client.sendText(
        message.chatId,
        `✅ Auto-sticker ${status} para @${user_phone}.`,
        { mentions: [sender_id] }
      );
      console.log(`[AUTO] Auto-sticker ${status} para usuário ${user_phone}`);
    } catch (err) {
      console.error('❌ Erro ao alternar auto-sticker do usuário:', err);
      await client.sendText(
        message.chatId,
        '❌ Erro ao alternar auto-sticker. Tente novamente.'
      );
    }
  },
};
