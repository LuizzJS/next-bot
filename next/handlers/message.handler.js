import mediaHandler from './media.handler.js';

const messageHandler = async ({ message, client }) => {
  const { body, chatId } = message;
  const isGroup = chatId?.endsWith('@g.us');
  const isBroadcast =
    chatId?.endsWith('@broadcast') || chatId?.endsWith('@newsletter');

  if (isBroadcast) return;
  if (!body?.trim()) return;

  let senderId = message.sender?.id || message.author || message.from;
  if (!senderId) return;

  let senderName = 'Usuário';
  try {
    const contact = await client.getContact(senderId);
    senderName = contact?.pushname || contact?.name || senderName;
  } catch {}

  const phoneNumber = senderId.replace('@c.us', '');

  console.log(
    `[M] De: ${phoneNumber} | Chat: ${chatId} | Conteúdo: "${
      body.length > 50 ? body.slice(0, 50) + '...' : body
    }"`
  );

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

      if (groupData.recordUserMessage) {
        await groupData.recordUserMessage(phoneNumber);
      } else {
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

  // --- Atualizar/Registrar usuário e reduzir fome/sede ---
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
        stats: {
          health: 100,
          energy: 100,
          hunger: 100,
          thirst: 100,
        },
        groups: isGroup ? [chatId] : [],
      });
      await user.save();
      console.log(`[U] Criado novo usuário ${phoneNumber} (${senderName})`);
    } else {
      const updates = {
        $set: { name: senderName, 'activity.lastSeen': new Date() },
        $inc: { 'activity.messagesSent': 1 },
      };

      if (isGroup) {
        updates.$addToSet = { groups: chatId };
      }

      // Reduz fome e sede a cada 5 mensagens
      const msgCount = (user.activity?.messagesSent || 0) + 1;
      if (msgCount % 5 === 0) {
        updates.$inc['stats.hunger'] = -2;
        updates.$inc['stats.thirst'] = -3;
      }

      user = await client.db.User.findOneAndUpdate(
        { phone: phoneNumber },
        updates,
        { new: true, runValidators: true }
      );
      console.log(`[U] Atualizado usuário ${phoneNumber} (${senderName})`);
    }
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
  }

  if (
    ['image', 'video', 'audio', 'sticker', 'document'].includes(message.type) ||
    (message.type === 'conversation' && message.isMedia === true)
  ) {
    return mediaHandler({ message, client, groupData });
  }

  if (body.trim().startsWith(prefix)) {
    const [commandName, ...args] = body
      .slice(prefix.length)
      .trim()
      .split(/\s+/);
    const command = client.commands.get(commandName.toLowerCase());
    if (!command) return;

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

    const chatName = (await client.getChatById(chatId)).name;
    console.log(
      `[C] Executando comando "${command.name}" por ${phoneNumber} em ${chatName}`
    );

    try {
      await client.react(message.id, '⌛');
      const startTime = Date.now();

      await client.db.User.findOneAndUpdate(
        { phone: phoneNumber },
        { $inc: { 'activity.commandsUsed': 1 } }
      );

      if (!user?.authorized && command.name !== 'register') {
        return client.reply(
          chatId,
          `🔐 Você não está autorizado a usar comandos, por favor, registre-se antes de prosseguir.\n▸ Utilize *${prefix}registrar*.`,
          message.id
        );
      }

      await command.execute({ client, message, args, prefix });

      const endTime = Date.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(2);
      await client.react(message.id, '✅');

      console.log(
        `[C] Comando "${command.name}" finalizado por ${phoneNumber} em ${elapsed}s`
      );
    } catch (error) {
      console.error(`Erro ao executar comando ${command.name}:`, error);
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
