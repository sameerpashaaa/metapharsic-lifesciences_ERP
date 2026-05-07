const db = require('../db');
async function stats() {
    const gl = await db.query("SELECT count(*) FROM general_ledger");
    const sl = await db.query("SELECT count(*) FROM stock_ledger_entries");
    const prd = await db.query("SELECT count(*) FROM products");
    const pty = await db.query("SELECT count(*) FROM parties");
    console.log('--- SYSTEM BASELINE ---');
    console.log('GL Entries:', gl.rows[0].count);
    console.log('Stock Entries:', sl.rows[0].count);
    console.log('Products:', prd.rows[0].count);
    console.log('Parties:', pty.rows[0].count);
    process.exit();
}
stats();
