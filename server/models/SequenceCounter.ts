import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISequenceCounter extends Document {
  workspace: Types.ObjectId;
  sequenceKey: string;
  seq: number;
}

const SequenceCounterSchema = new Schema<ISequenceCounter>({
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  sequenceKey: {
    type: String,
    required: true,
    index: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

SequenceCounterSchema.index({ workspace: 1, sequenceKey: 1 }, { unique: true });

export const SequenceCounter = mongoose.model<ISequenceCounter>(
  'SequenceCounter',
  SequenceCounterSchema
);
