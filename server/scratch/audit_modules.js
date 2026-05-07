const db = require('../db');

async function auditModules() {
    const tables = ['employees', 'crm_leads', 'payroll_entries'];
    for (const t of tables) {
        const res = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [t]);
        console.log(`\n--- [${t.toUpperCase()}] ---`);
        console.table(res.rows);
    }
    process.exit();
}

auditModules();
