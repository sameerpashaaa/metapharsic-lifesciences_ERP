const db = require('../server/db');

async function check() {
  try {
    console.log('\n--- Checking sales_invoices ---');
    const { rows } = await db.query(`
      SELECT
        id,
        invoice_date,
        net_payable,
        status,
        created_at
      FROM sales_invoices
      LIMIT 10
    `);
    console.log('sales_invoices:', rows);

    const { rows: summaryRows } = await db.query(`
      WITH normalized_invoices AS (
        SELECT
          si.id,
          COALESCE(si.invoice_date, si.created_at) AS invoice_ts,
          COALESCE(si.net_payable, 0)::numeric AS net_total,
          COALESCE(si.status, 'Completed') AS status
        FROM sales_invoices si
      )
      SELECT
        invoice_ts,
        net_total,
        status
      FROM normalized_invoices
      LIMIT 10
    `);
    console.log('normalized_invoices:', summaryRows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();