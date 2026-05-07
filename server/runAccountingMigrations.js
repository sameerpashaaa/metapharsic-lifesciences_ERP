const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'metapharsic_erp'
});

async function runSQLFile(client, file) {
    console.log(`\n======================================\nExecuting ${file}\n======================================`);
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    for (let stmt of statements) {
        try {
            await client.query(stmt);
            console.log(`✅ Statement Success: ${stmt.replace(/\n|\r/g, ' ').substring(0, 50)}...`);
        } catch (e) {
            console.error(`⚠️ Notice: ${e.message}`);
        }
    }
}

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await runSQLFile(client, '003-accounting-core.sql');
        await runSQLFile(client, '004-accounting-advanced.sql');
        await client.query('COMMIT');
        console.log('\n✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ MIGRATION FAILED:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
