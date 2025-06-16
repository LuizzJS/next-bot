export default {
  name: 'magnates',
  args: false,
  description: 'Mostra os 5 usuários com maior saldo na economia.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,
  execute: async ({ client, message, args }) => {
    try {
      const { User } = client.db;

      // Busca os 5 usuários com maior saldo
      const topUsers = await User.find().sort({ 'economy.money': -1 }).limit(5);

      if (topUsers.length === 0) {
        return client.sendText(
          message.chatId,
          'Nenhum magnata encontrado ainda.',
        );
      }

      // Monta mensagem com ranking
      let reply = '💰 *Top Magnatas* 💰\n\n';

      topUsers.forEach((user, i) => {
        const name = user.name || 'Desconhecido';
        const money = user.economy?.money || 0;
        const formattedMoney = money.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        reply += `${i + 1}. *${name}* - ${formattedMoney}\n`;
      });

      await client.sendText(message.chatId, reply);
    } catch (err) {
      console.error('[MAGNATES] Erro:', err);
      return client.sendText(message.chatId, '❌ Erro ao buscar os magnatas.');
    }
  },
};
