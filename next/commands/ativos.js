export default {
  name: 'ativos',
  args: false,
  description: 'Mostra a lista de membros ativos do grupo',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const groupId = message.chatId; // Exemplo: '123456@g.us'
    const groupKey = groupId.replace('@g.us', '@g_us');

    try {
      // Pega todos os usuários da database
      const allUsers = await client.db.User.findAll();

      const leaderboard = [];

      for (const user of allUsers) {
        const userId = user.id; // Exemplo: '391234567890'
        const userData = user.data;

        // Verifica se o usuário tem dados para este grupo
        if (userData && typeof userData.get === 'function') {
          const grupoData = userData.get(groupKey);
          if (grupoData && grupoData.mensagens) {
            leaderboard.push({
              userId,
              name: user.name || userId,
              mensagens: grupoData.mensagens,
            });
          }
        }
      }

      if (leaderboard.length === 0) {
        await client.sendText(
          groupId,
          'Nenhum dado de atividade encontrado neste grupo.'
        );
        return;
      }

      // Ordena do mais ativo para o menos ativo
      leaderboard.sort((a, b) => b.mensagens - a.mensagens);

      // Cria a mensagem da leaderboard
      let resposta = `🏆 *Ranking de Atividade - ${leaderboard.length} usuários*\n\n`;
      const top = leaderboard.slice(0, 10); // Top 10

      top.forEach((user, index) => {
        resposta += `${index + 1}. *${user.name}* — ${
          user.mensagens
        } mensagens\n`;
      });

      await client.sendText(groupId, resposta);
    } catch (err) {
      console.error('Erro ao gerar leaderboard de ativos:', err);
      await client.sendText(
        groupId,
        '❌ Ocorreu um erro ao buscar os membros ativos.'
      );
    }
  },
};
