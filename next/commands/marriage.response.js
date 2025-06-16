export default {
  name: 'aceitar',
  aliases: ['recusar'],
  args: false,
  description: 'Aceitar ou recusar uma proposta de casamento',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const commandName = message.body
      .trim()
      .split(' ')[0]
      .slice(1)
      .toLowerCase();

    if (!['aceitar', 'recusar'].includes(commandName)) {
      return client.sendText(
        message.chatId,
        `❌ Comando inválido. Use "${prefix}aceitar" ou "${prefix}recusar".`,
      );
    }

    const senderId = message.sender?.id || message.sender;
    if (!senderId)
      return client.sendText(message.chatId, '❌ Usuário não identificado');

    const { Marriage } = client.db;

    try {
      const senderUser = await client.db.User.findOne({
        phone: senderId.replace('@c.us', ''),
      });

      if (!senderUser)
        return client.sendText(message.chatId, '❌ Usuário não registrado');

      const pendingMarriage = await Marriage.findOne({
        partner2: senderUser._id,
        status: 'pending',
      });

      if (!pendingMarriage)
        return client.sendText(
          message.chatId,
          '❌ Você não tem propostas pendentes para responder.',
        );

      if (commandName === 'aceitar') {
        pendingMarriage.status = 'accepted';
        await pendingMarriage.save();
        return client.sendText(
          message.chatId,
          `💍 Parabéns! Você aceitou a proposta de casamento.`,
        );
      } else {
        pendingMarriage.status = 'rejected';
        await pendingMarriage.save();
        return client.sendText(
          message.chatId,
          `❌ Você recusou a proposta de casamento.`,
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
