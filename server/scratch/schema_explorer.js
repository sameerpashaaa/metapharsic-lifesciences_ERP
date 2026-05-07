const db = require('../db');

async function exploreSchema() {
    console.log('🔍 ERP MODULE SCHEMA EXPLORATION...');
    try {
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('Existing Tables:', tables.rows.map(r => r.table_name).join(', '));

        for (const t of tables.rows) {
            const columns = await db.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [t.table_name]);
            console.log(`\n--- [${t.table_name.toUpperCase()}] ---`);
            console.table(columns.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

exploreSchema();
