const db = require('./db');

async function testInsert() {
  try {
    const payload = {
      name: 'TestItem',
      genericName: 'TestItem',
      code: 'TEST01',
      manufacturer: 'Metapharsic',
      category: 'Medicines',
      reorderLevel: 0,
      reorderQty: 100,
      mrp: 0,
      ptr: 0,
      pts: 0,
      purchaseRate: 0,
      sellingRate: 0,
      hsnCode: '',
      taxRate: 12,
      openingStock: 0,
      scheme: ''
    };

    const result = await db.query(
      `INSERT INTO products (
        name, generic_name, code, manufacturer, category, 
        reorder_level, reorder_qty, mrp, ptr, pts, 
        purchase_rate, selling_rate, hsn, gst, 
        opening_stock, scheme, created_by, updated_at, current_stock
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $15) 
       RETURNING *`,
      [
        payload.name, payload.genericName, payload.code, payload.manufacturer, payload.category, 
        payload.reorderLevel || 50, payload.reorderQty || 100, payload.mrp || 0, payload.ptr || 0, payload.pts || 0,
        payload.purchaseRate || 0, payload.sellingRate || 0, payload.hsnCode || '', payload.taxRate || 12,
        payload.openingStock || 0, payload.scheme || '', '027bf305-1ca5-460a-94b2-71da6289896d'
      ]
    );
    console.log('Success:', result.rows[0].id);
  } catch (err) {
    console.error('Test Failed:', err.message);
  } finally {
    process.exit();
  }
}

testInsert();
