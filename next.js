import { messageHandler } from './next/handlers/message.handler.js';
import stabilishConnection from './next/database/stabilish.js';
import { loadCommands } from './next/functions/load.js';
import { groupEvent } from './next/events/group.add.js';
import { update } from './next/events/update.js';
import * as baileys from 'baileys';
import P from 'pino';

const startSocket = async () => {
  const { state, saveCreds: saveCredentials } =
    await baileys.useMultiFileAuthState('next_auth');

  const socket = baileys.makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: baileys.Browsers.ubuntu('Desktop'),
    markOnlineOnConnect: false,
    qrTimeout: 0,
  });

  socket.commands = await loadCommands();
  socket.db = await stabilishConnection();
  socket.ev.on('creds.update', saveCredentials);
  socket.ev.on('groups.update', async (upd) => groupEvent({ update: upd }));
  socket.ev.on('connection.update', async (upd) =>
    update({ update: upd, callback: startSocket })
  );
  socket.ev.on(
    'messages.upsert',
    async (upd) => await messageHandler({ update: upd, socket })
  );

  return socket;
};

startSocket();
export default startSocket;
