export default {
  name: 'aceitar',
  aliases: ['recusar'],
  args: false,
  description: 'Aceita ou recusa uma proposta de casamento.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(prefix.length)
      .toLowerCase();

    if (!['aceitar', 'recusar'].includes(commandName)) {
      const lang = 'pt'; // padrão
      const invalidCmdMsg =
        client.messages?.errors?.invalidCommand?.[lang] ??
        `❌ Comando inválido. Use "${prefix}aceitar" para aceitar ou "${prefix}recusar" para recusar a proposta.`;
      return client.reply(message.chatId, invalidCmdMsg, message.id);
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      const errMsg =
        client.messages?.errors?.userNotIdentified?.pt ??
        '❌ Não foi possível identificar seu usuário. Tente novamente.';
      return client.reply(message.chatId, errMsg, message.id);
    }

    const { User, Marriage } = client.db;

    try {
      const senderPhone = senderId.replace('@c.us', '');
      const senderUser = await User.findOne({ phone: senderPhone });

      if (!senderUser) {
        const notRegisteredMsg =
          client.messages?.errors?.userNotRegistered?.pt ??
          '❌ Você não está registrado no sistema. Envie alguma mensagem para se registrar.';
        return client.reply(message.chatId, notRegisteredMsg, message.id);
      }

      const pendingMarriage = await Marriage.findOne({
        status: 'pending',
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
      }).populate('partner1 partner2');

      if (!pendingMarriage) {
        const noPendingMsg =
          client.messages?.marriage?.noPendingProposal?.pt ??
          '❌ Você não possui nenhuma proposta de casamento pendente para responder.';
        return client.reply(message.chatId, noPendingMsg, message.id);
      }

      // O parceiro que fez a proposta é o outro
      const isSenderPartner1 = pendingMarriage.partner1._id.equals(
        senderUser._id
      );
      const proposer = isSenderPartner1
        ? pendingMarriage.partner2
        : pendingMarriage.partner1;

      if (commandName === 'aceitar') {
        pendingMarriage.status = 'accepted';
        pendingMarriage.marriedAt = new Date();
        await pendingMarriage.save();

        const acceptedMsg =
          client.messages?.marriage?.accepted?.pt ??
          `💍 Você aceitou a proposta de casamento de *${
            proposer.name || 'Desconhecido'
          }*! Parabéns ao casal! ❤️`;

        return client.reply(message.chatId, acceptedMsg, message.id);
      } else {
        pendingMarriage.status = 'rejected';
        await pendingMarriage.save();

        const rejectedMsg =
          client.messages?.marriage?.rejected?.pt ??
          `❌ Você recusou a proposta de casamento de *${
            proposer.name || 'Desconhecido'
          }*. Desejamos que encontre alguém especial em breve!`;

        return client.reply(message.chatId, rejectedMsg, message.id);
      }
    } catch (error) {
      console.error('Erro no comando aceitar/recusar:', error);
      const errMsg =
        client.messages?.errors?.unknownError?.pt ??
        '❌ Ocorreu um erro ao processar sua resposta. Tente novamente mais tarde.';
      return client.reply(message.chatId, errMsg, message.id);
    }
  },
};
