const db = require('../server/db');

async function check() {
  try {
    console.log('\n--- Test: chart_of_accounts ---');
    try {
      const r = await db.query(`SELECT account_type, SUM(opening_balance) as balance FROM chart_of_accounts GROUP BY account_type`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }

    console.log('\n--- Test: expenses ---');
    try {
      const r = await db.query(`SELECT TO_CHAR(date, 'Mon YYYY') as month, SUM(amount) as expenses FROM expenses WHERE date::TIMESTAMP > NOW() - INTERVAL '24 months' GROUP BY month`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }

    console.log('\n--- Test: parties ---');
    try {
      const r = await db.query(`SELECT p.id FROM parties p LIMIT 1`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }

    console.log('\n--- Test: branches ---');
    try {
      const r = await db.query(`SELECT * FROM branches`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }

    console.log('\n--- Test: batches ---');
    try {
      const r = await db.query(`SELECT SUM(stock) as total FROM batches`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }

    console.log('\n--- Test: products batches join (analytics.js /inventory/comprehensive) ---');
    try {
      const r = await db.query(`SELECT p.id, COALESCE(SUM(b.quantity), 0) FROM products p LEFT JOIN batches b ON p.id = b.product_id GROUP BY p.id LIMIT 1`);
      console.log('Success:', r.rowCount);
    } catch(e) { console.error('Error:', e.message); }
  } finally {
    process.exit(0);
  }
}
check();