const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metapharsic_erp',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runQueries() {
    await client.connect();

    try {
        console.log("Testing exact inventory query...");
        const dataQuery = `
          SELECT 
            p.id, p.code, p.name, p.generic_name as "genericName", p.manufacturer,
            p.current_stock as "currentStock", p.reorder_level as "reorderLevel", p.reorder_qty as "reorderQty",
            p.min_stock_level as "minStockLevel", p.last_received_date as "lastReceivedDate",
            p.mrp, p.ptr, p.pts,
            COALESCE((SELECT MAX(b.purchase_rate) FROM batches b WHERE b.product_id = p.id AND b.quantity > 0), p.purchase_rate, 0) as "purchaseRate",
            p.selling_rate as "sellingRate", p.hsn as "hsnCode", p.gst as "taxRate",
            p.opening_stock as "openingStock", p.scheme, p.category, p.uom,
            p.maintain_batches as "maintainBatches", p.track_expiry as "trackExpiry",
            p.is_active as "isActive", p.branch_distribution as "branchDistribution",
            COALESCE(p.current_stock * p.mrp, 0) as "totalValue",
            (SELECT COUNT(*) FROM batches b WHERE b.product_id = p.id) as "batchCount",
            CASE 
              WHEN NOT EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND b.expiry_date >= NOW()::date) THEN 'EXPIRED'
              WHEN EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND b.expiry_date BETWEEN NOW()::date AND (NOW() + interval '30 days')::date) THEN 'EXPIRING_SOON'
              ELSE 'OK'
            END as "expiryStatus"
          FROM products p
          WHERE p.deleted_at IS NULL AND p.is_active = true
          ORDER BY p.name ASC
          LIMIT 1
        `;
        const { rows } = await client.query(dataQuery);
        console.log("✅ Exact query succeeded, returned rows:", rows.length);
    } catch (err) {
        console.error("❌ Query failed:", err.message);
    }

    await client.end();
}

runQueries().catch(console.error);
