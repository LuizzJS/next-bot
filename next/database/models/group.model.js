import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    inviteLink: {
      type: String,
    },
    autoSticker: {
      type: Boolean,
      default: false,
    },
    prefix: {
      type: String,
      default: '/',
    },
  },
  {
    versionKey: false, // Remove "__v" do documento
    timestamps: true,
  },
);

export default mongoose.model('Group', GroupSchema);
