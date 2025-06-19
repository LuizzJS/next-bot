export default {
  name: 'inventario',
  aliases: ['inv', 'itens'],
  description: 'Mostra seus itens comprados',
  group_only: false,

  async execute({ client, message }) {
    const { User } = client.db;
    const chatId = message.chatId;
    const senderId = message.sender.id.replace(/@c\.us$/, '');

    try {
      const user = await User.findOne({ phone: senderId });
      if (!user) {
        return await client.sendText(
          chatId,
          '❌ Você não está registrado no sistema!'
        );
      }

      if (!user.inventory || user.inventory.length === 0) {
        return await client.sendText(
          chatId,
          `📦 *${user.name || 'Você'}*, seu inventário está vazio no momento!`
        );
      }

      let msg = `🎒 *Inventário de ${user.name || 'você'}* 🎒\n\n`;

      // Agrupa itens por categoria
      const itemsByCategory = {};
      for (const item of user.inventory) {
        if (!itemsByCategory[item.category]) {
          itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
      }

      // Monta mensagem organizada por categoria
      for (const [category, items] of Object.entries(itemsByCategory)) {
        msg += `📂 *${category.toUpperCase()}*\n`;
        for (const item of items) {
          msg += `  ▸ ${item.name} x${item.quantity}\n`;
        }
        msg += '\n';
      }

      // Formata saldo com separador de milhar e 2 casas decimais
      const cashFormatted = (user.economy?.cash ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      msg += `💰 *Saldo atual:* R$${cashFormatted}\n\n`;
      msg +=
        '💡 Use comandos para comprar ou usar itens. Para mais informações, digite *!ajuda* ou *!shop*';

      await client.sendText(chatId, msg);
    } catch (error) {
      console.error('Erro no inventário:', error);
      await client.sendText(
        chatId,
        '❌ Ocorreu um erro ao tentar acessar seu inventário.'
      );
    }
  },
};
