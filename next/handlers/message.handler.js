import { imageHandler } from './image.handler.js';

export const messageHandler = async ({ socket, update }) => {
  const { messages, type } = update;
  if (type !== 'notify' || !messages?.length) return;
  for (const msg of messages) {
    try {
      const from = msg.key?.remoteJid;
      if (!from || from.endsWith('@newsletter') || from.endsWith('@broadcast'))
        continue;
      const isGroup = from.endsWith('@g.us');
      const senderId = msg.key?.participant || msg.key?.remoteJid;
      const senderName = msg.pushName || senderId || 'Desconhecido';
      const phoneNumber = senderId?.replace('@s.whatsapp.net', '');
      if (!phoneNumber) continue;
      let avatar = null;
      try {
        avatar = await socket.profilePictureUrl(senderId, { type: 'image' });
      } catch {}
      const newUserData = {
        name: senderName,
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
        data: {},
      };
      let messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';
      const isImage = !!msg.message?.imageMessage;
      const isVideo = !!msg.message?.videoMessage;
      if (!messageContent.trim() && !isImage && !isVideo) continue;
      let user = await socket.db.User.findOne({ phone: phoneNumber });
      if (!user) {
        user = new socket.db.User(newUserData);
      } else {
        const updateData = {};
        if (user.name !== senderName) updateData.name = senderName;
        if (user.avatar !== avatar) updateData.avatar = avatar;
        if (Object.keys(updateData).length) {
          await socket.db.User.updateOne(
            { phone: phoneNumber },
            { $set: updateData }
          );
          user = await socket.db.User.findOne({ phone: phoneNumber });
        }
      }
      if (isImage || isVideo) {
        await imageHandler({ socket, msg });
        continue;
      }
      if (isGroup) {
        const groupKey = from.replace(/\./g, '_');
        if (!user.data) user.data = new Map();
        const current = user.data.get(groupKey) || {
          mensagens: 0,
          originalId: from,
        };
        current.mensagens += 1;
        user.data.set(groupKey, current);
      }
      await user.save();
      const [rawCommand, ...args] = messageContent.trim().split(/\s+/g);
      const commandName = rawCommand.toLowerCase();
      if (!socket.commands.has(commandName) || msg.key.fromMe) continue;
      const command = socket.commands.get(commandName);
      if (command.groupOnly && !isGroup) {
        await socket.sendMessage(from, {
          text: '🚫 Esse comando só pode ser usado em grupos.',
        });
        continue;
      }
      let isSenderGroupAdmin = false;
      if (isGroup) {
        let metadata;
        try {
          metadata = await socket.groupMetadata(from);
        } catch (e) {
          console.warn(`Falha ao obter metadata do grupo: ${from}`);
        }
        const participants = metadata?.participants || [];
        const senderParticipant = participants.find((p) => p.id === senderId);
        isSenderGroupAdmin = ['admin', 'superadmin'].includes(
          senderParticipant?.admin
        );
      }
      if (command.adminOnly && isGroup && !isSenderGroupAdmin) {
        await socket.sendMessage(from, {
          text: '🚫 Você precisa ser *administrador do grupo* para usar esse comando.',
        });
        continue;
      }
      if (command.ownerOnly) {
        const isOwner = ['owner', 'admin'].includes(user?.config?.role);
        if (!isOwner) {
          await socket.sendMessage(from, {
            text: '🚫 Esse comando é exclusivo para *administradores do bot*.',
          });
          continue;
        }
      }
      await command.execute({ socket, message: msg, args });
    } catch (err) {
      console.error('❌ [COMMAND] Error:', err?.stack || err);
      try {
        await socket.sendMessage(msg.key?.remoteJid, {
          text: '❌ Ocorreu um erro ao processar o comando. Tente novamente mais tarde.',
        });
      } catch {}
    }
  }
};
