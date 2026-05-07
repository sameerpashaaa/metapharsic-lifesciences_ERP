const db = require('../db');
async function analyze() {
    console.log('🔍 ANALYZING INTELLIGENCE DASHBOARD PERFORMANCE...');
    
    // Test 1: Inventory Comprehensive Query
    const start1 = Date.now();
    await db.query(`
      SELECT 
        p.id, p.name,
        COALESCE(SUM(b.quantity), 0) as "totalStock"
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      GROUP BY p.id
    `);
    console.log(`Inventory Comp Query: ${Date.now() - start1}ms`);

    // Test 2: Sales Velocity Query
    const start2 = Date.now();
    await db.query(`
      SELECT 
        sii.product_id, 
        COUNT(*) as "transactionCount"
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.invoice_id
      WHERE si.created_at > NOW() - INTERVAL '90 days'
      GROUP BY sii.product_id
    `);
    console.log(`Sales Velocity Query: ${Date.now() - start2}ms`);

    // Test 3: Check Current Indexes
    const idxRes = await db.query(`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'sales_invoices', 'sales_invoice_items', 'batches', 'chart_of_accounts')
    `);
    console.log('\n--- CURRENT INDEXES ---');
    console.table(idxRes.rows);
    
    process.exit();
}
analyze();
