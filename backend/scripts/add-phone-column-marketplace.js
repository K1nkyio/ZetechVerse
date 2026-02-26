const { db } = require('../src/config/db');

async function addPhoneColumn() {
  console.log('Adding phone column to marketplace_listings table if it does not exist...');

  try {
    // Check if the phone column exists
    const result = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(marketplace_listings)", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    const phoneColumnExists = result.some(column => column.name === 'phone');

    if (!phoneColumnExists) {
      console.log('Phone column does not exist, adding it...');
      
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE marketplace_listings ADD COLUMN phone VARCHAR(20)", (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Phone column added successfully!');
            resolve();
          }
        });
      });
    } else {
      console.log('Phone column already exists in the table.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

addPhoneColumn();