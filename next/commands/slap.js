import { Client as NekoClient } from 'nekos-best.js';
import { fileTypeFromBuffer } from 'file-type';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

const mediaDir = path.resolve('C:/NextBOT/next/media');

export default {
  name: 'slap',
  aliases: ['tapa'],
  description: 'Envia um GIF de "slap" para o alvo mencionado.',
  args: true,
  args_length: 1,
  command_example: 'slap @luiz',
  group_only: true,

  execute: async ({ client, message, args, prefix }) => {
    const tempId = uuidv4();

    let gifPath = '';
    let mp4Path = '';
    try {
      const chat = await client.getChatById(message.chatId);

      const targetId = await client.findUser({
        chat,
        input: args.join(' '),
        client,
        message,
      });

      if (!targetId) {
        return client.sendText(message.chatId, '❌ Usuário não encontrado.');
      }

      const target = await client.getContact(targetId);
      const sender = await client.getContact(message.sender.id);

      const neko = await new NekoClient().fetch('slap', 1);
      const gifUrl = neko.results?.[0]?.url;
      if (!gifUrl) {
        throw new Error('GIF URL não encontrada na resposta da API.');
      }

      const response = await axios.get(gifUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      if (!response.data || response.data.length < 5000) {
        throw new Error('GIF inválido ou muito pequeno.');
      }

      const type = await fileTypeFromBuffer(response.data);
      if (!type || type.ext !== 'gif') {
        throw new Error('Arquivo baixado não é um GIF.');
      }

      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      gifPath = path.join(mediaDir, `${tempId}.gif`);
      mp4Path = path.join(mediaDir, `${tempId}.mp4`);

      fs.writeFileSync(gifPath, response.data);

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
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg saiu com código ${code}`));
          }
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });
      });

      const caption = `✋ ${sender.pushname} deu um tapa em ${
        target?.pushname || 'alguém'
      }!`;

      const relativePath = `./next/media/${tempId}.mp4`;

      await client.sendVideoAsGif(
        message.chatId,
        relativePath,
        `${tempId}.mp4`,
        caption,
      );
    } catch (err) {
      console.error('❌ Erro no comando /slap:', err);
      await client.sendText(
        message.chatId,
        '❌ Não foi possível processar o comando.',
      );
    } finally {
      try {
        if (gifPath && fs.existsSync(gifPath)) {
          fs.unlinkSync(gifPath);
        }
        if (mp4Path && fs.existsSync(mp4Path)) {
          fs.unlinkSync(mp4Path);
        }
      } catch (cleanupErr) {
        console.warn(
          '⚠️ Erro ao remover arquivos temporários:',
          cleanupErr.message,
        );
      }
    }
  },
};
