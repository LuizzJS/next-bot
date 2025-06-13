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
          mensagens: {
            type: Number,
            default: 0,
          },
          originalId: {
            type: String,
            default: '',
          },
        },
        { _id: false }
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
        enum: ['pt_br', 'en_us', 'es_es', 'fr_fr', 'it_it'],
        default: 'pt_br',
      },
      premium: {
        type: String,
        enum: ['Platinum', 'Diamond', 'Gold', 'None'],
        default: 'None',
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
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
