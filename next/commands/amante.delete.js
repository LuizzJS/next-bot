export default {
  name: 'removeramante',
  aliases: ['removeamante', 'tiraramante'],
  args: false,
  description: 'Remove seu amante atual',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      return client.sendText(message.chatId, '❌ Usuário não identificado.');
    }

    const { User, Marriage } = client.db;
    const phone = senderId.replace('@c.us', '');
    const user = await User.findOne({ phone });
    if (!user) {
      return client.sendText(
        message.chatId,
        '❌ Usuário não cadastrado no sistema.',
      );
    }

    // Busca casamento aceito onde usuário é partner1 ou partner2
    const marriage = await Marriage.findOne({
      $or: [{ partner1: user._id }, { partner2: user._id }],
      status: 'accepted',
    }).populate('lover');

    if (!marriage) {
      return client.sendText(message.chatId, '💔 Você não está casado(a).');
    }

    if (
      !marriage.lover ||
      !marriage.loverStatus ||
      marriage.loverStatus === 'rejected'
    ) {
      return client.sendText(
        message.chatId,
        '💔 Você não tem amante no momento.',
      );
    }

    const amanteNome = marriage.lover.name || 'Desconhecido';

    // Remove amante: limpa campos relacionados
    marriage.lover = null;
    marriage.loverStatus = null;
    marriage.loverSince = null;

    await marriage.save();

    return client.sendText(
      message.chatId,
      `❌ O relacionamento com seu amante *${amanteNome}* foi encerrado.`,
    );
  },
};
