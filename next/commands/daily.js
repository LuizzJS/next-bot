export default {
  name: 'daily',
  description: 'Coleta sua recompensa diária',
  group_only: false,
  bot_owner_only: false,
  group_admin_only: false,

  execute: async ({ client, message }) => {
    const { User } = client.db;
    const chatId = message.chatId;
    const senderId = message.sender.id.replace('@c.us', '');

    const DAILY_CONFIG = {
      baseMin: 400,
      baseMax: 800,
      multipliers: {
        none: 1.0,
        bronze: 1.3,
        silver: 1.6,
        gold: 2.0,
        diamond: 2.5,
      },
    };

    try {
      const user = await User.findOne({ phone: senderId });
      if (!user) {
        return await client.sendText(chatId, '❌ Você não está registrado!');
      }

      const now = new Date();
      const lastClaim = user.cooldowns?.daily
        ? new Date(user.cooldowns.daily)
        : null;

      // Cooldown de 24h (86.400.000 ms)
      if (lastClaim && now - lastClaim < 86400000) {
        const next = new Date(lastClaim.getTime() + 86400000);
        const mins = Math.ceil((next - now) / 60000);
        return client.sendText(
          chatId,
          `⏳ Você já coletou hoje!\nTente novamente em *${Math.floor(
            mins / 60
          )}h ${mins % 60}min*`
        );
      }

      // Ajuste: VIP está em config.premium, não em config.vip
      const vip = user.config?.premium || 'none';
      const multiplier = DAILY_CONFIG.multipliers[vip] || 1.0;

      const baseReward = Math.floor(
        Math.random() * (DAILY_CONFIG.baseMax - DAILY_CONFIG.baseMin + 1) +
          DAILY_CONFIG.baseMin
      );
      const reward = Math.round(baseReward * multiplier);

      const balanceBefore = user.economy.cash || 0;

      // Usa o método addMoney do modelo
      await user.addMoney(reward, 'Recompensa diária', 'reward');

      // Atualiza cooldown daily
      user.cooldowns = user.cooldowns || {};
      user.cooldowns.daily = now;
      await user.save();

      const format = (v) =>
        Number(v).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      await client.sendText(
        chatId,
        `🎁 *Daily recebido!*\n\n` +
          `💸 Base: R$${format(baseReward)}\n` +
          `🎖️ VIP: ${vip.toUpperCase()} (x${multiplier})\n` +
          `💰 Recompensa total: *R$${format(reward)}*`
      );
    } catch (err) {
      console.error('Erro no /daily:', err);
      await client.sendText(chatId, '❌ Erro ao coletar a recompensa diária.');
    }
  },
};
