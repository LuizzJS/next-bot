export default {
  name: 'gpauto',
  args: false,
  description:
    'Ativa ou desativa o envio automático de stickers em mensagens com mídia no grupo.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: true,

  execute: async ({ client, message, args, prefix }) => {
    try {
      const groupId = message.chatId;

      let group = await client.db.Group.findOne({ id: groupId });

      // Caso o grupo ainda não esteja registrado
      if (!group) {
        const chat = await client.getChatById(groupId);
        const inviteLink = await client
          .getGroupInviteLink(groupId)
          .catch(() => null);

        group = await client.db.Group.findOneAndUpdate(
          { id: groupId },
          {
            $set: {
              name: chat.name,
              inviteLink,
              'settings.autoSticker': true,
            },
          },
          { upsert: true, new: true }
        );

        await client.reply(
          groupId,
          '✅ O modo *auto-sticker* foi *ativado* neste grupo!',
          message.id
        );
        console.log(`[AUTO] Auto-sticker ativado para novo grupo: ${groupId}`);
        return;
      }

      // Alternar o valor atual
      group.settings.autoSticker = !group.settings.autoSticker;
      await group.save();

      const status = group.settings.autoSticker ? 'ativado' : 'desativado';

      await client.reply(
        groupId,
        `✅ O modo *auto-sticker* foi *${status}* neste grupo.`,
        message.id
      );

      console.log(
        `[AUTO] Auto-sticker ${status} para grupo ${group.name} (${group.id})`
      );
    } catch (err) {
      console.error('❌ Erro ao alternar auto-sticker:', err);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao alterar o modo auto-sticker. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};
