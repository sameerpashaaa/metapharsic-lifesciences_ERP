const db = require('../server/db');

async function validate() {
  const tables = [
    'purchase_orders', 
    'purchase_order_items', 
    'suppliers', 
    'products', 
    'goods_received_notes', 
    'grn_items', 
    'supplier_invoices', 
    'three_way_matches', 
    'vendor_ratings', 
    'purchase_budgets', 
    'approval_workflows'
  ];

  console.log('--- Purchase Intelligence Hub Table Validation ---');
  for (const table of tables) {
    try {
      const countRes = await db.query(`SELECT COUNT(*) FROM "${table}"`);
      const schemaRes = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      console.log(`\n✅ Table: ${table}`);
      console.log(`   Rows: ${countRes.rows[0].count}`);
      console.log(`   Columns: ${schemaRes.rows.map(r => r.column_name).join(', ')}`);
    } catch (err) {
      console.log(`\n❌ Table: ${table} - ERROR: ${err.message}`);
    }
  }
  process.exit(0);
}

validate();