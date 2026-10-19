import mongoose, { Schema, Document, Types } from 'mongoose';

export type WorkspaceRole = 'owner' | 'member';

export interface IWorkspaceMembership extends Document {
  workspace: Types.ObjectId;
  user: Types.ObjectId;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMembershipSchema = new Schema<IWorkspaceMembership>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceMembershipSchema.index({ workspace: 1, user: 1 }, { unique: true });

export const WorkspaceMembership = mongoose.model<IWorkspaceMembership>(
  'WorkspaceMembership',
  WorkspaceMembershipSchema
);
