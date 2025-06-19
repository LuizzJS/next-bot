import { Client as NekoClient } from 'nekos-best.js';
import { fileTypeFromBuffer } from 'file-type';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

const mediaDir = path.resolve('C:/NextBOT/next/media');

export async function sendActionGif({
  client,
  message,
  actionName,
  emoji,
  captionTemplate,
  args,
  requireTarget = true, // agora o target é opcional por padrão
}) {
  const tempId = uuidv4();
  let gifPath = '';
  let mp4Path = '';

  try {
    const sender = await client.getContact(message.sender.id);

    let targetUser = null;
    let target = null;

    if (requireTarget) {
      targetUser = await client.findUser({
        chat: message.chat,
        input: args.join(' '),
        client,
        message,
      });

      if (!targetUser || !targetUser.id) {
        return client.reply(
          message.chatId,
          '❌ Usuário não encontrado.',
          message.id
        );
      }

      target = await client.getContact(targetUser.id);
    }

    // Busca GIF da ação
    const neko = await new NekoClient().fetch(actionName, 1);
    const gifUrl = neko.results?.[0]?.url;
    if (!gifUrl) throw new Error('GIF URL não encontrada na resposta da API.');

    // Baixa o GIF
    const response = await axios.get(gifUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    if (!response.data || response.data.length < 5000)
      throw new Error('GIF inválido ou muito pequeno.');

    const type = await fileTypeFromBuffer(response.data);
    if (!type || type.ext !== 'gif')
      throw new Error('Arquivo baixado não é um GIF.');

    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

    gifPath = path.join(mediaDir, `${tempId}.gif`);
    mp4Path = path.join(mediaDir, `${tempId}.mp4`);

    fs.writeFileSync(gifPath, response.data);

    // Converte para MP4
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i',
        gifPath,
        '-movflags',
        'faststart',
        '-pix_fmt',
        'yuv420p',
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        mp4Path,
      ]);

      ffmpeg.on('close', (code) => {
        code === 0
          ? resolve()
          : reject(new Error(`ffmpeg saiu com código ${code}`));
      });

      ffmpeg.on('error', (err) => reject(err));
    });

    // Monta a legenda
    const caption = captionTemplate
      .replace('{emoji}', emoji)
      .replace('{sender}', sender.pushname || sender.number)
      .replace(
        '{target}',
        requireTarget ? target?.pushname || target?.number || 'alguém' : ''
      )
      .replace('  ', ' ')
      .trim();

    const relativePath = `./next/media/${tempId}.mp4`;

    await client.sendVideoAsGif(
      message.chatId,
      relativePath,
      `${tempId}.mp4`,
      caption
    );
  } catch (err) {
    console.error(`❌ Erro no comando ${actionName}:`, err);
    await client.reply(
      message.chatId,
      '❌ Não foi possível processar o comando.',
      message.id
    );
  } finally {
    try {
      if (gifPath && fs.existsSync(gifPath)) fs.unlinkSync(gifPath);
      if (mp4Path && fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
    } catch (cleanupErr) {
      console.warn(
        '⚠️ Erro ao remover arquivos temporários:',
        cleanupErr.message
      );
    }
  }
}
