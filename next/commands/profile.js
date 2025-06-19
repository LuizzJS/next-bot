export default {
  name: 'profile',
  aliases: ['perfil', 'saldo', 'stats'],
  args: false,
  description: 'Exibe o perfil completo com estatísticas e saldo do usuário',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const { chatId, sender } = message;
    const senderId = sender?.id || message.author || message.from;

    if (!senderId) {
      return client.reply(chatId, '❌ Usuário não identificado.', message.id);
    }

    try {
      const { User } = client.db;

      const targetUser = await getUserProfile(
        client,
        User,
        message,
        args,
        senderId
      );
      const profileMessage = buildProfileMessage(targetUser, prefix, senderId);

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

// Helper functions
async function getUserProfile(client, User, message, args, senderId) {
  const { mentionedJidList } = message;

  // Busca usuário mencionado ou padrão (sender)
  if (args.length > 0 || mentionedJidList.length > 0) {
    const foundUser = await client.findUser({
      chat: message.chat,
      input: args.join(' '),
      client,
      message,
    });

    if (foundUser) {
      return await getOrCreateUser(User, foundUser.id, client);
    }
  }

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
      lastDaily: null,
      lastWork: null,
    },
    stats: {
      level: 1,
      xp: 0,
      streak: 0,
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
    economy: { cash: 100, bank: 0 },
    stats: { level: 1, xp: 0 },
    activity: { lastSeen: new Date() },
    registeredAt: new Date(),
  });
}

function buildProfileMessage(user, prefix, senderId) {
  const isSelf = user.phone === senderId.replace('@c.us', '');
  const now = new Date();

  // Formatações
  const format = {
    currency: (value) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    date: (date) =>
      date ? new Date(date).toLocaleDateString('pt-BR') : 'Nunca',
    timeAgo: getTimeAgo(now),
    progressBar: (percent) => {
      const length = 10;
      const filled = '🟩'.repeat(Math.round((percent / 100) * length));
      const empty = '⬜'.repeat(length - filled.length);
      return `${filled}${empty} ${percent.toFixed(1)}%`;
    },
  };

  // Dados calculados
  const daysRegistered =
    Math.floor((now - new Date(user.registeredAt)) / (1000 * 60 * 60 * 24)) ||
    1;
  const levelProgress = calculateLevelProgress(user.stats);

  // Construção da mensagem
  let message = `👤 *${user.name || 'Usuário'}* ${
    isSelf ? '' : '(Perfil Visualizado)'
  }\n`;
  message += `📅 Registrado em: ${format.date(
    user.registeredAt
  )} (${daysRegistered} dia${daysRegistered > 1 ? 's' : ''})\n\n`;

  // Seção Econômica
  message += `💵 *Economia*\n`;
  message += `▸ Carteira: ${format.currency(user.economy?.cash || 0)}\n`;
  message += `▸ Banco: ${format.currency(user.economy?.bank || 0)}\n`;
  message += `▸ Total Ganho: ${format.currency(
    user.economy?.totalEarned || 0
  )}\n`;
  message += `▸ Total Gasto: ${format.currency(
    user.economy?.totalSpent || 0
  )}\n`;
  message += `▸ Último daily: ${format.timeAgo(user.economy?.lastDaily)}\n`;
  message += `▸ Último trabalho: ${format.timeAgo(user.economy?.lastWork)}\n\n`;

  // Seção de Progresso
  message += `📊 *Progresso*\n`;
  message += `▸ Nível: ${levelProgress.level}\n`;
  message += `▸ XP: ${levelProgress.xp}/${levelProgress.xpNeeded}\n`;
  message += `▸ Progresso: ${format.progressBar(levelProgress.progress)}\n`;
  message += `▸ Sequência ativa: ${user.stats?.streak || 0} dias\n\n`;

  // Seção de Estatísticas
  message += `🏆 *Estatísticas*\n`;
  message += `▸ Itens comprados: ${user.stats?.itemsBought || 0}\n`;
  message += `▸ Comandos usados: ${user.activity?.commandsUsed || 0}\n`;
  message += `▸ Mensagens enviadas: ${user.activity?.messagesSent || 0}\n`;
  message += `▸ Última atividade: ${format.timeAgo(
    user.activity?.lastSeen
  )}\n\n`;

  // Dicas interativas
  if (isSelf) {
    message += `💡 *Dicas*\n`;
    message += `▸ Use \`${prefix}daily\` para resgatar seu prêmio diário\n`;
    message += `▸ Use \`${prefix}work\` para trabalhar e ganhar dinheiro\n`;
    message += `▸ Use \`${prefix}loja\` para ver itens disponíveis\n`;
  } else {
    message += `🔹 Dica: Use \`${prefix}profile\` para ver seu próprio perfil`;
  }

  return message;
}

// Helper functions para formatação
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

    for (const { unit, seconds: secondsInUnit } of intervals) {
      const interval = Math.floor(seconds / secondsInUnit);
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
