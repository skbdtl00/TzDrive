const path = require('path');
require('dotenv').config();

const storageBackend = process.env.STORAGE_BACKEND || 'local';
if (!['local', 's3'].includes(storageBackend)) {
  throw new Error('STORAGE_BACKEND must be either "local" or "s3"');
}

const localStoragePath =
  process.env.LOCAL_STORAGE_PATH ||
  path.join(process.cwd(), 'storage');

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'tzdrive-secret',
  adminSecret: process.env.ADMIN_SECRET || 'tzdrive-admin',
  storageBackend,
  localStoragePath,
  defaultUserLimitBytes: parseInt(process.env.DEFAULT_USER_LIMIT_BYTES || `${10 * 1024 * 1024 * 1024}`, 10), // 10GB
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || `${500 * 1024 * 1024}`, 10), // 500MB
  s3: {
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
};

if (storageBackend === 's3') {
  const required = ['region', 'bucket', 'accessKeyId', 'secretAccessKey'];
  const missing = required.filter((k) => !config.s3[k]);
  if (missing.length) {
    throw new Error(
      `Missing required S3 configuration values: ${missing.join(', ')}`
    );
  }
}

module.exports = config;
