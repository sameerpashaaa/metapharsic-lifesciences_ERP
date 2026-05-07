const db = require('../server/db');
async function check() {
  const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'batches'`);
  console.log(res.rows);
  process.exit(0);
}
check();