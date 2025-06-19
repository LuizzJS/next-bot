export default {
  name: 'loja',
  aliases: ['shop', 'comprar'],
  description: 'Sistema de loja para comprar itens',
  group_only: false,

  async execute({ client, message, args, prefix }) {
    const { User } = client.db;
    const chatId = message.chatId;
    const senderId = message.sender.id.replace('@c.us', '');

    const STORE_ITEMS = {
      comida: {
        1: {
          id: 'burger_1',
          name: '🍔 Hambúrguer',
          price: 50,
          description: 'Hambúrguer suculento',
          effect: { hunger: +30 },
        },
        2: {
          id: 'pizza_1',
          name: '🍕 Pizza',
          price: 80,
          description: 'Fatia de pizza',
          effect: { hunger: +50 },
        },
      },
      diversao: {
        1: {
          id: 'game_1',
          name: '🎮 Videogame',
          price: 200,
          description: '2 horas de diversão',
          effect: { happiness: +30 },
        },
      },
    };

    const showCategories = async () => {
      let msg = '🛍️ *LOJA VIRTUAL* 🛍️\n\n';
      msg += '📂 *Categorias:*\n';
      msg += '1. 🍔 Comida\n';
      msg += '2. 🎮 Diversão\n\n';
      msg += `Use *${prefix}loja <categoria>* para ver itens\n`;
      msg += `Exemplo: *${prefix}loja 1*`;

      await client.sendText(chatId, msg);
    };

    const showItems = async (categoryNum) => {
      const categories = Object.keys(STORE_ITEMS);
      if (!categories[categoryNum - 1]) {
        return await client.sendText(chatId, '❌ Categoria inválida!');
      }

      const categoryName = categories[categoryNum - 1];
      const items = STORE_ITEMS[categoryName];

      let msg = `🛒 *${categoryName.toUpperCase()}* 🛒\n\n`;

      Object.entries(items).forEach(([id, item]) => {
        msg += `*${id}.* ${item.name} - R$${item.price}\n`;
        msg += `   ${item.description}\n\n`;
      });

      msg += `\nPara comprar: *${prefix}comprar ${categoryNum} <item>*\n`;
      msg += `Exemplo: *${prefix}comprar 1 2* para comprar pizza`;

      await client.sendText(chatId, msg);
    };

    const buyItem = async (categoryNum, itemNum) => {
      const user = await User.findOne({ phone: senderId });
      if (!user) {
        return await client.sendText(chatId, '❌ Você não está registrado!');
      }

      const categories = Object.keys(STORE_ITEMS);
      const categoryName = categories[categoryNum - 1];
      if (!categoryName) {
        return await client.sendText(chatId, '❌ Categoria inválida!');
      }

      const item = STORE_ITEMS[categoryName][itemNum];
      if (!item) {
        return await client.sendText(chatId, '❌ Item não encontrado!');
      }

      try {
        // Usa método virtual / instancia para remover dinheiro
        await user.removeMoney(item.price, `Compra: ${item.name}`, 'shop', {
          itemId: item.id,
        });

        // Usa método para adicionar item ao inventário
        await user.addItemToInventory({
          itemId: item.id,
          name: item.name,
          category: categoryName,
          quantity: 1,
          effect: item.effect,
        });

        await user.save();

        await client.sendText(
          chatId,
          `✅ *Compra realizada!*\n\n` +
            `📦 Item: ${item.name}\n` +
            `💵 Preço: R$${item.price}\n` +
            `💰 Saldo: R$${user.economy.cash}\n\n` +
            `Use *${prefix}inventario* para ver seus itens`
        );
      } catch (error) {
        return await client.sendText(
          chatId,
          `❌ Erro na compra: ${error.message}\n\n` +
            `Você precisa de R$${item.price} mas só tem R$${user.economy.cash}`
        );
      }
    };

    try {
      if (args.length === 0) return await showCategories();

      const categoryNum = parseInt(args[0]);
      if (isNaN(categoryNum))
        return await client.sendText(
          chatId,
          '❌ Use um número para a categoria!'
        );

      if (args.length === 1) return await showItems(categoryNum);

      const itemNum = parseInt(args[1]);
      if (isNaN(itemNum))
        return await client.sendText(chatId, '❌ Use um número para o item!');

      return await buyItem(categoryNum, itemNum);
    } catch (error) {
      console.error('Erro no comando loja:', error);
      return await client.sendText(
        chatId,
        '❌ Ocorreu um erro. Tente novamente.'
      );
    }
  },
};
