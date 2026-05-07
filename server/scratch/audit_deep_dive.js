const db = require('../db');

async function deepAudit() {
    try {
        console.log('--- VOUCHER CONTENT ANALYSIS ---');
        const vouchers = ['99c5cd16-fe6c-45d7-b1c9-9e5bfb758d38', '937c020a-246d-4823-81b4-17b5f8c18ecb'];
        for (const vid of vouchers) {
            const res = await db.query(`
                SELECT coa.account_name, gl.debit, gl.credit, gl.running_balance, gl.transaction_date, gl.voucher_type
                FROM general_ledger gl
                JOIN chart_of_accounts coa ON gl.account_id = coa.id
                WHERE gl.voucher_id = $1
            `, [vid]);
            console.log(`\nVoucher ID: ${vid}`);
            console.table(res.rows);
        }

        console.log('\n--- LEDGER HELPER LOGIC AUDIT ---');
        const runningBalCheck = await db.query(`
            SELECT account_name, COUNT(*) as tx_count, SUM(debit - credit) as net_gl, 
                   (SELECT running_balance FROM general_ledger WHERE account_id = coa.id ORDER BY created_at DESC, id DESC LIMIT 1) as stored_last_bal
            FROM chart_of_accounts coa
            JOIN general_ledger gl ON coa.id = gl.account_id
            GROUP BY coa.id, coa.account_name
        `);
        console.log('Comparison of Sum vs Last Stored Running Balance:');
        console.table(runningBalCheck.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

deepAudit();
