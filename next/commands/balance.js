export default {
  name: 'balance',
  aliases: ['saldo'],
  args: false,
  description: 'Exibe o saldo atual do usuário ou de outra pessoa.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args }) => {
    try {
      const senderId = message.sender?.id || message.sender;
      if (!senderId) {
        return client.sendText(message.chatId, '❌ Usuário não identificado.');
      }

      const { User } = client.db;

      // Função para buscar ou criar usuário
      async function getOrCreateUser(id) {
        const phone = id.replace('@c.us', '');
        let user = await User.findOne({ phone });
        if (!user) {
          const contact = await client.getContact(id);
          user = await User.create({
            phone,
            name: contact?.pushname || contact?.formattedName || 'Desconhecido',
          });
        }
        return user;
      }

      // Usuário remetente
      const senderUser = await getOrCreateUser(senderId);

      // Define alvo (self ou outro)
      let targetUser = senderUser;

      if (args.length > 0) {
        const foundUser = await client.findUser({
          chat: message.chatId,
          input: args.join(' '),
          client,
          message,
        });
        if (foundUser && foundUser.phone) {
          targetUser = await getOrCreateUser(foundUser.phone + '@c.us');
        }
      }

      const isSelf = targetUser.phone === senderUser.phone;
      const displayName = targetUser.name || 'Desconhecido';

      const coins = targetUser.economy?.money ?? 0;

      const formattedCoins = coins.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      const messageText = isSelf
        ? `💰 Você tem *${formattedCoins}* no seu saldo.`
        : `💰 *${displayName}* tem *${formattedCoins}* no saldo.`;

      return client.sendText(message.chatId, messageText);
    } catch (err) {
      console.error('[BALANCE] Erro:', err);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao consultar o saldo.',
      );
    }
  },
};
