import { loadCommands } from '../functions/load.js';
import * as baileys from 'baileys';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
dotenv.config({ path: '../.env' });

const logger = pino(
  {
    timestamp: () => `, "time": "${new Date().toISOString()}"`,
  },
  pino.destination('./next/logs/next_logs.txt')
);

export const update = async ({ update, callback }) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    const qrSVG = await QRCode.toString(qr, { type: 'svg' });

    fs.writeFile('./next/logs/qr.svg', qrSVG, (err) => {
      if (err) {
        logger.error('Failed to write QR code to file: ', err?.message);
        console.log('Failed to write QR code to file: ', err?.message);
      } else {
        logger.info('QR Code saved to ./next/logs/qr.svg');
        console.log('QR Code saved to ./next/logs/qr.svg');
      }
    });
  }

  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (statusCode === baileys.DisconnectReason.restartRequired) {
      console.log('⚠️ Socket requires a restart. Restarting...');
      logger.warn('Socket requires a restart. Restarting...');
      callback();
    } else if (statusCode === baileys.DisconnectReason.loggedOut) {
      console.log('❌ You have been logged out. Please re-authenticate.');
      logger.error('You have been logged out. Please re-authenticate.');
    } else {
      console.log(
        `❌ Connection closed for another reason: ${lastDisconnect?.error?.output?.payload?.error} | ${lastDisconnect?.error?.output?.payload?.message}`
      );
      logger.error('Connection closed for another reason: ', statusCode);
    }

    return;
  }

  if (connection === 'open') {
    console.log('✅ Successfully connected to WhatsApp!');
    logger.info('Successfully connected to WhatsApp.');
  }
};
