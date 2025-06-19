export default {
  name: 'inventario',
  aliases: ['inv', 'itens'],
  description: 'Mostra seus itens comprados',
  group_only: false,

  async execute({ client, message }) {
    const { User } = client.db;
    const chatId = message.chatId;
    const senderId = message.sender.id;

    try {
      const user = await User.findOne({ phone: senderId.replace('@c.us', '') });
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
      user.inventory.forEach((item) => {
        if (!itemsByCategory[item.category]) {
          itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
      });

      // Monta mensagem organizada por categoria
      for (const [category, items] of Object.entries(itemsByCategory)) {
        msg += `📂 *${category.toUpperCase()}*\n`;
        items.forEach((item) => {
          msg += `  ▸ ${item.name} x${item.quantity}\n`;
        });
        msg += '\n';
      }

      msg += `💰 *Saldo atual:* R$${
        user.economy?.cash?.toLocaleString('pt-BR') ?? '0'
      }\n\n`;
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
