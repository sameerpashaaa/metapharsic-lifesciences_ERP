const db = require('../server/db');

async function fixDates() {
  try {
    console.log('\n--- Updating dates in sales_invoices to simulate live data ---');
    
    // Shift April 14/15 2026 dates to CURRENT_DATE and CURRENT_DATE - 1
    // Update some to today
    await db.query(`
      UPDATE sales_invoices 
      SET 
        invoice_date = CURRENT_DATE,
        created_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id FROM sales_invoices 
        ORDER BY created_at DESC 
        LIMIT 3
      )
    `);

    // Update some to yesterday
    await db.query(`
      UPDATE sales_invoices 
      SET 
        invoice_date = CURRENT_DATE - INTERVAL '1 day',
        created_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
      WHERE id IN (
        SELECT id FROM sales_invoices 
        WHERE invoice_date != CURRENT_DATE OR invoice_date IS NULL
        ORDER BY created_at DESC 
        LIMIT 2
      )
    `);
    
    // Update the rest to this month
    await db.query(`
      UPDATE sales_invoices 
      SET 
        invoice_date = CURRENT_DATE - INTERVAL '5 days',
        created_at = CURRENT_TIMESTAMP - INTERVAL '5 days'
      WHERE invoice_date < CURRENT_DATE - INTERVAL '1 day' OR invoice_date IS NULL
    `);

    console.log('Dates updated successfully.');

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
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = CURRENT_DATE
        ), 0) AS today_revenue,
        COUNT(*) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = CURRENT_DATE
        )::int AS invoices_generated,
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts >= date_trunc('month', CURRENT_DATE)
            AND ni.invoice_ts < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        ), 0) AS monthly_revenue,
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = CURRENT_DATE - INTERVAL '1 day'
        ), 0) AS yesterday_revenue
      FROM normalized_invoices ni
    `);
    console.log('New Dashboard Summary:', summaryRows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fixDates();