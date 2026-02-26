const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'zetechverse.db');

const db = new sqlite3.Database(dbPath);

const run = (sql) =>
  new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const all = (sql) =>
  new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const get = (sql) =>
  new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const count = async (tableName) => {
  const row = await get(`SELECT COUNT(*) AS c FROM ${tableName}`);
  return row?.c ?? 0;
};

(async () => {
  try {
    await run('PRAGMA foreign_keys = ON');

    const tables = (await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).map(
      (r) => r.name,
    );

    const has = (name) => tables.includes(name);

    if (!has('events_comments')) {
      console.log('DB:', dbPath);
      console.log('No events_comments table found. Nothing to purge.');
      return;
    }

    const likesCandidates = [
      'events_comments_likes',
      'event_comments_likes',
      'events_comment_likes',
      'event_comment_likes',
    ];

    const likesTable = likesCandidates.find(has) || null;

    const beforeComments = await count('events_comments');
    const beforeLikes = likesTable ? await count(likesTable) : 0;

    await run('BEGIN');
    if (likesTable) await run(`DELETE FROM ${likesTable}`);
    await run('DELETE FROM events_comments');
    await run('COMMIT');

    const afterComments = await count('events_comments');
    const afterLikes = likesTable ? await count(likesTable) : 0;

    console.log('DB:', dbPath);
    console.log('Purged events_comments:', beforeComments, '->', afterComments);
    if (likesTable) {
      console.log(`Purged ${likesTable}:`, beforeLikes, '->', afterLikes);
    } else {
      console.log('No event comment likes table found; skipped likes purge.');
    }
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch (_) {
      // ignore
    }

    console.error('Purge failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
