export default {
  name: 'gpauto',
  args: false,
  description: 'Alterna o estado de auto sticker do grupo.',
  group_only: true,
  bot_owner_only: false,
  admin_only: true,

  execute: async ({ client, message }) => {
    try {
      const groupId = message.chatId;

      let group = await client.db.Group.findOne({ id: groupId });

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
              autoSticker: false,
            },
          },
          { upsert: true, new: true }
        );

        await client.sendText(groupId, '✅ Auto-sticker ativado neste grupo!');
        console.log(`[AUTO] Auto-sticker ativado para novo grupo: ${groupId}`);
        return;
      }

      group.autoSticker = !group.autoSticker;
      await group.save();

      const status = group.autoSticker ? 'ativado' : 'desativado';
      await client.sendText(groupId, `✅ Auto-sticker ${status} neste grupo.`);
      console.log(
        `[AUTO] Auto-sticker ${status} para grupo ${group.name} (${group.id})`
      );
    } catch (err) {
      console.error('❌ Erro ao alternar auto-sticker:', err);
      await client.sendText(
        message.chatId,
        '❌ Erro ao alternar auto-sticker. Tente novamente.'
      );
    }
  },
};
