import { AppDataSource } from './data-source';

/**
 * Standalone TypeORM migration runner for production container startup.
 */
async function runMigrations(): Promise<void> {
  try {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log(`Executed ${migrations.length} migration(s).`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void runMigrations();
