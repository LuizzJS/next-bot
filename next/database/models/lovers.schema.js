import mongoose from 'mongoose';

const loverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },

  since: {
    type: Date,
    default: null,
  },
});

export default loverSchema;
