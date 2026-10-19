import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Task } from '../models/Task.ts';
import { Goal } from '../models/Goal.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/tasks
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const { goalId } = req.query;

    const query: any = { workspace: workspace._id };
    if (goalId && typeof goalId === 'string') {
      query.goal = new Types.ObjectId(goalId);
    }

    const tasks = await Task.find(query)
      .populate('createdBy', 'name')
      .populate('completedBy', 'name')
      .sort({ createdAt: 1 });

    const result = tasks.map((t: any) => ({
      id: t._id,
      goalId: t.goal,
      title: t.title,
      isCompleted: t.isCompleted,
      createdByName: t.createdBy?.name || 'Partner',
      completedByName: t.completedBy?.name,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// POST /api/workspaces/:workspaceId/tasks
router.post('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const user = req.user!;
    const { goalId, title } = req.body;

    if (!goalId || !title || !title.trim()) {
      res.status(400).json({ error: 'Goal ID and task title are required.' });
      return;
    }

    const goal = await Goal.findOne({
      _id: new Types.ObjectId(goalId),
      workspace: workspace._id,
    });

    if (!goal) {
      res.status(404).json({ error: 'Target goal not found in this workspace.' });
      return;
    }

    const task = await Task.create({
      workspace: workspace._id,
      goal: goal._id,
      title: title.trim(),
      isCompleted: false,
      createdBy: user._id,
    });

    res.status(201).json({
      id: task._id,
      goalId: task.goal,
      title: task.title,
      isCompleted: task.isCompleted,
      createdByName: user.name,
      createdAt: task.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create task.' });
  }
});

// PATCH /api/workspaces/:workspaceId/tasks/:taskId
router.patch(
  '/:taskId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;
      const { taskId } = req.params;
      const { title, isCompleted } = req.body;

      const task = await Task.findOne({
        _id: new Types.ObjectId(taskId),
        workspace: workspace._id,
      });

      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      if (title !== undefined && title.trim()) {
        task.title = title.trim();
      }

      if (isCompleted !== undefined) {
        task.isCompleted = Boolean(isCompleted);
        if (task.isCompleted) {
          task.completedBy = user._id;
          task.completedAt = new Date();
        } else {
          task.completedBy = undefined;
          task.completedAt = undefined;
        }
      }

      await task.save();

      res.json({
        id: task._id,
        goalId: task.goal,
        title: task.title,
        isCompleted: task.isCompleted,
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update task.' });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/tasks/:taskId
router.delete(
  '/:taskId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { taskId } = req.params;

      const deleted = await Task.findOneAndDelete({
        _id: new Types.ObjectId(taskId),
        workspace: workspace._id,
      });

      if (!deleted) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      res.json({ message: 'Task deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete task.' });
    }
  }
);

export default router;
