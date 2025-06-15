import media_handler from './media.handler.js';

const message_handler = async ({ message, client }) => {
  const prefix = '/';
  const from = message.from;
  const is_group = from.includes('@g.us');
  const is_broadcast =
    from.endsWith('@broadcast') || from.endsWith('@newsletter');

  try {
    if (is_broadcast || !message.body?.trim()) return;

    const sender_id = message.sender?.id || message.author || message.from;
    const sender = await client.getContact(sender_id);
    const sender_name = sender.pushname || 'Desconhecido';

    if (is_group) {
      const group = await client.getChatById(message.chatId);
      const inviteLink = await client
        .getGroupInviteLink(group.id)
        .catch(() => null);

      await client.db.Group.findOneAndUpdate(
        { id: group.id },
        {
          $set: {
            name: group.name,
            inviteLink,
          },
          $setOnInsert: {
            autoSticker: false,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Busca usuário no banco
    const user_phone = String(sender?.id).replace('@c.us', '');
    let user = await client.db.User.findOne({ phone: user_phone });

    if (!user) {
      user = await client.db.User.create({
        name: sender_name,
        phone: user_phone,
      });

      console.warn(`⚠️ Novo usuário adicionado na database: ${user_phone}`);
      return;
    }

    // Trata mídias (imagem ou vídeo)
    if (
      message.mimetype?.startsWith('image/') ||
      message.mimetype?.startsWith('video/')
    ) {
      return await media_handler({ message, client });
    }

    const user_role = user.config?.role || 'user';
    const user_lang = user.config?.language?.substring(0, 2) || 'pt';
    const is_bot_owner = user_role === 'owner' || user_role === 'admin';

    const is_admin = is_group
      ? (await client.getGroupAdmins(message.chatId)).includes(sender.id)
      : false;

    console.log(
      `[MSG] Grupo: ${is_group} | Nome: ${sender_name} | ID: ${sender.id} | Conteúdo: ${message.body}`
    );

    const body = message.body.trim();
    if (!body.startsWith(prefix)) return;

    const [command_name, ...args] = body
      .slice(prefix.length)
      .trim()
      .split(/\s+/);
    const command = client.commands.get(command_name.toLowerCase());
    if (!command) return;

    const placeholders = {
      '{user}': `@${user_phone}`,
      '{example}': command.command_example || '',
    };

    // Função para substituir placeholders
    const formatMsg = (template) => {
      let msg = template;
      for (const [key, value] of Object.entries(placeholders)) {
        msg = msg.replace(new RegExp(key, 'g'), value);
      }
      return msg;
    };

    // Verificação de argumentos
    if (command.args_length && args.length < command.args_length) {
      const msg = client.messages?.restrictions?.missing_args?.[user_lang]
        ? formatMsg(client.messages.restrictions.missing_args[user_lang])
        : 'Argumentos insuficientes.';

      return client.sendTextWithMentions(message.chatId, msg);
    }

    // Verificações de permissão
    if (command.group_only && !is_group) {
      const msg = client.messages?.restrictions?.group_only?.[user_lang]
        ? formatMsg(client.messages.restrictions.group_only[user_lang])
        : 'Este comando só pode ser usado em grupos.';
      return client.sendTextWithMentions(message.chatId, msg);
    }

    if (command.bot_owner_only && !is_bot_owner) {
      const msg = client.messages?.restrictions?.owner_only?.[user_lang]
        ? formatMsg(client.messages.restrictions.owner_only[user_lang])
        : 'Apenas o dono do bot pode usar este comando.';
      return client.sendTextWithMentions(message.chatId, msg);
    }

    if (command.admin_only && !is_admin) {
      const msg = client.messages?.restrictions?.admin_only?.[user_lang]
        ? formatMsg(client.messages.restrictions.admin_only[user_lang])
        : 'Você precisa ser administrador para usar este comando.';
      return client.sendTextWithMentions(message.chatId, msg);
    }

    // Executa o comando
    console.log(
      `⚙️ Executando "${command.name}" | Por: ${sender_name} (${user_phone})`
    );
    await client.react(message.id, '⌛');
    const start = Date.now();

    await command.execute({ message, client, args });

    const runtime = (Date.now() - start).toFixed(2);
    console.log(`⚙️ "${command.name}" finalizado. Tempo: ${runtime}ms`);
    await client.react(message.id, '✅');
  } catch (error) {
    console.error('❌ Erro no message_handler:', error);
    await client.react(message.id, '❎');
    const user_lang = message?.user?.config?.language?.substring(0, 2) || 'pt';
    const msg = client.messages?.errors?.unknownError?.[user_lang]
      ? client.messages.errors.unknownError[user_lang].replace(
          '{user}',
          `@${message.sender?.id || message.author || message.from}`
        )
      : '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.';
    await client.sendText(message.chatId, msg);
  }
};

export default message_handler;
