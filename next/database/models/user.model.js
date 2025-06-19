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
    reputation: {
      score: { type: Number, default: 0, min: -100, max: 100 },
      lastGiven: { type: Date, default: null },
    },
    activity: {
      lastSeen: { type: Date, default: Date.now },
      messagesSent: { type: Number, default: 0 },
      commandsUsed: { type: Number, default: 0 },
    },
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
    economy: {
      cash: { type: Number, default: 100, min: 0 },
      bank: { type: Number, default: 0, min: 0 },
      debt: { type: Number, default: 0, min: 0 },
      totalEarned: { type: Number, default: 0, min: 0 },
      totalSpent: { type: Number, default: 0, min: 0 },
      lastDaily: { type: Date, default: null },
      lastWork: { type: Date, default: null },
    },
    transactions: {
      type: [TransactionSchema],
      default: [],
    },
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
    job: {
      name: { type: String, default: null },
      position: { type: String, default: null },
      salary: { type: Number, default: 0, min: 0 },
      startedAt: { type: Date, default: null },
      performance: { type: Number, default: 0, min: 0, max: 100 },
      company: { type: String, default: null },
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
    },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.methods = {
  async addMoney(
    amount,
    description = 'Depósito',
    source = 'system',
    metadata = {}
  ) {
    const rounded = Math.round(amount);
    const before = this.economy.cash;
    this.economy.cash += rounded;
    this.economy.totalEarned += rounded;
    this.transactions.push({
      type: 'income',
      amount: rounded,
      description,
      source,
      balanceBefore: before,
      balanceAfter: this.economy.cash,
      metadata,
      createdAt: new Date(),
    });
    await this.save();
    return this;
  },

  async removeMoney(
    amount,
    description = 'Pagamento',
    source = 'system',
    metadata = {}
  ) {
    const rounded = Math.round(amount);
    if (this.economy.cash < rounded) throw new Error('Saldo insuficiente');
    const before = this.economy.cash;
    this.economy.cash -= rounded;
    this.economy.totalSpent += rounded;
    this.transactions.push({
      type: 'expense',
      amount: rounded,
      description,
      source,
      balanceBefore: before,
      balanceAfter: this.economy.cash,
      metadata,
      createdAt: new Date(),
    });
    await this.save();
    return this;
  },

  async addBank(
    amount,
    description = 'Depósito bancário',
    source = 'system',
    metadata = {}
  ) {
    const rounded = Math.round(amount);
    const before = this.economy.bank;
    this.economy.bank += rounded;
    this.transactions.push({
      type: 'income',
      amount: rounded,
      description,
      source,
      balanceBefore: before,
      balanceAfter: this.economy.bank,
      metadata,
      createdAt: new Date(),
    });
    await this.save();
    return this;
  },

  async removeBank(
    amount,
    description = 'Retirada bancária',
    source = 'system',
    metadata = {}
  ) {
    const rounded = Math.round(amount);
    if (this.economy.bank < rounded)
      throw new Error('Saldo bancário insuficiente');
    const before = this.economy.bank;
    this.economy.bank -= rounded;
    this.transactions.push({
      type: 'expense',
      amount: rounded,
      description,
      source,
      balanceBefore: before,
      balanceAfter: this.economy.bank,
      metadata,
      createdAt: new Date(),
    });
    await this.save();
    return this;
  },
};

userSchema.virtual('netWorth').get(function () {
  return this.economy.cash + this.economy.bank - this.economy.debt;
});

userSchema.virtual('isPremium').get(function () {
  return this.config.premium !== 'none';
});

export default mongoose.model('User', userSchema);
