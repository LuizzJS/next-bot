import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/pt-br.js';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export default {
  name: 'amantestatus',
  aliases: ['statusamante', 'amanteinfo'],
  args: false,
  description: 'Mostra o status do seu amante',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const senderId = message.sender?.id || message.sender;
    if (!senderId) {
      return client.sendText(message.chatId, '❌ Usuário não identificado.');
    }

    const { User, Marriage } = client.db;
    const phone = senderId.replace('@c.us', '');
    const user = await User.findOne({ phone });
    if (!user) {
      return client.sendText(
        message.chatId,
        '❌ Usuário não cadastrado no sistema.',
      );
    }

    // Busca casamento aceito que envolva o usuário
    const marriage = await Marriage.findOne({
      $or: [{ partner1: user._id }, { partner2: user._id }],
      status: 'accepted',
    }).populate('partner1 partner2 lover');

    if (!marriage) {
      return client.sendText(message.chatId, '💔 Você não está casado(a).');
    }

    // Se não tem amante
    if (
      !marriage.lover ||
      !marriage.loverStatus ||
      marriage.loverStatus === 'rejected'
    ) {
      return client.sendText(
        message.chatId,
        '💔 Você não tem amante no momento.',
      );
    }

    // Formata datas e duração
    const since = marriage.loverSince
      ? dayjs(marriage.loverSince).format('D [de] MMMM [de] YYYY')
      : 'data desconhecida';

    const duration = marriage.loverSince
      ? dayjs(marriage.loverSince).fromNow()
      : '';

    // Status do amante
    if (marriage.loverStatus === 'accepted') {
      return client.sendText(
        message.chatId,
        `💘 Você está com um amante: *${
          marriage.lover.name || 'Desconhecido'
        }*\n` + `Desde: *${since}* (${duration})`,
      );
    }

    if (marriage.loverStatus === 'pending') {
      // Quem enviou a proposta? Assumindo que o amante é quem enviou, e usuário é quem recebe
      return client.sendText(
        message.chatId,
        `💌 Proposta de amante *pendente* de *${
          marriage.lover.name || 'Desconhecido'
        }* para você.\n` + `Enviada há: ${duration}`,
      );
    }

    return client.sendText(
      message.chatId,
      '💔 Você não tem amante no momento.',
    );
  },
};
