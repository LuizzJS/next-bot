import chalk from 'chalk';
import open_wa from '@open-wa/wa-automate';
import messages from './next/messages/messages.js';
import { findUser } from './next/utils/find.user.js';
import connection from './next/database/connection.js';
import commandsLoader from './next/loaders/commands.js';
import User from './next/database/models/user.model.js';
import Group from './next/database/models/group.model.js';
import groupHandler from './next/handlers/groups.handler.js';
import Marriage from './next/database/models/marriage.model.js';
import messageHandler from './next/handlers/message.handler.js';

const start = async (client) => {
  const { red } = chalk;
  try {
    console.log(`⚙️ NextBOT iniciado com sucesso!`);
    client.id = (await client.getMe()).id;
    client.db = { User, Group, Marriage };
    client.loadCommands = commandsLoader;
    client.divorceRequests = new Map();
    client.marriages = new Map();
    client.commands = new Map();
    client.connect = connection;
    client.messages = messages;
    client.findUser = findUser;
    client.prefix = '/';

    await client.loadCommands({ client });
    await client.connect();

    client.onAddedToGroup(
      async (g) => await groupHandler({ event: g, client }),
    );

    client.onGlobalParticipantsChanged(
      async (e) => await groupHandler({ event: e, client }),
    );

    client.onMessage(async (m) => await messageHandler({ message: m, client }));
  } catch (e) {
    console.log(
      `${red('[ERROR]')} Error while starting the bot instance: ${e?.message}`,
    );
  }
};

open_wa
  .create({
    sessionId: 'next_auth',
    multiDevice: true,
    useChrome: true,
  })
  .then((c) => start(c));
