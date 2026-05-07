const db = require('../server/db');

async function checkMetrics() {
  console.log('--- Purchase Intelligence Hub Metric Validation ---');
  
  try {
    // 1. Total Purchases
    const { rows: poRows } = await db.query(`
      SELECT SUM(poi.quantity * poi.purchase_rate) as total_spent
      FROM purchase_order_items poi
    `);
    console.log(`Total Spent (from items): ₹${poRows[0].total_spent || 0}`);

    // 2. Inventory Value (Approximation from batches)
    const { rows: invRows } = await db.query(`
      SELECT SUM(quantity * purchase_rate) as total_value
      FROM batches
    `);
    console.log(`Inventory Value (from batches): ₹${invRows[0].total_value || 0}`);

    // 3. Critical Reorders
    const { rows: reorderRows } = await db.query(`
      SELECT COUNT(*) as count
      FROM products p
      WHERE (SELECT SUM(quantity) FROM batches WHERE product_id = p.id) <= p.min_stock_level
    `);
    console.log(`Critical Reorders: ${reorderRows[0].count}`);

    // 4. Budget Remaining
    const { rows: budgetRows } = await db.query(`
      SELECT SUM(budgeted_amount - spent_amount - committed_amount) as remaining
      FROM purchase_budgets
    `);
    console.log(`Budget Remaining: ₹${budgetRows[0].remaining || 0}`);

    // 5. Purchases Count
    const { rows: poCountRows } = await db.query(`SELECT COUNT(*) FROM purchase_orders`);
    console.log(`Total Purchases (Orders): ${poCountRows[0].count}`);

    // 6. 3-Way Match Mismatches
    const { rows: matchRows } = await db.query(`SELECT COUNT(*) FROM three_way_matches WHERE match_status = 'Mismatch'`);
    console.log(`3-Way Matching Mismatches: ${matchRows[0].count}`);

    // 7. Approvals
    const { rows: approvalRows } = await db.query(`SELECT COUNT(*) FROM approval_workflows WHERE status = 'Pending'`);
    console.log(`Pending Approvals: ${approvalRows[0].count}`);

  } catch (err) {
    console.error('Error calculating metrics:', err.message);
  } finally {
    process.exit(0);
  }
}

checkMetrics();