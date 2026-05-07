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
        console.log('Fixing batches table columns...');
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='batch_number') THEN
                    ALTER TABLE batches RENAME COLUMN batch_number TO batch_no;
                END IF;
                IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='stock') THEN
                    ALTER TABLE batches RENAME COLUMN stock TO quantity;
                END IF;
                IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='ptr_rate') THEN
                    ALTER TABLE batches RENAME COLUMN ptr_rate TO ptr;
                END IF;
            END $$;
        `);

        console.log('Fixing sales_invoices table columns...');
        await client.query(`
            ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS party_id UUID;
            ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
        `);

        // Wait, the POS error earlier said "column invoice_date does not exist" in POS dashboard summary. So let's add that.

        console.log('✅ Fix successful');
    } catch (err) {
        console.error('Fix failed:', err.message);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
