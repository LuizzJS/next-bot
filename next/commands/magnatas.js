export default {
  name: 'magnates',
  aliases: ['magnatas', 'ricos'],
  args: false,
  description: 'Mostra os 5 usuários com maior saldo em cash.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    try {
      const { User } = client.db;
      const senderPhone = message.sender.id.replace('@c.us', '');
      const user = await User.findOne({ phone: senderPhone });
      const user_lang = user?.config?.language?.substring(0, 2) || 'pt';

      const topUsers = await User.find().sort({ 'economy.cash': -1 }).limit(5);

      if (topUsers.length === 0) {
        const noMagnatesMsg =
          client.messages?.economy?.noMagnates?.[user_lang] ??
          '💸 Nenhum magnata encontrado ainda.';
        return client.reply(message.chatId, noMagnatesMsg, message.id);
      }

      let reply =
        client.messages?.economy?.topMagnatesTitle?.[user_lang] ??
        '💰 *Top Magnatas* 💰\n\n';

      topUsers.forEach((u, i) => {
        const name =
          u.name?.trim() ||
          client.messages?.economy?.unknownName?.[user_lang] ||
          'Desconhecido';
        const money = u.economy?.cash || 0;
        const formattedMoney = money.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        reply += `${i + 1}. *${name}* - ${formattedMoney}\n`;
      });

      await client.reply(message.chatId, reply, message.id);
    } catch (err) {
      console.error('[MAGNATES] Erro:', err);

      const senderPhone = message.sender.id.replace('@c.us', '');
      const user = await client.db.User.findOne({ phone: senderPhone });
      const user_lang = user?.config?.language?.substring(0, 2) || 'pt';

      const errorMsg =
        client.messages?.errors?.unknownError?.[user_lang] ??
        '❌ Erro ao buscar os magnatas.';
      return client.reply(message.chatId, errorMsg, message.id);
    }
  },
};
