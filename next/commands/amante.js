export default {
  name: 'amante',
  aliases: [],
  args: true,
  description: 'Proponha um relacionamento como amante (somente para casados)',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado.');

    const { User, Marriage } = client.db;
    const phone = senderId.replace('@c.us', '');

    const senderUser = await User.findOne({ phone });
    if (!senderUser)
      return client.sendText(message.chatId, '❌ Você não está registrado.');

    const currentMarriage = await Marriage.findOne({
      $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
      status: 'accepted',
    });

    if (!currentMarriage)
      return client.sendText(
        message.chatId,
        '💔 Você precisa estar casado(a) para ter um amante.',
      );

    if (currentMarriage.lover)
      return client.sendText(message.chatId, '❌ Você já tem um(a) amante.');

    const mentioned = message.mentionedJidList?.[0];
    if (!mentioned)
      return client.sendText(
        message.chatId,
        `❌ Marque alguém para propor como amante.\nEx: ${prefix}amante @pessoa`,
      );

    const targetPhone = mentioned.replace('@c.us', '');
    if (targetPhone === phone)
      return client.sendText(
        message.chatId,
        '❌ Você não pode ser seu(a) próprio(a) amante.',
      );

    const targetUser = await User.findOne({ phone: targetPhone });
    if (!targetUser)
      return client.sendText(
        message.chatId,
        '❌ Usuário não encontrado na base.',
      );

    // Se já estiver esperando uma resposta
    const existingRequest = await Marriage.findOne({
      lover: targetUser._id,
      status: 'lover_pending',
    });
    if (existingRequest)
      return client.sendText(
        message.chatId,
        '❌ Essa pessoa já tem um pedido de amante pendente.',
      );

    // Salva o pedido de amante no casamento
    currentMarriage.lover = targetUser._id;
    currentMarriage.loverStatus = 'pending';
    await currentMarriage.save();

    const senderName = senderUser.name || `@${phone}`;
    const targetName = targetUser.name || `@${targetPhone}`;
    const loverId = mentioned;
    const proposerId = senderId;

    return client.sendTextWithMentions(
      message.chatId,
      `💘 ${senderName} quer que ${targetName} seja seu(a) amante!\n\n❤️ Para aceitar, ${targetName} deve digitar *${prefix}aceitaramante*\n💔 Para recusar, digite *${prefix}recusaramante*`,
      [loverId, proposerId],
    );
  },
};
