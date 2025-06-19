import mediaHandler from './media.handler.js';

const messageHandler = async ({ message, client }) => {
  const { body, chatId } = message;
  const isGroup = chatId?.endsWith('@g.us');
  const isBroadcast =
    chatId?.endsWith('@broadcast') || chatId?.endsWith('@newsletter');

  if (isBroadcast) return; // ignora broadcasts/newsletters
  if (!body?.trim()) return; // ignora mensagens vazias

  // --- Resolver sender e prefixo ---
  let senderId = message.sender?.id || message.author || message.from;
  if (!senderId) return;

  let senderName = 'Usuário';
  try {
    const contact = await client.getContact(senderId);
    senderName = contact?.pushname || contact?.name || senderName;
  } catch {}

  const phoneNumber = senderId.replace('@c.us', '');

  // --- Log mensagem recebida ---
  console.log(
    `[M] De: ${phoneNumber} | Chat: ${chatId} | Conteúdo: "${
      body.length > 50 ? body.slice(0, 50) + '...' : body
    }"`
  );

  // --- Obter prefixo direto do DB (sem cache) ---
  let prefix = '/';
  if (isGroup) {
    try {
      const group = await client.db.Group.findOne({ id: chatId })
        .select('settings.prefix')
        .lean();
      prefix = group?.settings?.prefix || client.prefix || '/';
    } catch (error) {
      console.error('Erro ao buscar prefixo do grupo:', error);
      prefix = client.prefix || '/';
    }
  } else {
    prefix = client.prefix || '/';
  }

  // --- Atualizar dados do grupo no DB (sem cache) ---
  let groupData = null;
  if (isGroup) {
    try {
      const groupInfo = await client.getChatById(chatId);
      const inviteLink = await client
        .getGroupInviteLink(chatId)
        .catch(() => null);
      const participants = await client.getGroupMembers(chatId).catch(() => []);

      const updateData = {
        name: groupInfo.name,
        inviteLink: inviteLink || '',
        'members.count': participants.length,
        'stats.lastActivity': new Date(),
      };

      // Atualiza ou cria grupo no DB
      groupData = await client.db.Group.findOneAndUpdate(
        { id: chatId },
        {
          $set: updateData,
          $setOnInsert: {
            settings: {
              autoSticker: false,
              prefix: '/',
              welcomeMessage: 'Bem-vindo(a), {user}!',
            },
            createdAt: new Date(),
            userActivities: new Map(),
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Registrar atividade do usuário no grupo
      if (groupData.recordUserMessage) {
        await groupData.recordUserMessage(phoneNumber);
      } else {
        // Se não existir método, atualiza direto aqui
        const key = `userActivities.${phoneNumber}`;
        await client.db.Group.updateOne(
          { id: chatId },
          {
            $inc: { [`${key}.messageCount`]: 1 },
            $set: {
              [`${key}.lastActivity`]: new Date(),
              [`${key}.userId`]: phoneNumber,
            },
          }
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do grupo:', error);
    }
  }

  // --- Atualizar/Registrar usuário ---
  try {
    let user = await client.db.User.findOne({ phone: phoneNumber });
    if (!user) {
      user = new client.db.User({
        phone: phoneNumber,
        name: senderName,
        activity: {
          lastSeen: new Date(),
          messagesSent: 1,
          commandsUsed: 0,
        },
        groups: isGroup ? [chatId] : [],
      });
      await user.save();
      console.log(`[U] Criado novo usuário ${phoneNumber} (${senderName})`);
    } else {
      const updateData = {
        $set: { name: senderName, 'activity.lastSeen': new Date() },
        $inc: { 'activity.messagesSent': 1 },
      };
      if (isGroup) {
        updateData.$addToSet = { groups: chatId };
      }
      user = await client.db.User.findOneAndUpdate(
        { phone: phoneNumber },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      console.log(`[U] Atualizado usuário ${phoneNumber} (${senderName})`);
    }
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
  }

  // --- Se for mídia, chama mediaHandler e retorna ---
  if (
    ['image', 'video', 'audio', 'sticker', 'document'].includes(message.type) ||
    (message.type === 'conversation' && message.isMedia === true)
  ) {
    return mediaHandler({ message, client, groupData });
  }

  // --- Se mensagem começa com prefixo, tenta executar comando ---
  if (body.trim().startsWith(prefix)) {
    const [commandName, ...args] = body
      .slice(prefix.length)
      .trim()
      .split(/\s+/);
    const command = client.commands.get(commandName.toLowerCase());
    if (!command) return;

    // --- Verifica permissões básicas ---
    const user = await client.db.User.findOne({ phone: phoneNumber });
    const role = user?.config?.role || 'user';

    if (command.group_only && !isGroup) {
      return client.reply(
        chatId,
        '❌ Este comando só pode ser usado em grupos.',
        message.id
      );
    }
    if (command.group_admin_only) {
      const chat = await client.getChatById(chatId);
      const participant = chat?.groupMetadata?.participants.find(
        (p) => p.id === senderId
      );
      if (!participant?.isAdmin && !participant?.isSuperAdmin) {
        return client.reply(
          chatId,
          '❌ Este comando requer que você seja administrador do grupo.',
          message.id
        );
      }
    }
    if (command.bot_admin_only && !['admin', 'owner'].includes(role)) {
      return client.reply(
        chatId,
        '❌ Este comando requer que você seja administrador do bot.',
        message.id
      );
    }
    if (command.bot_owner_only && role !== 'owner') {
      return client.reply(
        chatId,
        '❌ Este comando é restrito ao dono do bot.',
        message.id
      );
    }

    if (command.args && command.args > args.length) {
      return client.reply(
        chatId,
        `❌ Uso incorreto do comando.\nUse:\n${prefix}${command.name} ${
          command.args ? '<args>' : ''
        }`,
        message.id
      );
    }

    // --- Log comando executado ---
    const chatName = (await client.getChatById(chatId)).name;
    console.log(
      `[C] Executando comando "${command.name}" por ${phoneNumber} em ${chatName}`
    );

    try {
      // --- Reação: comando iniciado ---
      await client.react(message.id, '⌛');

      const startTime = Date.now();

      // --- Incrementa contador comandos usados e executa ---
      await client.db.User.findOneAndUpdate(
        { phone: phoneNumber },
        { $inc: { 'activity.commandsUsed': 1 } }
      );

      await command.execute({ client, message, args, prefix });

      const endTime = Date.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(2);

      // --- Reação: comando finalizado ---
      await client.react(message.id, '✅');

      // --- Log tempo execução ---
      console.log(
        `[C] Comando "${command.name}" finalizado por ${phoneNumber} em ${elapsed}s`
      );
    } catch (error) {
      console.error(`Erro ao executar comando ${command.name}:`, error);

      // --- Reação: erro na execução ---
      await client.react(message.id, '❌');

      await client.reply(
        chatId,
        `❌ Ocorreu um erro ao executar o comando ${command.name}.`,
        message.id
      );
    }
  }
};

export default messageHandler;
