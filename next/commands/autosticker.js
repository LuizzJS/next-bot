export default {
  name: 'autosticker',
  args: false,
  description:
    'Ativa ou desativa o modo auto-sticker para você (responderá automaticamente com stickers).',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    try {
      const senderId = message.sender?.id || message.author || message.from;
      if (!senderId) {
        return await client.reply(
          message.chatId,
          '❌ Usuário não identificado.',
          message.id
        );
      }
      const userPhone = senderId.replace('@c.us', '');

      let user = await client.db.User.findOne({ phone: userPhone });

      if (!user) {
        const sender = await client.getContact(senderId);
        user = await client.db.User.create({
          name: sender?.pushname || sender?.verifiedName || 'Desconhecido',
          phone: userPhone,
          config: { autoSticker: true },
        });

        await client.reply(
          message.chatId,
          '✅ Auto-sticker ativado para você!',
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
        `✅ Auto-sticker ${status} para você.`,
        message.id
      );

      console.log(`[AUTO] Auto-sticker ${status} para usuário ${userPhone}`);
    } catch (err) {
      console.error('❌ Erro ao alternar auto-sticker do usuário:', err);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao alternar auto-sticker. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};
