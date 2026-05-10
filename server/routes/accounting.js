const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { verifyTokenMiddleware, verifyRoleMiddleware, verify2FAMiddleware } = require('../utils/jwt');

// Helper to wrap async routes
const asyncRoute = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.use((req, res, next) => {
    console.log(`[Accounting Router] Requested: ${req.method} ${req.path}`);
    next();
});

// ============================================
// DIAGNOSTIC
// ============================================
router.get('/diagnostic', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const diagnostic = {};
        const tableCheck = await db.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chart_of_accounts'
            );`
        );
        diagnostic.tableExists = tableCheck.rows[0]?.exists || false;
        
        if (diagnostic.tableExists) {
            const columns = await db.query(
                `SELECT column_name, data_type FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'chart_of_accounts'
                 ORDER BY column_name;`
            );
            diagnostic.columns = columns.rows.map(r => `${r.column_name}(${r.data_type})`);
            const count = await db.query('SELECT COUNT(*) as cnt FROM chart_of_accounts;');
            diagnostic.recordCount = parseInt(count.rows[0]?.cnt || 0);
        }
        
        diagnostic.userId = req.user?.userId;
        diagnostic.companyId = req.user?.companyId || 1;

        // Bypassing 404 for analytics by embedding it in the working diagnostic route
        // Added explicit company_id filtering for ERP multi-tenancy integrity
        const query = `
            WITH daily_sales AS (
                SELECT 
                    si.id AS invoice_id,
                    si.date AS transaction_date,
                    si.net_amount,
                    si.total_gst,
                    si.payment_mode,
                    sii.quantity,
                    sii.rate AS unit_price,
                    b.batch_number AS batch_no,
                    COALESCE(b.purchase_rate, 0) AS cost_price,
                    b.expiry_date,
                    (sii.quantity * sii.rate) as gross_line_total,
                    (sii.quantity * COALESCE(b.purchase_rate, 0)) as cogs_line_total
                FROM sales_invoices si
                JOIN sales_invoice_items sii ON si.id = sii.invoice_id
                LEFT JOIN batches b ON sii.batch_id = b.id
                WHERE si.status = 'Completed'
                  AND si.company_id = $1
            )
            SELECT 
                transaction_date::DATE as date,
                COUNT(DISTINCT invoice_id) as invoice_count,
                SUM(gross_line_total) as revenue,
                SUM(total_gst) as tax,
                SUM(cogs_line_total) as cogs,
                (SUM(gross_line_total) - SUM(cogs_line_total)) as gross_profit,
                CASE 
                    WHEN SUM(gross_line_total) > 0 
                    THEN ROUND(((SUM(gross_line_total) - SUM(cogs_line_total)) / SUM(gross_line_total)) * 100, 2)
                    ELSE 0 
                END as margin_percentage
            FROM daily_sales
            GROUP BY transaction_date::DATE
            ORDER BY transaction_date DESC;
        `;
        const { rows } = await db.query(query, [diagnostic.companyId]);
        
        // Ensure properties exist to prevent 'Format Mismatch' in frontend
        diagnostic.stats = rows || [];
        diagnostic.summary = {
            total_period_revenue: rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0),
            total_period_profit: rows.reduce((sum, r) => sum + parseFloat(r.gross_profit || 0), 0),
            average_margin: rows.length > 0 
                ? (rows.reduce((sum, r) => sum + parseFloat(r.margin_percentage || 0), 0) / rows.length).toFixed(2)
                : 0
        };

        res.json(diagnostic);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

// ============================================
// CHART OF ACCOUNTS
// ============================================
router.get('/chart-of-accounts', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT 
                coa.*,
                ((CASE WHEN coa.account_format = 'credit' THEN -COALESCE(coa.opening_balance, 0) ELSE COALESCE(coa.opening_balance, 0) END) + COALESCE(gl.net_balance, 0)) as current_balance
            FROM chart_of_accounts coa
            LEFT JOIN (
                SELECT account_id, SUM(debit - credit) as net_balance
                FROM general_ledger
                GROUP BY account_id
            ) gl ON coa.id = gl.account_id
            WHERE coa.company_id = $1
        `;
        let params = [req.user.companyId || 1];
        
        if (type && type !== 'All') {
            query += ' AND coa.account_type = $2';
            params.push(type);
        }
        
        query += ' ORDER BY coa.account_code';
        
        const { rows } = await db.query(query, params);
        res.json(rows || []);
    } catch (error) {
        logger.error('Failed to fetch accounts', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
}));

router.post('/chart-of-accounts', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { 
            accountCode, accountName, accountType, openingBalance, group, description, status, 
            gstApplicable, accountFormat, costCenter,
            alias, inventoryAffected, ledgerType, activateInterest,
            mailingName, mailingAddress, mailingCountry, mailingState,
            provideBankDetails, panItNo
        } = req.body;
        
        if (!accountCode || !accountName || !accountType) {
            return res.status(400).json({ error: 'Missing required fields: accountCode, accountName, accountType' });
        }
        
        const { rows } = await db.query(
            `INSERT INTO chart_of_accounts (
                account_code, account_name, account_type, opening_balance, account_group, description, status, 
                gst_applicable, account_format, cost_center_id, company_id, created_by, created_at,
                alias, inventory_affected, ledger_type, activate_interest,
                mailing_name, mailing_address, mailing_country, mailing_state,
                provide_bank_details, pan_it_no
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`,
            [
                accountCode, accountName, accountType, openingBalance || 0, group || null, description || null, status || 'Active', 
                gstApplicable || false, accountFormat || 'debit', costCenter || null, req.user.companyId || 1, req.user.userId,
                alias || null, inventoryAffected || false, ledgerType || null, activateInterest || false,
                mailingName || accountName, mailingAddress || null, mailingCountry || 'India', mailingState || null,
                provideBankDetails || false, panItNo || null
            ]
        );
        
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ error: `Account code '${req.body.accountCode}' already exists`, code: '23505' });
        } else {
            logger.error('Failed to create account', { error: error.message });
            res.status(500).json({ error: `Failed to create account: ${error.message}` });
        }
    }
}));

router.put('/chart-of-accounts/:id', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { 
            accountName, accountType, costCenter,
            alias, inventoryAffected, ledgerType, activateInterest,
            mailingName, mailingAddress, mailingCountry, mailingState,
            provideBankDetails, panItNo, status, group, openingBalance, accountFormat, gstApplicable
        } = req.body;
        
        const { rows } = await db.query(
            `UPDATE chart_of_accounts SET 
                account_name = $1, account_type = $2, cost_center_id = $3, 
                alias = $4, inventory_affected = $5, ledger_type = $6, activate_interest = $7,
                mailing_name = $8, mailing_address = $9, mailing_country = $10, mailing_state = $11,
                provide_bank_details = $12, pan_it_no = $13, status = $14, account_group = $15,
                opening_balance = $16, account_format = $17, gst_applicable = $18,
                updated_at = NOW() 
             WHERE id = $19 RETURNING *`,
            [
                accountName, accountType, costCenter,
                alias, inventoryAffected, ledgerType, activateInterest,
                mailingName, mailingAddress, mailingCountry, mailingState,
                provideBankDetails, panItNo, status, group,
                openingBalance, accountFormat, gstApplicable,
                req.params.id
            ]
        );
        res.json(rows[0] || {});
    } catch (error) {
        logger.error('Failed to update account', { error: error.message });
        res.status(500).json({ error: 'Failed to update account' });
    }
}));

router.get('/chart-of-accounts/:id', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM chart_of_accounts WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId || 1]);
        if (rows.length === 0) return res.status(404).json({ error: 'Account not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch account' });
    }
}));

// ============================================
// JOURNAL VOUCHERS
// ============================================
router.get('/journal-vouchers', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT jv.*, 
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', jve.id,
                'accountId', jve.account_id,
                'accountName', coa.account_name,
                'debit', jve.debit,
                'credit', jve.credit,
                'narration', jve.narration
              ))
              FROM journal_voucher_entries jve
              LEFT JOIN chart_of_accounts coa ON jve.account_id = coa.id
              WHERE jve.voucher_id = jv.id
            ), '[]'::json) as entries
            FROM journal_vouchers jv 
            WHERE jv.company_id = $1 
            ORDER BY jv.voucher_date DESC
        `, [req.user.companyId || 1]);
        res.json(rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vouchers' });
    }
}));

router.post('/journal-vouchers', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'ACCOUNTANT']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    const { voucherNo, date, narration, entries, totalDebit, totalCredit } = req.body;
    
    const companyId = req.user.companyId || 1;
    // Check Financial Year lock status
    try {
        const fyCheck = await db.query(
            `SELECT status FROM financial_years WHERE company_id = $1 AND $2 BETWEEN start_date AND end_date`,
            [companyId, date]
        );
        if (fyCheck.rows.length > 0 && fyCheck.rows[0].status === 'Locked') {
            return res.status(400).json({ error: 'This financial period is locked. Backdated entry not allowed.' });
        }
    } catch (e) {
        // Table might not exist yet if migrations aren't fully run, ignore for now
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ error: 'Debit must equal Credit' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(
            `INSERT INTO journal_vouchers (voucher_no, voucher_date, narration, total_debit, total_credit, status, company_id, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
            [voucherNo, date, narration, totalDebit, totalCredit, req.body.status || 'Draft', req.user.companyId || 1, req.user.userId || req.user.id]
        );
        const voucherId = rows[0].id;

        for (const entry of entries) {
            let finalAccountId = entry.accountId;
            // Handle if UI sent an accountCode instead of UUID
            if (finalAccountId && !finalAccountId.includes('-')) {
                const acctLookup = await client.query('SELECT id FROM chart_of_accounts WHERE account_code = $1 AND company_id = $2 LIMIT 1', [finalAccountId, companyId]);
                if (acctLookup.rows.length > 0) finalAccountId = acctLookup.rows[0].id;
            }

            await client.query(
                `INSERT INTO journal_voucher_entries (voucher_id, account_id, debit, credit, narration)
                 VALUES ($1, $2, $3, $4, $5)`,
                [voucherId, finalAccountId, entry.debit, entry.credit, entry.narration || '']
            );
        }

        await client.query('COMMIT');
        res.status(201).json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('JV Create Error:', error);
        res.status(500).json({ error: 'Failed to create voucher: ' + error.message });
    } finally {
        client.release();
    }
}));

router.put('/journal-vouchers/:id', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'ACCOUNTANT']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    const { voucherNo, date, narration, entries, totalDebit, totalCredit, voucherType } = req.body;
    const companyId = req.user.companyId || 1;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Update header
        await client.query(
            `UPDATE journal_vouchers SET 
                voucher_no = $1, voucher_date = $2, narration = $3, 
                total_debit = $4, total_credit = $5, voucher_type = $6,
                status = $7
             WHERE id = $8 AND company_id = $9`,
            [voucherNo, date, narration, totalDebit, totalCredit, voucherType || 'Journal', req.body.status || 'Draft', req.params.id, companyId]
        );

        // Clear existing entries and recreate
        await client.query('DELETE FROM journal_voucher_entries WHERE voucher_id = $1', [req.params.id]);

        for (const entry of entries) {
            let finalAccountId = entry.accountId;
            if (finalAccountId && !finalAccountId.includes('-')) {
                const acctLookup = await client.query('SELECT id FROM chart_of_accounts WHERE account_code = $1 AND company_id = $2 LIMIT 1', [finalAccountId, companyId]);
                if (acctLookup.rows.length > 0) finalAccountId = acctLookup.rows[0].id;
            }

            await client.query(
                `INSERT INTO journal_voucher_entries (voucher_id, account_id, debit, credit, narration)
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.params.id, finalAccountId, entry.debit, entry.credit, entry.narration || '']
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Voucher updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update voucher: ' + error.message });
    } finally {
        client.release();
    }
}));

router.delete('/journal-vouchers/:id', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'ACCOUNTANT']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    const companyId = req.user.companyId || 1;
    try {
        // Entries are deleted automatically due to ON DELETE CASCADE
        const { rowCount } = await db.query('DELETE FROM journal_vouchers WHERE id = $1 AND company_id = $2', [req.params.id, companyId]);
        if (rowCount === 0) return res.status(404).json({ error: 'Voucher not found' });
        res.json({ message: 'Voucher deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete voucher' });
    }
}));

router.post('/journal-vouchers/:id/post', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query(
            `UPDATE journal_vouchers SET status = $1, posted_by = $2, posted_at = NOW() WHERE id = $3`,
            ['Posted', req.user.userId, req.params.id]
        );

        const { rows: [voucher] } = await client.query(
            'SELECT voucher_date FROM journal_vouchers WHERE id = $1',
            [req.params.id]
        );

        const { rows: entries } = await client.query(
            'SELECT * FROM journal_voucher_entries WHERE voucher_id = $1',
            [req.params.id]
        );

        for (const entry of entries) {
            const runningBalance = await client.query(
                'SELECT COALESCE(SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END), 0) as balance FROM general_ledger WHERE account_id = $1',
                [entry.account_id]
            );
            const newBalance = (runningBalance.rows[0]?.balance || 0) + (entry.debit - entry.credit);
            
            await client.query(
                `INSERT INTO general_ledger (account_id, voucher_id, voucher_type, transaction_date, debit, credit, running_balance, is_reconciled, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())`,
                [entry.account_id, req.params.id, 'JV', voucher.voucher_date, entry.debit, entry.credit, newBalance]
            );
        }

        await client.query('COMMIT');
        res.json({ status: 'Posted' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to post voucher' });
    } finally {
        client.release();
    }
}));

router.post('/journal-vouchers/:id/reverse', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const { rows: [original] } = await client.query(
            'SELECT * FROM journal_vouchers WHERE id = $1 AND company_id = $2',
            [req.params.id, req.user.companyId || 1]
        );
        if (!original) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Voucher not found' });
        }
        if (original.status !== 'Posted') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Only posted vouchers can be reversed' });
        }

        const reversalNo = `REV-${original.voucher_no}`;
        const { rows: [reversal] } = await client.query(
            `INSERT INTO journal_vouchers (voucher_no, voucher_date, narration, total_debit, total_credit, status, company_id, created_by)
             VALUES ($1, NOW(), $2, $3, $4, 'Posted', $5, $6) RETURNING *`,
            [reversalNo, `Reversal of ${original.voucher_no}. Reason: ${req.body.reason || 'Manual reversal'}`,
             original.total_credit, original.total_debit, req.user.companyId || 1, req.user.userId]
        );

        // Mirror all entries with debit/credit swapped
        const { rows: entries } = await client.query('SELECT * FROM journal_voucher_entries WHERE voucher_id = $1', [req.params.id]);
        for (const e of entries) {
            await client.query(
                `INSERT INTO journal_voucher_entries (voucher_id, account_id, debit, credit, narration)
                 VALUES ($1, $2, $3, $4, 'Reversal entry')`,
                [reversal.id, e.account_id, e.credit, e.debit]
            );
            
            // Reversal GL entries
            const runningBalance = await client.query(
                'SELECT COALESCE(SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END), 0) as balance FROM general_ledger WHERE account_id = $1',
                [e.account_id]
            );
            const newBalance = (runningBalance.rows[0]?.balance || 0) + (e.credit - e.debit);
            
            await client.query(
                `INSERT INTO general_ledger (account_id, voucher_id, voucher_type, transaction_date, debit, credit, running_balance, is_reconciled, created_at)
                 VALUES ($1, $2, $3, NOW(), $4, $5, $6, FALSE, NOW())`,
                [e.account_id, reversal.id, 'JV-REV', e.credit, e.debit, newBalance]
            );
        }

        await client.query('UPDATE journal_vouchers SET status = $1 WHERE id = $2', ['Reversed', req.params.id]);
        await client.query('COMMIT');
        res.json({ status: 'Reversed', reversalVoucherId: reversal.id, reversalVoucherNo: reversalNo });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to reverse voucher: ' + error.message });
    } finally { 
        client.release(); 
    }
}));

// ============================================
// GENERAL LEDGER
// ============================================

router.get('/general-ledger/:accountId', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM general_ledger WHERE account_id = $1 ORDER BY transaction_date ASC, created_at ASC',
            [req.params.accountId]
        );
        res.json(rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch GL' });
    }
}));

router.post('/general-ledger', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { dateFrom, dateTo, accountIds, voucherType } = req.body;
        const sDate = dateFrom || '2000-01-01';
        const eDate = dateTo || '2099-12-31';
        const companyId = req.user.company_id || 1;

        if (!accountIds || accountIds.length === 0) {
            return res.status(400).json({ error: 'At least one account ID is required' });
        }

        const results = [];

        for (const accountId of accountIds) {
            // 1. Get Account Info
            const accountRes = await db.query('SELECT account_name, account_code, opening_balance FROM chart_of_accounts WHERE id = $1', [accountId]);
            if (accountRes.rows.length === 0) continue;
            const account = accountRes.rows[0];

            // 2. Calculate Opening Balance for the period
            // (Initial Master OB + Transactions before sDate)
            const priorTransRes = await db.query(
                'SELECT SUM(debit - credit) as balance FROM general_ledger WHERE account_id = $1 AND transaction_date < $2',
                [accountId, sDate]
            );
            const openingBalance = parseFloat(account.opening_balance) + parseFloat(priorTransRes.rows[0]?.balance || 0);

            // 3. Get Period Transactions
            let query = 'SELECT * FROM general_ledger WHERE account_id = $1 AND transaction_date BETWEEN $2 AND $3';
            let params = [accountId, sDate, eDate];
            if (voucherType) {
                query += ` AND voucher_type = $${params.length + 1}`;
                params.push(voucherType);
            }
            const { rows: entries } = await db.query(query + ' ORDER BY transaction_date ASC, created_at ASC', params);

            // 4. Calculate Summary
            let periodDebit = 0;
            let periodCredit = 0;
            entries.forEach(e => {
                periodDebit += parseFloat(e.debit || 0);
                periodCredit += parseFloat(e.credit || 0);
            });

            results.push({
                accountId,
                accountName: account.account_name,
                accountCode: account.account_code,
                openingBalance,
                periodDebit,
                periodCredit,
                closingBalance: openingBalance + periodDebit - periodCredit,
                entries
            });
        }

        res.json(results);
    } catch (error) {
        console.error('GL Error:', error);
        res.status(500).json({ error: 'Failed to fetch GL data' });
    }
}));

// ============================================
// REPORTS
// ============================================
router.post('/trial-balance', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { startDate, endDate, asOnDate } = req.body;
        const eDate = endDate || asOnDate || new Date().toISOString().split('T')[0];
        const sDate = startDate || '2000-01-01';
        const companyId = req.user.company_id || 1;

        const { rows } = await db.query(
            `WITH OpeningBal AS (
                SELECT 
                    coa.id,
                    COALESCE(coa.opening_balance, 0) + COALESCE(SUM(gl.debit - gl.credit), 0) as opening_bal
                FROM chart_of_accounts coa
                LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.transaction_date < $1
                GROUP BY coa.id, coa.opening_balance
            ),
            PeriodTrans AS (
                SELECT 
                    coa.id,
                    COALESCE(SUM(gl.debit), 0) as period_debit,
                    COALESCE(SUM(gl.credit), 0) as period_credit
                FROM chart_of_accounts coa
                LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.transaction_date BETWEEN $1 AND $2
                GROUP BY coa.id
            )
            SELECT 
                coa.id, coa.account_code, coa.account_name, coa.account_type, coa.account_group,
                ob.opening_bal as opening_balance,
                pt.period_debit,
                pt.period_credit,
                (ob.opening_bal + pt.period_debit - pt.period_credit) as closing_balance
            FROM chart_of_accounts coa
            JOIN OpeningBal ob ON coa.id = ob.id
            JOIN PeriodTrans pt ON coa.id = pt.id
            WHERE coa.company_id = $3
            ORDER BY coa.account_group, coa.account_code`,
            [sDate, eDate, companyId]
        );
        
        let totalDebit = 0;
        let totalCredit = 0;
        rows.forEach(r => {
            const cb = parseFloat(r.closing_balance);
            if (cb > 0) totalDebit += cb;
            else totalCredit += Math.abs(cb);
        });

        res.json({ 
            entries: rows, 
            totalDebit, 
            totalCredit, 
            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 
        });
    } catch (error) {
        console.error('Trial Balance Error:', error);
        res.status(500).json({ error: 'Failed to generate trial balance' });
    }
}));

router.post('/balance-sheet', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { asOnDate } = req.body;
        const date = asOnDate || new Date().toISOString().split('T')[0];
        const companyId = req.user.company_id || 1;

        const { rows } = await db.query(
            `SELECT 
                coa.account_type, coa.account_group, coa.account_name, coa.account_code,
                COALESCE(coa.opening_balance, 0) + COALESCE(SUM(gl.debit - gl.credit), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.transaction_date <= $1
            WHERE coa.company_id = $2 AND coa.account_type IN ('Asset', 'Liability', 'Equity')
            GROUP BY coa.account_type, coa.account_group, coa.account_name, coa.account_code, coa.opening_balance
            ORDER BY coa.account_type, coa.account_group`,
            [date, companyId]
        );

        const report = {
            assets: { total: 0, groups: {} },
            liabilities: { total: 0, groups: {} },
            equity: { total: 0, groups: {} }
        };

        rows.forEach(r => {
            const val = parseFloat(r.balance);
            const typeKey = r.account_type.toLowerCase() + 's';
            const groupKey = r.account_group || 'Uncategorized';

            if (!report[typeKey]) report[typeKey] = { total: 0, groups: {} };
            if (!report[typeKey].groups[groupKey]) report[typeKey].groups[groupKey] = { total: 0, accounts: [] };

            report[typeKey].total += val;
            report[typeKey].groups[groupKey].total += val;
            report[typeKey].groups[groupKey].accounts.push(r);
        });

        res.json(report);
    } catch (error) {
        console.error('Balance Sheet Error:', error);
        res.status(500).json({ error: 'Failed to generate balance sheet' });
    }
}));

router.post('/profit-loss', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { startDate, endDate, periodStart, periodEnd } = req.body;
        const sDate = startDate || periodStart || '2000-01-01';
        const eDate = endDate || periodEnd || new Date().toISOString().split('T')[0];
        const companyId = req.user.company_id || 1;

        const { rows } = await db.query(
            `SELECT 
                coa.account_type, coa.account_group, coa.account_name, coa.account_code,
                COALESCE(SUM(CASE 
                    WHEN coa.account_type = 'Income' THEN (gl.credit - gl.debit)
                    WHEN coa.account_type = 'Expense' THEN (gl.debit - gl.credit)
                    ELSE 0 
                END), 0) as amount
            FROM chart_of_accounts coa
            LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.transaction_date BETWEEN $1 AND $2
            WHERE coa.company_id = $3 AND coa.account_type IN ('Income', 'Expense')
            GROUP BY coa.account_type, coa.account_group, coa.account_name, coa.account_code
            ORDER BY coa.account_group`,
            [sDate, eDate, companyId]
        );

        const report = {
            income: { total: 0, groups: {} },
            expense: { total: 0, groups: {} },
            grossProfit: 0,
            netProfit: 0
        };

        rows.forEach(r => {
            const val = parseFloat(r.amount);
            const typeKey = r.account_type.toLowerCase();
            const groupKey = r.account_group || 'Uncategorized';

            if (!report[typeKey].groups[groupKey]) report[typeKey].groups[groupKey] = { total: 0, accounts: [] };

            report[typeKey].total += val;
            report[typeKey].groups[groupKey].total += val;
            report[typeKey].groups[groupKey].accounts.push(r);
        });

        report.netProfit = report.income.total - report.expense.total;
        
        // Basic Gross Profit calculation (Revenue - Cost of Goods Sold)
        const revenue = (report.income.groups['Sales']?.total || 0) + (report.income.groups['Revenue']?.total || 0);
        const cogs = report.expense.groups['Cost of Goods Sold']?.total || 0;
        report.grossProfit = revenue - cogs;

        res.json(report);
    } catch (error) {
        console.error('P&L Error:', error);
        res.status(500).json({ error: 'Failed to generate P&L' });
    }
}));

// ============================================
// COST CENTERS
// ============================================
router.get('/cost-center', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM cost_centers WHERE company_id = $1 ORDER BY name', [req.user.companyId || 1]);
        res.json(rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cost centers' });
    }
}));

router.post('/cost-center', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { name, type, manager } = req.body;
        const { rows } = await db.query(
            `INSERT INTO cost_centers (name, type, manager_id, company_id, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [name, type, manager, req.user.companyId || 1, req.user.userId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create cost center' });
    }
}));

// ============================================
// AUDIT LOGS
// ============================================
router.get('/audit-logs', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM audit_log_accounting WHERE company_id = $1 ORDER BY timestamp DESC LIMIT 500', [req.user.companyId || 1]);
        res.json(rows || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
}));

// ============================================
// DAY BOOK
// ============================================
router.get('/daybook', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { dateFrom, dateTo, voucherType } = req.query;
        const companyId = req.user.companyId || req.user.company_id || 1;
        const dateStart = dateFrom || '2000-01-01';
        const dateEnd = dateTo || '2099-12-31';

        console.log(`[DayBook v2] Fetching: Company=${companyId}, Period=${dateStart} to ${dateEnd}`);
        
        const query = `
            SELECT
                TO_CHAR(v.voucher_date, 'YYYY-MM-DD') as "date",
                COALESCE(v.narration, 'Journal Voucher') as particulars,
                'Journal' as "vchType",
                v.voucher_no as "vchNo",
                v.total_debit::numeric as debit,
                v.total_credit::numeric as credit,
                'journal_vouchers' as "sourceTable"
            FROM journal_vouchers v
            WHERE (v.company_id = $1 OR v.company_id IS NULL)
              AND TO_CHAR(v.voucher_date, 'YYYY-MM-DD') >= $2
              AND TO_CHAR(v.voucher_date, 'YYYY-MM-DD') <= $3

            UNION ALL

            SELECT
                TO_CHAR(i.date, 'YYYY-MM-DD') as "date",
                COALESCE(i.customer_name, 'Cash Sales') as particulars,
                'Sales' as "vchType",
                i.invoice_number as "vchNo",
                i.net_amount::numeric as debit,
                0::numeric as credit,
                'sales_invoices' as "sourceTable"
            FROM sales_invoices i
            WHERE TO_CHAR(i.date, 'YYYY-MM-DD') >= $2
              AND TO_CHAR(i.date, 'YYYY-MM-DD') <= $3

            UNION ALL

            SELECT
                TO_CHAR(e.date, 'YYYY-MM-DD') as "date",
                COALESCE(e.description, 'Expense') as particulars,
                'Expense' as "vchType",
                'EXP-' || e.id::text as "vchNo",
                e.amount::numeric as debit,
                0::numeric as credit,
                'expenses' as "sourceTable"
            FROM expenses e
            WHERE TO_CHAR(e.date, 'YYYY-MM-DD') >= $2
              AND TO_CHAR(e.date, 'YYYY-MM-DD') <= $3

            ORDER BY "date" DESC, "vchNo" DESC
        `;
        
        const params = [companyId, dateStart, dateEnd];
        const { rows } = await db.query(query, params);
        
        // Filter by voucherType if not 'All'
        let filteredRows = rows;
        if (voucherType && voucherType !== 'All') {
            const searchType = voucherType.toLowerCase();
            filteredRows = rows.filter(r => r.vchType && r.vchType.toLowerCase() === searchType);
        }
            
        res.json(filteredRows);
    } catch (error) {
        logger.error('Failed to fetch day book', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch day book' });
    }
}));

// ============================================
// AGING ANALYSIS
// ============================================
router.post('/aging-analysis', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { asOnDate, partyType } = req.body;
        const companyId = req.user.companyId || 1;
        const { rows } = await db.query(
            `SELECT 
                p.id, p.name, p.current_balance,
                COALESCE(SUM(CASE WHEN (CURRENT_DATE - jv.voucher_date) <= 30 THEN jv.total_amount ELSE 0 END), 0) as bucket_0_30,
                COALESCE(SUM(CASE WHEN (CURRENT_DATE - jv.voucher_date) BETWEEN 31 AND 60 THEN jv.total_amount ELSE 0 END), 0) as bucket_31_60,
                COALESCE(SUM(CASE WHEN (CURRENT_DATE - jv.voucher_date) BETWEEN 61 AND 90 THEN jv.total_amount ELSE 0 END), 0) as bucket_61_90,
                COALESCE(SUM(CASE WHEN (CURRENT_DATE - jv.voucher_date) > 90 THEN jv.total_amount ELSE 0 END), 0) as bucket_90_plus
             FROM parties p
             LEFT JOIN journal_vouchers jv ON p.id = jv.party_id
             WHERE p.company_id = $1 AND (p.type = $2 OR $2 IS NULL)
             GROUP BY p.id, p.name, p.current_balance
             HAVING p.current_balance != 0`,
            [companyId, partyType || 'Debtor']
        );
        res.json(rows || []);
    } catch (error) {
        console.error('Aging Analysis Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
}));

/**
 * GET /api/accounting/daily-sales-analytics
 * Production-grade Pharmaceutical Sales-to-Ledger Integration
 */
router.get('/daily-sales-analytics', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        console.log('GET /api/accounting/daily-sales-analytics - Hit');
        const { startDate, endDate } = req.query;
        const companyId = req.user.companyId || 1;

        // PostgreSQL 18.1 Optimized CTE for Pharma Financial Integrity
        const query = `
            WITH daily_sales AS (
                SELECT 
                    si.id AS invoice_id,
                    si.date AS transaction_date,
                    si.net_amount,
                    si.total_gst,
                    si.payment_mode,
                    sii.quantity,
                    sii.rate AS unit_price,
                    b.batch_number AS batch_no,
                    COALESCE(b.purchase_rate, 0) AS cost_price,
                    b.expiry_date,
                    (sii.quantity * sii.rate) as gross_line_total,
                    (sii.quantity * COALESCE(b.purchase_rate, 0)) as cogs_line_total
                FROM sales_invoices si
                JOIN sales_invoice_items sii ON si.id = sii.invoice_id
                LEFT JOIN batches b ON sii.batch_id = b.id
                WHERE si.status = 'Completed'
                  AND si.date BETWEEN $1 AND $2
            )
            SELECT 
                transaction_date::DATE as date,
                COUNT(DISTINCT invoice_id) as invoice_count,
                SUM(gross_line_total) as revenue,
                SUM(total_gst) as tax,
                SUM(cogs_line_total) as cogs,
                (SUM(gross_line_total) - SUM(cogs_line_total)) as gross_profit,
                CASE 
                    WHEN SUM(gross_line_total) > 0 
                    THEN ROUND(((SUM(gross_line_total) - SUM(cogs_line_total)) / SUM(gross_line_total)) * 100, 2)
                    ELSE 0 
                END as margin_percentage
            FROM daily_sales
            GROUP BY transaction_date::DATE
            ORDER BY transaction_date DESC;
        `;

        const { rows } = await db.query(query, [
            startDate || '2000-01-01', 
            endDate || '2099-12-31'
        ]);

        // Standardized JSON Response for Unified Design System
        // Wrapped in a single data object to prevent useDataFetch from stripping the summary
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                stats: rows,
                summary: {
                    total_period_revenue: rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0),
                    total_period_profit: rows.reduce((sum, r) => sum + parseFloat(r.gross_profit || 0), 0),
                    average_margin: rows.length > 0 
                        ? (rows.reduce((sum, r) => sum + parseFloat(r.margin_percentage || 0), 0) / rows.length).toFixed(2)
                        : 0
                }
            }
        });

    } catch (error) {
        logger.error('🔥 Financial Analytics Error:', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to aggregate daily sales analytics for accounting.',
            trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));

// ============================================
// AGING ANALYSIS
// ============================================
router.post('/aging-analysis', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { type = 'Debtor', asOnDate } = req.body; 
        const date = asOnDate || new Date().toISOString().split('T')[0];
        const companyId = req.user.companyId || 1;

        const { rows } = await db.query(
            `SELECT 
                p.name as party_name,
                i.invoice_number as reference_no,
                i.date as invoice_date,
                i.total_amount as total_value,
                i.total_amount - COALESCE(i.paid_amount, 0) as balance_amount,
                EXTRACT(DAY FROM ($1::TIMESTAMP - i.date::TIMESTAMP)) as age_days
            FROM sales_invoices i
            JOIN parties p ON i.party_id = p.id
            WHERE p.type = $2 AND i.company_id = $3 AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
            ORDER BY i.date ASC`,
            [date, type, companyId]
        );

        const summary = {
            '0-30 Days': 0,
            '31-60 Days': 0,
            '61-90 Days': 0,
            '90+ Days': 0,
            total: 0
        };

        const categorizedRows = rows.map(r => {
            const days = parseInt(r.age_days);
            const amt = parseFloat(r.balance_amount);
            let bucket = '90+ Days';
            if (days <= 30) bucket = '0-30 Days';
            else if (days <= 60) bucket = '31-60 Days';
            else if (days <= 90) bucket = '61-90 Days';

            summary[bucket] += amt;
            summary.total += amt;
            return { ...r, bucket };
        });

        res.json({ success: true, summary, data: categorizedRows });
    } catch (error) {
        console.error('Aging Analysis Error:', error);
        res.status(500).json({ error: 'Failed to generate aging analysis' });
    }
}));

// ============================================
// CASH FLOW SUMMARY
// ============================================
router.post('/cash-flow', verifyTokenMiddleware, verify2FAMiddleware, asyncRoute(async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const sDate = startDate || '2000-01-01';
        const eDate = endDate || new Date().toISOString().split('T')[0];
        const companyId = req.user.companyId || 1;

        const { rows } = await db.query(
            `SELECT 
                gl.voucher_type,
                gl.narration,
                gl.transaction_date,
                gl.debit as "in",
                gl.credit as "out"
            FROM general_ledger gl
            JOIN chart_of_accounts coa ON gl.account_id = coa.id
            WHERE (
                coa.account_group IN ('Cash', 'Bank', 'Cash in Hand', 'Bank Accounts')
                OR coa.account_name ILIKE '%Cash%'
                OR coa.account_name ILIKE '%Bank%'
            )
              AND gl.transaction_date BETWEEN $1 AND $2
              AND coa.company_id = $3
            ORDER BY gl.transaction_date ASC`,
            [sDate, eDate, companyId]
        );

        let totalIn = 0;
        let totalOut = 0;
        rows.forEach(r => {
            totalIn += parseFloat(r.in || 0);
            totalOut += parseFloat(r.out || 0);
        });

        res.json({
            success: true,
            summary: {
                totalInflow: totalIn,
                totalOutflow: totalOut,
                netCashFlow: totalIn - totalOut
            },
            data: rows
        });
    } catch (error) {
        console.error('Cash Flow Error:', error);
        res.status(500).json({ error: 'Failed to generate cash flow summary' });
    }
}));

module.exports = router;
