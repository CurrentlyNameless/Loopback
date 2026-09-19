import mongoose, { Schema } from 'mongoose';

const AppealSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userTag: { type: String, default: '' },
  punishment: { type: String, enum: ['BAN', 'MUTE', 'WARN', 'BLACKLIST'], required: true },
  originalReason: { type: String, default: '' },
  statement: { type: String, required: true },
  contact: { type: String, default: '' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  reviewedBy: { type: String, default: null },
  staffNote: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

export const AppealModel = mongoose.models.Appeal || mongoose.model('Appeal', AppealSchema);
