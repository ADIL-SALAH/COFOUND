import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWorkspaceInvitation extends Document {
  workspace: Types.ObjectId;
  inviteCode: string;
  role: 'owner' | 'member';
  createdBy: Types.ObjectId;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'EXPIRED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

export const WorkspaceInvitation = mongoose.model<IWorkspaceInvitation>(
  'WorkspaceInvitation',
  WorkspaceInvitationSchema
);
