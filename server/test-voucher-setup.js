const db = require('./db');

async function testVoucherSetup() {
  try {
    console.log('--- Testing Voucher Type Creation ---');
    
    // 1. Check current count
    const initial = await db.query('SELECT COUNT(*) FROM voucher_types');
    console.log(`Initial voucher types: ${initial.rows[0].count}`);

    // 2. Create a dummy voucher type
    const dummyName = `Test Voucher ${Date.now()}`;
    const res = await db.query(
      `INSERT INTO voucher_types 
       (name, alias, type_of_voucher, abbreviation, method_of_voucher_numbering)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dummyName, 'TV', 'Sale', 'TEST', 'Manual']
    );
    console.log('✅ Successfully created voucher type:', res.rows[0].name);

    // 3. Verify it exists
    const verify = await db.query('SELECT * FROM voucher_types WHERE name = $1', [dummyName]);
    if (verify.rows.length > 0) {
      console.log('✅ Verification successful. Row found in DB.');
    } else {
      console.error('❌ Verification failed. Row NOT found in DB.');
    }

    // 4. Clean up
    await db.query('DELETE FROM voucher_types WHERE name = $1', [dummyName]);
    console.log('✅ Cleanup successful.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testVoucherSetup();
