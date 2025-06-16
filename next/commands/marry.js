export default {
  name: 'marry',
  aliases: ['casar', 'sposare'],
  args: true,
  description: 'Propor casamento a alguém (global)',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado');

    const { Marriage } = client.db;

    const targetId = await client.findUser({
      chat: message.chatId,
      input: args.join(' '),
      client,
      message,
    });

    if (!targetId)
      return client.sendText(message.chatId, '❌ Usuário não encontrado');
    if (targetId === senderId)
      return client.sendText(
        message.chatId,
        '❌ Você não pode casar consigo mesmo',
      );

    // Função auxiliar para criar usuário se não existir
    async function findOrCreateUser(phoneWithSuffix) {
      const phone = phoneWithSuffix.replace('@c.us', '');
      let user = await client.db.User.findOne({ phone });
      if (!user) {
        let contact;
        try {
          contact = await client.getContact(phoneWithSuffix);
        } catch {
          contact = null;
        }
        user = await client.db.User.create({
          phone,
          name: contact?.pushname || contact?.name || 'Desconhecido',
        });
        console.warn(`⚠️ Usuário criado automaticamente: ${phone}`);
      }
      return user;
    }

    const senderUser = await findOrCreateUser(senderId);
    const targetUser = await findOrCreateUser(targetId);

    const senderContact = await client.getContact(senderId);
    const targetContact = await client.getContact(targetId);

    // Verifica se já existe casamento pendente ou aceito entre eles (em qualquer direção)
    const existingMarriage = await Marriage.findOne({
      $or: [
        { partner1: senderUser._id, partner2: targetUser._id },
        { partner1: targetUser._id, partner2: senderUser._id },
      ],
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingMarriage) {
      if (existingMarriage.status === 'accepted') {
        return client.sendText(message.chatId, `💍 Vocês já estão casados!`);
      }
      if (existingMarriage.status === 'pending') {
        return client.sendText(
          message.chatId,
          `💌 Já existe uma proposta pendente.`,
        );
      }
    }

    // Cria uma nova proposta
    try {
      const marriage = new Marriage({
        partner1: senderUser._id,
        partner2: targetUser._id,
        status: 'pending',
      });

      await marriage.save();

      await client.sendTextWithMentions(
        message.chatId,
        `💌 Proposta de casamento enviada de ${
          senderContact?.pushname || senderUser.name || 'Desconhecido'
        } para ${
          targetContact?.pushname || targetUser.name || 'Desconhecido'
        }.`,
        [targetId, senderId],
      );
    } catch (error) {
      console.error('Erro ao salvar proposta de casamento:', error);
      await client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao enviar a proposta de casamento.',
      );
    }
  },
};
