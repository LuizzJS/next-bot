export default {
  name: 'historico',
  aliases: ['extrato', 'transacoes'],
  description: 'Mostra seu histórico financeiro',
  group_only: false,

  async execute({ client, message, args }) {
    const { User } = client.db;
    const chatId = message.chatId;
    const senderId = message.sender.id.replace('@c.us', '');

    try {
      const user = await User.findOne({ phone: senderId });
      if (!user) {
        return await client.sendText(chatId, '❌ Você não está registrado!');
      }

      // Limite máximo de transações mostradas
      let limit = parseInt(args[0], 10) || 5;
      if (limit < 1) limit = 5;
      if (limit > 10) limit = 10;

      const transactions = (user.transactions || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      if (transactions.length === 0) {
        return await client.sendText(
          chatId,
          '📊 Nenhuma transação encontrada!'
        );
      }

      let msg = '📊 *Histórico financeiro:*\n\n';

      transactions.forEach((trans) => {
        const typeIcon = trans.type === 'income' ? '⬆️' : '⬇️';
        const date = trans.createdAt
          ? new Date(trans.createdAt).toLocaleString('pt-BR')
          : 'Data desconhecida';
        const amountFormatted = Number(trans.amount).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        msg += `${typeIcon} *${trans.description || 'Sem descrição'}*\n`;
        msg += `💰 ${amountFormatted} • ${date}\n\n`;
      });

      const saldoFormatado = Number(user.economy.cash).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      msg += `💰 *Saldo atual:* ${saldoFormatado}`;

      await client.sendText(chatId, msg);
    } catch (error) {
      console.error('Erro no histórico:', error);
      await client.sendText(chatId, '❌ Erro ao ver histórico.');
    }
  },
};
