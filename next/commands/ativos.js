export default {
  name: 'ativos',
  args: false,
  description: 'Mostra a lista de membros ativos do grupo',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const groupId = message.chatId; // Ex: 5521xxxxxx@g.us
    const groupKey = groupId.replace('.', '_'); // Ex: 5521xxxxxx@g_us

    try {
      const users = await client.db.User.find();
      const leaderboard = [];

      for (const user of users) {
        const userData =
          user.data instanceof Map ? user.data.get(groupKey) : null;
        if (!userData || typeof userData.messages !== 'number') continue;

        let contact;
        try {
          contact = await client.getContact(user.phone + '@c.us');
        } catch {
          contact = null;
        }

        leaderboard.push({
          name: contact?.pushname || contact?.name || user.name || 'Unknown',
          messages: userData.messages,
        });
      }

      if (leaderboard.length === 0) {
        return await client.sendText(
          message.chatId,
          'Nenhum dado de atividade encontrado neste grupo.',
        );
      }

      leaderboard.sort((a, b) => b.messages - a.messages);
      const medals = ['🥇', '🥈', '🥉'];
      let resposta = '🏆 *Ranking de Atividade* 🏆\n\n';
      leaderboard.slice(0, 10).forEach((u, i) => {
        resposta += `${medals[i] || `${i + 1}.`} *${u.name}* — ${
          u.messages
        } mensagens\n`;
      });

      await client.sendText(message.chatId, resposta);
    } catch (e) {
      console.error('Erro ao gerar leaderboard:', e);
      await client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao buscar os membros ativos.',
      );
    }
  },
};
