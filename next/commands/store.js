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
      food: {
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
      fun: {
        1: {
          id: 'game_1',
          name: '🎮 Videogame',
          price: 200,
          description: '2 horas de diversão',
          effect: { happiness: +30 },
        },
      },
    };

    const categories = Object.keys(STORE_ITEMS);

    const showCategories = async () => {
      let msg = '🛍️ *LOJA VIRTUAL* 🛍️\n\n';
      msg += '📂 *Categorias:*\n';
      categories.forEach((cat, i) => {
        const icon = cat === 'food' ? '🍔' : cat === 'fun' ? '🎮' : '';
        msg += `${i + 1}. ${icon} ${
          cat.charAt(0).toUpperCase() + cat.slice(1)
        }\n`;
      });
      msg += `\nUse *${prefix}loja <categoria>* para ver os itens\n`;
      msg += `Exemplo: *${prefix}loja 1*`;

      await client.sendText(chatId, msg);
    };

    const showItems = async (categoryNum) => {
      if (!categories[categoryNum - 1]) {
        return await client.sendText(chatId, '❌ Categoria inválida!');
      }

      const categoryName = categories[categoryNum - 1];
      const items = STORE_ITEMS[categoryName];

      let msg = `🛒 *${categoryName.toUpperCase()}* 🛒\n\n`;

      Object.entries(items).forEach(([key, item], index) => {
        msg += `*${index + 1}.* ${item.name} - ${item.price.toLocaleString(
          'pt-BR',
          { style: 'currency', currency: 'BRL' }
        )}\n`;
        msg += `   ${item.description}\n\n`;
      });

      msg += `Para comprar: *${prefix}comprar ${categoryNum} <item>*\n`;
      msg += `Exemplo: *${prefix}comprar 1 2* para comprar pizza`;

      await client.sendText(chatId, msg);
    };

    const buyItem = async (categoryNum, itemNum) => {
      const user = await User.findOne({ phone: senderId });
      if (!user) {
        return await client.sendText(chatId, '❌ Você não está registrado!');
      }

      if (!categories[categoryNum - 1]) {
        return await client.sendText(chatId, '❌ Categoria inválida!');
      }

      const categoryName = categories[categoryNum - 1];
      const items = STORE_ITEMS[categoryName];
      const itemKeys = Object.keys(items);

      if (!itemKeys[itemNum - 1]) {
        return await client.sendText(chatId, '❌ Item não encontrado!');
      }

      const item = items[itemKeys[itemNum - 1]];

      if (!user.economy?.cash || user.economy.cash < item.price) {
        return await client.sendText(
          chatId,
          `❌ Saldo insuficiente! Você precisa de ${item.price.toLocaleString(
            'pt-BR',
            { style: 'currency', currency: 'BRL' }
          )} e tem ${
            user.economy?.cash?.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }) || 'R$0,00'
          }`
        );
      }

      try {
        // Removendo dinheiro
        if (typeof user.removeMoney === 'function') {
          await user.removeMoney(item.price, `Compra: ${item.name}`, 'shop', {
            itemId: item.id,
          });
        } else {
          user.economy.cash -= item.price;
        }

        // Adicionando item ao inventário
        if (typeof user.addItemToInventory === 'function') {
          await user.addItemToInventory({
            itemId: item.id,
            name: item.name,
            category: categoryName,
            quantity: 1,
            effect: item.effect,
          });
        } else {
          // Caso não tenha método, atualiza inventário manualmente
          if (!user.inventory) user.inventory = [];
          const invItem = user.inventory.find((i) => i.itemId === item.id);
          if (invItem) {
            invItem.quantity += 1;
          } else {
            user.inventory.push({
              itemId: item.id,
              name: item.name,
              category: categoryName,
              quantity: 1,
              effect: item.effect,
            });
          }
        }

        await user.save();

        await client.sendText(
          chatId,
          `✅ Compra realizada!\n\n` +
            `📦 Item: ${item.name}\n` +
            `💵 Preço: ${item.price.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}\n` +
            `💰 Saldo atual: ${user.economy.cash.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}\n\n` +
            `Use *${prefix}inventario* para ver seus itens`
        );
      } catch (error) {
        console.error('Erro na compra:', error);
        await client.sendText(
          chatId,
          `❌ Erro na compra: ${error.message}\n\nSaldo disponível: ${
            user.economy.cash?.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }) || 'R$0,00'
          }`
        );
      }
    };

    try {
      if (args.length === 0) return await showCategories();

      const categoryNum = parseInt(args[0]);
      if (isNaN(categoryNum)) {
        return await client.sendText(
          chatId,
          '❌ Use um número para a categoria!'
        );
      }

      if (args.length === 1) return await showItems(categoryNum);

      const itemNum = parseInt(args[1]);
      if (isNaN(itemNum)) {
        return await client.sendText(chatId, '❌ Use um número para o item!');
      }

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
