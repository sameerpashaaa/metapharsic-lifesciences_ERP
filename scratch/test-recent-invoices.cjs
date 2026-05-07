const db = require('../server/db');

db.query(`
      WITH invoice_item_counts AS (
        SELECT
          COALESCE(sii.sales_invoice_id, sii.invoice_id) AS invoice_id,
          COALESCE(SUM(sii.quantity), 0)::int AS items_sold
        FROM sales_invoice_items sii
        GROUP BY COALESCE(sii.sales_invoice_id, sii.invoice_id)
      )
      SELECT
        si.id,
        COALESCE(si.invoice_no, si.invoice_number, si.id::text) AS invoice_number,
        COALESCE(p.name, si.customer_name, 'Counter Customer') AS customer_name,
        COALESCE(si.invoice_date, si.date, si.created_at) AS invoice_date,
        COALESCE(si.net_payable, si.net_amount, 0)::numeric AS amount,
        COALESCE(si.status, 'Completed') AS status,
        COALESCE(iic.items_sold, 0) AS items_sold
      FROM sales_invoices si
      LEFT JOIN parties p ON p.id = si.party_id
      LEFT JOIN invoice_item_counts iic ON iic.invoice_id = si.id
      ORDER BY COALESCE(si.invoice_date, si.date, si.created_at) DESC, si.created_at DESC NULLS LAST
      LIMIT 10
`).then(res => { console.log('recentInvoices:', res.rows.length); process.exit(0); }).catch(e => { console.error('ERROR:', e); process.exit(1); });
