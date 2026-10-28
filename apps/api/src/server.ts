import http from 'http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/environment.js';
import { seedServicesIfEmpty } from './services/serviceCatalogService.js';

const startServer = async () => {
  console.log('----------------------------------------------------');
  console.log(`[VivoQuest API] Initializing in ${env.NODE_ENV} mode...`);
  console.log('----------------------------------------------------');

  // Connect to MongoDB Atlas or Local MongoDB
  await connectDatabase();

  // Seed default 6 canonical healthcare services if DB empty
  await seedServicesIfEmpty();

  const app = createApp();
  const server = http.createServer(app);

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[VivoQuest API] Port ${env.PORT} is already in use by another running instance.`);
      console.error(`[VivoQuest API] To free port ${env.PORT}, run: .\\stop_all.bat`);
      console.error(`[VivoQuest API] Or run in PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${env.PORT}).OwningProcess -Force\n`);
    } else {
      console.error('[VivoQuest API] Server runtime error:', err);
    }
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    console.log(`[VivoQuest API] Listening on port ${env.PORT}`);
    console.log(`[VivoQuest API] Health check: ${env.API_BASE_URL}/api/v1/health`);
    console.log(`[VivoQuest API] Services directory: ${env.API_BASE_URL}/api/v1/services`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[VivoQuest API] ${signal} signal received. Closing HTTP server and database...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('[VivoQuest API] Server and MongoDB connection safely terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('[VivoQuest API] Fatal startup error:', err);
  process.exit(1);
});
