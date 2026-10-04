import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { authMiddleware } from './server/auth.js';
import authRoutes from './server/routes/authRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import doctorRoutes from './server/routes/doctorRoutes.js';
import compounderRoutes from './server/routes/compounderRoutes.js';
import publicRoutes from './server/routes/publicRoutes.js';
import appointmentRoutes from './server/routes/appointmentRoutes.js';
import hospitalIntegrationRoutes from './server/routes/hospitalIntegrationRoutes.js';
import adminHospitalRoutes from './server/routes/adminHospitalRoutes.js';
import testRoutes from './server/routes/testRoutes.js';
import uploadRoutes from './server/routes/uploadRoutes.js';
import {
  getDoctorForMeta,
  getBaseUrl,
  buildDoctorMetaData,
  buildFallbackDoctorMetaData,
  injectDoctorMetaIntoHtml
} from './server/doctorMeta.js';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  // Initialize Database Connection Pool
  await initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust proxy headers (LiteSpeed / Passenger / Cloudflare / Cloud Run reverse proxies)
  app.set('trust proxy', true);

  // Enable CORS for Android Capacitor & Web
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      // Allow capacitor schemes, localhost, and production domains
      const configuredHost = (process.env.APP_URL || process.env.VITE_APP_URL || '')
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split(':')[0];

      if (
        origin.startsWith('capacitor://') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        (configuredHost && origin.includes(configuredHost)) ||
        origin.includes('dakatarseial.bd') ||
        origin.includes('run.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for API consumers
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));

  // Global Middlewares with increased size limit for photo uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());
  app.use(authMiddleware);

  // Serve static uploaded photos
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Daktar Serial MVP', timestamp: new Date().toISOString() });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/hospitals', adminHospitalRoutes);
  app.use('/api/integration/hospital', hospitalIntegrationRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/compounder', compounderRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/upload', uploadRoutes);
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
    app.get(['/assets/*', '/*.*'], (req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    // Explicit Doctor Profile route for immediate OpenGraph metadata injection in production
    app.get(['/doctor/:slugOrId', '/doctor-profile/:slugOrId'], async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const finalHtml = await renderHtmlWithMetadata(req, rawHtml, req.params.slugOrId);
          res.status(200).type('text/html; charset=utf-8').send(finalHtml);
        } catch (err) {
          res.sendFile(indexPath);
        }
      } else {
        res.status(500).type('text/plain').send('Build artifact index.html not found');
      }
    });

    // SPA fallback: return index.html for all page routes with doctor Open Graph metadata
    app.get('*', async (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const finalHtml = await renderHtmlWithMetadata(req, rawHtml);
          res.status(200).type('text/html; charset=utf-8').send(finalHtml);
        } catch (err) {
          res.sendFile(indexPath);
        }
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

    // Explicit Doctor Profile route for immediate OpenGraph metadata injection in dev
    app.get(['/doctor/:slugOrId', '/doctor-profile/:slugOrId'], async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const finalHtml = await renderHtmlWithMetadata(req, template, req.params.slugOrId);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });

    // Fallback for HTML entry point in dev
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const finalHtml = await renderHtmlWithMetadata(req, template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });
  }

  /**
   * Detect doctor profile URLs and inject dynamic Open Graph / Twitter metadata into the HTML
   */
  async function renderHtmlWithMetadata(req: express.Request, htmlTemplate: string, explicitSlugOrId?: string): Promise<string> {
    try {
      let slugOrId = explicitSlugOrId;
      if (!slugOrId) {
        const match = req.originalUrl.split('?')[0].match(/^\/(?:doctor|doctor-profile)\/([^/?#]+)/i);
        if (match && match[1]) {
          slugOrId = match[1];
        }
      }

      if (slugOrId) {
        const decoded = decodeURIComponent(slugOrId);
        const doctor = await getDoctorForMeta(decoded);
        const baseUrl = getBaseUrl(req);

        if (doctor) {
          const metaData = buildDoctorMetaData(doctor, baseUrl, decoded);
          return injectDoctorMetaIntoHtml(htmlTemplate, metaData);
        } else {
          // If doctor record is not found in database, generate doctor metadata from slug
          const fallbackMeta = buildFallbackDoctorMetaData(decoded, baseUrl);
          return injectDoctorMetaIntoHtml(htmlTemplate, fallbackMeta);
        }
      }
    } catch (err) {
      console.error('[SEO Meta] Error injecting doctor metadata:', err);
    }
    return htmlTemplate;
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
