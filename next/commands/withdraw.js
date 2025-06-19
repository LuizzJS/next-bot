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

    if (user.economy.bank < amount) {
      return client.reply(
        message.chatId,
        '❌ Saldo insuficiente no banco.',
        message.id
      );
    }

    try {
      // Usa método removeBank para retirar do banco com registro
      await user.removeBank(amount, 'Saque do banco', 'withdraw');

      // Adiciona no cash com registro
      await user.addMoney(amount, 'Saque do banco', 'withdraw');

      return client.reply(
        message.chatId,
        `✅ Saque de R$${amount.toFixed(
          2
        )} realizado com sucesso! Saldo cash: R$${user.economy.cash.toFixed(
          2
        )}.`,
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
