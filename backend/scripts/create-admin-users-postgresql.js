require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Content Administrator';

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_FULL_NAME = process.env.SUPERADMIN_FULL_NAME || 'System Administrator';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

const isStrongPassword = (password) => {
  if (typeof password !== 'string') return false;
  return password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
};

const requireEnv = (label, value) => {
  if (!value) {
    throw new Error(`${label} is required to create admin users.`);
  }
};

const prepareUser = async ({
  email,
  password,
  username,
  fullName,
  role
}) => {
  requireEnv(`${role.toUpperCase()}_EMAIL`, email);
  requireEnv(`${role.toUpperCase()}_PASSWORD`, password);

  if (!isStrongPassword(password)) {
    throw new Error(`${role.toUpperCase()}_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol.`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return {
    email,
    username,
    passwordHash,
    fullName,
    role
  };
};

const getPoolConfig = () => {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
  if (connectionString) {
    return {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'zetechverse',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
};

// PostgreSQL connection
const pool = new Pool(getPoolConfig());

console.log('Creating admin users...');

const getRow = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows[0];
  } finally {
    client.release();
  }
};

const run = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount;
  } finally {
    client.release();
  }
};

const resolveUsername = async (email, desiredUsername) => {
  const existingByEmail = await getRow('SELECT id, username FROM users WHERE email = $1', [email]);
  if (existingByEmail) {
    if (existingByEmail.username === desiredUsername) return desiredUsername;
    const conflict = await getRow('SELECT id FROM users WHERE username = $1', [desiredUsername]);
    if (!conflict) return desiredUsername;
    return existingByEmail.username;
  }

  let candidate = desiredUsername;
  let counter = 0;
  while (await getRow('SELECT id FROM users WHERE username = $1', [candidate])) {
    counter += 1;
    candidate = `${desiredUsername}_${counter}`;
  }
  return candidate;
};

async function createAdminUsers() {
  try {
    const usersToCreate = [];

    if (ADMIN_EMAIL || ADMIN_PASSWORD) {
      usersToCreate.push(await prepareUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        username: ADMIN_USERNAME,
        fullName: ADMIN_FULL_NAME,
        role: 'admin'
      }));
    }

    if (SUPERADMIN_EMAIL || SUPERADMIN_PASSWORD) {
      usersToCreate.push(await prepareUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        username: SUPERADMIN_USERNAME,
        fullName: SUPERADMIN_FULL_NAME,
        role: 'super_admin'
      }));
    }

    if (usersToCreate.length === 0) {
      throw new Error('Provide ADMIN_EMAIL/ADMIN_PASSWORD and/or SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD to create admin users.');
    }

    for (const user of usersToCreate) {
      const resolvedUsername = await resolveUsername(user.email, user.username);
      
      // Check if user exists
      const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existingUser) {
        // Update existing user
        const updated = await run(`
          UPDATE users
          SET username = $1,
              password_hash = $2,
              full_name = $3,
              role = $4,
              is_active = true,
              email_verified = true,
              admin_status = 'approved',
              admin_requested_at = COALESCE(admin_requested_at, CURRENT_TIMESTAMP),
              admin_approved_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE email = $5
        `, [
          resolvedUsername,
          user.passwordHash,
          user.fullName,
          user.role,
          user.email
        ]);

        if (updated) {
          console.log(`Updated ${user.role} (${user.email}) with username "${resolvedUsername}".`);
        }
      } else {
        // Insert new user
        await run(`
          INSERT INTO users (
            email, username, password_hash, full_name, role, is_active, email_verified, admin_status, admin_requested_at, admin_approved_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          user.email,
          resolvedUsername,
          user.passwordHash,
          user.fullName,
          user.role,
          true,
          true,
          'approved'
        ]);
        console.log(`Inserted ${user.role} (${user.email}) with username "${resolvedUsername}".`);
      }
    }

    console.log('Created/updated admin users:');
    usersToCreate.forEach((user) => {
      console.log(`  - ${user.role} (${user.email})`);
    });
    
  } catch (error) {
    console.error('Error creating admin users:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
    console.log('Admin user creation complete.');
  }
}

createAdminUsers();

