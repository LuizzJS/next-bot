export default {
  name: 'aceitar',
  aliases: ['recusar'],
  args: false,
  description: 'Aceitar ou recusar uma proposta de casamento',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    // Detecta se é aceitar ou recusar pelo comando usado
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(prefix.length)
      .toLowerCase();

    if (!['aceitar', 'recusar'].includes(commandName)) {
      return client.sendText(
        message.chatId,
        `❌ Comando inválido. Use "${prefix}aceitar" para aceitar ou "${prefix}recusar" para recusar a proposta.`,
      );
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      return client.sendText(
        message.chatId,
        '❌ Não foi possível identificar seu usuário. Tente novamente.',
      );
    }

    const { User, Marriage } = client.db;
    try {
      const senderUser = await User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      if (!senderUser) {
        return client.sendText(
          message.chatId,
          '❌ Você não está registrado no sistema. Envie alguma mensagem para se registrar.',
        );
      }

      // Busca proposta pendente onde o usuário é destinatário (partner2 ou partner1)
      const pendingMarriage = await Marriage.findOne({
        status: 'pending',
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
      }).populate('partner1 partner2');

      if (!pendingMarriage) {
        return client.sendText(
          message.chatId,
          '❌ Você não possui nenhuma proposta de casamento pendente para responder.',
        );
      }

      // Define quem enviou e quem recebe a proposta
      const isSenderPartner1 = pendingMarriage.partner1._id.equals(
        senderUser._id,
      );
      const proposer = isSenderPartner1
        ? pendingMarriage.partner2
        : pendingMarriage.partner1;
      const receiver = senderUser;

      if (commandName === 'aceitar') {
        pendingMarriage.status = 'accepted';
        pendingMarriage.marriedAt = new Date();
        await pendingMarriage.save();

        return client.sendText(
          message.chatId,
          `💍 Você aceitou a proposta de casamento de *${
            proposer.name || 'Desconhecido'
          }*! Parabéns ao casal! ❤️`,
        );
      } else {
        // recusar
        pendingMarriage.status = 'rejected';
        await pendingMarriage.save();

        return client.sendText(
          message.chatId,
          `❌ Você recusou a proposta de casamento de *${
            proposer.name || 'Desconhecido'
          }*. Desejamos que encontre alguém especial em breve!`,
        );
      }
    } catch (error) {
      console.error('Erro no comando aceitar/recusar:', error);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao processar sua resposta. Tente novamente mais tarde.',
      );
    }
  },
};
