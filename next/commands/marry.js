export default {
  name: 'marry',
  aliases: ['casar', 'sposare'],
  args: true,
  description: 'Propõe um pedido de casamento à alguém.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.reply(
        message.chatId,
        '❌ Usuário não identificado.',
        message.id
      );

    const { User, Marriage } = client.db;

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
        console.warn(`⚠️ Usuário criado automaticamente: ${phone}`);
      }
      return user;
    }

    const targetId = await client.findUser({
      chat: message.chatId,
      input: args.join(' '),
      client,
      message,
    });

    if (!targetId)
      return client.reply(
        message.chatId,
        '❌ Usuário não encontrado.',
        message.id
      );

    if (targetId === senderId)
      return client.reply(
        message.chatId,
        '❌ Você não pode casar consigo mesmo.',
        message.id
      );

    const senderUser = await findOrCreateUser(senderId);
    const targetUser = await findOrCreateUser(targetId);

    const senderName = senderUser.name || 'Desconhecido';
    const targetName = targetUser.name || 'Desconhecido';

    const existingMarriage = await Marriage.findOne({
      $or: [
        { partner1: senderUser._id, partner2: targetUser._id },
        { partner1: targetUser._id, partner2: senderUser._id },
      ],
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingMarriage) {
      if (existingMarriage.status === 'accepted') {
        return client.reply(
          message.chatId,
          `💍 Vocês já estão casados!\n\n` +
            `Para terminar o casamento, use o comando:\n➡️ *${prefix}divorciar*`,
          message.id
        );
      } else if (existingMarriage.status === 'pending') {
        const partner1 = await User.findById(existingMarriage.partner1);
        const partner2 = await User.findById(existingMarriage.partner2);
        return client.reply(
          message.chatId,
          `💌 Já existe uma proposta pendente:\n` +
            `De: ${partner1?.name || 'Desconhecido'}\n` +
            `Para: ${partner2?.name || 'Desconhecido'}\n\n` +
            `✔️ Para aceitar use: *${prefix}aceitar*\n` +
            `❌ Para recusar use: *${prefix}recusar*`,
          message.id
        );
      }
    }

    const senderMarriage = await Marriage.findOne({
      $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
      status: 'accepted',
    });

    if (senderMarriage) {
      return client.reply(
        message.chatId,
        `❌ Você já está casado(a) com outra pessoa!\n` +
          `Se quiser casar com ${targetName}, primeiro use *${prefix}divorciar*.`,
        message.id
      );
    }

    const targetMarriage = await Marriage.findOne({
      $or: [{ partner1: targetUser._id }, { partner2: targetUser._id }],
      status: 'accepted',
    });

    if (targetMarriage) {
      return client.reply(
        message.chatId,
        `❌ ${targetName} já está casado(a) com outra pessoa!\n` +
          `Aguarde até que ele(a) se divorcie.`,
        message.id
      );
    }

    try {
      const marriage = new Marriage({
        partner1: senderUser._id,
        partner2: targetUser._id,
        status: 'pending',
      });

      await marriage.save();

      await client.reply(
        message.chatId,
        `💌 ${senderName} pediu a mão de ${targetName} em casamento 💍!\n\n` +
          `Para aceitar, ${targetName}, digite: *${prefix}aceitar*\n` +
          `Para recusar, digite: *${prefix}recusar*`,
        message.id
      );
    } catch (error) {
      console.error('Erro ao salvar proposta de casamento:', error);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao enviar a proposta de casamento.',
        message.id
      );
    }
  },
};
