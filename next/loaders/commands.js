import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const commandsLoader = async ({ client }) => {
  const dir = path.resolve('next', 'commands');

  await Promise.all(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map(async (file) => {
        const filePath = path.join(dir, file);
        const fileUrl = pathToFileURL(filePath).href;
        const { default: cmd } = await import(fileUrl);

        if (!cmd?.name)
          return console.warn(`${file} | Missing property "name"`);

        client.commands.set(cmd.name, cmd);
        cmd.aliases?.forEach((alias) => client.commands.set(alias, cmd));
      })
  );
};

export default commandsLoader;
