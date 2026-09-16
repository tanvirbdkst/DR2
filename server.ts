import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { authMiddleware } from './server/auth.js';
import authRoutes from './server/routes/authRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import doctorRoutes from './server/routes/doctorRoutes.js';
import publicRoutes from './server/routes/publicRoutes.js';
import appointmentRoutes from './server/routes/appointmentRoutes.js';
import testRoutes from './server/routes/testRoutes.js';

const __filename = typeof fileURLToPath === 'function' && import.meta?.url ? fileURLToPath(import.meta.url) : '';
const currentDir = typeof __dirname !== 'undefined' ? __dirname : (__filename ? path.dirname(__filename) : process.cwd());

async function startServer() {
  // Initialize Database Connection Pool
  await initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Global Middlewares
  app.use(express.json());
  app.use(cookieParser());
  app.use(authMiddleware);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Daktar Serial MVP', timestamp: new Date().toISOString() });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/test', testRoutes);

  // API 404 handler: guarantees unmatched API routes return JSON, not HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // Determine if running in production mode or as bundled standalone server
  const hasLocalIndex = fs.existsSync(path.join(currentDir, 'index.html'));
  const hasCwdDistIndex = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || (currentDir !== process.cwd() && hasLocalIndex);

  if (isProduction) {
    // Resolve absolute path to dist directory containing index.html & assets/
    const distPath = (currentDir !== process.cwd() && hasLocalIndex)
      ? currentDir
      : (hasCwdDistIndex ? path.join(process.cwd(), 'dist') : process.cwd());

    console.log(`[Production] Serving static files from: ${distPath}`);

    // Serve static files (JS, CSS, images, etc.)
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: false,
    }));

    // If an asset was requested (e.g. /assets/*.js, *.css) but not found by express.static,
    // return 404 text instead of index.html.
    // Returning index.html for JS/CSS causes browser MIME-type mismatch crashes & white pages!
    app.get(['/assets/*', '/*.*'], (req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    // SPA fallback: return index.html for all page routes
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).type('text/plain').send('Build artifact index.html not found');
      }
    });
  } else {
    // Vite middleware for dev
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for HTML entry point in dev
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Daktar Serial server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
