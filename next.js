import chalk from 'chalk';
import open_wa from '@open-wa/wa-automate';
import User from './next/database/models/user.model.js';
import Group from './next/database/models/group.model.js';
import ScheduledPix from './next/database/models/pix.model.js';
import Marriage from './next/database/models/marriage.model.js';
import commandsLoader from './next/loaders/commands.js';
import connection from './next/database/connection.js';
import groupHandler from './next/handlers/groups.handler.js';
import messageHandler from './next/handlers/message.handler.js';
import messages from './next/messages/messages.js';
import { findUser } from './next/utils/find.user.js';
import { startPixScheduler } from './next/loaders/pix.loader.js';

const start = async (client) => {
  try {
    console.log(chalk.green('⚙️ NextBOT iniciado com sucesso!'));
    client.id = (await client.getMe()).id;

    // Define os modelos no client.db para facilitar acesso
    client.db = { User, Group, Marriage, ScheduledPix };
    client.loadCommands = commandsLoader;
    client.connect = connection;
    client.messages = messages;
    client.findUser = findUser;
    client.prefix = '/';
    client.divorceRequests = new Map();
    client.marriages = new Map();
    client.commands = new Map();

    await client.loadCommands({ client });
    await client.connect();

    client.onAddedToGroup(
      async (g) => await groupHandler({ event: g, client }),
    );
    client.onGlobalParticipantsChanged(
      async (e) => await groupHandler({ event: e, client }),
    );
    client.onMessage(async (m) => await messageHandler({ message: m, client }));

    // Inicia o scheduler do Pix
    startPixScheduler(client);
  } catch (e) {
    console.error(
      chalk.red('[ERROR] Error while starting the bot instance:'),
      e,
    );
  }
};

open_wa
  .create({
    sessionId: 'next_auth',
    multiDevice: true,
    useChrome: true,
  })
  .then((client) => start(client));
