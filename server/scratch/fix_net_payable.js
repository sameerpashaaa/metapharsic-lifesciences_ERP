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
        console.log('Adding net_payable column to sales_invoices...');
        await client.query(`
            ALTER TABLE sales_invoices 
            ADD COLUMN IF NOT EXISTS net_payable NUMERIC(12, 2);
        `);
        console.log('✅ Fix successful');
    } catch (err) {
        console.error('Fix failed:', err.message);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
