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
      let limit = parseInt(args[0]) || 5;
      if (limit < 1) limit = 5;
      if (limit > 10) limit = 10;

      // Ordenar transações da mais recente para a mais antiga
      const transactions = (user.economy.transactions || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      if (transactions.length === 0) {
        return await client.sendText(
          chatId,
          '📊 Nenhuma transação encontrada!'
        );
      }

      let msg = '📊 *HISTÓRICO FINANCEIRO* 📊\n\n';

      transactions.forEach((trans) => {
        const typeIcon = trans.type === 'income' ? '⬆️' : '⬇️';
        const date = trans.createdAt
          ? new Date(trans.createdAt).toLocaleDateString('pt-BR')
          : 'Data desconhecida';
        const amountFormatted = Number(trans.amount).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        msg += `${typeIcon} *${trans.description || 'Sem descrição'}*\n`;
        msg += `💰 R$${amountFormatted} • ${date}\n`;
        msg += `📌 ${trans.source || 'Fonte desconhecida'}\n\n`;
      });

      const saldoFormatado = Number(user.economy.cash).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      msg += `💰 *Saldo atual:* R$${saldoFormatado}`;

      await client.sendText(chatId, msg);
    } catch (error) {
      console.error('Erro no histórico:', error);
      await client.sendText(chatId, '❌ Erro ao ver histórico.');
    }
  },
};
