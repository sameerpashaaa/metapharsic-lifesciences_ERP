const db = require('./db');

async function testQuery() {
    try {
        console.log('Testing daily sales analytics query...');
        const query = `
            WITH daily_sales AS (
                SELECT 
                    si.id AS invoice_id,
                    si.date AS transaction_date,
                    si.net_amount,
                    si.total_gst,
                    si.payment_mode,
                    sii.quantity,
                    sii.rate AS unit_price,
                    b.batch_number AS batch_no,
                    b.purchase_rate AS cost_price,
                    b.expiry_date,
                    (sii.quantity * sii.rate) as gross_line_total,
                    (sii.quantity * b.purchase_rate) as cogs_line_total
                FROM sales_invoices si
                JOIN sales_invoice_items sii ON si.id = sii.invoice_id
                JOIN batches b ON sii.batch_id = b.id
                WHERE si.status = 'Completed'
                  AND si.date BETWEEN $1 AND $2
            )
            SELECT 
                transaction_date::DATE as date,
                COUNT(DISTINCT invoice_id) as invoice_count,
                SUM(gross_line_total) as revenue,
                SUM(total_gst) as tax,
                SUM(cogs_line_total) as cogs,
                (SUM(gross_line_total) - SUM(cogs_line_total)) as gross_profit,
                CASE 
                    WHEN SUM(gross_line_total) > 0 
                    THEN ROUND(((SUM(gross_line_total) - SUM(cogs_line_total)) / SUM(gross_line_total)) * 100, 2)
                    ELSE 0 
                END as margin_percentage
            FROM daily_sales
            GROUP BY transaction_date::DATE
            ORDER BY transaction_date DESC;
        `;

        const { rows } = await db.query(query, ['2000-01-01', '2099-12-31']);
        console.log('Query successful!');
        console.log('Rows:', rows.length);
        console.log('Sample Row:', rows[0]);
        process.exit(0);
    } catch (error) {
        console.error('🔥 Query failed!');
        console.error(error);
        process.exit(1);
    }
}

testQuery();
