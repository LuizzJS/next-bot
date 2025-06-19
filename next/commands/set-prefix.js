export default {
  name: 'prefix',
  aliases: ['prefixo'],
  args: true,
  description: 'Altera o prefixo do grupo atual (padrão: "/")',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: true,

  execute: async ({ client, message, args }) => {
    const groupId = message.chatId;
    const newPrefix = args[0]?.trim();

    if (!newPrefix) {
      return await client.reply(
        groupId,
        `❌ Por favor, informe um novo prefixo. Exemplo: /prefixo !`,
        message.id
      );
    }

    if (newPrefix.length > 3) {
      return await client.reply(
        groupId,
        '❌ O prefixo deve ter no máximo 3 caracteres.',
        message.id
      );
    }

    if (/\s/.test(newPrefix)) {
      return await client.reply(
        groupId,
        '❌ O prefixo não pode conter espaços ou quebras de linha.',
        message.id
      );
    }

    try {
      const group = await client.db.Group.findOne({ id: groupId });
      const oldPrefix = group?.settings?.prefix || '/';

      if (!group) {
        // Cria novo grupo se não existir
        await client.db.Group.create({
          id: groupId,
          settings: { prefix: newPrefix },
        });

        return await client.reply(
          groupId,
          `✅ Prefixo definido para "${newPrefix}".\nAgora use comandos como: *${newPrefix}help*`,
          message.id
        );
      }

      await client.db.Group.findOneAndUpdate(
        { id: groupId },
        { $set: { 'settings.prefix': newPrefix } }
      );

      await client.reply(
        groupId,
        `✅ Prefixo alterado de "${oldPrefix}" para "${newPrefix}".\nAgora use comandos como: *${newPrefix}help*`,
        message.id
      );
    } catch (error) {
      console.error('Erro ao alterar prefixo:', error);
      await client.reply(
        groupId,
        '❌ Falha ao alterar o prefixo. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};
