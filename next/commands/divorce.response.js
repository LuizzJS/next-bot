export default {
  name: 'confirmar',
  aliases: ['retirar'],
  args: false,
  description: 'Confirmar ou cancelar um pedido de divórcio',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(1)
      .toLowerCase(); // 'confirmar' ou 'retirar'

    if (!['confirmar', 'retirar'].includes(commandName)) {
      return client.sendText(
        message.chatId,
        '❌ Use "/confirmar" para confirmar o divórcio ou "/retirar" para cancelar.',
      );
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado');

    const { Marriage } = client.db;

    try {
      const senderUser = await client.db.User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      if (!senderUser)
        return client.sendText(message.chatId, '❌ Usuário não registrado');

      const pendingDivorce = await Marriage.findOne({
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
        status: 'accepted',
        divorceStatus: 'pending',
      });

      if (!pendingDivorce)
        return client.sendText(
          message.chatId,
          '❌ Você não tem pedidos de divórcio pendentes para responder.',
        );

      const partnerId = pendingDivorce.partner1.equals(senderUser._id)
        ? pendingDivorce.partner2
        : pendingDivorce.partner1;

      const partnerUser = await client.db.User.findById(partnerId);

      if (commandName === 'confirmar') {
        pendingDivorce.status = 'not-married';
        pendingDivorce.divorceStatus = 'accepted';
        await pendingDivorce.save();

        return client.sendText(
          message.chatId,
          `💔 Divórcio confirmado. Você e ${
            partnerUser?.name || 'seu parceiro(a)'
          } agora estão divorciados.`,
        );
      }

      if (commandName === 'retirar') {
        pendingDivorce.divorceStatus = null;
        pendingDivorce.divorceRequester = null;
        await pendingDivorce.save();

        return client.sendText(
          message.chatId,
          '👍 Pedido de divórcio cancelado com sucesso.',
        );
      }
    } catch (error) {
      console.error('Erro ao processar pedido de divórcio:', error);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao processar seu pedido. Tente novamente mais tarde.',
      );
    }
  },
};
