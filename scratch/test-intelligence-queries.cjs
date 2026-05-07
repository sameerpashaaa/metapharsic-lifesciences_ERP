const db = require('../server/db');

async function testEndpoints() {
  console.log('--- API Logic Validation ---');
  
  try {
    // Test 3-Way Match Query
    const { rows: matches } = await db.query(`
      SELECT 
        po.id as "poId", 
        po.invoice_no as "poNumber",
        COALESCE(twm.match_status, 'Pending') as "status"
      FROM purchase_orders po
      LEFT JOIN three_way_matches twm ON po.id = twm.purchase_order_id
    `);
    console.log(`Total Match Records found in Query: ${matches.length}`);
    console.log(`Mismatches: ${matches.filter(m => m.status === 'Mismatch').length}`);

    // Test Approvals
    const { rows: approvals } = await db.query(`
      SELECT aw.* FROM approval_workflows aw WHERE aw.status = 'Pending'
    `);
    console.log(`Pending Approvals found in Query: ${approvals.length}`);

    // Test Reorder
    const { rows: reorder } = await db.query(`
      SELECT p.id FROM products p 
      WHERE (SELECT SUM(quantity) FROM batches WHERE product_id = p.id) <= p.min_stock_level
    `);
    console.log(`Reorder Alerts found in Query: ${reorder.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testEndpoints();