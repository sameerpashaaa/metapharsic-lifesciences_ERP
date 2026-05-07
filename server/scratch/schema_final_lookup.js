const db = require('../db');
async function lookup() {
    const tables = ['products', 'employees', 'leads', 'orders', 'sales_invoices', 'parties'];
    for (const t of tables) {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [t]);
        console.log(`\n--- [${t.toUpperCase()}] ---`);
        console.log(res.rows.map(r => r.column_name).join(', '));
    }
    process.exit();
}
lookup();
