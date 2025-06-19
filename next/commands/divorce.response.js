export default {
  name: 'confirmar',
  aliases: ['retirar'],
  args: false,
  argsText: '',
  description:
    'Quem iniciou o pedido de divórcio pode confirmar ou cancelar o pedido.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(prefix.length)
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

      // Verifica se quem enviou é o iniciador do pedido
      const isRequester = pendingDivorce.divorceRequester.equals(
        senderUser._id
      );

      if (!isRequester) {
        return client.reply(
          message.chatId,
          '❌ Apenas quem iniciou o pedido de divórcio pode confirmar ou cancelar.',
          message.id
        );
      }

      const partnerId = pendingDivorce.partner1.equals(senderUser._id)
        ? pendingDivorce.partner2
        : pendingDivorce.partner1;
      const partnerUser = await User.findById(partnerId);

      if (commandName === 'confirmar') {
        // Confirma divórcio
        pendingDivorce.status = 'divorced'; // marca como divorciado
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
        // Cancela o pedido de divórcio
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
