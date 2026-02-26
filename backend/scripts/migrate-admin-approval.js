const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database.');
});

const addColumnIfMissing = async (columnName, columnDef) => {
  const columns = await new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(users);", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map((row) => row.name));
    });
  });

  if (columns.includes(columnName)) {
    return false;
  }

  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN ${columnDef};`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return true;
};

async function migrate() {
  try {
    console.log(`Database path: ${dbPath}`);

    const added = [];
    if (await addColumnIfMissing('admin_status', "admin_status TEXT DEFAULT 'approved'")) added.push('admin_status');
    if (await addColumnIfMissing('admin_requested_at', 'admin_requested_at DATETIME')) added.push('admin_requested_at');
    if (await addColumnIfMissing('admin_approved_at', 'admin_approved_at DATETIME')) added.push('admin_approved_at');
    if (await addColumnIfMissing('admin_approved_by', 'admin_approved_by INTEGER')) added.push('admin_approved_by');

    console.log(added.length ? `Added columns: ${added.join(', ')}` : 'No columns added.');

    await new Promise((resolve, reject) => {
      db.run("CREATE INDEX IF NOT EXISTS idx_users_admin_status ON users(admin_status);", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE users
        SET admin_status = 'approved',
            admin_approved_at = COALESCE(admin_approved_at, CURRENT_TIMESTAMP)
        WHERE role IN ('admin', 'super_admin')
          AND (admin_status IS NULL OR admin_status = '')
        `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
      else console.log('Database connection closed.');
    });
  }
}

migrate();
