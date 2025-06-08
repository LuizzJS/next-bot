export default {
  command: 'ativos',
  aliases: ['passivos'],
  args: false, // você pode mudar pra true se quiser usar args depois
  description: 'Lista os usuários do grupo com contagem de mensagens',
  groupOnly: true,
  adminOnly: false,
  ownerOnly: false,
  commandUsage: 'ativos',
  execute: async function ({ socket, message }) {
    const groupId = message.key.remoteJid;
    const groupKey = groupId.replace('.', '_');
    const allUsers = await socket.db.User.find();

    const usersInGroup = allUsers
      .map((user) => {
        const groupData = user.data.get(groupKey);
        if (!groupData || !groupData.mensagens) return null;
        if (String(user.name).includes('g.us')) return;

        return {
          name: user.name,
          phone: user.phone,
          mensagens: groupData.mensagens,
        };
      })
      .filter(Boolean);

    if (usersInGroup.length === 0) {
      return socket.sendMessage(groupId, {
        text: 'Nenhum usuário com mensagens registradas neste grupo.',
      });
    }

    usersInGroup.sort((a, b) => b.mensagens - a.mensagens);
    const medals = ['🥇', '🥈', '🥉'];
    const response = usersInGroup
      .map(
        (u, i) =>
          `${medals[i] || i + 1}. *${u.name}*: ${u.mensagens} ${
            u.mensagens > 1 ? 'mensagens' : 'mensagem'
          }`
      )
      .join('\n');

    await socket.sendMessage(groupId, {
      text: `📊 Atividade dos membros no grupo:\n\n${response}`,
    });
  },
};
