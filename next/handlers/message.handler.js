import { mediaHandler } from './media.handler.js';

export const messageHandler = async ({ socket, update }) => {
  const { messages, type } = update;
  if (type !== 'notify' || !messages?.length) return;
  for (const msg of messages) {
    const isFromMe =
      msg.key.fromMe ||
      (msg.key.participant || msg.key.remoteJid) === socket.user?.id;
    if (isFromMe) continue;

    try {
      const from = msg.key?.remoteJid;
      if (!from || from.endsWith('@newsletter') || from.endsWith('@broadcast'))
        continue;

      const isGroup = from.endsWith('@g.us');
      const senderId = msg.key?.participant || msg.key?.remoteJid;
      const senderName = msg.pushName || senderId || 'Desconhecido';
      const phoneNumber = senderId?.replace('@s.whatsapp.net', '');
      if (!phoneNumber) continue;

      let messageContent =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      const isImage = !!msg.message?.imageMessage;
      const isVideo = !!msg.message?.videoMessage;
      const isSticker = !!msg.message?.stickerMessage;

      messageContent || isSticker || isImage || isVideo
        ? console.log(
            `[MSG] From: ${senderName} (${phoneNumber}) | Group: ${isGroup} | Type: ${
              isImage
                ? 'Image'
                : isVideo
                ? 'Video'
                : isSticker
                ? 'Sticker'
                : 'Text'
            } | Content: "${messageContent.trim()}"`
          )
        : null;

      if (!messageContent.trim() && !isSticker && !isImage && !isVideo)
        continue;

      const avatar = await socket
        .profilePictureUrl(senderId, 'image')
        .catch(() => null);

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

      if (socket.awaitingRatioResponse?.has(phoneNumber) && messageContent) {
        const choice = messageContent.trim();

        if (choice === '1' || choice === '2') {
          const user = await socket.db.User.findOne({ phone: phoneNumber });
          if (!user) {
            await socket.sendMessage(msg.key.remoteJid, {
              text: '❌ Usuário não encontrado no banco de dados.',
            });
            socket.awaitingRatioResponse.delete(phoneNumber);
            return;
          }

          user.config.ratio = choice === '1' ? '1:1' : 'original';
          await user.save();

          await socket.sendMessage(msg.key.remoteJid, {
            text: `✅ Proporção alterada para: *${user.config.ratio}*.`,
          });

          socket.awaitingRatioResponse.delete(phoneNumber);
        } else {
          await socket.sendMessage(msg.key.remoteJid, {
            text: '❌ Opção inválida. Responda com *1* ou *2*.',
          });
        }
        continue;
      }

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

      if (
        (isImage || isVideo) &&
        (messageContent.trim() === 'sticker' || user.config.autoSticker)
      ) {
        const startTime = Date.now();
        await mediaHandler({ socket, msg });
        const elapsedTime = Date.now() - startTime;
        console.log(`📷 [mediaHandler] Tempo de execução: ${elapsedTime} ms`);
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
      if (!socket.commands.has(commandName)) continue;

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

      const start = Date.now();
      await command.execute({ socket, message: msg, args });
      const end = Date.now();
      console.log(
        `⚙️ [command: ${commandName}] Tempo de execução: ${end - start} ms`
      );
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
