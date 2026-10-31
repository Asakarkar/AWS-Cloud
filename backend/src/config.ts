import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toNumber = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value?: string) => value === 'true' || value === '1';

export const config = {
  port: toNumber(process.env.PORT) ?? 4000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  primaryDb: {
    host: process.env.PRIMARY_DB_HOST ?? '',
    port: toNumber(process.env.PRIMARY_DB_PORT) ?? 3306,
    user: process.env.PRIMARY_DB_USER ?? '',
    password: process.env.PRIMARY_DB_PASSWORD ?? '',
    database: process.env.PRIMARY_DB_NAME ?? 'readdemo',
    ssl: toBoolean(process.env.PRIMARY_DB_SSL)
  },
  replicaDb: {
    host: process.env.REPLICA_DB_HOST ?? '',
    port: toNumber(process.env.REPLICA_DB_PORT) ?? 3306,
    user: process.env.REPLICA_DB_USER ?? '',
    password: process.env.REPLICA_DB_PASSWORD ?? '',
    database: process.env.REPLICA_DB_NAME ?? 'readdemo',
    ssl: toBoolean(process.env.REPLICA_DB_SSL)
  },
  aws: {
    region: process.env.AWS_REGION ?? '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    replicaInstanceIdentifier: process.env.AWS_REPLICA_INSTANCE_IDENTIFIER ?? ''
  }
};

export const databaseConfiguration = {
  primaryConfigured: Boolean(config.primaryDb.host && config.primaryDb.user),
  replicaConfigured: Boolean(config.replicaDb.host && config.replicaDb.user)
};
