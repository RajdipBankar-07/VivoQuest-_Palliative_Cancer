import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

export const createApp = (): Express => {
  const app = express();

  // 1. Security & CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (
          env.CORS_ALLOWED_ORIGINS.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy blocks access from origin ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 2. Request Parsers
  // Large files are uploaded directly to S3 via presigned URLs; small JSON limit protects against DoS
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. Sanitized Request Logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (env.NODE_ENV !== 'test') {
      const sanitizedUrl = req.originalUrl.split('?')[0];
      console.log(`[API ${req.method}] ${sanitizedUrl} - ${new Date().toISOString()}`);
    }
    next();
  });

  // 4. API Routes
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
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/visits', fieldVisitRoutes);
  app.use('/api/v1/patients', patientRoutes);

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
