export default {
  name: 'aceitar',
  aliases: ['recusar'],
  args: false,
  description: 'Aceita ou recusa uma proposta de casamento.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    // Extrai o comando usado (aceitar ou recusar)
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(prefix.length)
      .toLowerCase();

    if (!['aceitar', 'recusar'].includes(commandName)) {
      const lang = 'pt'; // idioma padrão
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
      // Busca usuário no banco pelo phone extraído
      const senderPhone = senderId.replace('@c.us', '');
      const senderUser = await User.findOne({ phone: senderPhone });

      if (!senderUser) {
        const notRegisteredMsg =
          client.messages?.errors?.userNotRegistered?.pt ??
          '❌ Você não está registrado no sistema. Envie alguma mensagem para se registrar.';
        return client.reply(message.chatId, notRegisteredMsg, message.id);
      }

      // Procura proposta pendente envolvendo o usuário, com parceiros populados
      const pendingMarriage = await Marriage.findOne({
        status: 'pending',
        $or: [{ partner1: senderUser._id }, { partner2: senderUser._id }],
      }).populate('partner1 partner2 proposer');

      if (!pendingMarriage) {
        const noPendingMsg =
          client.messages?.marriage?.noPendingProposal?.pt ??
          '❌ Você não possui nenhuma proposta de casamento pendente para responder.';
        return client.reply(message.chatId, noPendingMsg, message.id);
      }

      // Verifica se o sender é o proponente - quem fez a proposta não pode aceitar ou recusar
      if (
        pendingMarriage.proposer &&
        pendingMarriage.proposer._id.equals(senderUser._id)
      ) {
        return client.reply(
          message.chatId,
          '❌ Você não pode aceitar ou recusar sua própria proposta.',
          message.id
        );
      }

      // Define quem é o proponente para usar no texto
      const proposerUser = pendingMarriage.proposer;

      if (commandName === 'aceitar') {
        pendingMarriage.status = 'accepted';
        pendingMarriage.marriedAt = new Date();
        pendingMarriage.proposer = null;
        await pendingMarriage.save();

        const acceptedMsg =
          client.messages?.marriage?.accepted?.pt ??
          `💍 Você aceitou a proposta de casamento de *${
            proposerUser?.name || 'Desconhecido'
          }*! Parabéns ao casal! ❤️`;

        return client.reply(message.chatId, acceptedMsg, message.id);
      } else {
        // recusar
        pendingMarriage.status = 'rejected';
        pendingMarriage.proposer = null;
        await pendingMarriage.save();

        const rejectedMsg =
          client.messages?.marriage?.rejected?.pt ??
          `❌ Você recusou a proposta de casamento de *${
            proposerUser?.name || 'Desconhecido'
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
