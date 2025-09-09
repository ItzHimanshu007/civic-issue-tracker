const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'civic_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get migrations directory
    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found');
      return;
    }

    // Read all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Check which migrations have been applied
    const appliedResult = await client.query('SELECT filename FROM migrations');
    const appliedMigrations = appliedResult.rows.map(row => row.filename);

    let appliedCount = 0;

    for (const file of files) {
      if (appliedMigrations.includes(file)) {
        console.log(`⏩ Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`🔧 Applying ${file}...`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Execute the migration
        await client.query(sql);
        
        // Record that this migration was applied
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        
        console.log(`✅ Applied ${file}`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ Error applying ${file}:`, error);
        throw error;
      }
    }

    if (appliedCount === 0) {
      console.log('🎉 All migrations are up to date!');
    } else {
      console.log(`🎉 Applied ${appliedCount} migrations successfully!`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
