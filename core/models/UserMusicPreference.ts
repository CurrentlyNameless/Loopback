import mongoose, { Schema } from "mongoose";

export interface IUserMusicPreference {
  userId: string;
  volume: number;
  autoplay?: boolean;
  preferredEngine?: string;
  updatedAt?: Date;
}

const UserMusicPreferenceSchema = new Schema<IUserMusicPreference>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    volume: { type: Number, required: true, default: 80, min: 1, max: 150 },
    autoplay: { type: Boolean, default: false },
    preferredEngine: { type: String, default: "scsearch" },
  },
  { timestamps: true }
);

export const UserMusicPreferenceModel =
  mongoose.models.UserMusicPreference ||
  mongoose.model<IUserMusicPreference>(
    "UserMusicPreference",
    UserMusicPreferenceSchema
  );
