const { Pool } = require('pg');
const { getPoolConfig, toInt } = require('./db-pool-config');

// PostgreSQL connection configuration
const pool = new Pool(getPoolConfig());


const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const verifyDatabaseConnection = async () => {
  const retryAttempts = toInt(process.env.DB_CONNECT_RETRY_ATTEMPTS, 5);
  const retryDelayMs = toInt(process.env.DB_CONNECT_RETRY_DELAY_MS, 2000);

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      console.log('Connected to PostgreSQL database.');
      return;
    } catch (error) {
      const isLastAttempt = attempt === retryAttempts;
      if (isLastAttempt) {
        console.error('Error connecting to PostgreSQL database:', error);
        return;
      }

      console.warn(
        `PostgreSQL connection attempt ${attempt}/${retryAttempts} failed: ${error.message}. Retrying in ${retryDelayMs}ms...`
      );
      await wait(retryDelayMs);
    } finally {
      if (client) client.release();
    }
  }
};

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

verifyDatabaseConnection();

const stripTrailingSemicolon = (sql) => sql.trim().replace(/;$/, '');

const isInsertQuery = (sql) => /^\s*insert\s+into\s+/i.test(sql);

const hasReturningClause = (sql) => /\breturning\b/i.test(sql);

// Convert sqlite-style placeholders (?) into PostgreSQL placeholders ($1, $2, ...).
const normalizeSql = (sql) => {
  if (typeof sql !== 'string' || !sql.includes('?')) return sql;

  let result = '';
  let placeholderIndex = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const current = sql[i];
    const next = sql[i + 1];

    if (current === "'" && !inDoubleQuote) {
      result += current;
      if (inSingleQuote && next === "'") {
        result += next;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (current === '"' && !inSingleQuote) {
      result += current;
      if (inDoubleQuote && next === '"') {
        result += next;
        i += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (current === '?' && !inSingleQuote && !inDoubleQuote) {
      placeholderIndex += 1;
      result += `$${placeholderIndex}`;
      continue;
    }

    result += current;
  }

  return result;
};

const query = async (sql, params = []) => {
  const normalizedSql = normalizeSql(sql);
  return pool.query(normalizedSql, params);
};

// Helper function to run queries with promises.
const run = async (sql, params = []) => {
  const normalizedSql = normalizeSql(sql);
  const executableSql = isInsertQuery(normalizedSql) && !hasReturningClause(normalizedSql)
    ? `${stripTrailingSemicolon(normalizedSql)} RETURNING id`
    : normalizedSql;

  const result = await pool.query(executableSql, params);
  return { id: result.rows[0]?.id, changes: result.rowCount };
};

// Helper function to get single row.
const get = async (sql, params = []) => {
  const result = await query(sql, params);
  return result.rows[0];
};

// Helper function to get all rows.
const all = async (sql, params = []) => {
  const result = await query(sql, params);
  return result.rows;
};

const resolveCallbackArgs = (params, callback) => {
  if (typeof params === 'function') {
    return { args: [], cb: params };
  }

  return { args: Array.isArray(params) ? params : [], cb: callback };
};

// Backward-compatible db object for callback-based callers.
const db = {
  run(sql, params, callback) {
    const { args, cb } = resolveCallbackArgs(params, callback);
    run(sql, args)
      .then((result) => {
        if (typeof cb === 'function') {
          cb.call({ lastID: result.id, changes: result.changes }, null);
        }
      })
      .catch((error) => {
        if (typeof cb === 'function') cb(error);
      });
  },

  get(sql, params, callback) {
    const { args, cb } = resolveCallbackArgs(params, callback);
    get(sql, args)
      .then((row) => {
        if (typeof cb === 'function') cb(null, row);
      })
      .catch((error) => {
        if (typeof cb === 'function') cb(error);
      });
  },

  all(sql, params, callback) {
    const { args, cb } = resolveCallbackArgs(params, callback);
    all(sql, args)
      .then((rows) => {
        if (typeof cb === 'function') cb(null, rows);
      })
      .catch((error) => {
        if (typeof cb === 'function') cb(error);
      });
  },

  close(callback) {
    pool.end()
      .then(() => {
        if (typeof callback === 'function') callback(null);
      })
      .catch((error) => {
        if (typeof callback === 'function') callback(error);
      });
  }
};

module.exports = {
  pool,
  query,
  run,
  get,
  all,
  db
};
