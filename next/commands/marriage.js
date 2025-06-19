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
  description: 'Mostra as informações do seu casamento atual.',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args }) => {
    try {
      const senderId = message.sender?.id || message.sender;
      if (!senderId) {
        return client.reply(
          message.chatId,
          '❌ Usuário não identificado.',
          message.id
        );
      }

      const { User, Marriage } = client.db;

      async function getOrCreateUser(id) {
        const phone = id.replace('@c.us', '');
        let user = await User.findOne({ phone });
        if (!user) {
          const contact = await client.getContact(id).catch(() => null);
          user = await User.create({
            phone,
            name: contact?.pushname || contact?.formattedName || 'Desconhecido',
          });
        }
        return user;
      }

      const senderUser = await getOrCreateUser(senderId);

      // Se houver argumento, busca o usuário correspondente, senão usa o sender
      let targetUser = senderUser;
      if (args.length > 0) {
        const foundUser = await client.findUser({
          chat: message.chat,
          input: args.join(' '),
          client,
          message,
        });
        if (foundUser?.phone) {
          // Normaliza o id para o formato @c.us
          const targetId = foundUser.id?.includes('@c.us')
            ? foundUser.id
            : `${foundUser.phone}@c.us`;
          targetUser = await getOrCreateUser(targetId);
        }
      }

      const isSelf = senderUser.phone === targetUser.phone;

      // Busca casamento aceito envolvendo o targetUser
      const marriage = await Marriage.findOne({
        $or: [{ partner1: targetUser._id }, { partner2: targetUser._id }],
        status: 'accepted',
      }).populate('partner1 partner2');

      if (!marriage) {
        const displayName = targetUser.name || 'Essa pessoa';
        const msg = isSelf
          ? '💔 Você ainda não encontrou o amor...'
          : `💔 ${displayName} está solteira(o) no momento.`;
        return client.reply(message.chatId, msg, message.id);
      }

      // Define quem é o parceiro do targetUser
      // Usa String() para comparação segura
      const targetIdStr = String(targetUser._id);
      const partner =
        String(marriage.partner1._id) === targetIdStr
          ? marriage.partner2
          : marriage.partner1;

      const userName = targetUser.name || 'Desconhecido';
      const partnerName = partner.name || 'Desconhecido';

      const marriedAtDate =
        marriage.marriedAt || marriage.updatedAt || new Date();
      const since = dayjs(marriedAtDate).format('D [de] MMMM [de] YYYY');
      const msDuration = dayjs().diff(marriedAtDate);
      const duration = humanizer(msDuration) || 'menos de um minuto';

      const selfText = `💍 ${userName}, você e *${partnerName}* estão casados desde *${since}*.\n⏳ O seu casamento já dura *${duration}*!`;
      const otherText = `💍 *${userName}* e *${partnerName}* estão casados desde *${since}*.\n⏳ O casamento deles já dura *${duration}*!`;

      return client.reply(
        message.chatId,
        isSelf ? selfText : otherText,
        message.id
      );
    } catch (error) {
      console.error('[MARRIAGE] Erro inesperado:', error);
      return client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao verificar o casamento.',
        message.id
      );
    }
  },
};
