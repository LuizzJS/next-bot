export default {
  name: 'works',
  aliases: ['work'],
  args: false,
  description:
    'Gerencia sistema de empregos - lista trabalhos ou executa trabalho atual',
  group_only: true,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message, args, prefix }) => {
    const chatId = message.chatId;
    const senderId = message.sender.id.replace('@c.us', '');
    const { User, Transaction } = client.db;

    const JOBS_CONFIG = {
      1: {
        name: 'Motorista',
        salary: 100,
        xpPerJob: 20,
        xpForNextLevel: 100,
        cooldownMinutes: 10,
        emoji: '🚗',
        description: 'Transporte passageiros pela cidade',
        requirements: 'Nenhum',
      },
      2: {
        name: 'Cozinheiro',
        salary: 150,
        xpPerJob: 25,
        xpForNextLevel: 120,
        cooldownMinutes: 15,
        emoji: '👨‍🍳',
        description: 'Prepare refeições em restaurantes',
        requirements: 'Nível 2+',
      },
      3: {
        name: 'Professor',
        salary: 200,
        xpPerJob: 30,
        xpForNextLevel: 140,
        cooldownMinutes: 20,
        emoji: '👨‍🏫',
        description: 'Ensine alunos em escolas',
        requirements: 'Nível 3+',
      },
      4: {
        name: 'Programador',
        salary: 300,
        xpPerJob: 40,
        xpForNextLevel: 160,
        cooldownMinutes: 25,
        emoji: '💻',
        description: 'Desenvolva sistemas e aplicativos',
        requirements: 'Nível 5+',
      },
      5: {
        name: 'Médico',
        salary: 400,
        xpPerJob: 50,
        xpForNextLevel: 180,
        cooldownMinutes: 30,
        emoji: '👨‍⚕️',
        description: 'Atenda pacientes em hospitais',
        requirements: 'Nível 8+',
      },
    };

    const formatCooldown = (minutes) => {
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins ? ` ${mins}min` : ''}`;
      }
      return `${minutes} minutos`;
    };

    const formatTimeRemaining = (ms) => {
      const totalMinutes = Math.ceil(ms / 60000);
      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h${mins ? ` ${mins}min` : ''}`;
      }
      return `${totalMinutes} minutos`;
    };

    const showJobsList = async (userLevel = 1) => {
      let listMsg = '👜 *Lista de empregos disponíveis:* \n\n';

      Object.entries(JOBS_CONFIG).forEach(([id, job]) => {
        const requiredLevel = job.requirements.includes('Nível')
          ? parseInt(job.requirements.replace('Nível ', '').replace('+', ''))
          : 0;
        const canAccess = userLevel >= requiredLevel;

        listMsg += `${job.emoji} *${id}. ${job.name}*\n`;
        listMsg += `💵 Salário: R$${job.salary.toLocaleString(
          'pt-BR'
        )}/trabalho\n`;
        listMsg += `📈 XP: ${job.xpPerJob}/trabalho\n`;
        listMsg += `⏳ Cooldown: ${formatCooldown(job.cooldownMinutes)}\n`;
        listMsg += `📝 ${job.description}\n`;
        listMsg += `🔑 Requisitos: ${job.requirements}\n`;
        listMsg += canAccess ? '✅ Disponível\n\n' : '❌ Indisponível\n\n';
      });

      listMsg += `\n💡 Use *${prefix}works <número>* para escolher um emprego\n`;
      listMsg += `🛠️ Use *${prefix}work* para realizar seu trabalho atual`;

      await client.reply(chatId, listMsg, message.id);
    };

    const initializeUserData = (user) => {
      if (!user) return null;
      if (!user.economy) user.economy = { cash: 0, bank: 0 };
      if (!user.stats)
        user.stats = {
          jobsDone: 0,
          xp: 0,
          level: 1,
          totalEarned: 0,
          energy: 100,
          health: 100,
        };
      if (!user.cooldowns) user.cooldowns = {};
      if (!user.job) user.job = null;
      // Garantir energy e health existam
      user.stats.energy = user.stats.energy ?? 100;
      user.stats.health = user.stats.health ?? 100;
      return user;
    };

    const getUser = async () => {
      try {
        const user = await User.findOne({ phone: senderId });
        return initializeUserData(user);
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
      }
    };

    try {
      const commandUsed = message.body.toLowerCase().split(' ')[0];
      const isWorkCmd = commandUsed === `${prefix}work`;
      const isWorksCmd = commandUsed === `${prefix}works`;

      if (isWorkCmd) {
        const user = await getUser();
        if (!user) {
          await client.reply(
            chatId,
            '❌ Você não está registrado!',
            message.id
          );
          return;
        }

        if (!user.job) {
          await client.reply(
            chatId,
            `🔍 *Você não tem um emprego!*\n\nUse *${prefix}works* para escolher um trabalho.`,
            message.id
          );
          await showJobsList(user.stats.level);
          return;
        }

        // Verifica energia e saúde mínima para trabalhar
        const minEnergy = 20;
        const minHealth = 30;

        if (user.stats.energy < minEnergy) {
          return await client.reply(
            chatId,
            `❌ Você está sem energia suficiente para trabalhar!\n` +
              `Energia atual: ${user.stats.energy}/100\n` +
              `Descanse para recuperar energia.`,
            message.id
          );
        }

        if (user.stats.health < minHealth) {
          return await client.reply(
            chatId,
            `❌ Sua saúde está muito baixa para trabalhar!\n` +
              `Saúde atual: ${user.stats.health}/100\n` +
              `Cuide-se para recuperar saúde.`,
            message.id
          );
        }

        const jobConfig = Object.values(JOBS_CONFIG).find(
          (j) => j.name === user.job.name
        );
        if (!jobConfig) {
          await client.reply(
            chatId,
            '🔄 *Trabalho removido!*\nSeu cargo atual não existe mais.\nEscolha um novo trabalho:',
            message.id
          );
          await showJobsList(user.stats.level);
          return;
        }

        const now = new Date();
        const cooldownExpires = user.cooldowns.work
          ? new Date(user.cooldowns.work)
          : null;

        if (cooldownExpires && cooldownExpires > now) {
          const remainingMs = cooldownExpires.getTime() - now.getTime();
          return await client.reply(
            chatId,
            `⏳ *Aguarde para trabalhar novamente!*\n\n` +
              `Você poderá trabalhar em *${formatTimeRemaining(
                remainingMs
              )}*\n` +
              `⏰ Próximo horário: ${cooldownExpires.toLocaleTimeString(
                'pt-BR'
              )}`,
            message.id
          );
        }

        // Paga salário e adiciona XP
        const balanceBefore = user.economy.cash;
        user.economy.cash += jobConfig.salary;
        const balanceAfter = user.economy.cash;

        user.stats.jobsDone++;
        user.stats.xp += jobConfig.xpPerJob;
        user.stats.totalEarned =
          (user.stats.totalEarned || 0) + jobConfig.salary;

        // Consome energia e saúde
        user.stats.energy -= 15; // ajuste o valor conforme quiser
        if (user.stats.energy < 0) user.stats.energy = 0;

        user.stats.health -= 5; // ajuste o valor conforme quiser
        if (user.stats.health < 0) user.stats.health = 0;

        // Checar level up (pode subir múltiplos níveis)
        let leveledUp = false;
        while (user.stats.xp >= jobConfig.xpForNextLevel) {
          user.stats.level++;
          user.stats.xp -= jobConfig.xpForNextLevel;
          leveledUp = true;
        }

        user.cooldowns.work = new Date(
          now.getTime() + jobConfig.cooldownMinutes * 60000
        );

        // Registra transação
        await Transaction.create({
          type: 'income',
          amount: jobConfig.salary,
          description: `Salário recebido como ${user.job.name}`,
          source: 'work',
          relatedUser: user._id,
          balanceBefore,
          balanceAfter,
          metadata: {
            jobName: user.job.name,
            jobLevel: user.stats.level,
          },
          createdAt: new Date(),
        });

        await user.save();

        let levelUpMsg = '';
        if (leveledUp) {
          levelUpMsg =
            '\n\n🌟 *Promoção!* 🌟\n' +
            `Você alcançou o nível ${user.stats.level}!\n` +
            'Novos empregos podem estar disponíveis!';
        }

        await client.reply(
          chatId,
          '📄 *Relatório de trabalho:* \n\n' +
            `👨‍💼 Cargo: ${jobConfig.emoji} *${user.job.name}*\n` +
            `💰 Salário: R$${jobConfig.salary.toLocaleString('pt-BR')}\n\n` +
            '📊 *Progresso*\n' +
            `▸ Nível: ${user.stats.level}\n` +
            `▸ XP: ${user.stats.xp}/${jobConfig.xpForNextLevel}\n` +
            `▸ Total realizado: ${user.stats.jobsDone} trabalhos\n` +
            `⏳ Próximo trabalho: ${formatCooldown(
              jobConfig.cooldownMinutes
            )}\n` +
            `🔋 Energia restante: ${user.stats.energy}/100\n` +
            `❤️ Saúde restante: ${user.stats.health}/100` +
            levelUpMsg,
          message.id
        );
        return;
      }

      if (isWorksCmd && args.length === 0) {
        const user = await getUser();
        if (!user) {
          await client.reply(
            chatId,
            '❌ Você não está registrado!',
            message.id
          );
          return;
        }
        return await showJobsList(user.stats.level);
      }

      if (isWorksCmd && args.length > 0) {
        const jobNumber = parseInt(args[0]);
        const user = await getUser();
        if (!user) {
          await client.reply(
            chatId,
            '❌ Você não está registrado!',
            message.id
          );
          return;
        }

        if (isNaN(jobNumber)) {
          return await client.reply(
            chatId,
            `❌ *Número inválido!*\nUse *${prefix}works <número>*\nExemplo: *${prefix}works 2* para virar Cozinheiro`,
            message.id
          );
        }

        const selectedJob = JOBS_CONFIG[jobNumber];
        if (!selectedJob) {
          return await client.reply(
            chatId,
            `🔍 *Emprego não encontrado!*\nO número ${jobNumber} não é válido.\nUse *${prefix}works* para ver a lista completa.`,
            message.id
          );
        }

        const requiredLevel = selectedJob.requirements.includes('Nível')
          ? parseInt(
              selectedJob.requirements.replace('Nível ', '').replace('+', '')
            )
          : 0;

        if (user.stats.level < requiredLevel) {
          return await client.reply(
            chatId,
            `🔒 *Requisitos não atendidos!*\nPara ser ${selectedJob.name} você precisa:\n▸ Nível ${requiredLevel} (atual: ${user.stats.level})\nContinue trabalhando para desbloquear!`,
            message.id
          );
        }

        const previousJob = user.job?.name || null;
        user.job = {
          name: selectedJob.name,
          salary: selectedJob.salary,
          startedAt: new Date(),
        };

        await user.save();

        await client.reply(
          chatId,
          '*🎉 Contratação concluída!* \n\n' +
            (previousJob
              ? `Você mudou de *${previousJob}* para:\n`
              : 'Parabéns pelo seu primeiro emprego!\n') +
            `\n${selectedJob.emoji} *${selectedJob.name.toUpperCase()}*\n` +
            `📌 ${selectedJob.description}\n\n` +
            '📋 *Detalhes do cargo*\n' +
            `▸ Salário: R$${selectedJob.salary.toLocaleString('pt-BR')}\n` +
            `▸ XP por trabalho: ${selectedJob.xpPerJob}\n` +
            `▸ Intervalo: ${formatCooldown(selectedJob.cooldownMinutes)}\n\n` +
            `💡 Use *${prefix}work* para começar a trabalhar!`,
          message.id
        );
        return;
      }
    } catch (error) {
      console.error('Erro no comando works:', error);
      await client.reply(
        chatId,
        '❌ Ocorreu um erro. Tente novamente.',
        message.id
      );
    }
  },
};
