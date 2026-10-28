import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/environment.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const isHealthy = dbStatus.connected && dbStatus.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'vivoquest-marketplace-api',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
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

/**
 * GET /health/ready - Kubernetes / Cloud Readiness Probe
 */
router.get('/health/ready', (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const isReady = dbStatus.connected && dbStatus.readyState === 1;

  if (isReady) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not_ready', databaseReadyState: dbStatus.readyState });
  }
});

export const healthRoutes = router;
