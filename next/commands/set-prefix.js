export default {
  name: 'prefix',
  args: true,
  description: 'Muda o prefixo do grupo atual',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: true,
  execute: async ({ client, message, args }) => {
    const newPrefix = args[0];

    if (!newPrefix || newPrefix.length > 3) {
      return client.sendText(
        message.chatId,
        '❌ Prefixo inválido. Use até 3 caracteres. Ex: `/prefix !`',
      );
    }

    try {
      const groupId = message.chatId;

      await client.db.Group.findOneAndUpdate(
        { id: groupId },
        { $set: { prefix: newPrefix } },
        { upsert: true },
      );

      return client.sendText(
        groupId,
        `✅ Prefixo atualizado com sucesso para: *${newPrefix}*`,
      );
    } catch (error) {
      console.error('Erro ao atualizar prefixo:', error);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao tentar alterar o prefixo.',
      );
    }
  },
};
