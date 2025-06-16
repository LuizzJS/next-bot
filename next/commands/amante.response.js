export default {
  name: 'aceitaramante',
  aliases: ['recusaramante'],
  args: false,
  description: 'Aceitar ou recusar uma proposta de ser amante',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(prefix.length)
      .toLowerCase();

    if (!['aceitaramante', 'recusaramante'].includes(commandName)) {
      return client.sendText(
        message.chatId,
        '❌ Comando inválido. Use "aceitaramante" ou "recusaramante".',
      );
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado.');

    const { Marriage, User } = client.db;
    const phone = senderId.replace('@c.us', '');
    const senderUser = await User.findOne({ phone });
    if (!senderUser)
      return client.sendText(message.chatId, '❌ Usuário não registrado.');

    const marriage = await Marriage.findOne({
      lover: senderUser._id,
      loverStatus: 'pending',
    }).populate('partner1 partner2 lover');

    if (!marriage)
      return client.sendText(
        message.chatId,
        '❌ Você não tem nenhum pedido de amante pendente.',
      );

    if (commandName === 'aceitaramante') {
      marriage.loverStatus = 'accepted';
      marriage.loverSince = new Date();
      await marriage.save();

      const proposer = marriage.partner1._id.equals(senderUser._id)
        ? marriage.partner2
        : marriage.partner1;

      const senderName = senderUser.name || `@${phone}`;
      const proposerName = proposer.name || 'seu parceiro(a)';

      return client.sendText(
        message.chatId,
        `💘 Parabéns, ${senderName}! Você aceitou ser amante de ${proposerName}.\n\nSeja discreto(a) e aproveitem!`,
      );
    } else if (commandName === 'recusaramante') {
      marriage.loverStatus = 'rejected';
      marriage.lover = null;
      await marriage.save();

      return client.sendText(
        message.chatId,
        `❌ Você recusou a proposta de ser amante.`,
      );
    }
  },
};
