import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/environment.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { serviceRoutes } from './routes/serviceRoutes.js';
import { bookingRoutes } from './routes/bookingRoutes.js';
import { uploadRoutes } from './routes/uploadRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';
import { doctorRoutes } from './routes/doctorRoutes.js';
import { appointmentRoutes } from './routes/appointmentRoutes.js';
import { hospitalRoutes } from './routes/hospitalRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { productRoutes } from './routes/productRoutes.js';
import { fieldVisitRoutes } from './routes/fieldVisitRoutes.js';
import { patientRoutes } from './routes/patientRoutes.js';
import { professionalRoutes } from './routes/professionalRoutes.js';
import { supplierPortalRoutes } from './routes/supplierPortalRoutes.js';
import { adminMarketplaceRoutes } from './routes/adminMarketplaceRoutes.js';
import { financeRouter } from './routes/financeRoutes.js';

import { securityHeaders } from './middleware/securityHeaders.js';
import { mongoSanitize } from './middleware/mongoSanitize.js';

export const createApp = (): Express => {
  const app = express();

  // Disable server identification fingerprint
  app.disable('x-powered-by');

  // 1. HTTP Security Headers
  app.use(securityHeaders);

  // 2. Security & CORS
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile native apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');

      // 1. Explicitly configured origins (from env.CORS_ALLOWED_ORIGINS)
      if (env.CORS_ALLOWED_ORIGINS.includes(cleanOrigin)) {
        return callback(null, true);
      }

      // 2. In development or test mode, permit localhost, 127.0.0.1, and private LAN IP ranges
      if (env.NODE_ENV !== 'production') {
        try {
          const url = new URL(cleanOrigin);
          const hostname = url.hostname;

          if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '10.151.164.41' ||
            /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
            /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
          ) {
            return callback(null, true);
          }
        } catch {
          // Malformed origin URL
        }
      }

      // Reject cleanly without crashing Express error handler
      if (env.NODE_ENV !== 'test') {
        console.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));


  // 3. Request Parsers & Input Sanitization
  // Large files are uploaded directly to S3 via presigned URLs; small JSON limit protects against DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Prevent NoSQL / MongoDB operator injection across body, query, and params
  app.use(mongoSanitize);

  // 4. Sanitized Request Logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (env.NODE_ENV !== 'test') {
      const sanitizedUrl = req.originalUrl.split('?')[0];
      console.log(`[API ${req.method}] ${sanitizedUrl} - ${new Date().toISOString()}`);
    }
    next();
  });

  // 5. Static Product & Medical Assets
  const possibleAssetDirs = [
    path.resolve(process.cwd(), 'frontend/public/assets'),
    path.resolve(process.cwd(), '../frontend/public/assets'),
    path.resolve(process.cwd(), '../../frontend/public/assets'),
  ];
  for (const assetDir of possibleAssetDirs) {
    if (fs.existsSync(assetDir)) {
      app.use('/assets', express.static(assetDir));
      break;
    }
  }

  // 6. Health & Diagnostic Probes (Root level for ALB / container readiness)
  app.use('/', healthRoutes);

  // 6. API v1 Routes
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/services', serviceRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/uploads', uploadRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/hospitals', hospitalRoutes);
  app.use('/api/v1/admin/finances', financeRouter);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/visits', fieldVisitRoutes);
  app.use('/api/v1/patients', patientRoutes);
  app.use('/api/v1/professionals', professionalRoutes);
  app.use('/api/v1/supplier', supplierPortalRoutes);
  app.use('/api/v1/admin/marketplace', adminMarketplaceRoutes);

  // 5. Mock Storage Handler (For local testing without AWS S3)
  app.put('/api/v1/mock-storage/upload/:fileId', express.raw({ type: '*/*', limit: '20mb' }), (req, res) => {
    res.status(200).json({
      success: true,
      message: 'MOCK_STORAGE: Object payload accepted and simulated successfully',
      fileId: req.params.fileId,
      bytesReceived: req.body ? req.body.length : 0,
    });
  });

  // 6. 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist`,
      },
    });
  });

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
