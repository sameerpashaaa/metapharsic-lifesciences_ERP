const db = require('../server/db');

async function seedIntelligence() {
  console.log('--- Pro Intelligence Seeding: Making the Hub Alive ---');
  
  try {
    // 1. Seed Vendor Ratings for all suppliers
    const { rows: suppliers } = await db.query('SELECT id, name FROM suppliers');
    console.log(`Found ${suppliers.length} suppliers. Seeding ratings...`);
    
    for (const s of suppliers) {
      await db.query(`
        INSERT INTO vendor_ratings 
        (supplier_id, quality_score, delivery_score, price_score, overall_rating, total_transactions)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (supplier_id) DO UPDATE SET
        quality_score = EXCLUDED.quality_score,
        delivery_score = EXCLUDED.delivery_score,
        price_score = EXCLUDED.price_score,
        overall_rating = EXCLUDED.overall_rating,
        total_transactions = EXCLUDED.total_transactions
      `, [
        s.id, 
        (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        (Math.random() * 2 + 3).toFixed(1), 
        (Math.random() * 2 + 3).toFixed(1),
        (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5 - 5.0
        Math.floor(Math.random() * 50) + 5
      ]);
    }

    // 2. Seed Approval Workflows for some POs
    const { rows: pos } = await db.query('SELECT id FROM purchase_orders LIMIT 5');
    console.log(`Seeding ${pos.length} pending approvals...`);
    
    for (const po of pos) {
      await db.query(`
        INSERT INTO approval_workflows 
        (document_type, document_id, current_level, total_levels, status)
        VALUES ('PO', $1, 1, 2, 'Pending')
        ON CONFLICT DO NOTHING
      `, [po.id]);
    }

    // 3. Seed 3-Way Matches for more POs
    const { rows: morePos } = await db.query('SELECT id FROM purchase_orders OFFSET 5 LIMIT 5');
    console.log(`Seeding ${morePos.length} more 3-way matches...`);
    
    for (let i = 0; i < morePos.length; i++) {
      const status = i % 2 === 0 ? 'Mismatch' : 'Partial';
      const variance = i % 2 === 0 ? 2500.00 : 0;
      await db.query(`
        INSERT INTO three_way_matches 
        (purchase_order_id, match_status, variance_amount, remarks)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [morePos[i].id, status, variance, status === 'Mismatch' ? 'Price discrepancy in item line 2' : 'GRN pending for 2 items']);
    }

    // 4. Force some Reorder Alerts by lowering stock or increasing min_stock_level
    console.log('Adjusting stock levels for Reorder Alerts...');
    await db.query(`
      UPDATE products 
      SET min_stock_level = 100 
      WHERE id IN (SELECT product_id FROM batches GROUP BY product_id HAVING SUM(quantity) < 100 LIMIT 5)
    `);

    console.log('✅ Intelligence Seeding Complete.');
  } catch (err) {
    console.error('Error seeding intelligence:', err.message);
  } finally {
    process.exit(0);
  }
}

seedIntelligence();