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
        values: ['pending', 'accepted', 'rejected', 'not-married'],
        message: '{VALUE} não é um status válido.',
      },
      default: 'pending',
    },
    divorceStatus: {
      type: String,
      enum: {
        values: [null, '', 'pending', 'accepted', 'rejected'],
        message: '{VALUE} não é um status válido para divórcio.',
      },
      default: null,
    },
    // quem iniciou o pedido de casamento ou divórcio (se quiser rastrear)
    marriageRequester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    divorceRequester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
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
      }),
    );
    return next(err);
  }
  next();
});

// índices únicos para garantir que não existam dois registros para o mesmo casal
MarriageSchema.index(
  { partner1: 1, partner2: 1 },
  { unique: true, name: 'unique_marriage_partners' },
);

MarriageSchema.index(
  { partner2: 1, partner1: 1 },
  { unique: true, name: 'unique_marriage_partners_inverse' },
);

export default mongoose.model('Marriage', MarriageSchema);
