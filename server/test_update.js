const db = require('./db');

async function testUpdate() {
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

    const id = 'd6664e01-92d7-4fe8-a95d-c372fd4fde13'; // Use the newly created ID

    const result = await db.query(
      `UPDATE products SET 
        name = COALESCE($1, name),
        generic_name = COALESCE($2, generic_name),
        code = COALESCE($3, code),
        manufacturer = COALESCE($4, manufacturer),
        category = COALESCE($5, category),
        reorder_level = COALESCE($6, reorder_level),
        reorder_qty = COALESCE($7, reorder_qty),
        mrp = COALESCE($8, mrp),
        ptr = COALESCE($9, ptr),
        pts = COALESCE($10, pts),
        purchase_rate = COALESCE($11, purchase_rate),
        selling_rate = COALESCE($12, selling_rate),
        hsn = COALESCE($13, hsn),
        gst = COALESCE($14, gst),
        opening_stock = COALESCE($15, opening_stock),
        scheme = COALESCE($16, scheme),
        updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [
        payload.name, payload.genericName, payload.code, payload.manufacturer, payload.category, 
        payload.reorderLevel, payload.reorderQty, payload.mrp, payload.ptr, payload.pts,
        payload.purchaseRate, payload.sellingRate, payload.hsnCode, payload.taxRate,
        payload.openingStock, payload.scheme, id
      ]
    );
    console.log('Update Success:', result.rows[0].id);
  } catch (err) {
    console.error('Test Update Failed:', err.message);
  } finally {
    process.exit();
  }
}

testUpdate();
