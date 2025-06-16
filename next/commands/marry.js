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

    const { User, Marriage } = client.db;

    // Busca usuário no DB ou cria com fallback no contato WhatsApp
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

    // Encontrar o alvo (pode ser menção, número, etc)
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

    // Pega os usuários no DB
    const senderUser = await findOrCreateUser(senderId);
    const targetUser = await findOrCreateUser(targetId);

    // Usar os nomes do DB
    const senderName = senderUser.name || 'Desconhecido';
    const targetName = targetUser.name || 'Desconhecido';

    // Verifica se já existe casamento pendente ou aceito entre eles
    const existingMarriage = await Marriage.findOne({
      $or: [
        { partner1: senderUser._id, partner2: targetUser._id },
        { partner1: targetUser._id, partner2: senderUser._id },
      ],
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingMarriage) {
      if (existingMarriage.status === 'accepted') {
        return client.sendText(
          message.chatId,
          `💍 Vocês já estão casados!\n\n` +
            `Para terminar o casamento, use o comando:\n` +
            `➡️ *${prefix}divorciar*\n\n`,
        );
      }
      if (existingMarriage.status === 'pending') {
        // Exibir quem fez a proposta e para quem
        // Como não tem userUsername direto, vamos buscar no DB
        const partner1 = await User.findById(existingMarriage.partner1);
        const partner2 = await User.findById(existingMarriage.partner2);

        return client.sendText(
          message.chatId,
          `💌 Já existe uma proposta pendente:\n` +
            `De: ${partner1?.name || 'Desconhecido'}\n` +
            `Para: ${partner2?.name || 'Desconhecido'}\n\n` +
            `✔️ Para aceitar use: *${prefix}aceitar*\n` +
            `❌ Para recusar use: *${prefix}recusar*\n\n`,
        );
      }
    }

    // Cria uma nova proposta de casamento
    try {
      const marriage = new Marriage({
        partner1: senderUser._id,
        partner2: targetUser._id,
        status: 'pending',
      });

      await marriage.save();

      await client.sendTextWithMentions(
        message.chatId,
        `💌 ${senderName} pediu a mão de ${targetName} em casamento 💍!\n\n` +
          `Para aceitar esse pedido, ${targetName}, basta digitar ${prefix}aceitar.\n` +
          `Se preferir recusar, digite ${prefix}recusar.\n`,
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
