import dotenv from 'dotenv';
import path from 'path';

// Load .env from root workspace or local apps/api folder
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to local .env

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
  WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:3000',

  // Authentication & Security
  JWT_SECRET: process.env.JWT_SECRET || 'vivoquest_dev_jwt_secret_change_in_production_2026',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '1d',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',

  // MongoDB Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vivoquest_db',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'vivoquest_db',

  // Object Storage (AWS S3 or Compatible)
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'MOCK',
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'vivoquest-clinical-storage-dev',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID || '',
  S3_PRESIGNED_UPLOAD_TTL_SECONDS: parseInt(process.env.S3_PRESIGNED_UPLOAD_TTL_SECONDS || '900', 10),
  S3_PRESIGNED_DOWNLOAD_TTL_SECONDS: parseInt(process.env.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS || '900', 10),

  // CORS Settings
  CORS_ALLOWED_ORIGINS: [
    process.env.WEB_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
  ],

  // Rate Limiting
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10), // requests per 15 mins
  UPLOAD_RATE_LIMIT_MAX: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '20', 10), // requests per 15 mins
};
