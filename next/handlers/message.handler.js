export const messageHandler = async ({ socket, update }) => {
  const { messages, type } = update;
  if (type !== 'notify') return;

  for (let msg of messages) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.pushName || msg.key.participant || msg.key.remoteJid;

    const messageContent =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      '';

    if (!messageContent) continue;

    const parts = messageContent.trim().split(/ +/);
    const commandName = parts.shift().toLowerCase();
    const args = parts;

    if (socket.commands.has(commandName)) {
      const command = socket.commands.get(commandName);
      if (isGroup && !command.groupOnly) return;

      if (msg.key.fromMe) return;

      try {
        await command.execute({ socket, message: msg, args });
      } catch (err) {
        console.error(`Erro ao executar comando ${commandName}:`, err);
      }
    }

    console.log(
      `[${
        isGroup ? 'GROUP' : 'PRIVATE'
      }] ${sender} (${from}): ${messageContent}`
    );
  }
};
