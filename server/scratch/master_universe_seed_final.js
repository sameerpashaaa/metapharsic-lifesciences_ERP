const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function masterUniverseSeed() {
    console.log('🌌 MASTER UNIVERSE SEED - FINAL MISSION...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        const companyId = 1;
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // --- 1. HRMS (Employee/Salary) ---
        console.log('👥 Seeding HRMS...');
        const empId = uuidv4();
        await client.query(`INSERT INTO employees (id, name, base_salary, status, join_date) VALUES ($1, 'John Universe', 65000, 'Active', $2)`, [empId, lastMonth]);
        
        // --- 2. CRM (Lead to Party) ---
        console.log('🎯 Seeding CRM...');
        const leadId = uuidv4();
        await client.query(`INSERT INTO leads (id, lead_name, company_name, status) VALUES ($1, 'Michael Scott', 'Dunder Mifflin', 'Converted')`, [leadId]);
        
        const partyId = uuidv4();
        await client.query(`INSERT INTO parties (id, name, type, status, gstin) VALUES ($1, 'DUNDER_MIFFLIN_OMS', 'Customer', 'Active', '27XXXYYYZZZ')`, [partyId]);
        
        const customerLedgerId = uuidv4();
        await client.query(`INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group) VALUES ($1, $2, 'U_DM_01', 'DUNDER_MIFFLIN_OMS', 'Asset', 'Sundry Debtors')`, [customerLedgerId, companyId]);

        // --- 3. Inventory & Purchase ---
        console.log('📦 Seeding Inventory & Purchase Flow...');
        const prodId = uuidv4();
        await client.query(`INSERT INTO products (id, name, code, uom, mrp, purchase_rate, sale_rate) VALUES ($1, 'UNIVERSE_PREMIUM_PAPER', 'U-PAPER', 'Ream', 500, 150, 450)`, [prodId]);
        
        const supplierId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_SUPPLIER_GLOBAL'")).rows[0].id;
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc';
        const inventoryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Inventory'")).rows[0].id;

        const pVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'FIN/PUR/001', $3, 'Purchase', 'POSTED')`, [pVchId, companyId, lastMonth]);
        
        // Stock In 1000 Reams @ 150
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'IN', referenceType: 'Purchase', referenceId: pVchId, referenceNumber: 'FIN/PUR/001', quantity: 1000, costPerUnit: 150, movementDate: lastMonth });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: pVchId, voucherType: 'Purchase', transactionDate: lastMonth, debit: 150000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: pVchId, voucherType: 'Purchase', transactionDate: lastMonth, credit: 150000 });

        // --- 4. OMS (Order to Sales) ---
        console.log('📈 Seeding OMS Flow...');
        const sVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'FIN/SALE/001', $3, 'Sales', 'POSTED')`, [sVchId, companyId, today]);
        
        const salesAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'")).rows[0].id;
        const cogsAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Cost of Goods Sold'")).rows[0].id;

        // Stock Out 200 Reams @ 450
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'OUT', referenceType: 'Sales', referenceId: sVchId, referenceNumber: 'FIN/SALE/001', quantity: 200, costPerUnit: 150, movementDate: today });
        await postToGeneralLedger(client, { accountId: customerLedgerId, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, debit: 90000 });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, credit: 90000 });
        
        await postToGeneralLedger(client, { accountId: cogsAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, debit: 30000 });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, credit: 30000 });

        // --- 5. Expenses / HRMS Payout ---
        console.log('💸 Seeding Expense/Payroll Payout...');
        const salaryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Salaries & Wages'")).rows[0].id;
        const bankAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Bank Account'")).rows[0].id;

        const payVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'FIN/PAY/001', $3, 'Payment', 'POSTED')`, [payVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: salaryAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, debit: 65000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, credit: 65000 });

        await client.query('COMMIT');
        console.log('🌌 MASTER UNIVERSE SEED - FINAL MISSION COMPLETED.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SEED FAILED:', e);
    } finally {
        client.release();
        process.exit();
    }
}

masterUniverseSeed();
