import mongoose from 'mongoose';

const escapeMongoKey = (key) => key.replace(/\./g, '_');

const UserActivitySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
    commandCount: { type: Number, default: 0 },
    lastActivity: { type: Date },
  },
  { _id: false }
);

const GroupSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: (v) => !v || v.endsWith('@g.us'),
        message: 'ID de grupo inválido',
      },
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500, default: '' },
    inviteLink: {
      type: String,
      validate: {
        validator: (v) => v.startsWith('https://chat.whatsapp.com/'),
        message: 'Link de convite inválido',
      },
    },
    settings: {
      autoSticker: { type: Boolean, default: false },
      prefix: { type: String, default: '/', maxlength: 3 },
      welcomeMessage: { type: String, default: 'Bem-vindo(a), {user}!' },
      isActive: { type: Boolean, default: true },
    },
    members: {
      count: { type: Number, default: 0, min: 1 },
    },
    userActivities: {
      type: Map,
      of: UserActivitySchema,
      default: {},
    },
    createdAt: { type: Date, default: Date.now },
    stats: {
      lastActivity: Date,
      messages: { type: Number, default: 0 },
    },
  },
  {
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

// ======================
// VIRTUAIS
// ======================
GroupSchema.virtual('inviteCode').get(function () {
  return this.inviteLink?.split('https://chat.whatsapp.com/')[1] || null;
});

GroupSchema.virtual('activityScore').get(function () {
  const days = Math.max(1, (Date.now() - this.createdAt) / 86400000);
  return {
    daily: (this.stats.messages / days).toFixed(1),
    lastSeen: this.stats.lastActivity,
  };
});

GroupSchema.virtual('topMembers').get(function () {
  return Array.from(this.userActivities.values())
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);
});

// ======================
// MÉTODOS
// ======================
GroupSchema.methods = {
  async recordUserMessage(userId) {
    const safeKey = escapeMongoKey(userId);
    const activity = this.userActivities.get(safeKey) || {
      userId,
      messageCount: 0,
      commandCount: 0,
      lastActivity: new Date(),
    };

    activity.messageCount++;
    activity.lastActivity = new Date();
    this.stats.messages = (this.stats.messages || 0) + 1;
    this.stats.lastActivity = new Date();

    this.userActivities.set(safeKey, activity);
    await this.save();
    return activity;
  },

  async getUserStats(userId) {
    return (
      this.userActivities.get(escapeMongoKey(userId)) || {
        messageCount: 0,
        lastActivity: null,
      }
    );
  },
};

// ======================
// CONSULTAS ESTÁTICAS
// ======================
GroupSchema.statics = {
  async findActiveGroups(minMessages = 100) {
    return this.find({ 'settings.isActive': true })
      .where('stats.messages')
      .gte(minMessages)
      .sort({ 'stats.lastActivity': -1 });
  },

  async findUserGroups(userId) {
    const key = `userActivities.${escapeMongoKey(userId)}.messageCount`;
    return this.find({ [key]: { $gt: 0 } }).sort({
      [`userActivities.${escapeMongoKey(userId)}.lastActivity`]: -1,
    });
  },
};

export default mongoose.model('Group', GroupSchema);
