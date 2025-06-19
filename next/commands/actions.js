import { sendActionGif } from '../handlers/gif.handler.js';

const actionMap = {
  angry: {
    emoji: '😠',
    caption: '{emoji} {sender} está bravo(a) com {target}!',
  },
  baka: { emoji: '🤪', caption: '{emoji} {sender} chamou {target} de baka!' },
  bite: { emoji: '🦷', caption: '{emoji} {sender} mordeu {target}!' },
  blush: {
    emoji: '😊',
    caption: '{emoji} {sender} está tímido(a) perto de {target}.',
  },
  bored: {
    emoji: '😐',
    caption: '{emoji} {sender} está entediado(a) com {target}.',
  },
  cry: { emoji: '😭', caption: '{emoji} {sender} chorou por {target}.' },
  cuddle: { emoji: '🥰', caption: '{emoji} {sender} fez carinho em {target}!' },
  dance: { emoji: '💃', caption: '{emoji} {sender} dançou com {target}!' },
  facepalm: {
    emoji: '🧖',
    caption: '{emoji} {sender} fez facepalm por {target}.',
  },
  feed: { emoji: '🍲', caption: '{emoji} {sender} alimentou {target}!' },
  handhold: {
    emoji: '🤝',
    caption: '{emoji} {sender} segurou a mão de {target}.',
  },
  handshake: {
    emoji: '🤝',
    caption: '{emoji} {sender} apertou a mão de {target}.',
  },
  happy: { emoji: '😄', caption: '{emoji} {sender} está feliz com {target}!' },
  highfive: {
    emoji: '✋',
    caption: '{emoji} {sender} deu um high five em {target}!',
  },
  hug: { emoji: '🫂', caption: '{emoji} {sender} deu um abraço em {target}!' },
  kick: { emoji: '👢', caption: '{emoji} {sender} deu um chute em {target}!' },
  kiss: { emoji: '💋', caption: '{emoji} {sender} deu um beijo em {target}!' },
  laugh: { emoji: '😆', caption: '{emoji} {sender} riu de {target}!' },
  lurk: { emoji: '🕵️', caption: '{emoji} {sender} está espiando {target}.' },
  nod: { emoji: '🤔', caption: '{emoji} {sender} concordou com {target}.' },
  nom: { emoji: '😋', caption: '{emoji} {sender} está comendo {target}!' },
  nope: { emoji: '🙅', caption: '{emoji} {sender} rejeitou {target}.' },
  pat: { emoji: '🤗', caption: '{emoji} {sender} fez carinho em {target}!' },
  peck: {
    emoji: '💏',
    caption: '{emoji} {sender} deu um selinho em {target}!',
  },
  poke: { emoji: '👉', caption: '{emoji} {sender} cutucou {target}.' },
  pout: { emoji: '😡', caption: '{emoji} {sender} fez bico para {target}.' },
  punch: { emoji: '👊', caption: '{emoji} {sender} socou {target}!' },
  run: { emoji: '🏃', caption: '{emoji} {sender} fugiu de {target}.' },
  shoot: { emoji: '🔫', caption: '{emoji} {sender} atirou em {target}!' },
  shrug: {
    emoji: '🤷',
    caption: '{emoji} {sender} deu de ombros para {target}.',
  },
  slap: { emoji: '👋', caption: '{emoji} {sender} deu um tapa em {target}!' },
  sleep: {
    emoji: '😴',
    caption: '{emoji} {sender} está dormindo.',
    noTarget: true,
  },
  smile: { emoji: '🙂', caption: '{emoji} {sender} sorriu!', noTarget: true },
  smug: {
    emoji: '😏',
    caption: '{emoji} {sender} fez cara de quem sabe algo.',
    noTarget: true,
  },
  stare: {
    emoji: '👀',
    caption: '{emoji} {sender} está olhando fixamente para {target}.',
  },
  think: {
    emoji: '🤔',
    caption: '{emoji} {sender} está pensando em {target}.',
  },
  thumbsup: { emoji: '👍', caption: '{emoji} {sender} aprovou {target}!' },
  tickle: { emoji: '🤭', caption: '{emoji} {sender} fez cócegas em {target}!' },
  wave: { emoji: '👋', caption: '{emoji} {sender} acenou!', noTarget: true },
  wink: { emoji: '😉', caption: '{emoji} {sender} piscou para {target}!' },
  yawn: { emoji: '🥱', caption: '{emoji} {sender} bocejou.', noTarget: true },
  yeet: { emoji: '🫠', caption: '{emoji} {sender} lançou {target} longe!' },
};

const aliases = [
  ...Object.keys(actionMap),
  'bater',
  'cutucar',
  'abraçar',
  'pular',
  'lancar',
  'lançar',
  'sorrir',
  'acenar',
  'pensar',
  'dormir',
  'fugir',
  'olhar',
  'rir',
  'comer',
  'rejeitar',
  'concordar',
  'bravo',
  'feliz',
  'beijar',
  'morder',
  'abraço',
  'slap',
  'hug',
  'kiss',
  'poke',
  'shoot',
  'shrug',
  'wave',
  'yeet',
  'sleep',
  'nom',
];

export default {
  name: 'actions',
  aliases,
  args: false,
  description:
    'Envia um GIF interativo com outro membro. Ex: tapa, beijo, abraço e mais.',
  group_only: true,
  bot_owner_only: true,
  execute: async ({ client, message, args, prefix }) => {
    try {
      const invoked = message.body
        .trim()
        .split(' ')[0]
        .slice(prefix.length)
        .toLowerCase();

      if (invoked === 'actions') return;

      const action = actionMap[invoked];
      if (!action) return;

      const senderContact = await client.getContact(message.sender.id);
      const senderName =
        senderContact?.pushname ||
        senderContact?.verifiedName ||
        message.sender.id.split('@')[0];

      const caption = action.caption
        .replace('{emoji}', action.emoji)
        .replace('{sender}', senderName)
        .replace('{target}', '{target}');

      await sendActionGif({
        client,
        message,
        actionName: invoked,
        emoji: action.emoji,
        captionTemplate: caption,
        args,
        requireTarget: !action.noTarget,
      });
    } catch (err) {
      console.error('Erro no comando actions:', err);
      await client.reply(
        message.chatId,
        '❌ Ocorreu um erro ao executar o comando.',
        message.id
      );
    }
  },
};
