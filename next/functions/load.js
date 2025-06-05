import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

export const loadCommands = async () => {
  const commandsPath = path.resolve('./next/commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((f) => f.endsWith('.js'));

  const collection = new Map();

  for (const file of commandFiles) {
    const fullPath = path.join(commandsPath, file);
    const commandModule = await import(pathToFileURL(fullPath).href);
    const command = commandModule.default;

    if (!command?.command || typeof command.execute !== 'function') {
      console.warn(`[WARNING] Arquivo "${file}" está mal formatado.`);
      continue;
    }

    collection.set(command.command, command);
    console.log('Command set: ', command.command);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        collection.set(alias, command);
        console.log('Alias set: ', alias);
      }
    }
  }

  return collection;
};
