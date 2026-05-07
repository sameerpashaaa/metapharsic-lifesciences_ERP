const db = require('../db');

async function erpRescue() {
    console.log('👷 INITIATING ERP SYSTEMIC RESCUE OPERATIONS...');
    
    try {
        // 1. MASTER DATA HARDENING
        console.log('\n[1/3] Hardening Master Data (Groups)...');
        await db.query(`
            UPDATE chart_of_accounts SET account_group = 'Capital Account' WHERE account_name = 'Capital' AND account_group IS NULL;
            UPDATE chart_of_accounts SET account_group = 'Loans (Liability)' WHERE account_name = 'Loan - Bank' AND account_group IS NULL;
            UPDATE chart_of_accounts SET account_group = 'Fixed Assets' WHERE account_name = 'Property & Equipment' AND account_group IS NULL;
            UPDATE chart_of_accounts SET account_group = 'Reserves & Surplus' WHERE account_name = 'Retained Earnings' AND account_group IS NULL;
            UPDATE chart_of_accounts SET account_group = 'Duties & Taxes' WHERE account_name = 'GST Payable' AND account_group IS NULL;
        `);

        // 2. PARITY RESTORATION (Fixing unbalanced vouchers)
        console.log('\n[2/3] Restoring Double-Entry Parity...');
        const unbalanced = await db.query(`
            SELECT voucher_id, SUM(debit - credit) as skew 
            FROM general_ledger 
            GROUP BY voucher_id 
            HAVING ABS(SUM(debit - credit)) > 0.001
        `);

        // Create a Suspense account if not exists
        let suspenseId;
        const sAcc = await db.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Suspense Account'");
        if (sAcc.rows.length === 0) {
            const { v4: uuidv4 } = require('uuid');
            suspenseId = uuidv4();
            await db.query(`INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group) VALUES ($1, 1, 'SUSPENSE', 'Suspense Account', 'Asset', 'Suspense Account')`, [suspenseId]);
        } else {
            suspenseId = sAcc.rows[0].id;
        }

        for (const row of unbalanced.rows) {
            const skew = parseFloat(row.skew);
            const dr = skew < 0 ? Math.abs(skew) : 0;
            const cr = skew > 0 ? skew : 0;
            const { v4: uuidv4 } = require('uuid');
            
            console.log(`- Balancing Voucher ${row.voucher_id} with ₹${Math.abs(skew)} in ${dr > 0 ? 'Debit' : 'Credit'}`);
            await db.query(`
                INSERT INTO general_ledger (id, account_id, voucher_id, voucher_type, transaction_date, debit, credit, running_balance, created_at)
                VALUES ($1, $2, $3, 'Adjustment', NOW(), $4, $5, 0, clock_timestamp())
            `, [uuidv4(), suspenseId, row.voucher_id, dr, cr]);
        }

        // 3. RUNNING BALANCE RECONSTRUCTION
        console.log('\n[3/3] Reconstructing All Running Balances...');
        const accounts = await db.query("SELECT DISTINCT account_id FROM general_ledger");
        for (const acc of accounts.rows) {
            const txns = await db.query(`
                SELECT id, debit, credit FROM general_ledger 
                WHERE account_id = $1 
                ORDER BY transaction_date ASC, created_at ASC, id ASC
            `, [acc.account_id]);

            let running = 0;
            for (const tx of txns.rows) {
                running += parseFloat(tx.debit) - parseFloat(tx.credit);
                await db.query("UPDATE general_ledger SET running_balance = $1 WHERE id = $2", [running, tx.id]);
            }
            console.log(`- Recalculated ${txns.rows.length} entries for account ${acc.account_id}`);
        }

        console.log('\n✅ RESCUE OPS COMPLETED SUCCESSFULLY.');

    } catch (e) {
        console.error('❌ RESCUE FAILED:', e);
    } finally {
        process.exit();
    }
}

erpRescue();
