export default {
  name: 'usar',
  aliases: ['use', 'usaritem'],
  args: true,
  description: 'Use um item do seu inventário',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const phone = message.sender.id.replace('@c.us', '');
    const { User } = client.db;
    const chatId = message.chatId;

    try {
      const user = await User.findOne({ phone });
      if (!user) {
        return await client.reply(
          chatId,
          '❌ Você não está registrado.',
          message.id
        );
      }

      if (!user.inventory || user.inventory.length === 0) {
        return await client.reply(
          chatId,
          '📦 Seu inventário está vazio.',
          message.id
        );
      }

      // Se só chamar "usar" sem argumento, lista os itens
      if (args.length === 0) {
        let msg = '📦 *Seu Inventário:* \n\n';
        user.inventory.forEach((item, index) => {
          msg += `${index + 1}. ${item.name} (x${item.quantity})\n`;
        });
        msg += `\nUse *${prefix}usar <número ou nome do item>* para usar.`;
        return await client.reply(chatId, msg, message.id);
      }

      // Buscar item pelo índice ou nome
      const arg = args.join(' ').toLowerCase();

      let itemToUse = null;
      // tenta número primeiro
      if (!isNaN(arg)) {
        const idx = parseInt(arg) - 1;
        if (idx >= 0 && idx < user.inventory.length) {
          itemToUse = user.inventory[idx];
        }
      }
      // tenta nome
      if (!itemToUse) {
        itemToUse = user.inventory.find((i) => i.name.toLowerCase() === arg);
      }

      if (!itemToUse) {
        return await client.reply(
          chatId,
          '❌ Item não encontrado no seu inventário.',
          message.id
        );
      }

      // Aplicar efeitos do item (se existir efeito)
      if (itemToUse.effect) {
        // Garantir stats existam
        if (!user.stats) user.stats = {};
        user.stats.energy = user.stats.energy ?? 100;
        user.stats.health = user.stats.health ?? 100;
        user.stats.hunger = user.stats.hunger ?? 100;
        user.stats.happiness = user.stats.happiness ?? 100;

        const effects = itemToUse.effect;

        // Atualiza stats conforme efeito, com limites 0-100
        if (effects.energy) {
          user.stats.energy = Math.min(100, user.stats.energy + effects.energy);
        }
        if (effects.health) {
          user.stats.health = Math.min(100, user.stats.health + effects.health);
        }
        if (effects.hunger) {
          user.stats.hunger = Math.min(100, user.stats.hunger + effects.hunger);
        }
        if (effects.happiness) {
          user.stats.happiness = Math.min(
            100,
            user.stats.happiness + effects.happiness
          );
        }
      }

      // Remove 1 do item no inventário
      itemToUse.quantity--;
      if (itemToUse.quantity <= 0) {
        // Remove item do inventário se quantidade zerar
        user.inventory = user.inventory.filter((i) => i !== itemToUse);
      }

      await user.save();

      let effectMsg = '';
      if (itemToUse.effect) {
        effectMsg = '✨ *Efeitos aplicados:* \n';
        for (const [key, val] of Object.entries(itemToUse.effect)) {
          effectMsg += `▸ ${key.charAt(0).toUpperCase() + key.slice(1)}: ${
            val > 0 ? '+' : ''
          }${val}\n`;
        }
      }

      await client.reply(
        chatId,
        `✅ Você usou *${itemToUse.name}*.\n${effectMsg}`.trim(),
        message.id
      );
    } catch (error) {
      console.error('Erro no comando usar:', error);
      await client.reply(
        chatId,
        '❌ Ocorreu um erro ao usar o item.',
        message.id
      );
    }
  },
};
