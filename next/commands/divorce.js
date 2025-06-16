export default {
  name: 'divorce',
  args: false,
  description: 'Iniciar pedido de divórcio (global)',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado');

    try {
      const { Marriage } = client.db;

      const senderUser = await client.db.User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      if (!senderUser)
        return client.sendText(message.chatId, '❌ Usuário não registrado');

      const marriage = await Marriage.findOne({
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
        status: 'accepted',
      });

      if (!marriage)
        return client.sendText(message.chatId, '❌ Você não está casado(a)');

      if (marriage.divorceStatus === 'pending') {
        return client.sendText(
          message.chatId,
          '❌ Já existe um pedido de divórcio pendente.',
        );
      }

      marriage.divorceStatus = 'pending';
      marriage.divorceRequester = senderUser._id;
      await marriage.save();

      const partnerId = marriage.partner1.equals(senderUser._id)
        ? marriage.partner2
        : marriage.partner1;
      const partnerUser = await client.db.User.findById(partnerId);

      await client.sendText(
        message.chatId,
        `⚠️ Pedido de divórcio iniciado entre ${senderUser?.name} e ${
          partnerUser?.name || 'seu parceiro(a)'
        }. O outro parceiro pode "${prefix}confirmar" ou "${prefix}retirar".`,
      );
    } catch (error) {
      console.error('Erro no comando divorce:', error);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao iniciar o pedido de divórcio. Tente novamente mais tarde.',
      );
    }
  },
};
