export default {
  name: 'marriage',
  aliases: ['casamento', 'matrimonio'],
  args: false,
  description: 'Verifica o status do casamento',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      return client.sendText(message.chatId, '❌ Usuário não identificado');
    }

    const { User, Marriage } = client.db;

    // Função para obter ou criar o usuário
    async function findOrCreateUser(phoneWithSuffix) {
      const phone = phoneWithSuffix.replace('@c.us', '');
      let user = await User.findOne({ phone });
      if (!user) {
        let contact;
        try {
          contact = await client.getContact(phoneWithSuffix);
        } catch {
          contact = null;
        }
        user = await User.create({
          phone,
          name: contact?.pushname || contact?.name || 'Desconhecido',
        });
      }
      return user;
    }

    // Determina o alvo (menção ou comando direto)
    let targetId = senderId;
    if (message.mentionedJidList?.length) {
      targetId = message.mentionedJidList[0];
    }

    const user = await findOrCreateUser(targetId);

    // Procura casamento com status "accepted"
    const marriage = await Marriage.findOne({
      $or: [{ partner1: user._id }, { partner2: user._id }],
      status: 'accepted',
    }).populate('partner1 partner2');

    if (!marriage) {
      const isSender = targetId === senderId;
      return client.sendText(
        message.chatId,
        isSender
          ? '💔 Você não está casado(a).'
          : `💔 ${user.name || 'Esse usuário'} não está casado(a).`,
      );
    }

    const partner = marriage.partner1._id.equals(user._id)
      ? marriage.partner2
      : marriage.partner1;

    const userDisplay = user.name || 'Você';
    const partnerDisplay = partner.name || 'seu parceiro(a)';

    return client.sendText(
      message.chatId,
      `💍 ${userDisplay} está casado(a) com ${partnerDisplay}.`,
    );
  },
};
