const db = require('../db');
async function check() {
    try {
        console.log('--- SALES_INVOICES NOT NULL ---');
        const s = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoices' AND is_nullable = 'NO'");
        console.table(s.rows);

        console.log('--- PURCHASE_ORDERS NOT NULL ---');
        const p = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_orders' AND is_nullable = 'NO'");
        console.table(p.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
