const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        const page = 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const whereClause = 'WHERE p.deleted_at IS NULL AND p.is_active = true';
        const params = [];

        const dataQuery = `
          SELECT 
            p.id,
            p.code,
            p.name,
            p.generic_name as "genericName",
            p.manufacturer,
            p.current_stock as "currentStock",
            p.reorder_level as "reorderLevel",
            p.reorder_qty as "reorderQty",
            p.min_stock_level as "minStockLevel",
            p.last_received_date as "lastReceivedDate",
            p.mrp,
            p.ptr,
            p.pts,
            p.purchase_rate as "purchaseRate",
            p.selling_rate as "sellingRate",
            p.hsn as "hsnCode",
            p.gst as "taxRate",
            p.opening_stock as "openingStock",
            p.scheme,
            p.category,
            p.uom,
            p.maintain_batches as "maintainBatches",
            p.track_expiry as "trackExpiry",
            p.is_active as "isActive",
            p.branch_distribution as "branchDistribution",
            COALESCE(p.current_stock * p.mrp, 0) as "totalValue",
            (SELECT COUNT(*) FROM batches b WHERE b.product_id = p.id) as "batchCount",
            CASE 
              WHEN NOT EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND b.expiry_date >= NOW()::date) THEN 'EXPIRED'
              WHEN EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND b.expiry_date BETWEEN NOW()::date AND (NOW() + interval '30 days')::date) THEN 'EXPIRING_SOON'
              ELSE 'OK'
            END as "expiryStatus"
          FROM products p
          ${whereClause}
          ORDER BY p.name ASC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const dataResult = await pool.query(dataQuery, [...params, limit, offset]);
        console.log('Results found:', dataResult.rows.length);
        if (dataResult.rows.length > 0) {
            console.log('First result:', JSON.stringify(dataResult.rows[0], null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await pool.end();
    }
}

run();
