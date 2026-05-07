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
        console.log("Fetching products...");
        const { rows } = await client.query('SELECT * FROM products ORDER BY name LIMIT 1');
        console.log("Products count:", rows.length);
        
        if (rows.length > 0) {
            console.log("Fetching batches for product_id", rows[0].id);
            const { rows: batches } = await client.query(
                'SELECT * FROM batches WHERE product_id = $1 ORDER BY expiry_date',
                [rows[0].id]
            );
            console.log("Batches count:", batches.length);
        } else {
            console.log("No products found, trying a dummy query on batches");
            await client.query('SELECT * FROM batches ORDER BY expiry_date LIMIT 1');
        }
        console.log("✅ Query succeeded");
    } catch (err) {
        console.error("❌ Query failed:", err.message);
    }

    await client.end();
}

runQueries().catch(console.error);
