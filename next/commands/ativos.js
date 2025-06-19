import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
dayjs.extend(relativeTime);

export default {
  name: 'ativos',
  args: false,
  description:
    'Exibe o ranking de membros mais ativos do grupo com estatísticas de mensagens e última atividade.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const groupId = message.chatId;

    try {
      const group = await client.db.Group.findOne({ id: groupId }).lean();

      if (
        !group ||
        !group.userActivities ||
        Object.keys(group.userActivities).length === 0
      ) {
        return await client.reply(
          groupId,
          '📭 Nenhuma atividade registrada neste grupo ainda.',
          message.id
        );
      }

      const activities = Object.entries(group.userActivities)
        .map(([userId, data]) => ({
          userId,
          messageCount: data.messageCount || 0,
          lastActivity: data.lastActivity || null,
        }))
        .sort((a, b) => b.messageCount - a.messageCount);

      const topMembers = await Promise.all(
        activities.slice(0, 15).map(async (activity) => {
          const userId = activity.userId;
          try {
            const contact = await client.getContact(userId + '@c.us');
            return {
              name: contact?.pushname || contact?.name || 'Desconhecido',
              messages: activity.messageCount,
              lastSeen: activity.lastActivity
                ? dayjs(activity.lastActivity).fromNow()
                : 'Nunca visto',
            };
          } catch {
            return {
              name: 'Desconhecido',
              messages: activity.messageCount,
              lastSeen: activity.lastActivity
                ? dayjs(activity.lastActivity).fromNow()
                : 'Não disponível',
            };
          }
        })
      );

      const totalMessages = activities.reduce(
        (sum, a) => sum + a.messageCount,
        0
      );
      const activeUsers = activities.length || 1;
      const averageMessages = (totalMessages / activeUsers).toFixed(1);

      const medals = ['🥇', '🥈', '🥉'];

      let resposta =
        `📈 *Estatísticas do grupo:*

` +
        `👥 Membros ativos: ${activeUsers}
` +
        `💬 Total de mensagens: ${totalMessages}
` +
        `📊 Média por usuário: ${averageMessages}

`;

      topMembers.slice(0, 10).forEach((user, index) => {
        resposta += `${medals[index] || `▫️${index + 1}.`} *${user.name}*:  ${
          user.messages
        } mensagens\n⏱️ Última atividade: ${user.lastSeen}\n\n`;
      });

      if (topMembers.length > 10) {
        resposta += `\n🔹 *Próximos do ranking:*\n`;
        topMembers.slice(10, 15).forEach((user, index) => {
          resposta += `${index + 11}. ${user.name} (${user.messages})\n`;
        });
      }

      await client.reply(groupId, resposta, message.id);
    } catch (e) {
      console.error('Erro ao gerar leaderboard:', e);
      await client.reply(
        groupId,
        '❌ Ocorreu um erro ao processar o ranking. Por favor, tente novamente mais tarde.',
        message.id
      );
    }
  },
};
