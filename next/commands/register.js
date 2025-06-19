export default {
  name: 'register',
  aliases: ['registrar', 'registro'],
  args: false,
  description: 'Autoriza seu usuário no sistema',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,
  authorized: false,

  execute: async ({ client, message }) => {
    const { sender, from, chatId } = message;
    const phone = (sender?.id || from || '').replace('@c.us', '');

    // Função para formatar mensagens com placeholders
    const formatMsg = (template, data = {}) => {
      let msg = template;
      for (const [key, value] of Object.entries(data)) {
        msg = msg.replace(new RegExp(key, 'g'), value);
      }
      return msg;
    };

    // Mensagens padrão (expanda futuramente para multilíngue)
    const messages = {
      userNotFound:
        '❌ Seu usuário não foi encontrado. Envie uma mensagem normal primeiro.',
      alreadyAuthorized: '✅ Você já está autorizado no sistema!',
      success:
        '🔓 *Autorização concluída!*\n\nAgora você tem acesso completo ao bot!',
      error: '❌ Falha na autorização. Tente novamente.',
    };

    try {
      if (!phone) {
        return await client.reply(
          chatId,
          '❌ Usuário não identificado.',
          message.id
        );
      }

      const user = await client.db.User.findOne({ phone });

      if (!user) {
        return await client.reply(chatId, messages.userNotFound, message.id);
      }

      if (user.authorized) {
        return await client.reply(
          chatId,
          messages.alreadyAuthorized,
          message.id
        );
      }

      await client.db.User.updateOne(
        { phone },
        { $set: { authorized: true, registeredAt: new Date() } }
      );

      return await client.reply(chatId, messages.success, message.id);
    } catch (error) {
      console.error('Erro no comando register:', error);
      return await client.reply(chatId, messages.error, message.id);
    }
  },
};
