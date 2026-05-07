const db = require('../server/db');
async function check() {
  const res = await db.query(`SELECT stock, quantity, available_qty FROM batches LIMIT 5`);
  console.log(res.rows);
  process.exit(0);
}
check();