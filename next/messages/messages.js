const messages = {
  marriage: {
    request: {
      pt: '💝 {user} pediu *{partner}* em casamento!\n\nResponda com:\n💖 {prefix}aceitar - Para aceitar\n💔 {prefix}rejeitar - Para recusar',
      en: '💝 {user} has proposed to *{partner}*!\n\nReply with:\n💖 {prefix}accept - To accept\n💔 {prefix}reject - To decline',
      fr: '💝 {user} a demandé *{partner}* en mariage !\n\nRépondez avec :\n💖 {prefix}accepter - Pour accepter\n💔 {prefix}rejeter - Pour refuser',
      es: '💝 {user} le ha propuesto matrimonio a *{partner}*!\n\nResponde con:\n💖 {prefix}aceptar - Para aceptar\n💔 {prefix}rechazar - Para rechazar',
      it: '💝 {user} ha chiesto la mano di *{partner}*!\n\nRispondi con:\n💖 {prefix}accettare - Per accettare\n💔 {prefix}rifiutare - Per rifiutare',
    },
    already: {
      pt: '💍 {user} já está casado(a) com *{partner}*!',
      en: '💍 {user} is already married to *{partner}*!',
      fr: '💍 {user} est déjà marié(e) avec *{partner}*!',
      es: '💍 {user} ya está casado(a) con *{partner}*!',
      it: '💍 {user} è già sposato(a) con *{partner}*!',
    },
    accept: {
      pt: '💖 {partner} aceitou se casar com *{user}*!\n📅 Casamento realizado com sucesso em {date}!',
      en: '💖 {partner} accepted to marry *{user}*!\n📅 Marriage successfully registered on {date}!',
      fr: "💖 {partner} a accepté d'épouser *{user}* !\n📅 Mariage enregistré avec succès le {date} !",
      es: '💖 {partner} aceptó casarse con *{user}*!\n📅 Matrimonio registrado con éxito en {date}!',
      it: '💖 {partner} ha accettato di sposare *{user}*!\n📅 Matrimonio registrato con successo il {date}!',
    },
    reject: {
      pt: '💔 {partner} rejeitou o pedido de casamento de *{user}*...',
      en: "💔 {partner} rejected *{user}*'s marriage proposal...",
      fr: '💔 {partner} a rejeté la demande en mariage de *{user}*...',
      es: '💔 {partner} rechazó la propuesta de matrimonio de *{user}*...',
      it: '💔 {partner} ha rifiutato la proposta di matrimonio di *{user}*...',
    },
    divorce: {
      pt: '💔 {user} se divorciou de *{partner}*.',
      en: '💔 {user} divorced *{partner}*.',
      fr: '💔 {user} a divorcé de *{partner}*.',
      es: '💔 {user} se divorció de *{partner}*.',
      it: '💔 {user} ha divorziato da *{partner}*.',
    },
    notMarried: {
      pt: '❌ Você não está casado(a) com ninguém.',
      en: '❌ You are not married to anyone.',
      fr: "❌ Vous n'êtes marié(e) à personne.",
      es: '❌ No estás casado(a) con nadie.',
      it: '❌ Non sei sposato(a) con nessuno.',
    },
    partnerNotMarried: {
      pt: '❌ {partner} não está casado(a) com ninguém.',
      en: '❌ {partner} is not married to anyone.',
      fr: "❌ {partner} n'est marié(e) à personne.",
      es: '❌ {partner} no está casado(a) con nadie.',
      it: '❌ {partner} non è sposato(a) con nessuno.',
    },
    marriageInfo: {
      pt: '💍 Casamento entre *{user}* e *{partner}*\n📅 Desde: {date}',
      en: '💍 Marriage between *{user}* and *{partner}*\n📅 Since: {date}',
      fr: '💍 Mariage entre *{user}* et *{partner}*\n📅 Depuis : {date}',
      es: '💍 Matrimonio entre *{user}* y *{partner}*\n📅 Desde: {date}',
      it: '💍 Matrimonio tra *{user}* e *{partner}*\n📅 Dal: {date}',
    },
  },
};

export default messages;
