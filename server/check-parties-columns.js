require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkColumns() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to the database.');

        const tables = ['parties', 'products', 'sales_invoices', 'sales_invoice_items', 'batches'];
        
        for (const table of tables) {
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            
            console.log(`\nColumns in ${table} table:`);
            res.rows.forEach(row => {
                console.log(`- ${row.column_name} (${row.data_type})`);
            });
        }

        client.release();
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
