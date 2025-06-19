export default {
  name: 'deposito',
  args: true,
  description: 'Deposita dinheiro do seu cash para o banco.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args }) => {
    const phone = message.sender?.id.replace('@c.us', '');
    const amount = Number(args[0]);

    if (!amount || isNaN(amount) || amount <= 0) {
      return client.reply(
        message.chatId,
        '❌ Informe um valor válido para depositar.',
        message.id
      );
    }

    const user = await client.db.User.findOne({ phone });
    if (!user) {
      return client.reply(
        message.chatId,
        '❌ Usuário não encontrado.',
        message.id
      );
    }

    if (user.economy.cash < amount) {
      return client.reply(
        message.chatId,
        '❌ Saldo insuficiente no cash.',
        message.id
      );
    }

    try {
      // Retira do cash e adiciona no bank com registro correto
      await user.removeMoney(amount, 'Depósito no banco', 'deposit');
      await user.addBank(amount, 'Depósito no banco', 'deposit');

      return client.reply(
        message.chatId,
        `✅ Depósito de R$${amount.toFixed(
          2
        )} realizado com sucesso! Saldo bank: R$${user.economy.bank.toFixed(
          2
        )}.`,
        message.id
      );
    } catch (error) {
      console.error('Erro no depósito:', error);
      return client.reply(
        message.chatId,
        '❌ Erro ao realizar depósito.',
        message.id
      );
    }
  },
};
