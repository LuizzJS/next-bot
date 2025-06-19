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
          description: 'Fatia de pizza saborosa',
          effect: { hunger: +50 },
        },
        3: {
          id: 'sanduiche_1',
          name: '🥪 Sanduíche Natural',
          price: 40,
          description: 'Sanduíche saudável e leve',
          effect: { hunger: +25 },
        },
        4: {
          id: 'agua_1',
          name: '💧 Água Mineral',
          price: 20,
          description: 'Refresca e hidrata',
          effect: { thirst: +30 },
        },
        5: {
          id: 'suco_1',
          name: '🥤 Suco de Frutas',
          price: 35,
          description: 'Bebida refrescante natural',
          effect: { thirst: +40 },
        },
      },
      fun: {
        1: {
          id: 'game_1',
          name: '🎮 Videogame',
          price: 200,
          description: '2 horas de diversão garantida',
          effect: { happiness: +30 },
        },
        2: {
          id: 'livro_1',
          name: '📚 Livro de Aventuras',
          price: 90,
          description: 'Leia e se divirta com a história',
          effect: { happiness: +20 },
        },
        3: {
          id: 'cinema_1',
          name: '🎬 Ingresso de Cinema',
          price: 120,
          description: 'Diversão com pipoca e filme',
          effect: { happiness: +35 },
        },
      },
    };

    const categories = Object.keys(STORE_ITEMS);

    const showCategories = async () => {
      let msg = '🛍️ *LOJA VIRTUAL* 🛍️\n\n';
      msg += '📂 *Categorias disponíveis:*\n';
      categories.forEach((cat, i) => {
        const icon = cat === 'food' ? '🍔' : cat === 'fun' ? '🎮' : '📦';
        msg += `${i + 1}. ${icon} *${cat.toUpperCase()}*\n`;
      });
      msg += `\n➤ Use *${prefix}loja <categoria>* para ver os itens disponíveis.\nExemplo: *${prefix}loja 1*`;
      await client.sendText(chatId, msg);
    };

    const showItems = async (categoryNum) => {
      if (!categories[categoryNum - 1]) {
        return await client.sendText(chatId, '❌ Categoria inválida!');
      }

      const categoryName = categories[categoryNum - 1];
      const items = STORE_ITEMS[categoryName];

      let msg = `🛒 *ITENS EM ${categoryName.toUpperCase()}* 🛒\n\n`;

      Object.entries(items).forEach(([key, item], index) => {
        msg += `*${index + 1}.* ${item.name} — ${item.price.toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        )}\n`;
        msg += `   ${item.description}\n\n`;
      });

      msg += `💸 Para comprar: *${prefix}comprar ${categoryNum} <item>*\n`;
      msg += `Ex: *${prefix}comprar ${categoryNum} 1* para comprar o primeiro item.`;

      await client.sendText(chatId, msg);
    };

    const buyItem = async (categoryNum, itemNum) => {
      const user = await User.findOne({ phone: senderId });
      if (!user)
        return await client.sendText(chatId, '❌ Você não está registrado!');

      const categoryName = categories[categoryNum - 1];
      const items = STORE_ITEMS[categoryName];
      const itemKeys = Object.keys(items);

      const item = items[itemKeys[itemNum - 1]];
      if (!item)
        return await client.sendText(chatId, '❌ Item não encontrado!');

      if (user.economy?.cash < item.price) {
        return await client.sendText(
          chatId,
          `❌ Dinheiro insuficiente!\n💰 Seu saldo: ${user.economy.cash.toLocaleString(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          )}\n💵 Necessário: ${item.price.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}`
        );
      }

      try {
        if (typeof user.removeMoney === 'function') {
          await user.removeMoney(item.price, `Compra: ${item.name}`, 'shop', {
            itemId: item.id,
          });
        } else {
          user.economy.cash -= item.price;
        }

        if (typeof user.addItemToInventory === 'function') {
          await user.addItemToInventory({
            itemId: item.id,
            name: item.name,
            category: categoryName,
            quantity: 1,
            effect: item.effect,
          });
        } else {
          if (!user.inventory) user.inventory = [];
          const invItem = user.inventory.find((i) => i.itemId === item.id);
          if (invItem) invItem.quantity += 1;
          else
            user.inventory.push({
              itemId: item.id,
              name: item.name,
              category: categoryName,
              quantity: 1,
              effect: item.effect,
            });
        }

        await user.save();

        await client.sendText(
          chatId,
          `✅ *Compra realizada com sucesso!*\n\n📦 Item: ${
            item.name
          }\n💵 Preço: ${item.price.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}\n💰 Saldo restante: ${user.economy.cash.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}\n\nUse *${prefix}inventario* para ver seus itens.`
        );
      } catch (err) {
        console.error('Erro na compra:', err);
        await client.sendText(
          chatId,
          `❌ Erro ao realizar compra: ${err.message}`
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
