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

// 🛠️ Função para baixar e enviar o vídeo
async function sendVideo(
  socket,
  chatId,
  videoUrl,
  caption,
  mimetype = 'video/mp4'
) {
  const { data } = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
    },
  });

  await socket.sendMessage(chatId, {
    video: Buffer.from(data),
    mimetype,
    caption,
  });
}

export default {
  command: 'mp4',
  args: true,
  description: 'Converte um link do YouTube ou TikTok em vídeo MP4',
  execute: async ({ socket, message, args }) => {
    const chatId = message.key.remoteJid;
    const inputUrl = args[0];
    const quality = '360';

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

        if (!result.status || !result.video_no_watermark) {
          throw new Error('Erro ao baixar vídeo do TikTok.');
        }

        await sendVideo(
          socket,
          chatId,
          result.video_no_watermark,
          `@${result.author?.username || result.author?.nickname || 'unknown'}`
        );
      } else if (isYouTubeUrl(finalUrl)) {
        const url = normalizeYouTubeUrl(finalUrl);
        if (!url) throw new Error('Link do YouTube inválido.');

        const mp4Data = await hydra.ytmp4(url, quality);
        if (!mp4Data.status || !mp4Data.download?.url) {
          throw new Error('Erro ao processar vídeo do YouTube.');
        }

        await sendVideo(socket, chatId, mp4Data.download.url, '');
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
        text: `❌ ${err.message || 'Erro ao baixar o vídeo.'}`,
      });
    }
  },
};
