const db = require('../server/db');

async function check() {
  try {
    const tables = ['products', 'sales_invoices', 'purchase_orders', 'purchase_order_items', 'suppliers'];
    for (const table of tables) {
      console.log(`\n--- Table: ${table} ---`);
      const res = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(res.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();