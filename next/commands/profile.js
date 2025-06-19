export default {
  name: 'profile',
  aliases: ['perfil', 'saldo', 'stats'],
  args: false,
  description: 'Exibe o perfil completo com estatísticas e saldo do usuário',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const { chatId, sender, isGroupMsg } = message;
    const senderId = sender?.id || message.author || message.from || '';

    if (!senderId) {
      return client.reply(chatId, '❌ Usuário não identificado.', message.id);
    }

    try {
      const { User, Group } = client.db;

      // Obtém perfil do usuário (mencionado ou próprio)
      const targetUser = await getUserProfile(
        client,
        User,
        message,
        args,
        senderId
      );

      // Busca mensagens enviadas pelo usuário no grupo atual (se for grupo)
      let groupMessageCount = 0;
      if (isGroupMsg) {
        const groupData = await Group.findOne({ chatId });
        const userActivity = groupData?.userActivities?.find(
          (u) => u.phone === targetUser.phone
        );
        groupMessageCount = userActivity?.messages || 0;
      }

      // Monta a mensagem de perfil, já com o contador de mensagens do grupo
      const profileMessage = await buildProfileMessage(
        targetUser,
        prefix,
        senderId,
        groupMessageCount
      );

      return client.reply(chatId, profileMessage, message.id);
    } catch (error) {
      console.error('[PROFILE] Erro:', error);
      return client.reply(
        chatId,
        '❌ Ocorreu um erro ao gerar o perfil. Tente novamente mais tarde.',
        message.id
      );
    }
  },
};

// --- Funções auxiliares ---

async function getUserProfile(client, User, message, args, senderId) {
  const { mentionedJidList = [] } = message;

  // Se houver argumentos ou menção, busca usuário referido
  if (
    (args && args.length > 0) ||
    (mentionedJidList && mentionedJidList.length > 0)
  ) {
    const foundUser = await client.findUser({
      chat: message.chat,
      input: args.join(' '),
      client,
      message,
    });

    if (foundUser?.id) {
      return await getOrCreateUser(User, foundUser.id, client);
    }
  }

  // Senão, retorna o usuário do sender
  return await getOrCreateUser(User, senderId, client);
}

async function getOrCreateUser(User, userId, client) {
  const phone = userId.replace('@c.us', '');
  let user = await User.findOne({ phone });

  if (!user) {
    try {
      const contact = await client.getContact(userId);
      user = await createNewUser(User, phone, contact);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      user = await createBasicUser(User, phone);
    }
  }

  return user;
}

async function createNewUser(User, phone, contact) {
  return await User.create({
    phone,
    name:
      contact?.pushname ||
      contact?.formattedName ||
      contact?.verifiedName ||
      'Usuário',
    economy: {
      cash: 100,
      bank: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastDaily: null,
      lastWork: null,
    },
    stats: {
      level: 1,
      xp: 0,
      streak: 0,
      itemsBought: 0,
      jobsDone: 0,
      hoursWorked: 0,
      health: 100,
      happiness: 50,
      energy: 100,
      hunger: 100, // adiciona hunger e thirst para evitar undefined
      thirst: 100,
    },
    activity: {
      lastSeen: new Date(),
      commandsUsed: 0,
      messagesSent: 0,
    },
    registeredAt: new Date(),
  });
}

async function createBasicUser(User, phone) {
  return await User.create({
    phone,
    name: 'Usuário',
    economy: {
      cash: 100,
      bank: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastDaily: null,
      lastWork: null,
    },
    stats: {
      level: 1,
      xp: 0,
      streak: 0,
      itemsBought: 0,
      jobsDone: 0,
      hoursWorked: 0,
      health: 100,
      happiness: 50,
      energy: 100,
      hunger: 100,
      thirst: 100,
    },
    activity: {
      lastSeen: new Date(),
      commandsUsed: 0,
      messagesSent: 0,
    },
    registeredAt: new Date(),
  });
}

async function buildProfileMessage(
  user,
  prefix,
  senderId,
  groupMessageCount = 0
) {
  const isSelf = user.phone === senderId.replace('@c.us', '');
  const now = new Date();

  // Formatação utilitária
  const format = {
    currency: (value) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    date: (date) =>
      date ? new Date(date).toLocaleDateString('pt-BR') : 'Nunca',
    timeAgo: getTimeAgo(now),
    progressBar: (percent) => {
      const length = 10;
      const clampedPercent = Math.min(Math.max(percent, 0), 100);
      const filledLength = Math.round((clampedPercent / 100) * length);
      const filled = '🟩'.repeat(filledLength);
      const empty = '⬜'.repeat(length - filledLength);
      return `${filled}${empty} ${clampedPercent.toFixed(1)}%`;
    },
  };

  // Cálculo de dias registrado e progresso de nível
  const daysRegistered =
    Math.floor((now - new Date(user.registeredAt)) / (1000 * 60 * 60 * 24)) ||
    1;
  const levelProgress = calculateLevelProgress(user.stats);

  // Montagem da mensagem
  let message = `👤 *${user.name || 'Usuário'}* ${
    isSelf ? '' : '(Perfil Visualizado)'
  }\n`;
  message += `📅 Registrado em: ${format.date(
    user.registeredAt
  )} (${daysRegistered} dia${daysRegistered > 1 ? 's' : ''})\n\n`;

  // Economia
  message += `💵 *Economia*\n`;
  message += `▸ Carteira: ${format.currency(user.economy?.cash || 0)}\n`;
  message += `▸ Banco: ${format.currency(user.economy?.bank || 0)}\n`;
  message += `▸ Total Ganho: ${format.currency(
    user.economy?.totalEarned || 0
  )}\n\n`;

  // Status
  message += `❤️ *Status*\n`;
  message += `▸ Saúde: ${format.progressBar(user.stats.health)}\n`;
  message += `▸ Energia: ${format.progressBar(user.stats.energy)}\n`;
  message += `▸ Fome: ${format.progressBar(user.stats.hunger)}\n`;
  message += `▸ Sede: ${format.progressBar(user.stats.thirst)}\n`;
  message += `▸ Felicidade: ${format.progressBar(user.stats.happiness)}\n\n`;

  // Progresso
  message += `📊 *Progresso*\n`;
  message += `▸ Nível: ${levelProgress.level}\n`;
  message += `▸ XP: ${levelProgress.xp}/${levelProgress.xpNeeded}\n`;
  message += `▸ Progresso: ${format.progressBar(levelProgress.progress)}\n\n`;

  // Estatísticas
  message += `🏆 *Estatísticas*\n`;
  message += `▸ Trabalhos feitos: ${user.stats?.jobsDone || 0}\n`;
  message += `▸ Itens comprados: ${user.stats?.itemsBought || 0}\n`;
  message += `▸ Comandos usados: ${user.activity?.commandsUsed || 0}\n`;
  message += `▸ Mensagens enviadas (global): ${
    user.activity?.messagesSent || 0
  }\n`;
  message += `▸ Mensagens enviadas (grupo): ${groupMessageCount}\n`;
  message += `▸ Última atividade: ${format.timeAgo(
    user.activity?.lastSeen
  )}\n\n`;

  // Dicas
  if (isSelf) {
    message += `💡 *Dicas*\n`;
    message += `▸ Use \`${prefix}daily\` para resgatar seu prêmio diário\n`;
    message += `▸ Use \`${prefix}work\` para trabalhar e ganhar dinheiro\n`;
    message += `▸ Use \`${prefix}loja\` para ver itens disponíveis\n`;
    message += `▸ Use \`${prefix}usar <item>\` para usar um item do inventário\n`;
  } else {
    message += `🔹 Dica: Use \`${prefix}profile\` para ver seu próprio perfil`;
  }

  return message;
}

// --- Helpers ---

function getTimeAgo(now) {
  return (date) => {
    if (!date) return 'Nunca';
    const seconds = Math.floor((now - new Date(date)) / 1000);

    const intervals = [
      { unit: 'ano', seconds: 31536000 },
      { unit: 'mês', seconds: 2592000 },
      { unit: 'semana', seconds: 604800 },
      { unit: 'dia', seconds: 86400 },
      { unit: 'hora', seconds: 3600 },
      { unit: 'minuto', seconds: 60 },
    ];

    for (const { unit, seconds: secInUnit } of intervals) {
      const interval = Math.floor(seconds / secInUnit);
      if (interval >= 1)
        return `${interval} ${unit}${interval === 1 ? '' : 's'} atrás`;
    }

    return 'Agora mesmo';
  };
}

function calculateLevelProgress(stats = {}) {
  const level = stats.level || 1;
  const xp = stats.xp || 0;
  const xpNeeded = level * 1000;
  const progress = Math.min((xp / xpNeeded) * 100, 100);

  return { level, xp, xpNeeded, progress };
}
