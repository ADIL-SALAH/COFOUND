import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './server/db/connection.ts';
import { triggerDebouncedBackup } from './server/services/persistenceService.ts';

// Import route modules
import authRoutes from './server/routes/auth.ts';
import workspaceRoutes from './server/routes/workspaces.ts';
import memberRoutes from './server/routes/members.ts';
import goalRoutes from './server/routes/goals.ts';
import taskRoutes from './server/routes/tasks.ts';
import expenseRoutes from './server/routes/expenses.ts';
import walletRoutes from './server/routes/wallets.ts';
import transactionRoutes from './server/routes/transactions.ts';
import reimbursementRoutes from './server/routes/reimbursements.ts';
import dashboardRoutes from './server/routes/dashboard.ts';
import devRoutes from './server/routes/dev.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Connect to persistent MongoDB database
  await connectDB();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auto-backup hook on mutation requests
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          triggerDebouncedBackup(800);
        }
      });
    }
    next();
  });

  // API Route registrations
  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/workspaces/:workspaceId/members', memberRoutes);
  app.use('/api/workspaces/:workspaceId/goals', goalRoutes);
  app.use('/api/workspaces/:workspaceId/tasks', taskRoutes);
  app.use('/api/workspaces/:workspaceId/expenses', expenseRoutes);
  app.use('/api/workspaces/:workspaceId/wallets', walletRoutes);
  app.use('/api/workspaces/:workspaceId/transactions', transactionRoutes);
  app.use('/api/workspaces/:workspaceId/reimbursements', reimbursementRoutes);
  app.use('/api/workspaces/:workspaceId/dashboard', dashboardRoutes);
  app.use('/api/dev', devRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (!isProd) {
    // Mount Vite dev server middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built frontend assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoFound Server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
