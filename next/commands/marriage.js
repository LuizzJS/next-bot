import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/pt-br.js';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export default {
  name: 'marriage',
  aliases: ['casamento', 'matrimonio'],
  args: false,
  description: 'Verifica o status do casamento',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      return client.sendText(message.chatId, '❌ Usuário não identificado.');
    }

    const { User, Marriage } = client.db;

    async function findOrCreateUser(phoneWithSuffix) {
      const phone = phoneWithSuffix.replace('@c.us', '');
      let user = await User.findOne({ phone });
      if (!user) {
        let contact;
        try {
          contact = await client.getContact(phoneWithSuffix);
        } catch {
          contact = null;
        }
        user = await User.create({
          phone,
          name: contact?.pushname || contact?.name || 'Desconhecido',
        });
      }
      return user;
    }

    let targetId = senderId;
    if (message.mentionedJidList?.length) {
      targetId = message.mentionedJidList[0];
    }

    const user = await findOrCreateUser(targetId);

    const marriage = await Marriage.findOne({
      $or: [{ partner1: user._id }, { partner2: user._id }],
      status: 'accepted',
    }).populate('partner1 partner2');

    const isSender = targetId === senderId;

    if (!marriage) {
      return client.sendText(
        message.chatId,
        isSender
          ? '💔 Você ainda não encontrou o amor...'
          : `💔 ${user.name || 'Essa pessoa'} está solteira no momento.`,
      );
    }

    let partner = marriage.partner1._id.equals(user._id)
      ? marriage.partner2
      : marriage.partner1;

    if (!partner.name) {
      const partnerFromDb = await User.findOne({ _id: partner._id });
      if (partnerFromDb && partnerFromDb.name) {
        partner.name = partnerFromDb.name;
        if (marriage.partner1._id.equals(user._id)) {
          marriage.partner2.name = partner.name;
        } else {
          marriage.partner1.name = partner.name;
        }
      }
    }

    const userDisplay = isSender ? 'Você' : user.name || 'Essa pessoa';
    const partnerDisplay = isSender
      ? 'seu parceiro(a)'
      : partner.name || 'seu parceiro(a)';

    // Usa marriedAt se existir, senão fallback para updatedAt
    const marriedAtDate = marriage.marriedAt || marriage.updatedAt;
    const since = dayjs(marriedAtDate).format('D [de] MMMM [de] YYYY');
    const duration = dayjs(marriedAtDate).fromNow();

    const messageText =
      `💍 *${userDisplay}* e *${partnerDisplay}* estão casados desde *${since}*.\n` +
      `⏳ Faz ${duration} que o casamento foi confirmado!`;

    return client.sendText(message.chatId, messageText);
  },
};
