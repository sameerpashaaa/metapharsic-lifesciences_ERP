const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/metapharsic_erp'
});

async function seedVouchers() {
  const client = await pool.connect();
  try {
    console.log('--- SEEDING VOUCHERS ---');
    
    // Get some accounts
    const { rows: accounts } = await client.query('SELECT id, account_name FROM chart_of_accounts LIMIT 4');
    if (accounts.length < 2) {
       console.error('Not enough accounts to seed vouchers. Please add accounts first.');
       return;
    }

    const vchTypes = ['Contra', 'Payment', 'Receipt', 'Journal'];
    
    await client.query('BEGIN');

    for (let i = 0; i < vchTypes.length; i++) {
       const type = vchTypes[i];
       const voucherNo = `${type.toUpperCase().substring(0,3)}/24-25/00${i+1}`;
       
       const { rows: [vch] } = await client.query(
         `INSERT INTO journal_vouchers (voucher_no, voucher_date, narration, total_debit, total_credit, voucher_type, company_id) 
          VALUES ($1, CURRENT_DATE, $2, $3, $3, $4, 1) RETURNING id`,
         [voucherNo, `Dummy ${type} voucher entry for testing`, 5000 + (i*1000), type]
       );
       
       // Add two entries (Dr/Cr)
       await client.query(
         `INSERT INTO journal_voucher_entries (voucher_id, account_id, debit, credit, narration)
          VALUES ($1, $2, $3, 0, $5), ($1, $4, 0, $3, $5)`,
         [vch.id, accounts[0].id, 5000 + (i*1000), accounts[1].id, 'Seeded item']
       );
       
       console.log(`Seeded ${type} Voucher: ${voucherNo}`);
    }

    await client.query('COMMIT');
    console.log('--- SEEDING COMPLETE ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedVouchers();
