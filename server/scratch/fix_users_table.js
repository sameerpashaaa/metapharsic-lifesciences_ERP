const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    await client.connect();
    try {
        console.log('Adding company_id column to users table...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS company_id INTEGER DEFAULT 1;
        `);
        console.log('✅ Fix successful');
    } catch (err) {
        console.error('Fix failed:', err.message);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
