export default {
  name: 'withdraw',
  args: true,
  description: 'Saca dinheiro do banco para o seu cash.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,
  execute: async ({ client, message, args }) => {
    const phone = message.sender?.id.replace('@c.us', '');
    const amount = Number(args[0]);
    if (!amount || isNaN(amount) || amount <= 0) {
      return client.reply(
        message.chatId,
        '❌ Informe um valor válido para sacar.',
        message.id
      );
    }

    const user = await client.db.User.findOne({ phone });
    if (!user)
      return client.reply(
        message.chatId,
        '❌ Usuário não encontrado.',
        message.id
      );

    if ((user.economy.bank || 0) < amount) {
      return client.reply(
        message.chatId,
        '❌ Saldo insuficiente no banco.',
        message.id
      );
    }

    try {
      await user.removeBank(amount, 'Saque do banco', 'withdraw');
      await user.addMoney(amount, 'Saque do banco', 'withdraw');

      // Recarrega o usuário para pegar os dados atualizados
      await user.reload();

      return client.reply(
        message.chatId,
        `✅ Saque de R$${amount.toFixed(2)} realizado com sucesso!\n` +
          `💵 Saldo carteira: R$${(user.economy.cash || 0).toFixed(2)}\n` +
          `🏦 Saldo banco: R$${(user.economy.bank || 0).toFixed(2)}`,
        message.id
      );
    } catch (error) {
      console.error('Erro no saque:', error);
      return client.reply(
        message.chatId,
        '❌ Erro ao realizar saque.',
        message.id
      );
    }
  },
};
