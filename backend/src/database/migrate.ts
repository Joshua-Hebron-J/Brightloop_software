import fs from 'fs';
import path from 'path';
import { getDb } from './db';

export function runMigrations(dbPath?: string): void {
  const db = getDb(dbPath);

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  let migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');
  }
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found at', migrationsDir);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = db.prepare('SELECT id FROM migrations WHERE name = ?').get(file);
    if (!existing) {
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Execute migration script
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)')
          .run(file, new Date().toISOString());
        if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Migration violates foreign keys');
        db.exec('COMMIT;');
        db.exec('PRAGMA foreign_keys = ON;');
        console.log(`Successfully applied: ${file}`);
      } catch (err) {
        db.exec('ROLLBACK;');
        db.exec('PRAGMA foreign_keys = ON;');
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    } else {
      // Already applied
    }
  }
}

// When executed directly
if (require.main === module) {
  try {
    runMigrations();
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
