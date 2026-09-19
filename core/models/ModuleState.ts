import mongoose, { Schema } from 'mongoose';

export interface IModuleState {
  name: string;
  enabled: boolean;
  updatedAt?: Date;
}

const ModuleStateSchema = new Schema<IModuleState>({
  name: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, required: true, default: true },
}, { timestamps: true });

export const ModuleStateModel = mongoose.models.ModuleState || mongoose.model<IModuleState>('ModuleState', ModuleStateSchema);
