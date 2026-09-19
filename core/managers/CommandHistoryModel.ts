import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICommandHistoryDoc extends Document {
  commandName: string;
  type: "slash" | "prefix";
  userId: string;
  username: string;
  avatar: string | null;
  guildId: string | null;
  channelId: string;
  createdAt: Date;
}

const CommandHistorySchema = new Schema<ICommandHistoryDoc>({
  commandName: { type: String, required: true, index: true },
  type:        { type: String, enum: ["slash", "prefix"], required: true },
  userId:      { type: String, required: true },
  username:    { type: String, required: true },
  avatar:      { type: String, default: null },
  guildId:     { type: String, default: null, index: true },
  channelId:   { type: String, required: true },
  createdAt:   { type: Date, default: Date.now, index: true },
});

CommandHistorySchema.index({ guildId: 1, createdAt: -1 });

export const CommandHistoryModel: Model<ICommandHistoryDoc> =
  mongoose.models.CommandHistory ||
  mongoose.model<ICommandHistoryDoc>("CommandHistory", CommandHistorySchema);
