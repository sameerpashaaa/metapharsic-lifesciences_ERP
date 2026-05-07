const db = require('../db');

async function verify() {
    try {
        console.log('--- FINAL API LOGIC VERIFICATION ---');
        
        // 1. Check Trend Result logic
        const trendResult = await db.query(`
            WITH monthly_sales AS (
                SELECT 
                    TO_CHAR(date, 'Mon YYYY') as month,
                    TO_CHAR(date, 'YYYYMM') as month_sort,
                    SUM(net_amount) as revenue
                FROM sales_invoices
                WHERE date::TIMESTAMP > NOW() - INTERVAL '24 months'
                GROUP BY month, month_sort
            )
            SELECT month, revenue FROM monthly_sales
        `);
        
        console.log(`✅ Trend Result: Found ${trendResult.rows.length} months with revenue.`);
        if (trendResult.rows.length > 0) {
            const totalRevenue = trendResult.rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
            console.log(`📊 Total Revenue Detected: ₹${(totalRevenue / 1000000).toFixed(2)}M`);
        } else {
            console.warn('❌ Trend Result is EMPTY for the last 24 months.');
        }

        // 2. Check Expenses logic
        const expResult = await db.query(`
            SELECT SUM(amount) as total FROM expenses
            WHERE date::TIMESTAMP > NOW() - INTERVAL '24 months'
        `);
        console.log(`✅ Total Expenses Detected: ₹${parseFloat(expResult.rows[0].total || 0).toFixed(2)}`);

    } catch (e) {
        console.error('❌ Verification Failed:', e.message);
    } finally {
        process.exit();
    }
}

verify();
