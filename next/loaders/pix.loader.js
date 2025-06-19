import chalk from 'chalk';

async function processScheduledPix(client) {
  try {
    if (!client?.db) {
      console.error(chalk.red('[PIX JOB]') + ' client.db está indefinido!');
      return;
    }
    if (!client.db.ScheduledPix) {
      console.error(
        chalk.red('[PIX JOB]') + ' client.db.ScheduledPix está indefinido!'
      );
      return;
    }
    if (!client.db.User) {
      console.error(
        chalk.red('[PIX JOB]') + ' client.db.User está indefinido!'
      );
      return;
    }

    const now = new Date();
    console.log(
      chalk.cyan(`[PIX JOB] Iniciando verificação às ${now.toISOString()}`)
    );

    // Busca Pix agendados com scheduledAt <= agora
    const pixs = await client.db.ScheduledPix.find({
      scheduledAt: { $lte: now },
    });

    console.log(
      chalk.cyan(
        `[PIX JOB] Encontrados ${pixs.length} Pix(s) agendados para processar.`
      )
    );

    for (const pix of pixs) {
      // Busca sender e recipient
      let sender = await client.db.User.findById(pix.from);
      let recipient = await client.db.User.findById(pix.to);

      // Cria sender se não existir
      if (!sender) {
        console.warn(
          chalk.yellow(
            `[PIX JOB] Usuário remetente (${pix.from}) não encontrado. Criando novo usuário...`
          )
        );
        sender = await client.db.User.create({
          _id: pix.from,
          phone: null, // Se tiver dados, coloque aqui
          name: 'Usuário Remetente',
          economy: { money: 0 },
        });
      }

      // Cria recipient se não existir
      if (!recipient) {
        console.warn(
          chalk.yellow(
            `[PIX JOB] Usuário destinatário (${pix.to}) não encontrado. Criando novo usuário...`
          )
        );
        recipient = await client.db.User.create({
          _id: pix.to,
          phone: null, // Se tiver dados, coloque aqui
          name: 'Usuário Destinatário',
          economy: { money: 0 },
        });
      }

      // Transfere o valor para o destinatário
      recipient.economy.money = (recipient.economy.money || 0) + pix.amount;
      await recipient.save();

      // Remove o Pix agendado para não processar de novo
      await client.db.ScheduledPix.deleteOne({ _id: pix._id });

      const formattedAmount = pix.amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      // Notifica destinatário
      if (recipient.phone) {
        client.sendText(
          `${recipient.phone}@c.us`,
          `💰 Você recebeu um Pix agendado de *${formattedAmount}*!`
        );
      }

      // Notifica remetente
      if (sender.phone) {
        client.sendText(
          `${sender.phone}@c.us`,
          `✅ Seu Pix agendado de *${formattedAmount}* foi processado com sucesso!`
        );
      }

      console.log(
        chalk.green(`[PIX JOB] Pix ${pix._id} processado com sucesso.`)
      );
    }
  } catch (error) {
    console.error(
      chalk.red('[PIX JOB] Erro ao processar Pix agendados:'),
      error
    );
  }
}

function startPixScheduler(client) {
  console.log(
    chalk.blue('[PIX JOB] Scheduler iniciado, verificando a cada 60 segundos.')
  );
  setInterval(() => processScheduledPix(client), 60 * 1000);
}

export { startPixScheduler };
