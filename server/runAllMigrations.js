const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'metapharsic_erp'
});

async function runAllMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    const client = await pool.connect();
    try {
        for (const file of files) {
            if (!file.endsWith('.sql')) continue;
            
            console.log(`\n🔄 Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                try {
                    await client.query(statement);
                } catch (error) {
                    if (error.message.includes('already exists') || 
                        error.message.includes('duplicate key') ||
                        error.message.includes('already a member')) {
                        // Skip
                    } else {
                        console.error(`  ❌ Error in ${file}: ${error.message}`);
                    }
                }
            }
            console.log(`  ✅ Finished ${file}`);
        }
        console.log('\n🎉 All migrations processed!');
    } catch (error) {
        console.error('❌ Migration process failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

runAllMigrations();
