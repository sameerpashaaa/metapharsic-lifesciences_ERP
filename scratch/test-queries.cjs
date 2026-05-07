const db = require('../server/db');

async function check() {
  try {
    console.log('\n--- Test 1: Inventory ---');
    let res = await db.query(`
      SELECT 
        COALESCE(SUM(current_stock * mrp), 0) as "totalStockValue",
        COALESCE(COUNT(*) FILTER (WHERE current_stock <= reorder_level), 0) as "lowStockProducts",
        COALESCE(COUNT(*), 0) as "totalProducts"
      FROM products
      WHERE deleted_at IS NULL AND is_active = true
    `);
    console.log(res.rows);

    console.log('\n--- Test 2: Sales Stats ---');
    res = await db.query(`
      SELECT 
        COALESCE(SUM(net_amount), 0) as "totalSales",
        COUNT(*) as "invoiceCount"
      FROM sales_invoices
      WHERE date = CURRENT_DATE
    `);
    console.log(res.rows);
    
    console.log('\n--- Test 3: Sales Invoices ---');
    res = await db.query(`
      SELECT id, invoice_number, customer_name, net_amount, status, date
      FROM sales_invoices
      ORDER BY created_at DESC
      LIMIT $1
    `, [5]);
    console.log(res.rows);

    console.log('\n--- Test 4: Purchase Stats ---');
    res = await db.query(`
      SELECT 
        COALESCE(SUM(poi.quantity * poi.purchase_rate), 0) as "totalPurchases",
        COALESCE(COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'Pending'), 0) as "pendingOrders"
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.created_at >= CURRENT_DATE
    `);
    console.log(res.rows);

    console.log('\n--- Test 5: Recent Purchases ---');
    res = await db.query(`
      SELECT 
        po.id, 
        po.invoice_no, 
        s.name as supplier_name, 
        COALESCE(SUM(poi.quantity * poi.purchase_rate), 0) as total_amount,
        po.status,
        po.order_date as date
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      GROUP BY po.id, s.name
      ORDER BY po.created_at DESC
      LIMIT $1
    `, [5]);
    console.log(res.rows);

    console.log('\n--- Test 6: KPI ---');
    res = await db.query(`
      SELECT 
        COALESCE(COUNT(*), 0) as "deadStockCount",
        COALESCE(SUM(current_stock * mrp), 0) as "deadStockValue"
      FROM products
      WHERE (current_stock > 0 AND updated_at < CURRENT_DATE - INTERVAL '90 days')
    `);
    console.log(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();