const groupHandler = async ({ event, client }) => {
  try {
    const isFromParticipantsChange = (event?.action && event?.who) || false;

    let groupId, groupName;

    if (isFromParticipantsChange) {
      const botNumber = (await client.getMe()).id;
      if (event.action !== 'add' || event.who !== botNumber) return;

      groupId = event.chat;
      const groupChat = await client.getChatById(groupId);
      groupName =
        groupChat.name || groupChat.formattedTitle || 'Grupo sem nome';
    } else {
      // Veio de onAddedToGroup
      groupId = event.id;
      groupName = event.name || event.formattedTitle || 'Grupo sem nome';
    }

    const existing = await client.db.Group.findOne({ id: groupId });
    if (existing) return;

    let inviteLink = null;
    try {
      inviteLink = await client.getGroupInviteLink(groupId);
    } catch (inviteErr) {
      console.warn(
        `⚠️ Não foi possível obter link de convite do grupo ${groupName} (${groupId})`,
      );
    }

    await client.db.Group.create({
      id: groupId,
      name: groupName,
      inviteLink,
      prefix: client.prefix,
    });

    console.log(`✅ Grupo registrado: ${groupName} (${groupId})`);
  } catch (err) {
    console.error('❌ Erro ao registrar grupo:', err?.message || err);
  }
};

export default groupHandler;
