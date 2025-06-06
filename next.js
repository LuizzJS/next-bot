import { messageHandler } from './next/handlers/message.handler.js';
import { loadCommands } from './next/functions/load.js';
import { groupEvent } from './next/events/group.add.js';
import stabilishConnection from './next/database/stabilish.js';
import Marriage from './next/models/marriage.model.js';
import { update } from './next/events/update.js';
import User from './next/models/user.model.js';
import * as baileys from 'baileys';
import logger from './next/functions/logger.js';

const startSocket = async () => {
  const { state, saveCreds: saveCredentials } =
    await baileys.useMultiFileAuthState('next_auth');

  const socket = baileys.makeWASocket({
    auth: state,
    logger,
    browser: baileys.Browsers.ubuntu('Desktop'),
    markOnlineOnConnect: false,
    qrTimeout: 0,
  });

  socket.downloadMedia = baileys.downloadMediaMessage;
  socket.commands = await loadCommands();
  socket.db = { User, Marriage };

  await stabilishConnection();

  socket.ev.on('creds.update', saveCredentials);

  socket.ev.on('groups.update', async (upd) => {
    try {
      await groupEvent({ update: upd });
    } catch (err) {
      logger.error('❌ Erro em groups update:', err?.stack || err);
    }
  });

  socket.ev.on('connection.update', async (upd) => {
    try {
      if (upd.connection === 'open') {
        restartAttempts = 0;
      }
      await update({ update: upd, callback: startSocket });
    } catch (err) {
      logger.error('❌ Erro em connection update:', err?.stack || err);
    }
  });

  socket.ev.on('messages.upsert', async (upd) => {
    try {
      await messageHandler({ update: upd, socket });
    } catch (err) {
      logger.error('❌ Erro em messages upsert:', err?.stack || err);
    }
  });

  return socket;
};

await startSocket();

export default startSocket;
