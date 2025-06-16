import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/pt-br.js';
import humanizeDuration from 'humanize-duration';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const humanizer = humanizeDuration.humanizer({
  language: 'pt',
  fallbacks: ['en'],
  units: ['y', 'mo', 'd', 'h', 'm'],
  round: true,
  conjunction: ' e ',
  serialComma: false,
});

export default {
  name: 'marriage',
  aliases: ['casamento', 'matrimonio'],
  args: false,
  description: 'Verifica o status do casamento',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args }) => {
    try {
      const senderId = message.sender?.id || message.sender;
      if (!senderId) {
        return client.sendText(message.chatId, '❌ Usuário não identificado.');
      }

      const { User, Marriage } = client.db;

      async function getOrCreateUser(id) {
        const phone = id.replace('@c.us', '');
        let user = await User.findOne({ phone });
        if (!user) {
          const contact = await client.getContact(id);
          user = await User.create({
            phone,
            name: contact?.pushname || contact?.formattedName || 'Desconhecido',
          });
        }
        return user;
      }

      const senderUser = await getOrCreateUser(senderId);

      let targetUser = senderUser;
      if (args.length > 0) {
        const foundUser = await client.findUser({
          chat: message.chatId,
          input: args.join(' '),
          client,
          message,
        });
        if (foundUser && foundUser.phone) {
          targetUser = await getOrCreateUser(foundUser.phone + '@c.us');
        }
      }

      const isSelf = senderUser.phone === targetUser.phone;

      const marriage = await Marriage.findOne({
        $or: [{ partner1: targetUser._id }, { partner2: targetUser._id }],
        status: 'accepted',
      }).populate('partner1 partner2');

      if (!marriage) {
        const displayName = targetUser.name || 'Essa pessoa';
        const msg = isSelf
          ? '💔 Você ainda não encontrou o amor...'
          : `💔 ${displayName} está solteira(o) no momento.`;
        return client.sendText(message.chatId, msg);
      }

      const partner = marriage.partner1._id.equals(targetUser._id)
        ? marriage.partner2
        : marriage.partner1;

      async function ensureUserName(user) {
        if (!user.name) {
          const dbUser = await User.findById(user._id);
          return dbUser?.name || 'Desconhecido';
        }
        return user.name;
      }

      const userName = await ensureUserName(targetUser);
      const partnerName = await ensureUserName(partner);

      const marriedAtDate = marriage.marriedAt || marriage.updatedAt;
      const since = dayjs(marriedAtDate).format('D [de] MMMM [de] YYYY');
      const msDuration = dayjs().diff(marriedAtDate);
      const duration = humanizer(msDuration) || 'menos de um minuto';

      const selfText = `💍 ${userName}, você e *${partnerName}* estão casados desde *${since}*.\n⏳ O seu casamento já dura *${duration}*!`;
      const otherText = `💍 *${userName}* e *${partnerName}* estão casados desde *${since}*.\n⏳ O casamento deles já dura *${duration}*!`;

      return client.sendText(message.chatId, isSelf ? selfText : otherText);
    } catch (error) {
      console.error('[MARRIAGE] Erro inesperado:', error);
      return client.sendText(
        message.chatId,
        '❌ Ocorreu um erro ao verificar o casamento.',
      );
    }
  },
};
