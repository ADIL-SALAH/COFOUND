import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Goal } from '../models/Goal.ts';
import { Task } from '../models/Task.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/goals
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;

    const goals = await Goal.find({ workspace: workspace._id }).sort({ createdAt: 1 });
    const tasks = await Task.find({ workspace: workspace._id });

    const result = goals.map((g) => {
      const goalTasks = tasks.filter((t) => t.goal.toString() === g._id.toString());
      const completedCount = goalTasks.filter((t) => t.isCompleted).length;
      return {
        id: g._id,
        name: g.name,
        totalTasks: goalTasks.length,
        completedTasks: completedCount,
        createdAt: g.createdAt,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch goals.' });
  }
});

// POST /api/workspaces/:workspaceId/goals
router.post('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const user = req.user!;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Goal name is required.' });
      return;
    }

    const goal = await Goal.create({
      workspace: workspace._id,
      name: name.trim(),
      createdBy: user._id,
    });

    res.status(201).json({
      id: goal._id,
      name: goal.name,
      totalTasks: 0,
      completedTasks: 0,
      createdAt: goal.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create goal.' });
  }
});

// PATCH /api/workspaces/:workspaceId/goals/:goalId
router.patch(
  '/:goalId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { goalId } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Goal name is required.' });
        return;
      }

      const goal = await Goal.findOneAndUpdate(
        { _id: new Types.ObjectId(goalId), workspace: workspace._id },
        { name: name.trim() },
        { new: true }
      );

      if (!goal) {
        res.status(404).json({ error: 'Goal not found.' });
        return;
      }

      res.json({
        id: goal._id,
        name: goal.name,
        updatedAt: goal.updatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update goal.' });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/goals/:goalId
router.delete(
  '/:goalId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { goalId } = req.params;

      const goal = await Goal.findOneAndDelete({
        _id: new Types.ObjectId(goalId),
        workspace: workspace._id,
      });

      if (!goal) {
        res.status(404).json({ error: 'Goal not found.' });
        return;
      }

      // Delete associated tasks
      await Task.deleteMany({
        goal: new Types.ObjectId(goalId),
        workspace: workspace._id,
      });

      res.json({ message: 'Goal and all associated tasks deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete goal.' });
    }
  }
);

export default router;
