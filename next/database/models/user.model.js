import mongoose from 'mongoose';
import TransactionSchema from './transaction.model.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: (v) => /^\d+$/.test(v),
        message: 'Número de telefone inválido',
      },
    },
    marriage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marriage',
      default: null,
    },
    stickers: {
      type: Number,
      default: 0,
      min: 0,
    },
    authorized: {
      type: Boolean,
      default: false,
    },
    blacklisted: {
      type: Boolean,
      default: false,
    },
    registeredAt: {
      type: Date,
      default: null,
    },

    // Sistema de reputação e moderação
    reputation: {
      score: { type: Number, default: 0, min: -100, max: 100 },
      lastGiven: { type: Date, default: null },
    },

    // Dados de atividade
    activity: {
      lastSeen: { type: Date, default: Date.now },
      messagesSent: { type: Number, default: 0 },
      commandsUsed: { type: Number, default: 0 },
    },

    // Configurações do usuário
    config: {
      ratio: {
        type: String,
        enum: ['1:1', 'original', '4:5', '16:9'],
        default: '1:1',
      },
      premium: {
        type: String,
        enum: ['platinum', 'diamond', 'gold', 'silver', 'none'],
        default: 'none',
        index: true,
      },
      role: {
        type: String,
        enum: ['owner', 'admin', 'moderator', 'vip', 'user'],
        default: 'user',
        index: true,
      },
      autoSticker: {
        type: Boolean,
        default: false,
      },
    },

    // Sistema econômico completo
    economy: {
      cash: {
        type: Number,
        default: 100,
        min: 0,
        get: (v) => Math.round(v),
        set: (v) => Math.round(v),
      },
      bank: {
        type: Number,
        default: 0,
        min: 0,
        get: (v) => Math.round(v),
        set: (v) => Math.round(v),
      },
      debt: {
        type: Number,
        default: 0,
        min: 0,
        get: (v) => Math.round(v),
        set: (v) => Math.round(v),
      },
      totalEarned: { type: Number, default: 0, min: 0 },
      totalSpent: { type: Number, default: 0, min: 0 },
      lastDaily: { type: Date, default: null },
      lastWork: { type: Date, default: null },

      // Histórico de transações
      transactions: {
        type: [TransactionSchema],
        default: [],
        select: false,
      },
    },

    // Inventário aprimorado
    inventory: [
      {
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        category: {
          type: String,
          enum: ['food', 'fun', 'utility', 'collectible', 'other'],
          required: true,
        },
        obtainedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null },
        attributes: mongoose.Schema.Types.Mixed,
      },
    ],

    // Estatísticas detalhadas
    stats: {
      level: { type: Number, default: 1, min: 1, max: 100 },
      xp: { type: Number, default: 0, min: 0 },
      jobsDone: { type: Number, default: 0, min: 0 },
      itemsBought: { type: Number, default: 0, min: 0 },
      hoursWorked: { type: Number, default: 0, min: 0 },
      health: { type: Number, default: 100, min: 0, max: 100 },
      happiness: { type: Number, default: 50, min: 0, max: 100 },
      energy: { type: Number, default: 100, min: 0, max: 100 },
      strength: { type: Number, default: 10, min: 0, max: 100 },
      intelligence: { type: Number, default: 10, min: 0, max: 100 },
    },

    // Sistema de emprego aprimorado
    job: {
      name: { type: String, default: null },
      position: { type: String, default: null },
      salary: { type: Number, default: 0, min: 0 },
      startedAt: { type: Date, default: null },
      performance: { type: Number, default: 0, min: 0, max: 100 },
      company: { type: String, default: null },
    },

    // Privacidade
    privacy: {
      profileVisible: { type: Boolean, default: true },
    },

    // Sistema de missões
    quests: [
      {
        questId: { type: String, required: true },
        name: { type: String, required: true },
        progress: { type: Number, default: 0 },
        target: { type: Number, required: true },
        reward: { type: Number, required: true },
        startedAt: { type: Date, default: Date.now },
        completed: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
      virtuals: true,
    },
    toObject: {
      getters: true,
      virtuals: true,
    },
  }
);

// Índices para melhor performance
userSchema.index({ 'config.premium': 1, 'config.role': 1 });
userSchema.index({ 'economy.cash': -1 });
userSchema.index({ 'stats.level': -1 });
userSchema.index({ phone: 1, authorized: 1 });
userSchema.index({ 'economy.transactions.createdAt': -1 });
userSchema.index({ 'economy.transactions.source': 1 });

// Middleware para pré-salvamento
userSchema.pre('save', function (next) {
  // Garantir que valores monetários sejam inteiros
  if (this.isModified('economy')) {
    this.economy.cash = Math.round(this.economy.cash);
    this.economy.bank = Math.round(this.economy.bank);
    this.economy.debt = Math.round(this.economy.debt);
  }

  // Atualizar última vez visto
  if (this.isModified()) {
    this.activity.lastSeen = new Date();
  }

  next();
});

// Métodos do usuário
userSchema.methods = {
  // Adicionar dinheiro com registro de transação
  async addMoney(
    amount,
    description = 'Depósito',
    source = 'system',
    metadata = {}
  ) {
    const balanceBefore = this.economy.cash;
    const roundedAmount = Math.round(amount);

    this.economy.cash += roundedAmount;
    this.economy.totalEarned += roundedAmount;

    this.economy.transactions.push({
      type: 'income',
      amount: roundedAmount,
      description,
      source,
      balanceBefore,
      balanceAfter: this.economy.cash,
      metadata,
      createdAt: new Date(),
    });

    await this.save();
    return this;
  },

  // Remover dinheiro com registro de transação
  async removeMoney(
    amount,
    description = 'Pagamento',
    source = 'system',
    metadata = {}
  ) {
    const roundedAmount = Math.round(amount);

    if (this.economy.cash < roundedAmount) {
      throw new Error('Saldo insuficiente');
    }

    const balanceBefore = this.economy.cash;
    this.economy.cash -= roundedAmount;
    this.economy.totalSpent += roundedAmount;

    this.economy.transactions.push({
      type: 'expense',
      amount: roundedAmount,
      description,
      source,
      balanceBefore,
      balanceAfter: this.economy.cash,
      metadata,
      createdAt: new Date(),
    });

    await this.save();
    return this;
  },

  // Transferir dinheiro para outro usuário
  async transferMoney(targetUser, amount, description = 'Transferência') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const roundedAmount = Math.round(amount);

      // Remover do usuário origem
      await this.removeMoney(
        roundedAmount,
        `Transferência para ${targetUser.name}`,
        'transfer',
        { targetUserId: targetUser._id }
      );

      // Adicionar ao usuário destino
      await targetUser.addMoney(
        roundedAmount,
        `Transferência de ${this.name}`,
        'transfer',
        { sourceUserId: this._id }
      );

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Obter histórico de transações com filtros
  async getTransactionHistory({
    limit = 10,
    skip = 0,
    type,
    source,
    startDate,
    endDate,
  } = {}) {
    const filters = {};

    if (type) filters.type = type;
    if (source) filters.source = source;
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Usando aggregation para filtros complexos
    const result = await this.model('User').aggregate([
      { $match: { _id: this._id } },
      { $unwind: '$economy.transactions' },
      { $match: { 'economy.transactions': { $exists: true, ...filters } } },
      { $sort: { 'economy.transactions.createdAt': -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $group: {
          _id: '$_id',
          transactions: { $push: '$economy.transactions' },
          total: { $sum: 1 },
        },
      },
    ]);

    return {
      transactions: result[0]?.transactions || [],
      total: result[0]?.total || 0,
    };
  },

  // Obter resumo financeiro
  async getFinancialSummary() {
    const result = await this.model('User').aggregate([
      { $match: { _id: this._id } },
      {
        $project: {
          totalCash: '$economy.cash',
          totalBank: '$economy.bank',
          totalDebt: '$economy.debt',
          totalEarned: '$economy.totalEarned',
          totalSpent: '$economy.totalSpent',
          netWorth: {
            $subtract: [
              { $add: ['$economy.cash', '$economy.bank'] },
              '$economy.debt',
            ],
          },
          incomeBySource: {
            $reduce: {
              input: '$economy.transactions',
              initialValue: {},
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'income'] },
                  {
                    $mergeObjects: [
                      '$$value',
                      {
                        [$$this.source]: {
                          $add: [
                            { $ifNull: [`$$value[$$this.source]`, 0] },
                            $$this.amount,
                          ],
                        },
                      },
                    ],
                  },
                  '$$value',
                ],
              },
            },
          },
          expenseBySource: {
            $reduce: {
              input: '$economy.transactions',
              initialValue: {},
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'expense'] },
                  {
                    $mergeObjects: [
                      '$$value',
                      {
                        [$$this.source]: {
                          $add: [
                            { $ifNull: [`$$value[$$this.source]`, 0] },
                            $$this.amount,
                          ],
                        },
                      },
                    ],
                  },
                  '$$value',
                ],
              },
            },
          },
        },
      },
    ]);

    return result[0] || {};
  },

  // Adicionar item ao inventário
  async addItem(itemId, name, category, quantity = 1, attributes = {}) {
    const existingItem = this.inventory.find((item) => item.itemId === itemId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.inventory.push({
        itemId,
        name,
        category,
        quantity,
        obtainedAt: new Date(),
        attributes,
      });
    }

    await this.save();
    return this;
  },

  // Remover item do inventário
  async removeItem(itemId, quantity = 1) {
    const itemIndex = this.inventory.findIndex(
      (item) => item.itemId === itemId
    );

    if (itemIndex === -1) {
      throw new Error('Item não encontrado no inventário');
    }

    const item = this.inventory[itemIndex];

    if (item.quantity < quantity) {
      throw new Error('Quantidade insuficiente no inventário');
    }

    item.quantity -= quantity;

    if (item.quantity <= 0) {
      this.inventory.splice(itemIndex, 1);
    }

    await this.save();
    return this;
  },
};

// Virtuals
userSchema.virtual('lastTransaction').get(function () {
  if (this.economy.transactions && this.economy.transactions.length > 0) {
    return this.economy.transactions[this.economy.transactions.length - 1];
  }
  return null;
});

userSchema.virtual('netWorth').get(function () {
  return this.economy.cash + this.economy.bank - this.economy.debt;
});

userSchema.virtual('isPremium').get(function () {
  return this.config.premium !== 'none';
});

export default mongoose.model('User', userSchema);
