import chalk from 'chalk';
import open_wa from '@open-wa/wa-automate';
import * as pt_br from './next/messages/pt.br.js';
import * as en_us from './next/messages/en.us.js';
import * as fr_fr from './next/messages/fr.fr.js';
import * as es_es from './next/messages/es.es.js';
import * as it_it from './next/messages/it.it.js';
import { findUser } from './next/utils/find.user.js';
import connection from './next/database/connection.js';
import commandsLoader from './next/loaders/commands.js';
import User from './next/database/models/user.model.js';
import Group from './next/database/models/group.model.js';
import groupHandler from './next/handlers/groups.handler.js';
import Marriage from './next/database/models/marriage.model.js';
import messageHandler from './next/handlers/message.handler.js';

const start = async (client) => {
  try {
    console.log(`⚙️ NextBOT iniciado com sucesso!`);
    client.connect = connection;
    client.commands = new Map();
    client.loadCommands = commandsLoader;
    client.id = (await client.getMe()).id;
    client.messages = {
      pt_br,
      en_us,
      fr_fr,
      es_es,
      it_it,
    };
    client.findUser = findUser;
    client.db = { User, Group, Marriage };
    await client.loadCommands({ client });
    await client.connect();
    client.onAddedToGroup(
      async (g) => await groupHandler({ event: g, client })
    );
    client.onMessage(async (m) => await messageHandler({ message: m, client }));
  } catch (e) {
    console.log(
      `${chalk.red('[ERROR]')} Error while starting the bot instance: ${
        e?.message
      } `
    );
  }
};

open_wa
  .create({
    executablePath: process.env.CHROME_PATH || '/usr/bin/chrome',
    sessionId: 'next_auth',
    multiDevice: true,
    useChrome: true,
  })
  .then((c) => start(c));
