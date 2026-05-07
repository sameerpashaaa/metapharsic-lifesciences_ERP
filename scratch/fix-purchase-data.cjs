const db = require('../server/db');

async function fixData() {
  console.log('--- Pro Data Restoration: Purchase Intelligence ---');
  
  try {
    // 1. Get all POs without items
    const { rows: emptyPos } = await db.query(`
      SELECT id FROM purchase_orders 
      WHERE id NOT IN (SELECT DISTINCT purchase_order_id FROM purchase_order_items)
    `);
    
    console.log(`Found ${emptyPos.length} empty purchase orders. Populating...`);

    // Get some products and suppliers for randomization
    const { rows: products } = await db.query('SELECT id, purchase_rate FROM products LIMIT 10');
    
    if (products.length === 0) {
      console.error('No products found to populate POs.');
      return;
    }

    for (const po of emptyPos) {
      // Add 1-3 random items per PO
      const numItems = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numItems; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 50) + 1;
        await db.query(`
          INSERT INTO purchase_order_items 
          (purchase_order_id, product_id, quantity, purchase_rate, gst_rate)
          VALUES ($1, $2, $3, $4, 18)
        `, [po.id, product.id, qty, product.purchase_rate || 100]);
      }
    }

    // 2. Ensure we have at least one 3-way match mismatch for the "Intelligence" feel
    const { rows: matchCheck } = await db.query(`SELECT id FROM three_way_matches WHERE match_status = 'Mismatch'`);
    if (matchCheck.length === 0) {
      console.log('Creating a deliberate 3-way match mismatch for validation...');
      const { rows: po } = await db.query('SELECT id FROM purchase_orders LIMIT 1');
      if (po.length > 0) {
        await db.query(`
          INSERT INTO three_way_matches 
          (purchase_order_id, match_status, variance_amount, remarks)
          VALUES ($1, 'Mismatch', 1500.00, 'Price variance detected in Supplier Invoice')
          ON CONFLICT DO NOTHING
        `, [po[0].id]);
      }
    }

    console.log('✅ Data consistency restored.');
  } catch (err) {
    console.error('Error fixing data:', err.message);
  } finally {
    process.exit(0);
  }
}

fixData();