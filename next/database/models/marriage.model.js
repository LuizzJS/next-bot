import mongoose from 'mongoose';

const marriageSchema = new mongoose.Schema(
  {
    partner1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    partner2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'lover_pending'],
      default: 'pending',
    },
    lover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    loverStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', null],
      default: null,
    },
    marriedAt: {
      type: Date,
      default: null,
    },
    loverSince: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Marriage', marriageSchema);
