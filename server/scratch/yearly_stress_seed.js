const db = require('../db');
const { postToGeneralLedger, postToStockLedger } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function yearlyStressSeed() {
    console.log('🚀 INITIATING 1-YEAR YEARLY STRESS TEST (BIG DATA SIMULATION)...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        const companyId = 1;
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc'; // Main Godown

        // 1. Fetch Core Accounts
        const accs = {};
        const accRes = await client.query("SELECT id, account_name FROM chart_of_accounts");
        accRes.rows.forEach(r => accs[r.account_name] = r.id);

        const mandatory = ['Sales Revenue', 'Cost of Goods Sold', 'Inventory', 'Bank Account', 'Salaries & Wages', 'TEST_SUPPLIER_GLOBAL'];
        for (const m of mandatory) {
            if (!accs[m]) throw new Error(`Missing mandatory account: ${m}`);
        }

        // 2. Fetch/Create a High-Volume Product
        let prodId;
        const prodRes = await client.query("SELECT id FROM products WHERE code = 'U-PAPER-V3'");
        if (prodRes.rows.length > 0) {
            prodId = prodRes.rows[0].id;
        } else {
            prodId = uuidv4();
            await client.query(`
                INSERT INTO products (id, name, generic_name, manufacturer, therapeutic_category, code, uom, mrp, purchase_rate, selling_rate) 
                VALUES ($1, 'STRESS_TEST_PAPER', 'COPY PAPER', 'ZENITH CORP', 'STATIONERY', 'U-PAPER-V3', 'Ream', 1000, 350, 850)
            `, [prodId]);
        }

        // 3. Create a High-Volume Customer Party & Ledger
        const customerId = uuidv4();
        await client.query(`INSERT INTO parties (id, name, type, status, gstin) VALUES ($1, 'GLOBAL_DISTRIBUTION_CORP', 'Customer', 'Active', '27STRESS1234')`, [customerId]);
        const customerAccId = uuidv4();
        await client.query(`INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group) VALUES ($1, $2, 'C_STRESS_01', 'GLOBAL_DISTRIBUTION_CORP', 'Asset', 'Sundry Debtors')`, [customerAccId, companyId]);

        // 4. THE 12-MONTH ENGINE
        // Start date: May 2025
        const startDate = new Date(2025, 4, 1); // May 2025
        for (let m = 0; m < 12; m++) {
            const currentMonth = new Date(startDate);
            currentMonth.setMonth(startDate.getMonth() + m);
            const monthStr = currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
            const dateISO = currentMonth.toISOString().split('T')[0];

            console.log(`📅 Processing ${monthStr}...`);

            // A. Monthly Bulk Purchases (Restocking) - 3 per month
            for (let p = 1; p <= 3; p++) {
                const vchId = uuidv4();
                const vchNo = `STR/PUR/${currentMonth.getFullYear()}/${m+1}/${p}`;
                const qty = 5000;
                const cost = 350;
                const total = qty * cost;

                await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, $3, $4, 'Purchase', 'POSTED')`, [vchId, companyId, vchNo, dateISO]);
                
                await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'IN', referenceType: 'Purchase', referenceId: vchId, referenceNumber: vchNo, quantity: qty, costPerUnit: cost, movementDate: dateISO });
                await postToGeneralLedger(client, { accountId: accs['Inventory'], voucherId: vchId, voucherType: 'Purchase', transactionDate: dateISO, debit: total });
                await postToGeneralLedger(client, { accountId: accs['TEST_SUPPLIER_GLOBAL'], voucherId: vchId, voucherType: 'Purchase', transactionDate: dateISO, credit: total });
            }

            // B. Monthly High-Volume Sales - 15 per month
            for (let s = 1; s <= 15; s++) {
                const vchId = uuidv4();
                const vchNo = `STR/SALE/${currentMonth.getFullYear()}/${m+1}/${s}`;
                const qty = 200; // Total 3000 per month
                const rate = 850;
                const total = qty * rate;
                const cogs = qty * 350;

                await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, $3, $4, 'Sales', 'POSTED')`, [vchId, companyId, vchNo, dateISO]);
                
                await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'OUT', referenceType: 'Sales', referenceId: vchId, referenceNumber: vchNo, quantity: qty, costPerUnit: 350, movementDate: dateISO });
                await postToGeneralLedger(client, { accountId: customerAccId, voucherId: vchId, voucherType: 'Sales', transactionDate: dateISO, debit: total });
                await postToGeneralLedger(client, { accountId: accs['Sales Revenue'], voucherId: vchId, voucherType: 'Sales', transactionDate: dateISO, credit: total });
                
                // COGS Entry
                await postToGeneralLedger(client, { accountId: accs['Cost of Goods Sold'], voucherId: vchId, voucherType: 'Journal', transactionDate: dateISO, debit: cogs });
                await postToGeneralLedger(client, { accountId: accs['Inventory'], voucherId: vchId, voucherType: 'Journal', transactionDate: dateISO, credit: cogs });
            }

            // C. Monthly Payroll Run
            const payVchId = uuidv4();
            const payVchNo = `STR/PAY/${currentMonth.getFullYear()}/${m+1}`;
            const salaryTotal = 250000; // 5 Employees @ 50k

            await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, $3, $4, 'Payment', 'POSTED')`, [payVchId, companyId, payVchNo, dateISO]);
            await postToGeneralLedger(client, { accountId: accs['Salaries & Wages'], voucherId: payVchId, voucherType: 'Payment', transactionDate: dateISO, debit: salaryTotal });
            await postToGeneralLedger(client, { accountId: accs['Bank Account'], voucherId: payVchId, voucherType: 'Payment', transactionDate: dateISO, credit: salaryTotal });

            // D. Monthly Collection (Inflow from Customer)
            const recVchId = uuidv4();
            const collection = 2000000; // Big collection
            await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, $3, $4, 'Receipt', 'POSTED')`, [recVchId, companyId, `STR/REC/${m+1}`, dateISO]);
            await postToGeneralLedger(client, { accountId: accs['Bank Account'], voucherId: recVchId, voucherType: 'Receipt', transactionDate: dateISO, debit: collection });
            await postToGeneralLedger(client, { accountId: customerAccId, voucherId: recVchId, voucherType: 'Receipt', transactionDate: dateISO, credit: collection });
        }

        await client.query('COMMIT');
        console.log('✅ 1-YEAR YEARLY STRESS TEST SEED COMPLETED SUCCESSFULLY.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ STRESS SEED FAILED:', e);
    } finally {
        client.release();
        process.exit();
    }
}

yearlyStressSeed();
