const db = require('./db');

async function inspect() {
  try {
    const tables = ['sales_invoices', 'sales_invoice_items', 'voucher_types'];
    for (const table of tables) {
      const res = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`--- ${table} columns ---`);
      console.table(res.rows);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
