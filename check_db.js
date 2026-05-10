require('dotenv').config({ path: './server/.env' });
const db = require('./server/db');

async function checkSchema() {
  try {
    const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'batches';");
    console.log("SCHEMA FOR BATCHES:");
    res.rows.forEach(row => console.log(`${row.column_name} (${row.data_type})`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
