const db = require('../db');
async function listAll() {
    const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log(res.rows.map(r => r.table_name).join(', '));
    process.exit();
}
listAll();
