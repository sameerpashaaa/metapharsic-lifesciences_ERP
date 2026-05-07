const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    await client.connect();
    
    console.log("--- Batches Columns ---");
    const pRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'batches';");
    console.table(pRes.rows);

    await client.end();
}

run().catch(console.error);
