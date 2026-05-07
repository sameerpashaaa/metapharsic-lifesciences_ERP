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
        console.log('Adding missing columns to products table...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS code VARCHAR(50),
            ADD COLUMN IF NOT EXISTS reorder_qty INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_received_date DATE,
            ADD COLUMN IF NOT EXISTS ptr NUMERIC(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS pts NUMERIC(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS purchase_rate NUMERIC(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS selling_rate NUMERIC(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS opening_stock INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS scheme VARCHAR(255),
            ADD COLUMN IF NOT EXISTS category VARCHAR(100),
            ADD COLUMN IF NOT EXISTS maintain_batches BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS branch_distribution JSONB;
        `);
        console.log('✅ Fix successful');
    } catch (err) {
        console.error('Fix failed:', err.message);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
