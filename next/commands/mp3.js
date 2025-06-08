import * as hydra from 'hydra_scraper';
import axios from 'axios';

function normalizeYouTubeUrl(inputUrl) {
  try {
    const url = new URL(inputUrl);
    let videoId = '';

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1);
    } else if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      } else if (
        url.pathname.startsWith('/shorts/') ||
        url.pathname.startsWith('/embed/')
      ) {
        videoId = url.pathname.split('/')[2];
      }
    }

    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  } catch {
    return null;
  }
}

function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function isTikTokUrl(url) {
  return (
    url.includes('tiktok.com') ||
    url.includes('vt.tiktok.com') ||
    url.includes('vm.tiktok.com')
  );
}

async function resolveFinalUrl(link) {
  try {
    const response = await axios.get(link, {
      maxRedirects: 5,
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114 Safari/537.36',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    let finalUrl = response.request?.res?.responseUrl || response.url || link;
    const parsed = new URL(finalUrl);
    const redirect = parsed.searchParams.get('redirect_url');

    if (parsed.pathname === '/login' && redirect) {
      finalUrl = decodeURIComponent(redirect);
    }

    const clean = new URL(finalUrl);
    clean.search = '';
    return clean.toString();
  } catch {
    return link;
  }
}

// 🛠️ Função utilitária para baixar e enviar o áudio
async function sendAudio(socket, chatId, audioUrl, caption = '') {
  const { data } = await axios.get(audioUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
    },
  });

  await socket.sendMessage(chatId, {
    audio: Buffer.from(data),
    mimetype: 'audio/mp4',
    ptt: false,
    caption,
  });
}

export default {
  command: 'mp3',
  args: true,
  description: 'Converte um link do YouTube ou TikTok em áudio mp3',
  execute: async ({ socket, message, args }) => {
    const chatId = message.key.remoteJid;
    const inputUrl = args[0];
    const quality = '128';

    await socket.sendMessage(chatId, {
      react: {
        text: '⏳',
        key: message.key,
      },
    });

    if (!inputUrl) {
      await socket.sendMessage(chatId, {
        text: '❌ Envie um link válido do YouTube ou TikTok.',
      });
      return;
    }

    try {
      let finalUrl = inputUrl;

      if (isTikTokUrl(finalUrl)) {
        finalUrl = await resolveFinalUrl(finalUrl);
        const result = await hydra.ttdl(finalUrl);

        if (!result.status || !result.music_url) {
          throw new Error('Erro ao baixar áudio do TikTok.');
        }

        await sendAudio(
          socket,
          chatId,
          result.music_url,
          `🎵 Áudio de ${result.author?.username || 'TikTok'}`
        );
      } else if (isYouTubeUrl(finalUrl)) {
        const url = normalizeYouTubeUrl(finalUrl);
        if (!url) throw new Error('Link do YouTube inválido.');

        const mp3Data = await hydra.ytmp3(url, quality);
        if (!mp3Data.status || !mp3Data.download?.url) {
          throw new Error('Erro ao processar áudio do YouTube.');
        }

        await sendAudio(
          socket,
          chatId,
          mp3Data.download.url,
          `🎵 *${mp3Data.metadata?.title || 'Áudio do YouTube'}*`
        );
      } else {
        throw new Error(
          '❌ Link não suportado. Envie um link do YouTube ou TikTok.'
        );
      }

      await socket.sendMessage(chatId, {
        react: {
          text: '✅',
          key: message.key,
        },
      });
    } catch (err) {
      await socket.sendMessage(chatId, {
        react: {
          text: '❌',
          key: message.key,
        },
      });

      await socket.sendMessage(chatId, {
        text: `❌ ${err.message || 'Erro ao baixar o áudio.'}`,
      });
    }
  },
};
