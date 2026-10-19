import { Types } from 'mongoose';
import { SequenceCounter } from '../models/SequenceCounter.ts';

export async function generateSequenceId(
  workspaceId: Types.ObjectId | string,
  prefix: 'PAY' | 'TXN' | 'SETTLE'
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const sequenceKey = `${prefix}_${currentYear}`;

  const counter = await SequenceCounter.findOneAndUpdate(
    {
      workspace: new Types.ObjectId(workspaceId.toString()),
      sequenceKey,
    },
    { $inc: { seq: 1 } },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const seqNumber = counter.seq;
  const padded = String(seqNumber).padStart(4, '0');
  return `${prefix}-${currentYear}-${padded}`;
}
