import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/environment.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: 'ok',
    service: 'vivoquest-marketplace-api',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: {
      provider: 'MongoDB Atlas / Local',
      connected: dbStatus.connected,
      host: dbStatus.host || 'unknown',
      name: dbStatus.name || env.MONGODB_DB_NAME,
      readyState: dbStatus.readyState,
    },
    storage: {
      provider: env.STORAGE_PROVIDER,
      bucket: env.AWS_S3_BUCKET,
      region: env.AWS_REGION,
      isMock: env.AWS_ACCESS_KEY_ID === 'mock_aws_access_key' || !env.AWS_ACCESS_KEY_ID,
    },
  });
});

export const healthRoutes = router;
