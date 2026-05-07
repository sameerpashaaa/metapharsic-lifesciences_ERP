const db = require('../db');

async function globalSearch() {
    const term = 'INV/2024-25/001';
    console.log(`--- GLOBAL SEARCH FOR: ${term} ---`);
    
    try {
        const tablesRes = await db.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND data_type IN ('character varying', 'text')
        `);
        
        for (const row of tablesRes.rows) {
            try {
                // Using parameterized query to avoid SQL injection even in search
                const query = `SELECT count(*) FROM "${row.table_name}" WHERE "${row.column_name}" = $1`;
                const res = await db.query(query, [term]);
                if (parseInt(res.rows[0].count) > 0) {
                    console.log(`🎯 FOUND in table [${row.table_name}], column [${row.column_name}]`);
                    const data = await db.query(`SELECT * FROM "${row.table_name}" WHERE "${row.column_name}" = $1`, [term]);
                    console.table(data.rows);
                }
            } catch (err) {
                // Ignore errors for some tables
            }
        }
        
        console.log('Search complete.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

globalSearch();
