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
        console.log('Adding missing columns to products...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2) DEFAULT 0;
        `);

        console.log('Adding missing columns to sales_invoices...');
        await client.query(`
            ALTER TABLE sales_invoices 
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
