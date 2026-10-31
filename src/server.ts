import { createApp } from './app';
import { ENV } from './config/env';
import { runMigrations } from './database/migrate';
import { seedDatabase } from './database/seed';
import { getDb } from './database/db';

async function bootstrap() {
  try {
    console.log('--- Initializing Brightloop Platform Engine ---');
    console.log(`Environment: ${ENV.NODE_ENV}`);
    console.log(`Database: ${ENV.DATABASE_PATH}`);

    // Ensure database migrations are executed
    runMigrations();

    // Auto-seed if database has no users
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
    if (!userCount || userCount.c === 0) {
      console.log('Database is empty. Populating initial seed data...');
      seedDatabase();
    }

    const app = createApp();

    const server = app.listen(ENV.PORT, () => {
      console.log(`Brightloop server running on http://localhost:${ENV.PORT}`);
      console.log(`Healthcheck: http://localhost:${ENV.PORT}/api/health`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}
