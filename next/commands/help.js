export default {
  name: 'help',
  aliases: ['ajuda', 'comando', 'comandos'],
  args: false,
  description: 'Mostra todos os comandos ou detalhes de um comando específico.',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const isSpecific = args.length > 0;

    if (!isSpecific) {
      // Lista todos os comandos agrupados
      let msg = '📚 *Lista de Comandos Disponíveis:*\n\n';

      const commands = [...client.commands.values()];
      const categories = {};

      for (const cmd of commands) {
        const group = cmd.group_only ? '🌐 Grupos' : '👤 Privado';
        if (!categories[group]) categories[group] = [];
        categories[group].push(
          `• *${prefix}${cmd.name}* - ${cmd.description || 'Sem descrição'}`
        );
      }

      for (const [group, cmds] of Object.entries(categories)) {
        msg += `*${group}*\n${cmds.join('\n')}\n\n`;
      }

      msg += `ℹ️ Use *${prefix}help <comando>* para ver mais detalhes.\nEx: *${prefix}help casar*`;
      return client.reply(message.chatId, msg, message.id);
    }

    // Ajuda detalhada para um comando específico
    const query = args[0].toLowerCase();
    const command =
      client.commands.get(query) ||
      [...client.commands.values()].find((cmd) => cmd.aliases?.includes(query));

    if (!command) {
      return client.reply(
        message.chatId,
        `❌ Comando "*${query}*" não encontrado.`,
        message.id
      );
    }

    const {
      name,
      aliases,
      description,
      args: requiresArgs,
      argsText,
      usage,
      group_only,
      bot_owner_only,
      group_admin_only,
    } = command;

    let msg = `📖 *Ajuda do comando: ${prefix}${name}*\n\n`;
    msg += `📌 *Descrição:* ${description || 'Sem descrição'}\n`;
    msg += `🔁 *Aliases:* ${
      aliases?.length
        ? aliases.map((a) => `\`${prefix}${a}\``).join(', ')
        : 'Nenhum'
    }\n`;
    msg += `📥 *Requer argumentos:* ${requiresArgs ? 'Sim' : 'Não'}\n`;
    if (requiresArgs) {
      msg += `✍️ *Uso:* ${usage || argsText || `${prefix}${name} <args>`}\n`;
    }
    msg += `👥 *Somente grupo:* ${group_only ? 'Sim' : 'Não'}\n`;
    msg += `👑 *Somente dono do bot:* ${bot_owner_only ? 'Sim' : 'Não'}\n`;
    msg += `🛡️ *Somente admin de grupo:* ${group_admin_only ? 'Sim' : 'Não'}`;

    return client.reply(message.chatId, msg, message.id);
  },
};
