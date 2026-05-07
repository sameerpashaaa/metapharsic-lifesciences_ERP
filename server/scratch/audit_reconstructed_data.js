const db = require('../db');
async function check() {
    try {
        console.log('--- RECONSTRUCTED DATA AUDIT ---');
        const res = await db.query(`
            SELECT id, date, invoice_date, invoice_no, net_amount, net_payable, invoice_type
            FROM sales_invoices 
            WHERE invoice_no LIKE 'STR/%' 
            LIMIT 10
        `);
        console.table(res.rows);
        
        const count = await db.query("SELECT COUNT(*) FROM sales_invoices WHERE date > NOW() - INTERVAL '12 months'");
        console.log('Count of invoices in 12-month window:', count.rows[0].count);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
