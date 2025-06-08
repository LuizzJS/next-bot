import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { buffer as streamToBuffer } from 'stream/consumers';
import { fileTypeFromBuffer } from 'file-type';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_DURATION = 10;
const MAX_FILESIZE = 1024 * 1024;

const tmpFilePath = (ext) =>
  path.join(
    TEMP_DIR,
    `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`
  );

const runFFmpeg = async (inputPath, outputPath, vfFilter, quality = 40) => {
  const args = [
    '-t',
    `${MAX_DURATION}`,
    '-i',
    inputPath,
    '-y',
    '-vcodec',
    'libwebp',
  ];

  if (vfFilter) {
    args.push('-vf', vfFilter);
  }

  args.push(
    '-loop',
    '0',
    '-preset',
    'default',
    '-an',
    '-vsync',
    '0',
    '-quality',
    `${quality}`,
    '-compression_level',
    '6',
    '-pix_fmt',
    'yuva420p',
    '-q:v',
    '20',
    '-b:v',
    '250k',
    outputPath
  );

  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn(ffmpegStatic, args);
    let stderr = '';
    ffmpegProc.stderr.on('data', (data) => (stderr += data.toString()));
    ffmpegProc.on('error', reject);
    ffmpegProc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg erro: ${stderr}`))
    );
  });
};

const getVideoResolution = async (inputPath) => {
  return new Promise((resolve, reject) => {
    const args = ['-i', inputPath];
    const ffmpegProc = spawn(ffmpegStatic, args);
    let stderr = '';

    ffmpegProc.stderr.on('data', (data) => (stderr += data.toString()));

    ffmpegProc.on('error', reject);

    ffmpegProc.on('close', () => {
      const match = stderr.match(/, (\d{2,5})x(\d{2,5})/);
      if (match) {
        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);
        resolve({ width, height });
      } else {
        reject(new Error('Não foi possível extrair a resolução do vídeo.'));
      }
    });
  });
};

const createWebpStickerWithAdaptiveFps = async (
  inputPath,
  outputPath,
  maxFileSize = MAX_FILESIZE,
  ratio = '1:1'
) => {
  const fpsOptions = [60, 30, 20, 8, 9];
  const quality = 40;
  const resolution = 256;
  let buffer;

  for (const fps of fpsOptions) {
    const vfFilter = `fps=${fps},scale=${resolution}:${resolution}${
      ratio === 'original' ? ':force_original_aspect_ratio=decrease' : ''
    },pad=${resolution}:${resolution}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;

    try {
      await runFFmpeg(inputPath, outputPath, vfFilter, quality);
      buffer = await fs.readFile(outputPath);

      if (buffer.length <= maxFileSize) return buffer;
    } catch {
      continue;
    }
  }

  return buffer;
};

export const mediaHandler = async ({ socket, msg: message }) => {
  const senderId = message.key?.participant || message.key?.remoteJid;
  const phoneNumber = senderId?.replace('@s.whatsapp.net', '') || 'unknown';
  const user = await socket.db.User.findOne({ phone: phoneNumber }).catch(
    () => null
  );
  const ratio = user?.config?.ratio || '1:1';
  await fs.mkdir(TEMP_DIR, { recursive: true });

  try {
    await socket.sendMessage(message.key.remoteJid, {
      react: { text: '⌛', key: message.key },
    });

    const mediaStream = await socket.downloadMedia(message).catch(() => null);
    if (!mediaStream) return;

    const mediaBuffer = await streamToBuffer(mediaStream);
    if (!mediaBuffer || mediaBuffer.length === 0) return;

    const fileType = await fileTypeFromBuffer(mediaBuffer);
    if (!fileType) return;

    if (fileType.mime.startsWith('image/')) {
      const stickerBuffer = await new Sticker(mediaBuffer, {
        pack: '🅽 Made by',
        author: 'NextBOT',
        type: ratio === '1:1' ? StickerTypes.DEFAULT : StickerTypes.FULL,
        quality: 60,
      }).toBuffer();

      await socket.sendMessage(message.key.remoteJid, {
        sticker: stickerBuffer,
      });
      await socket.sendMessage(message.key.remoteJid, {
        react: { text: '✅', key: message.key },
      });
      return;
    }

    if (fileType.mime.startsWith('video/')) {
      const inputPath = tmpFilePath(fileType.ext);
      const outputPath = tmpFilePath('webp');
      await fs.writeFile(inputPath, mediaBuffer);

      const { width, height } = await getVideoResolution(inputPath);

      let processedBuffer;
      if (width > 500 || height > 500) {
        processedBuffer = await createWebpStickerWithAdaptiveFps(
          inputPath,
          outputPath,
          200 * 1024,
          ratio
        );
      } else {
        processedBuffer = await createWebpStickerWithAdaptiveFps(
          inputPath,
          outputPath,
          100 * 1024,
          ratio
        );
      }

      const sticker = await new Sticker(processedBuffer, {
        pack: '🅽 Made by',
        author: 'NextBOT',
        quality: 50,
        type: ratio === '1:1' ? StickerTypes.DEFAULT : StickerTypes.FULL,
      }).toBuffer();

      await socket.sendMessage(message.key.remoteJid, { sticker });
      await socket.sendMessage(message.key.remoteJid, {
        react: { text: '✅', key: message.key },
      });

      try {
        await fs.unlink(inputPath);
        await fs.unlink(outputPath);
      } catch {}

      return;
    }
  } catch (err) {
    console.error('[mediaHandler] Erro inesperado:', err);
  }
};
