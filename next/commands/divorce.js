export default {
  name: 'divorce',
  aliases: ['divorciar', 'divorcio', 'divórcio'],
  args: false,
  description: 'Inicia um pedido de divórcio.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.reply(
        message.chatId,
        '❌ Usuário não identificado',
        message.id
      );

    try {
      const { Marriage, User } = client.db;

      const senderUser = await User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      if (!senderUser)
        return client.reply(
          message.chatId,
          '❌ Usuário não registrado',
          message.id
        );

      const marriage = await Marriage.findOne({
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
        status: 'accepted',
      }).populate('partner1 partner2 divorceRequester');

      if (!marriage)
        return client.reply(
          message.chatId,
          '❌ Você não está casado(a)',
          message.id
        );

      if (marriage.divorceStatus === 'pending') {
        return client.reply(
          message.chatId,
          '❌ Já existe um pedido de divórcio pendente.',
          message.id
        );
      }

      marriage.divorceStatus = 'pending';
      marriage.divorceRequester = senderUser._id;
      await marriage.save();

      const partnerId = marriage.getPartnerOf(senderUser._id);
      const partnerUser = await User.findById(partnerId);

      await client.reply(
        message.chatId,
        `⚠️ Pedido de divórcio iniciado entre ${senderUser?.name} e ${
          partnerUser?.name || 'seu parceiro(a)'
        }.\n` +
          `Você deve responder com:\n` +
          `*${prefix}confirmar* para confirmar o divórcio, ou *${prefix}retirar* para cancelar o pedido.`,
        message.id
      );
    } catch (error) {
      console.error('Erro no comando divorce:', error);
      return client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao iniciar o pedido de divórcio. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};
