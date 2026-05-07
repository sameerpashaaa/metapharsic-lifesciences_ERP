const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function checkLinks() {
    try {
        console.log('🔍 Inspecting Foreign Key Relationships...\n');
        
        const query = `
            SELECT
                tc.table_name AS source_table, 
                kcu.column_name AS source_column, 
                ccu.table_name AS target_table,
                ccu.column_name AS target_column,
                tc.constraint_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_schema = 'public'
            ORDER BY source_table;
        `;

        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            console.log('⚠️ No Foreign Key constraints found in the public schema.');
        } else {
            console.log(`✅ Found ${res.rows.length} relationships:\n`);
            res.rows.forEach(row => {
                console.log(`🔗 ${row.source_table}.${row.source_column}  --->  ${row.target_table}.${row.target_column}  (${row.constraint_name})`);
            });
        }

    } catch (err) {
        console.error('❌ Error inspecting database links:', err.message);
    } finally {
        await pool.end();
    }
}

checkLinks();
