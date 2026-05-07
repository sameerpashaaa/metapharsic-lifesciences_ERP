const db = require('../db');
async function explore() {
    const targetTables = ['leads', 'orders', 'sales_invoices', 'purchase_orders', 'employees', 'parties'];
    for (const t of targetTables) {
        const res = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [t]);
        console.log(`\n--- [${t.toUpperCase()}] ---`);
        console.table(res.rows);
    }
    process.exit();
}
explore();
