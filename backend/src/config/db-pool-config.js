const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const parseDatabaseUrl = (connectionString) => {
  try {
    return new URL(connectionString);
  } catch (error) {
    return null;
  }
};

const isSupabaseHost = (hostname = '') => {
  const host = hostname.toLowerCase();
  return host.includes('supabase.co') || host.includes('supabase.com');
};

const isLocalHost = (hostname = '') => LOCAL_DATABASE_HOSTS.has(hostname.toLowerCase());

const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

const shouldUseSsl = ({ connectionString = '', host = '' } = {}) => {
  const configuredSsl = parseBoolean(process.env.DB_SSL);
  const databaseUrl = parseDatabaseUrl(connectionString);
  if (configuredSsl === true) return true;

  if (databaseUrl) {
    const sslMode = databaseUrl.searchParams.get('sslmode');
    if (sslMode && !['disable', 'allow'].includes(sslMode.toLowerCase())) {
      return true;
    }

    if (isSupabaseHost(databaseUrl.hostname) && !isLocalHost(databaseUrl.hostname)) {
      return true;
    }
  }

  if (isSupabaseHost(host) && !isLocalHost(host)) {
    return true;
  }

  return false;
};

const getSslConfig = ({ connectionString = '', host = '' } = {}) => {
  if (!shouldUseSsl({ connectionString, host })) return undefined;

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED) === true;
  return { rejectUnauthorized };
};

const getPoolConfig = () => {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  const hasConnectionString = Boolean(connectionString);
  const host = getEnvValue('DB_HOST', 'PGHOST') || 'localhost';
  const database = getEnvValue('DB_NAME', 'PGDATABASE') || 'zetechverse';
  const user = getEnvValue('DB_USER', 'PGUSER') || 'postgres';
  const password = getEnvValue('DB_PASSWORD', 'PGPASSWORD');
  const port = toInt(getEnvValue('DB_PORT', 'PGPORT'), 5432);
  const ssl = getSslConfig({ connectionString, host });
  const isHostedPostgres = hasConnectionString || (isSupabaseHost(host) && !isLocalHost(host));
  const max = toInt(process.env.DB_POOL_MAX, isHostedPostgres ? 5 : 20);
  const idleTimeoutMillis = toInt(process.env.DB_IDLE_TIMEOUT_MS, 30000);
  const connectionTimeoutMillis = toInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10000);
  const keepAlive = parseBoolean(process.env.DB_KEEP_ALIVE) !== false;
  const keepAliveInitialDelayMillis = toInt(
    process.env.DB_KEEP_ALIVE_INITIAL_DELAY_MS,
    10000
  );

  const sharedConfig = {
    ...(ssl ? { ssl } : {}),
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    keepAlive,
    keepAliveInitialDelayMillis,
  };

  if (hasConnectionString) {
    return {
      connectionString,
      ...sharedConfig,
    };
  }

  return {
    user,
    host,
    database,
    password,
    port,
    ...sharedConfig,
  };
};

const isSupabaseConnection = () => {
  const databaseUrl = parseDatabaseUrl((process.env.DATABASE_URL || '').trim());
  return Boolean(
    (databaseUrl && isSupabaseHost(databaseUrl.hostname))
    || isSupabaseHost(getEnvValue('DB_HOST', 'PGHOST'))
  );
};

module.exports = {
  getPoolConfig,
  isSupabaseConnection,
  toInt,
};
