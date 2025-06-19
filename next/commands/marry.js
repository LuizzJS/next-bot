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

    // Função para buscar/criar usuário no banco, usando o retorno do findUser (id com @c.us)
    async function findOrCreateUser(userIdWithSuffix) {
      const phone = userIdWithSuffix.replace('@c.us', '');
      let user = await User.findOne({ phone });
      if (!user) {
        let contact;
        try {
          contact = await client.getContact(userIdWithSuffix);
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

    // Usa o método findUser para obter { id, phone, name?, isInternational? }
    const targetUserObj = await client.findUser({
      chat: message.chat,
      input: args.join(' '),
      client,
      message,
    });

    if (!targetUserObj)
      return client.reply(
        message.chatId,
        '❌ Usuário não encontrado.',
        message.id
      );

    if (targetUserObj.id === senderId)
      return client.reply(
        message.chatId,
        '❌ Você não pode casar consigo mesmo.',
        message.id
      );

    // Busca ou cria os usuários no banco
    const senderUser = await findOrCreateUser(senderId);
    const targetUser = await findOrCreateUser(targetUserObj.id);

    const senderName = senderUser.name || 'Desconhecido';
    const targetName = targetUser.name || targetUserObj.name || 'Desconhecido';

    // Checa se já existe casamento pendente ou aceito entre os dois
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

    // Verifica se o remetente já está casado com outra pessoa
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

    // Verifica se o destinatário já está casado com outra pessoa
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
        proposer: senderUser._id, // <-- define quem fez a proposta!
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
