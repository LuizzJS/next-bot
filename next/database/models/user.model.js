import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    marriage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marriage',
      default: null,
    },
    stickers: {
      type: Number,
      default: 0,
    },
    authorized: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Map,
      of: new mongoose.Schema(
        {
          messages: {
            type: Number,
            default: 0,
          },
          originalId: {
            type: String,
            default: '',
          },
        },
        { _id: false },
      ),
      default: {},
    },
    config: {
      ratio: {
        type: String,
        enum: ['1:1', 'original'],
        default: '1:1',
      },
      language: {
        type: String,
        enum: ['pt', 'en', 'fr', 'es', 'it'],
        default: 'pt',
      },
      premium: {
        type: String,
        enum: ['platinum', 'diamond', 'gold', 'none'],
        default: 'none',
      },
      role: {
        type: String,
        enum: ['owner', 'admin', 'user'],
        default: 'user',
      },
      autoSticker: {
        type: Boolean,
        default: false,
      },
    },

    // 🔥 Economia
    economy: {
      money: { type: Number, default: 0 }, // Dinheiro em mãos
      bank: { type: Number, default: 0 }, // Dinheiro no banco
      diamonds: { type: Number, default: 0 }, // Moeda premium
    },

    // 📦 Inventário
    inventory: [
      {
        item: { type: String },
        quantity: { type: Number, default: 1 },
      },
    ],

    // ⏱️ Cooldowns de comandos
    cooldowns: {
      daily: { type: Date, default: null },
      work: { type: Date, default: null },
      crime: { type: Date, default: null },
      rob: { type: Date, default: null },
    },

    // 📊 Estatísticas
    stats: {
      level: { type: Number, default: 1 },
      xp: { type: Number, default: 0 },
      jobsDone: { type: Number, default: 0 },
    },

    // 💼 Emprego atual (para comando /work)
    job: {
      name: { type: String, default: null }, // Ex: "padeiro", "entregador"
      salary: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
