export const findUser = async ({ chat, input, client, message }) => {
  try {
    // Verifica se há mensagem citada (reply) - mais rápido
    if (message?.quotedMsg) {
      return {
        id: message.quotedMsg.sender.id,
        phone: message.quotedMsg.sender.id.replace('@c.us', ''),
      };
    }

    // Verifica menções diretas
    if (message?.mentionedJidList?.length > 0) {
      return {
        id: message.mentionedJidList[0],
        phone: message.mentionedJidList[0].replace('@c.us', ''),
      };
    }

    if (!input || typeof input !== 'string') return null;

    const cleanInput = input.trim().toLowerCase();
    const participants = chat?.groupMetadata?.participants || [];

    // Busca por @mention no texto
    if (cleanInput.startsWith('@')) {
      const username = cleanInput.replace('@', '');
      const target = participants.find((p) => {
        const phone = p.id.replace('@c.us', '');
        return (
          phone.includes(username) || p.id.toLowerCase().includes(username)
        );
      });
      if (target)
        return {
          id: target.id,
          phone: target.id.replace('@c.us', ''),
        };
    }

    // Busca por número de telefone (internacional)
    const numericInput = cleanInput.replace(/\D/g, '');

    if (numericInput.length >= 6) {
      // Número mínimo razoável para busca
      // Padroniza números internacionais:
      // - Remove zeros extras no início
      // - Mantém somente o código do país + número
      let phoneToFind = numericInput.replace(/^0+/, '');

      // Verifica participantes (agora suporta qualquer país)
      const target = participants.find((p) => {
        const participantPhone = p.id.replace('@c.us', '');
        // Remove o 'c.us' e zeros iniciais para comparação
        const cleanParticipantPhone = participantPhone.replace(/^0+/, '');
        return (
          cleanParticipantPhone.endsWith(phoneToFind) ||
          participantPhone.includes(phoneToFind)
        );
      });

      if (target) {
        return {
          id: target.id,
          phone: target.id.replace('@c.us', ''),
          isInternational: !target.id.startsWith('55'), // Exemplo para Brasil
        };
      }
    }

    // Busca por nome (para quando não é número)
    if (!/^\d+$/.test(cleanInput)) {
      for (const participant of participants) {
        try {
          const contact = await client.getContact(participant.id);
          const names = [
            contact?.pushname?.toLowerCase(),
            contact?.name?.toLowerCase(),
            contact?.verifiedName?.toLowerCase(),
            contact?.formattedName?.toLowerCase(),
          ].filter(Boolean);

          if (names.some((name) => name.includes(cleanInput))) {
            return {
              id: participant.id,
              phone: participant.id.replace('@c.us', ''),
              name: contact?.pushname || contact?.name || 'Usuário',
              isInternational: !participant.id.startsWith('55'),
            };
          }
        } catch (error) {
          console.error(`Erro ao buscar contato ${participant.id}:`, error);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erro na função findUser:', error);
    return null;
  }
};
