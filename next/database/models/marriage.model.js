import mongoose from 'mongoose';

const MarriageSchema = new mongoose.Schema(
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
      enum: {
        values: ['pending', 'accepted', 'rejected', 'divorced'],
        message: '{VALUE} não é um status válido.',
      },
      default: 'pending',
    },
  },
  { timestamps: true }
);

MarriageSchema.pre('validate', function (next) {
  if (this.partner1.equals(this.partner2)) {
    const err = new mongoose.Error.ValidationError(this);
    err.addError(
      'partner2',
      new mongoose.Error.ValidatorError({
        message: 'Você não pode se casar consigo mesmo.',
        path: 'partner2',
        value: this.partner2,
      })
    );
    return next(err);
  }
  next();
});

MarriageSchema.index(
  { partner1: 1, partner2: 1 },
  { unique: true, name: 'unique_marriage_partners' }
);

MarriageSchema.index(
  { partner2: 1, partner1: 1 },
  { unique: true, name: 'unique_marriage_partners_inverse' }
);

export default mongoose.model('Marriage', MarriageSchema);
