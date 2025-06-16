import ms from 'ms';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export default {
  name: 'pix',
  aliases: [],
  args: true,
  description: 'Envia Pix imediato ou agendado.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args }) => {
    try {
      const { User, ScheduledPix } = client.db;
      const senderId = message.sender?.id || message.sender;
      const senderPhone = senderId.replace('@c.us', '');

      // Tenta encontrar remetente, se não existir, cria automaticamente
      let senderUser = await User.findOne({ phone: senderPhone });
      if (!senderUser) {
        senderUser = await User.create({
          phone: senderPhone,
          name: 'Usuário recém-registrado',
          economy: { money: 1000 }, // Pode ajustar saldo inicial se quiser
        });
        await client.sendText(
          message.chatId,
          '⚠️ Você não estava registrado, mas foi criado automaticamente com saldo inicial.',
        );
      }

      if (args.length < 2) {
        return client.sendText(
          message.chatId,
          '❌ Uso correto: /pix @alvo valor [tempo]',
        );
      }

      // target aqui é string tipo '92381923@c.us'
      const targetId = await client.findUser({
        chat: message.chatId,
        input: args[0],
        client,
        message,
      });

      if (!targetId) {
        return client.sendText(message.chatId, '❌ Usuário não encontrado.');
      }

      const targetPhone = targetId.replace('@c.us', '');

      if (targetPhone === senderPhone) {
        return client.sendText(
          message.chatId,
          '❌ Você não pode enviar Pix para si mesmo.',
        );
      }

      // Busca ou cria destinatário
      const targetUser = await User.findOneAndUpdate(
        { phone: targetPhone },
        {
          $setOnInsert: {
            name: 'Desconhecido',
            economy: { money: 0 },
          },
        },
        { upsert: true, new: true },
      );

      const amount = parseInt(args[1], 10);
      if (isNaN(amount) || amount <= 0) {
        return client.sendText(message.chatId, '❌ Valor inválido.');
      }

      const senderBalance = senderUser.economy?.money ?? 0;
      if (senderBalance < amount) {
        return client.sendText(message.chatId, '❌ Saldo insuficiente.');
      }

      let delayMs = 0;
      if (args[2]) {
        delayMs = ms(args[2]);
        const maxMs = ms('7d');

        if (!delayMs || delayMs <= 0 || delayMs > maxMs) {
          return client.sendText(
            message.chatId,
            '❌ Tempo inválido. Use algo como "10m", "2h", "1d" (máximo 7 dias).',
          );
        }
      }

      const formattedAmount = amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      const recipientName = targetUser.name || 'Usuário';

      if (delayMs > 0) {
        const scheduledAt = new Date(Date.now() + delayMs);
        const formattedDate = dayjs(scheduledAt)
          .tz('America/Sao_Paulo')
          .format('DD/MM/YYYY [às] HH:mm');

        await ScheduledPix.create({
          from: senderUser._id,
          to: targetUser._id,
          amount,
          scheduledAt,
        });

        senderUser.economy.money -= amount;
        await senderUser.save();

        return client.sendText(
          message.chatId,
          `📅 Pix de *${formattedAmount}* agendado para *${formattedDate}* para *${recipientName}*.`,
        );
      } else {
        senderUser.economy.money -= amount;
        targetUser.economy.money = (targetUser.economy.money || 0) + amount;

        await senderUser.save();
        await targetUser.save();

        return client.sendText(
          message.chatId,
          `✅ Pix de *${formattedAmount}* enviado para *${recipientName}*!`,
        );
      }
    } catch (err) {
      console.error('[PIX] Erro:', err);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao processar o Pix.',
      );
    }
  },
};
