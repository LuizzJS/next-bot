import mongoose from 'mongoose';
import loverSchema from './lovers.schema.js';

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
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    marriedAt: {
      type: Date,
      default: null,
    },
    lovers: [loverSchema],
    divorceStatus: {
      type: String,
      enum: ['none', 'pending', 'confirmed'],
      default: 'none',
    },
    divorceRequester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Índice único para prevenir duplicatas de relacionamentos
marriageSchema.index({ partner1: 1, partner2: 1 }, { unique: true });

// Ordena os parceiros para consistência
marriageSchema.pre('save', function (next) {
  if (this.partner1 && this.partner2) {
    if (this.partner1.toString() > this.partner2.toString()) {
      [this.partner1, this.partner2] = [this.partner2, this.partner1];
    }
  }
  next();
});

// Validação: Parceiros devem ser diferentes
marriageSchema.path('partner1').validate(function (value) {
  return !this.partner2 || !value.equals(this.partner2);
}, 'Os parceiros partner1 e partner2 devem ser diferentes');

// Validação: Amantes devem ser únicos
marriageSchema.path('lovers').validate(function (lovers) {
  if (this.status !== 'accepted') return true;

  const loverUserIds = lovers.map((l) => l.user.toString());
  const uniqueIds = new Set(loverUserIds);
  return uniqueIds.size === loverUserIds.length;
}, 'Os amantes devem ser únicos dentro do relacionamento');

// Validação: Limite de amantes
marriageSchema.path('lovers').validate(function (lovers) {
  return lovers.length <= 2;
}, 'São permitidos no máximo dois amantes');

// Validação: Data de casamento obrigatória
marriageSchema.path('marriedAt').validate(function (value) {
  return this.status !== 'accepted' || value !== null;
}, 'O campo marriedAt é obrigatório quando o status é "accepted"');

// Virtual para retornar o parceiro(a) do usuário atual (recebendo userId como parâmetro)
marriageSchema.methods.getPartnerOf = function (userId) {
  if (!userId) return null;
  if (this.partner1.equals(userId)) return this.partner2;
  if (this.partner2.equals(userId)) return this.partner1;
  return null;
};

// Virtual para obter status legível do divórcio
marriageSchema.virtual('divorceStatusReadable').get(function () {
  switch (this.divorceStatus) {
    case 'none':
      return 'Sem pedido de divórcio';
    case 'pending':
      return 'Pedido de divórcio pendente';
    case 'confirmed':
      return 'Divórcio confirmado';
    default:
      return 'Status desconhecido';
  }
});

export default mongoose.model('Marriage', marriageSchema);
