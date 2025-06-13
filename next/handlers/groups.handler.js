const groupHandler = async ({ event, client }) => {
  try {
    if (
      event.action !== 'add' ||
      event.who !== client.getHostNumber() + '@c.us'
    )
      return;

    const groupData = await client.getChatById(event.chat);

    const existing = await client.db.Group.findOne({ id: groupData.id });
    if (existing) return;

    const inviteLink = await client.getGroupInviteLink(groupData.id);

    await client.db.Group.create({
      id: groupData.id,
      name: groupData.name,
      inviteLink,
      addedBy: event.author,
    });

    console.log(`✅ Grupo registrado: ${groupData.name} (${groupData.id})`);
  } catch (err) {
    console.error('❌ Erro ao registrar grupo:', err.message);
  }
};

export default groupHandler;
