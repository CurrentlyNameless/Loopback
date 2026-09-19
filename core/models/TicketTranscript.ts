import mongoose, { Schema } from 'mongoose';

const TicketTranscriptSchema = new Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  subject: { type: String, default: '' },
  category: { type: String, default: '' },
  closedAt: { type: Date, required: true, index: true },
  messageCount: { type: Number, required: true },
  html: { type: String, required: true },
}, { timestamps: true });

export const TicketTranscriptModel = mongoose.models.TicketTranscript
  || mongoose.model('TicketTranscript', TicketTranscriptSchema);
