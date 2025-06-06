import fs from 'fs/promises';
import path from 'path';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export const imageHandler = async ({ socket, msg }) => {
  try {
    const from = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    const phoneNumber = senderId.replace('@s.whatsapp.net', '');

    const isImage = !!msg.message?.imageMessage;
    const isVideo = !!msg.message?.videoMessage;

    if (!isImage && !isVideo) return;

    let mediaData;
    try {
      mediaData = await socket.downloadMedia(msg);
    } catch (e) {
      console.warn('⚠️ Erro ao baixar a mídia:', e?.message || e);
      return;
    }

    if (mediaData?.readable) {
      mediaData = await streamToBuffer(mediaData);
    }

    if (!mediaData || !Buffer.isBuffer(mediaData) || mediaData.length === 0) {
      console.warn('⚠️ Mídia inválida ou vazia.');
      return;
    }

    const tempDir = './temp';
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch {
      // ignore error if exists
    }

    const ext = isImage ? 'jpg' : 'mp4';
    const fileName = `media_${Date.now()}_${phoneNumber}.${ext}`;
    const filePath = path.join(tempDir, fileName);

    try {
      await fs.writeFile(filePath, mediaData);
    } catch (writeErr) {
      console.error(
        '❌ Falha ao salvar arquivo de mídia:',
        writeErr?.message || writeErr
      );
      return;
    }

    const user = await socket.db.User.findOne({ phone: phoneNumber });
    if (!user || !user?.autoSticker) {
      await fs.unlink(filePath).catch(() => {});
      return;
    }

    const sticker = new Sticker(filePath, {
      pack: '🅽 Made by',
      author: 'NextBOT',
      type:
        user?.config?.ratio === 'original'
          ? StickerTypes.FULL
          : StickerTypes.CROPPED,
      quality: 100,
    });

    let stickerBuffer;
    try {
      stickerBuffer = await sticker.build();
    } catch (stickerErr) {
      console.error(
        '❌ Erro ao criar figurinha:',
        stickerErr?.message || stickerErr
      );
      await fs.unlink(filePath).catch(() => {});
      return;
    }

    user.stickers = (user.stickers || 0) + 1;
    await user.save();

    try {
      await socket.sendMessage(from, { sticker: stickerBuffer });
      console.log(`✅ Sticker enviado e arquivo apagado: ${fileName}`);
    } catch (sendErr) {
      console.error(
        '❌ Erro ao enviar figurinha:',
        sendErr?.message || sendErr
      );
    }

    await fs.unlink(filePath).catch(() => {});
  } catch (error) {
    console.error(
      '❌ Erro ao processar mídia para figurinha:',
      error?.stack || error?.message || error
    );
  }
};
