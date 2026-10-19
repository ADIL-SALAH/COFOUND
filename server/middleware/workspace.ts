import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from './auth.ts';
import { Workspace, IWorkspace } from '../models/Workspace.ts';
import { WorkspaceMembership, IWorkspaceMembership } from '../models/WorkspaceMembership.ts';

export interface WorkspaceRequest extends AuthRequest {
  workspace?: IWorkspace;
  membership?: IWorkspaceMembership;
}

export async function requireWorkspaceMember(
  req: WorkspaceRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId =
      req.headers['x-workspace-id'] ||
      req.params.workspaceId ||
      req.query.workspaceId ||
      req.body.workspaceId;

    if (!workspaceId || typeof workspaceId !== 'string') {
      res.status(400).json({ error: 'Workspace ID is required (header x-workspace-id or parameter).' });
      return;
    }

    if (!Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace ID format.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const membership = await WorkspaceMembership.findOne({
      workspace: new Types.ObjectId(workspaceId),
      user: req.user._id,
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied. You are not a member of this workspace.' });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }

    req.workspace = workspace;
    req.membership = membership;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify workspace membership.' });
  }
}
