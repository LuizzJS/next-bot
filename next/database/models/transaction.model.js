import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'income',
      'expense',
      'transfer',
      'payment',
      'reward',
      'fine',
      'deposit',
      'withdraw',
    ],
    required: true,
  },
  source: {
    type: String,
    enum: [
      'work',
      'shop',
      'transfer',
      'system',
      'crime',
      'gift',
      'reward',
      'deposit',
      'withdraw',
      'other',
    ],
    required: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
    get: (v) => Math.round(v),
    set: (v) => Math.round(v),
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  itemId: String,
  balanceBefore: Number,
  balanceAfter: Number,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default TransactionSchema;

export const TransactionModel = mongoose.model(
  'Transaction',
  TransactionSchema
);
