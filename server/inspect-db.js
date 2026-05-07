const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, port: process.env.DB_PORT
});

async function run() {
    try {
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));
        
        for (const row of tables.rows) {
            const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [row.table_name]);
            console.log(`\n--- ${row.table_name} ---`);
            console.log(columns.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
        }
    } catch (e) { console.error(e); }
    finally { await pool.end(); }
}
run();
