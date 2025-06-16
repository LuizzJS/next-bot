const stealGames = new Map(); // chave: atacante (ex: '123456789@c.us')

const messageListeners = new Map(); // chave: atacante

function registerListener(attackerId, listenerFn) {
  messageListeners.set(attackerId, listenerFn);
}

function unregisterListener(attackerId) {
  messageListeners.delete(attackerId);
}

// Listener que só permite o atacante tentar adivinhar
async function stealListener({ client, message }) {
  const senderId = message.sender?.id || message.sender;
  const game = stealGames.get(senderId);
  if (!game) return; // não tem jogo pra esse atacante

  const chatId = message.chatId;
  const guess = message.body?.toLowerCase()?.trim();
  if (!guess) {
    return client.sendText(
      chatId,
      `🕵️ Palavra embaralhada: *${game.shuffledWord}*\nUse /roubar [palavra] para tentar.`,
    );
  }

  const { User } = client.db;

  const attackerUser = await User.findOne({
    phone: senderId.replace('@c.us', ''),
  });
  const defenderUser = await User.findOne({
    phone: game.defender.replace('@c.us', ''),
  });

  if (!attackerUser || !defenderUser) {
    stealGames.delete(senderId);
    unregisterListener(senderId);
    return client.sendText(chatId, '❌ Usuário(s) não encontrado(s).');
  }

  const defenderMoney = defenderUser.economy?.money || 0;
  const attackerMoney = attackerUser.economy?.money || 0;

  if (defenderMoney <= 0 && attackerMoney <= 0) {
    stealGames.delete(senderId);
    unregisterListener(senderId);
    return client.sendText(
      chatId,
      '❌ Nenhum dos dois tem saldo suficiente para roubar.',
    );
  }

  if (guess === game.word) {
    if (defenderMoney <= 0) {
      stealGames.delete(senderId);
      unregisterListener(senderId);
      return client.sendText(
        chatId,
        '❌ O alvo não tem saldo suficiente para roubar.',
      );
    }

    const amount = Math.floor(defenderMoney * 0.1);

    attackerUser.economy.money = (attackerUser.economy.money || 0) + amount;
    defenderUser.economy.money = defenderMoney - amount;

    await attackerUser.save();
    await defenderUser.save();

    stealGames.delete(senderId);
    unregisterListener(senderId);

    return client.sendText(
      chatId,
      `🎉 *${attackerUser.name || 'Você'}* roubou R$${amount.toLocaleString(
        'pt-BR',
      )} de *${defenderUser.name || 'alvo'}*!`,
    );
  } else {
    if (attackerMoney <= 0) {
      stealGames.delete(senderId);
      unregisterListener(senderId);
      return client.sendText(
        chatId,
        '❌ O atacante não tem saldo suficiente para o defensor roubar de volta.',
      );
    }

    const amount = Math.floor(attackerMoney * 0.1);

    defenderUser.economy.money = defenderMoney + amount;
    attackerUser.economy.money = attackerMoney - amount;

    await attackerUser.save();
    await defenderUser.save();

    stealGames.delete(senderId);
    unregisterListener(senderId);

    return client.sendText(
      chatId,
      `❌ Palavra incorreta! *${
        defenderUser.name || 'O alvo'
      }* roubou R$${amount.toLocaleString('pt-BR')} de *${
        attackerUser.name || 'você'
      }* na volta!`,
    );
  }
}

// Comando roubar
export default {
  name: 'roubar',
  args: true,
  description:
    'Tente roubar saldo de outro usuário acertando a palavra embaralhada.',
  group_only: true,
  bot_owner_only: true,
  execute: async ({ client, message, args }) => {
    const chatId = message.chatId;
    const senderId = message.sender?.id || message.sender;

    try {
      if (stealGames.has(senderId)) {
        return client.sendText(
          chatId,
          '⚠️ Você já tem um roubo em andamento. Use o chat para tentar adivinhar a palavra.',
        );
      }

      const targetInput = args[0];
      if (!targetInput) {
        return client.sendText(chatId, '❌ Use /roubar @usuário');
      }

      if (!targetInput.startsWith('@')) {
        return client.sendText(
          chatId,
          '❌ Você precisa mencionar o usuário com @',
        );
      }

      const normalizedTargetInput = targetInput.replace('@', '');

      const target = await client.findUser({
        chat: chatId,
        input: normalizedTargetInput,
        client,
        message,
      });

      if (!target) {
        return client.sendText(chatId, '❌ Usuário alvo não encontrado.');
      }

      if (target.phone === senderId.replace('@c.us', '')) {
        return client.sendText(chatId, '❌ Você não pode roubar a si mesmo.');
      }

      const word = await getRandomPortugueseWord();
      const shuffledWord = shuffleWord(word);

      const { User } = client.db;
      const attackerUser = await User.findOne({
        phone: senderId.replace('@c.us', ''),
      });
      const defenderUser = await User.findOne({ phone: target.phone });

      if (!attackerUser || !defenderUser) {
        return client.sendText(
          chatId,
          '❌ Usuário(s) não encontrado(s) no banco de dados.',
        );
      }

      stealGames.set(senderId, {
        attacker: senderId,
        defender: target.phone + '@c.us',
        attackerName: attackerUser.name || 'Você',
        defenderName: defenderUser.name || target.phone,
        word,
        shuffledWord,
      });

      registerListener(senderId, (msg) =>
        stealListener({ client, message: msg }),
      );

      return client.sendText(
        chatId,
        `🕵️ *${attackerUser.name}* quer roubar *${defenderUser.name}*!\n` +
          `Adivinhe a palavra para roubar:\n*${shuffledWord}*\n` +
          `Use o chat para enviar a palavra correta.`,
      );
    } catch (err) {
      console.error('[ROUBAR] Erro:', err);
      return client.sendText(chatId, '❌ Ocorreu um erro ao tentar roubar.');
    }
  },
};
