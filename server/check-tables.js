const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTables() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to the database.');

        const tables = [
            'users', 'products', 'batches', 'parties', 'sales_invoices',
            'sales_invoice_items', 'purchases', 'purchase_items', 'expenses',
            'chart_of_accounts', 'journal_vouchers', 'journal_voucher_entries',
            'general_ledger', 'cost_centers', 'budgets', 'bank_reconciliation',
            'tds_entries', 'e_invoices', 'audit_log_accounting'
        ];

        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table '${table}': ${res.rows[0].count} rows`);
            } catch (err) {
                console.error(`❌ Table '${table}' does not exist or error: ${err.message}`);
            }
        }

        client.release();
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

checkTables();
