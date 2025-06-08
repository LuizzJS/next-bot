import * as baileys from 'baileys';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs/promises';

dotenv.config({ path: '../.env' });

const streams = [
  {
    stream: {
      write: (msg) => {
        try {
          const parsed = JSON.parse(msg);
          const { level, msg: message } = parsed;

          if (level >= 50) console.error(`🔥 [FATAL] ${message}`);
          else if (level >= 40) console.error(`❌ | ${message}`);
          else if (level >= 30) console.warn(`⚠️ | ${message}`);
          else if (level >= 20) console.debug(`🐛 | ${message}`);
          else console.log(`📘 | ${message}`);
        } catch {
          console.warn(`🟡 [RAW] ${msg.trim()}`);
        }
      },
    },
  },
  {
    stream: pino.destination('./next/logs/next_logs.txt'),
  },
];

const logger = pino(
  {
    level: 'debug',
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  },
  pino.multistream(streams)
);

export const update = async ({ update, callback }) => {
  const { connection, lastDisconnect, qr } = update;

  if (connection) {
    logger.info(`🔄 Conexão atualizada: ${connection}`);
  }

  if (qr) {
    try {
      const qrSVG = await QRCode.toString(qr, { type: 'svg' });
      await fs.writeFile('./next/logs/qr.svg', qrSVG);
      logger.info('✅ QR Code salvo em ./next/logs/qr.svg');
    } catch (err) {
      logger.error({ err }, '❌ Falha ao salvar o QR Code.');
    }
  }

  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (statusCode === baileys.DisconnectReason.restartRequired) {
      logger.warn('⚠️ Socket requer reinicialização. Reiniciando...');
      if (typeof callback === 'function') callback();
    } else if (statusCode === baileys.DisconnectReason.loggedOut) {
      logger.error('❌ Você foi desconectado. Reautenticação necessária.');
    } else {
      const errorMsg =
        lastDisconnect?.error?.output?.payload?.error ||
        lastDisconnect?.error?.output?.payload?.message ||
        'Motivo desconhecido.';
      logger.error(
        { statusCode, error: lastDisconnect?.error },
        `❌ Conexão encerrada: ${errorMsg}`
      );
    }
    return;
  }

  if (connection === 'open') {
    logger.info('✅ Conectado com sucesso ao WhatsApp!');
  }
};

export default logger;
