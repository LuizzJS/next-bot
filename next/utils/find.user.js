export const findUser = async ({ chat, input, client, message }) => {
  const participants = chat?.groupMetadata?.participants || [];

  if (message.quotedMsg) {
    return message.quotedMsg.sender.id;
  }

  if (message.mentionedJidList?.length) {
    return message.mentionedJidList[0];
  }

  if (/^\d{11,13}$/.test(input)) {
    const target = participants.find((p) => p.id.includes(input));
    if (target) return target.id;
  }

  const normalizedInput = input.toLowerCase();
  for (const participant of participants) {
    const contact = await client.getContact(participant.id);
    const name = contact.pushname?.toLowerCase() || '';
    const formattedName = contact.name?.toLowerCase() || '';
    if (
      name.includes(normalizedInput) ||
      formattedName.includes(normalizedInput)
    ) {
      return participant.id;
    }
  }

  return null;
};
