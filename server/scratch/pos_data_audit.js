const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/metapharsic_erp'
});

async function checkPOSData() {
  try {
    console.log('--- POS DATA AUDIT ---');
    
    const { rows: todayInvoices } = await pool.query(`
      SELECT id, invoice_no, invoice_date, net_payable, created_at 
      FROM sales_invoices 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('Recent Invoices:');
    console.table(todayInvoices);
    
    const { rows: stats } = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(net_payable) as total_revenue,
        MIN(invoice_date) as earliest_date,
        MAX(invoice_date) as latest_date
      FROM sales_invoices
    `);
    
    console.log('\nGlobal Stats:');
    console.table(stats);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    console.log(`\nToday local check: ${todayStr}`);
    
    const { rows: statsToday } = await pool.query(`
      SELECT COUNT(*) as count, SUM(net_payable) as revenue 
      FROM sales_invoices 
      WHERE invoice_date::date = CURRENT_DATE
    `);
    
    console.log('\nDatabase CURRENT_DATE stats:');
    console.table(statsToday);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkPOSData();
