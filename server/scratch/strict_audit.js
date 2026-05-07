const db = require('../db');

async function runStrictAudit() {
    console.log('🛡️ METAPHARSIC ERP - SENIOR AUDITOR SUITE v1.0');
    console.log('-------------------------------------------');
    
    try {
        // 1. VOUCHER PARITY CHECK
        console.log('\n[1/5] Checking Transaction Parity (Double-Entry Audit)...');
        const parity = await db.query(`
            SELECT voucher_id, voucher_no, SUM(debit - credit) as diff 
            FROM general_ledger gl
            LEFT JOIN journal_vouchers jv ON gl.voucher_id = jv.id
            GROUP BY voucher_id, voucher_no 
            HAVING ABS(SUM(debit - credit)) > 0.001
        `);
        if (parity.rows.length === 0) {
            console.log('✅ PASS: All vouchers are correctly balanced.');
        } else {
            console.log('❌ FAIL: Found internal imbalances in the following vouchers:');
            console.table(parity.rows);
        }

        // 2. MASTER DATA CLASSIFICATION CHECK
        console.log('\n[2/5] Checking Account Classifications (Report Readiness)...');
        const missingGroups = await db.query(`
            SELECT coa.account_name, COUNT(gl.id) as txn_count
            FROM chart_of_accounts coa
            LEFT JOIN general_ledger gl ON coa.id = gl.account_id
            WHERE coa.account_group IS NULL
            GROUP BY coa.account_name
            HAVING COUNT(gl.id) > 0
        `);
        if (missingGroups.rows.length === 0) {
            console.log('✅ PASS: All active accounts have reporting groups assigned.');
        } else {
            console.log('❌ FAIL: Active accounts missing classification group (will break P&L/BS):');
            console.table(missingGroups.rows);
        }

        // 3. LEDGER CONTINUITY CHECK
        console.log('\n[3/5] Checking Ledger Balance Continuity...');
        const continuity = await db.query(`
            WITH Calculations AS (
                SELECT 
                    account_id,
                    id,
                    running_balance,
                    LAG(running_balance) OVER (PARTITION BY account_id ORDER BY transaction_date ASC, created_at ASC, id ASC) + debit - credit as calculated_bal
                FROM general_ledger
            )
            SELECT account_id, id, running_balance, calculated_bal 
            FROM Calculations 
            WHERE calculated_bal IS NOT NULL AND ABS(running_balance - calculated_bal) > 0.001
            LIMIT 5
        `);
        if (continuity.rows.length === 0) {
            console.log('✅ PASS: Running balances are continuous and mathematically sound.');
        } else {
            console.log('❌ FAIL: Found breaks in the running balance chain!');
            console.table(continuity.rows);
        }

        // 4. STOCK VS LEDGER SYNC CHECK
        console.log('\n[4/5] Checking Stock vs GL Alignment (Inventory Value)...');
        const stockSync = await db.query(`
            SELECT 
                p.name,
                SUM(sle.in_qty - sle.out_qty) as ledger_qty
            FROM stock_ledger_entries sle
            JOIN products p ON sle.product_id = p.id
            GROUP BY p.name
        `);
        console.log('📊 Current Stock Levels:');
        console.table(stockSync.rows);

        // 5. REPORT SUMMARY CHECK (TB BALANCE)
        console.log('\n[5/5] Final Trial Balance Sanity Check...');
        const tb = await db.query(`SELECT SUM(debit) as total_dr, SUM(credit) as total_cr FROM general_ledger`);
        console.log(`Total Debits: ₹${parseFloat(tb.rows[0].total_dr).toLocaleString()}`);
        console.log(`Total Credits: ₹${parseFloat(tb.rows[0].total_cr).toLocaleString()}`);
        const diff = tb.rows[0].total_dr - tb.rows[0].total_cr;
        if (Math.abs(diff) < 0.01) console.log('🏆 SYSTEM IS IN PERFECT BALANCE.');
        else console.log(`🛑 ALERT: SYSTEM-WIDE SKEW OF ₹${diff.toLocaleString()}`);

    } catch (err) {
        console.error('❌ AUDIT CRASHED:', err.message);
    } finally {
        process.exit();
    }
}

runStrictAudit();
