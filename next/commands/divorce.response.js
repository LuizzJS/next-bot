export default {
  name: 'confirmar',
  aliases: ['retirar'],
  args: false,
  description: 'Confirma ou cancela um pedido de divórcio.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(1)
      .toLowerCase();
    if (!['confirmar', 'retirar'].includes(commandName)) {
      return client.reply(
        message.chatId,
        `❌ Use "${prefix}confirmar" para confirmar o divórcio ou "${prefix}retirar" para cancelar o pedido.`,
        message.id
      );
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.reply(
        message.chatId,
        '❌ Usuário não identificado',
        message.id
      );

    const { Marriage, User } = client.db;

    try {
      const senderUser = await User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      if (!senderUser)
        return client.reply(
          message.chatId,
          '❌ Usuário não registrado',
          message.id
        );

      const pendingDivorce = await Marriage.findOne({
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
        status: 'accepted',
        divorceStatus: 'pending',
      });

      if (!pendingDivorce)
        return client.reply(
          message.chatId,
          '❌ Você não tem pedidos de divórcio pendentes para responder.',
          message.id
        );

      // Somente o parceiro que iniciou o pedido pode confirmar ou retirar
      if (!pendingDivorce.divorceRequester.equals(senderUser._id)) {
        return client.reply(
          message.chatId,
          '❌ Apenas quem iniciou o pedido de divórcio pode confirmar ou retirar.',
          message.id
        );
      }

      const partnerId = pendingDivorce.partner1.equals(senderUser._id)
        ? pendingDivorce.partner2
        : pendingDivorce.partner1;
      const partnerUser = await User.findById(partnerId);

      if (commandName === 'confirmar') {
        pendingDivorce.status = 'rejected'; // Marca casamento como terminado
        pendingDivorce.divorceStatus = 'confirmed';
        pendingDivorce.divorceRequester = null;
        await pendingDivorce.save();

        return client.reply(
          message.chatId,
          `💔 Divórcio confirmado. Você e ${
            partnerUser?.name || 'seu parceiro(a)'
          } agora estão divorciados.`,
          message.id
        );
      }

      if (commandName === 'retirar') {
        pendingDivorce.divorceStatus = null;
        pendingDivorce.divorceRequester = null;
        await pendingDivorce.save();

        return client.reply(
          message.chatId,
          '👍 Pedido de divórcio cancelado com sucesso.',
          message.id
        );
      }
    } catch (error) {
      console.error('Erro ao processar pedido de divórcio:', error);
      return client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao processar seu pedido. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};
