import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Goal, Task } from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import {
  Plus,
  Check,
  Trash2,
  Edit2,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

export const GoalsTasksPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // New Goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Delete Goal confirm dialog
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Inline new task inputs per goal: { [goalId]: string }
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  // Editing task modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');

  const fetchData = async () => {
    if (!currentWorkspace) return;
    try {
      const [goalsRes, tasksRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace.id}/goals`),
        api.get(`/workspaces/${currentWorkspace.id}/tasks`),
      ]);
      setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (err) {
      console.error('Failed to fetch goals and tasks:', err);
      setGoals([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWorkspace]);

  // Goal actions
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !currentWorkspace) return;

    try {
      if (editingGoal) {
        await api.patch(`/workspaces/${currentWorkspace.id}/goals/${editingGoal.id}`, {
          name: newGoalName.trim(),
        });
      } else {
        await api.post(`/workspaces/${currentWorkspace.id}/goals`, {
          name: newGoalName.trim(),
        });
      }
      setGoalModalOpen(false);
      setNewGoalName('');
      setEditingGoal(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save goal.');
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete || !currentWorkspace) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/goals/${goalToDelete.id}`);
      setGoalToDelete(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete goal.');
    }
  };

  // Task actions
  const handleAddTask = async (goalId: string) => {
    const title = taskInputs[goalId]?.trim();
    if (!title || !currentWorkspace) return;

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/tasks`, {
        goalId,
        title,
      });
      setTaskInputs({ ...taskInputs, [goalId]: '' });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add task.');
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!currentWorkspace) return;
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t))
    );

    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
      await fetchData();
    } catch (err) {
      // Revert if error
      await fetchData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/tasks/${taskId}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete task.');
    }
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim() || !currentWorkspace) return;

    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/tasks/${editingTask.id}`, {
        title: editTaskTitle.trim(),
      });
      setEditingTask(null);
      setEditTaskTitle('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task.');
    }
  };

  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Goals & Deliverables
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lightweight shared checklists for co-founder alignment
          </p>
        </div>

        <button
          onClick={() => {
            setEditingGoal(null);
            setNewGoalName('');
            setGoalModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Goals List */}
      {safeGoals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FolderPlus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No Goals Created</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create high-level business goals (e.g. Branding, Product Sourcing, Website Development) to organize tasks with your partner.
          </p>
          <button
            onClick={() => {
              setEditingGoal(null);
              setNewGoalName('');
              setGoalModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {safeGoals.map((goal) => {
            const goalTasks = safeTasks.filter((t) => t.goalId === goal.id);
            const completedCount = goalTasks.filter((t) => t.isCompleted).length;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Goal Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      {goal.name}
                    </h2>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {completedCount} of {goalTasks.length} completed
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setNewGoalName(goal.name);
                        setGoalModalOpen(true);
                      }}
                      title="Rename goal"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setGoalToDelete(goal)}
                      title="Delete goal"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks Checklist */}
                <div className="p-4 space-y-2">
                  {goalTasks.length === 0 ? (
                    <div className="py-3 px-3 text-xs text-slate-400 italic">
                      No tasks yet. Add a task below.
                    </div>
                  ) : (
                    goalTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          {/* Completion Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                              task.isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-emerald-500 bg-white'
                            }`}
                          >
                            {task.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Task Title */}
                          <span
                            onClick={() => handleToggleTask(task)}
                            className={`text-xs cursor-pointer select-none truncate ${
                              task.isCompleted
                                ? 'line-through text-slate-400 font-normal'
                                : 'text-slate-800 font-medium'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Task Action Controls (revealed on hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setEditTaskTitle(task.title);
                            }}
                            title="Edit task title"
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete task"
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Inline Add Task Input */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Add task to "${goal.name}"...`}
                      value={taskInputs[goal.id] || ''}
                      onChange={(e) =>
                        setTaskInputs({ ...taskInputs, [goal.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTask(goal.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTask(goal.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal (Create / Edit) */}
      <Modal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title={editingGoal ? 'Rename Goal' : 'Create New Goal'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              placeholder="e.g. Product Research, Branding, Sourcing"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              {editingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveEditTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={editTaskTitle}
              onChange={(e) => setEditTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Goal Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(goalToDelete)}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message={`Are you sure you want to delete the goal "${goalToDelete?.name}"? All tasks under this goal will also be deleted.`}
        confirmLabel="Delete Goal"
        isDestructive
      />
    </div>
  );
};
