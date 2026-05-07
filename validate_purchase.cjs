const db = require('./server/db');

async function validate() {
  console.log('--- PURCHASE MODULE DATABASE VALIDATION ---');
  
  const tables = [
    'purchase_orders',
    'purchase_order_items',
    'purchase_items',
    'inventory_items',
    'stock_items',
    'three_way_matches',
    'vendor_ratings',
    'purchase_budgets',
    'approval_workflows',
    'goods_received_notes',
    'grn_items',
    'supplier_invoices',
    'suppliers',
    'products',
    'batches'
  ];

  for (const table of tables) {
    try {
      const { rows } = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table.padEnd(25)}: ${rows[0].count} rows`);
    } catch (e) {
      console.log(`${table.padEnd(25)}: MISSING OR ERROR (${e.message})`);
    }
  }

  console.log('\n--- 3-WAY MATCHING DATA ---');
  try {
    const { rows } = await db.query(`
      SELECT po.invoice_no, grn.grn_number, si.invoice_number, twm.match_status
      FROM purchase_orders po
      LEFT JOIN goods_received_notes grn ON po.id = grn.purchase_order_id
      LEFT JOIN supplier_invoices si ON po.supplier_id = si.supplier_id
      LEFT JOIN three_way_matches twm ON po.id = twm.purchase_order_id
      LIMIT 5
    `);
    console.table(rows);
  } catch (e) {
    console.log('Error fetching matching data:', e.message);
  }

  console.log('\n--- VENDOR RATINGS ---');
  try {
    const { rows } = await db.query(`
      SELECT s.name, vr.overall_rating, vr.quality_score, vr.delivery_score
      FROM vendor_ratings vr
      JOIN suppliers s ON vr.supplier_id = s.id
    `);
    console.table(rows);
  } catch (e) {
    console.log('Error fetching vendor ratings:', e.message);
  }

  console.log('\n--- BUDGET CONTROL ---');
  try {
    const { rows } = await db.query(`SELECT category_id, budgeted_amount, spent_amount, committed_amount FROM purchase_budgets`);
    console.table(rows);
  } catch (e) {
    console.log('Error fetching budgets:', e.message);
  }

  process.exit(0);
}

validate();
