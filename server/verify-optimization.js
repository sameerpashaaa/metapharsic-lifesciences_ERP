const db = require('./db');

async function testOptimization() {
    console.log('--- BEFORE OPTIMIZATION ---');
    const before = await db.query('SELECT name, min_stock_level, reorder_level FROM products LIMIT 3');
    console.table(before.rows);

    console.log('\nRunning Optimization logic...');
    // Mock the logic from the route
    const velocityResult = await db.query(`
      SELECT 
        p.id,
        COALESCE(SUM(sii.quantity), 0) as units_sold
      FROM products p
      LEFT JOIN sales_invoice_items sii ON sii.product_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
    `);

    for (const row of velocityResult.rows) {
      const sales = parseFloat(row.units_sold);
      let newMin, newReorder;
      
      if (sales > 0) {
        const monthlyDemand = sales / 3;
        newMin = Math.max(20, Math.ceil(monthlyDemand * 0.5));
        newReorder = Math.max(50, Math.ceil(monthlyDemand * 1.5));
      } else {
        newMin = 10;
        newReorder = 25;
      }

      await db.query(`
        UPDATE products 
        SET min_stock_level = $1, reorder_level = $2, updated_at = NOW()
        WHERE id = $3
      `, [newMin, newReorder, row.id]);
    }

    console.log('\n--- AFTER OPTIMIZATION ---');
    const after = await db.query('SELECT name, min_stock_level, reorder_level FROM products LIMIT 3');
    console.table(after.rows);
    process.exit();
}

testOptimization();
