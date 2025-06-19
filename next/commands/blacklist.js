export default {
  name: 'blacklist',
  args: true,
  description: 'Adiciona ou remove um usuário da lista negra (blacklisted).',
  group_only: true,
  bot_owner_only: true,
  group_admin_only: false, // só admin do grupo pode usar
  execute: async ({ client, message, args, prefix }) => {
    try {
      const u = await client.findUser({
        chat: message.chat,
        input: args.join(' '),
        client,
        message,
      });

      if (!u || !u.phone) {
        return await client.reply(
          message.chatId,
          '❌ Usuário não encontrado.',
          message.id
        );
      }

      // Procura o usuário no banco
      const user = await client.db.User.findOne({ phone: u.phone });
      if (!user) {
        return await client.reply(
          message.chatId,
          '❌ Usuário não encontrado no banco de dados.',
          message.id
        );
      }

      // Alterna o campo blacklisted
      user.blacklisted = !user.blacklisted;
      await user.save();

      const status = user.blacklisted ? 'adicionado à' : 'removido da';

      await client.reply(
        message.chatId,
        `✅ Usuário ${user.name || user.phone} foi ${status} lista negra.`,
        message.id
      );
    } catch (error) {
      console.error('Erro no comando blacklist:', error);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao executar o comando blacklist.',
        message.id
      );
    }
  },
};
