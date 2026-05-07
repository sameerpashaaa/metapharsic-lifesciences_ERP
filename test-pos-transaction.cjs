const db = require('./server/db');

async function testPOS() {
  console.log('--- POS / Billing Test Case ---');
  
  try {
    // 1. Get Admin User
    const userRes = await db.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (userRes.rows.length === 0) {
      throw new Error('Admin user not found. Please run setup-admin.js first.');
    }
    const userId = userRes.rows[0].id;
    console.log('✓ Found user:', userId);

    // 2. Clear existing test data (Optional)
    // await db.query("DELETE FROM sales_invoice_items");
    // await db.query("DELETE FROM sales_invoices");

    // 3. Create Product if not exists
    let productRes = await db.query("SELECT id FROM products WHERE name = 'Paracetamol 500mg' LIMIT 1");
    let productId;
    if (productRes.rows.length === 0) {
      productRes = await db.query(
        "INSERT INTO products (name, generic_name, manufacturer, hsn, gst) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        ['Paracetamol 500mg', 'Paracetamol', 'Metapharsic Mfg', '3004', 12.00]
      );
      productId = productRes.rows[0].id;
      console.log('✓ Created product:', productId);
    } else {
      productId = productRes.rows[0].id;
      console.log('✓ Using existing product:', productId);
    }

    // 4. Create Batch if not exists
    let batchRes = await db.query("SELECT id, stock FROM batches WHERE product_id = $1 AND batch_number = $2", [productId, 'BATCH-TEST-001']);
    let batchId;
    if (batchRes.rows.length === 0) {
      batchRes = await db.query(
        "INSERT INTO batches (product_id, batch_number, expiry_date, stock, mrp, purchase_rate, selling_rate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        [productId, 'BATCH-TEST-001', '2028-12-31', 1000, 15.00, 8.00, 12.00]
      );
      batchId = batchRes.rows[0].id;
      console.log('✓ Created batch:', batchId);
    } else {
      batchId = batchRes.rows[0].id;
      console.log('✓ Using existing batch:', batchId, '(Current stock:', batchRes.rows[0].stock + ')');
    }

    // 5. Create Party if not exists
    let partyRes = await db.query("SELECT id FROM parties WHERE name = 'Walk-in Customer' LIMIT 1");
    let partyId;
    if (partyRes.rows.length === 0) {
      partyRes = await db.query(
        "INSERT INTO parties (name, type, mobile, status) VALUES ($1, $2, $3, $4) RETURNING id",
        ['Walk-in Customer', 'Debtor', '9999999999', 'Active']
      );
      partyId = partyRes.rows[0].id;
      console.log('✓ Created party:', partyId);
    } else {
      partyId = partyRes.rows[0].id;
      console.log('✓ Using existing party:', partyId);
    }

    // 6. Perform POS Transaction (Create Invoice)
    const invoiceNumber = 'INV-' + Date.now();
    const invoiceDate = new Date().toISOString().split('T')[0];
    const qty = 10;
    const rate = 12.00;
    const subTotal = qty * rate;
    const gstRate = 12;
    const gstAmount = (subTotal * gstRate) / 100;
    const netAmount = subTotal + gstAmount;

    console.log(`\nCreating Invoice ${invoiceNumber}...`);
    
    // Start Transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Insert Sales Invoice
      const invRes = await client.query(
        `INSERT INTO sales_invoices 
         (invoice_number, date, customer_name, payment_mode, sub_total, taxable_value, total_gst, net_amount, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [invoiceNumber, invoiceDate, 'Walk-in Customer', 'Cash', subTotal, subTotal, gstAmount, netAmount, 'Completed', userId]
      );
      const invoiceId = invRes.rows[0].id;

      // Insert Invoice Item
      await client.query(
        `INSERT INTO sales_invoice_items 
         (invoice_id, product_id, batch_id, quantity, mrp, rate, taxable_value, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [invoiceId, productId, batchId, qty, 15.00, rate, subTotal, subTotal]
      );

      // Update Stock
      await client.query(
        "UPDATE batches SET stock = stock - $1 WHERE id = $2",
        [qty, batchId]
      );

      await client.query('COMMIT');
      console.log('✓ POS Transaction Successful!');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // 7. Check History
    console.log('\n--- Sales Invoice History ---');
    const historyRes = await db.query(
      `SELECT si.invoice_number, si.date, si.net_amount, si.status, p.name as product_name, sii.quantity
       FROM sales_invoices si
       JOIN sales_invoice_items sii ON si.id = sii.invoice_id
       JOIN products p ON sii.product_id = p.id
       ORDER BY si.created_at DESC
       LIMIT 5`
    );
    
    console.table(historyRes.rows);

    // 8. Check Stock Level
    const finalBatchRes = await db.query("SELECT stock FROM batches WHERE id = $1", [batchId]);
    console.log(`\nFinal Stock for BATCH-TEST-001: ${finalBatchRes.rows[0].stock}`);

  } catch (err) {
    console.error('\n✗ Test Failed:', err.message);
  } finally {
    process.exit();
  }
}

testPOS();
