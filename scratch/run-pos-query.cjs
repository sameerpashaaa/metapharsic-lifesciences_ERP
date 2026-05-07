const db = require('../server/db');

db.query(`
      WITH normalized_invoices AS (
        SELECT
          si.id,
          COALESCE(si.invoice_date, si.date, si.created_at) AS invoice_ts,
          COALESCE(si.net_payable, si.net_amount, 0)::numeric AS net_total,
          COALESCE(si.status, 'Completed') AS status
        FROM sales_invoices si
      ),
      invoice_items AS (
        SELECT
          COALESCE(sii.sales_invoice_id, sii.invoice_id) AS invoice_id,
          COALESCE(SUM(sii.quantity), 0)::numeric AS item_quantity
        FROM sales_invoice_items sii
        GROUP BY COALESCE(sii.sales_invoice_id, sii.invoice_id)
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
        COALESCE(SUM(ii.item_quantity) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = CURRENT_DATE
        ), 0)::int AS items_sold_today,
        COUNT(*) FILTER (
          WHERE ni.status IN ('Draft', 'Pending')
        )::int AS pending_drafts,
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
      LEFT JOIN invoice_items ii ON ii.invoice_id = ni.id
`).then(res => { console.log('Exact POS Query:', res.rows[0]); process.exit(0); });
