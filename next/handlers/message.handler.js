export const messageHandler = async ({ socket, update }) => {
  const { messages, type } = update;
  if (type !== 'notify') return;

  for (const msg of messages) {
    try {
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const senderId = msg.key.participant || msg.key.remoteJid;
      const senderName = msg.pushName || senderId;
      const phoneNumber = senderId.replace('@s.whatsapp.net', '');

      const messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      if (!messageContent) continue;

      let user = await socket.db.findOne({ phone: phoneNumber });

      let avatar = null;
      try {
        avatar = await socket.profilePictureUrl(senderId, 'image');
      } catch {
        avatar = null;
      }

      if (!user) {
        const newUser = {
          name: senderName || 'Desconhecido',
          phone: phoneNumber,
          authorized: false,
          stickers: 0,
          marriage: null,
          avatar,
          config: {
            role: 'user',
            ratio: 'original',
            premium: 'None',
            language: 'pt-BR',
          },
          data: [],
        };

        if (isGroup) {
          newUser.data.push({
            group: from,
            groupName:
              msg?.message?.groupInviteMessage?.groupName || 'Desconhecido',
          });
        }

        user = await socket.db.create(newUser);
        console.log(`[DB] 🆕 Novo usuário salvo: ${phoneNumber}`);
      } else {
        const updateData = {};
        if (user.name !== senderName) updateData.name = senderName;
        if (user.avatar !== avatar) updateData.avatar = avatar;

        if (Object.keys(updateData).length > 0) {
          await socket.db.updateOne(
            { phone: phoneNumber },
            { $set: updateData }
          );
          console.log(`[DB] ✏️ Usuário atualizado: ${phoneNumber}`, updateData);
        }
      }

      const [rawCommand, ...args] = messageContent.trim().split(/\s+/);
      const commandName = rawCommand.toLowerCase();

      if (!socket.commands.has(commandName)) continue;
      if (msg.key.fromMe) continue;

      const command = socket.commands.get(commandName);

      if (command.groupOnly && !isGroup) {
        await socket.sendMessage(from, {
          text: '🚫 Esse comando só pode ser usado em grupos.',
        });
        return;
      }

      let metadata = null;
      let isSenderGroupAdmin = false;

      if (isGroup) {
        metadata = await socket.groupMetadata(from);
        const participants = metadata?.participants || [];
        const senderParticipant = participants.find((p) => p.id === senderId);
        isSenderGroupAdmin =
          senderParticipant?.admin === 'admin' ||
          senderParticipant?.admin === 'superadmin';
      }

      if (command.adminOnly && isGroup && !isSenderGroupAdmin) {
        await socket.sendMessage(from, {
          text: '🚫 Você precisa ser *administrador do grupo* para usar esse comando.',
        });
        return;
      }

      if (command.ownerOnly) {
        const isBotAdmin =
          user?.config?.role === 'owner' || user?.config?.role === 'admin';

        if (!isBotAdmin) {
          await socket.sendMessage(from, {
            text: '🚫 Esse comando é exclusivo para *administradores do bot*.',
          });
          return;
        }
      }

      await command.execute({ socket, message: msg, args });

      console.log(
        `[COMMAND] ${
          isGroup ? 'GROUP' : 'PRIVATE'
        } - ${senderName} (${from}) executou: ${commandName}`
      );
    } catch (err) {
      console.error('❌ [COMMAND ERROR]:', err);
      try {
        const from = msg?.key?.remoteJid;
        if (from) {
          await socket.sendMessage(from, {
            text: '❌ Ocorreu um erro ao processar o comando. Tente novamente mais tarde.',
          });
        }
      } catch {}
    }
  }
};
