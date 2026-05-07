const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function masterUniverseSeed() {
    console.log('🌌 MASTER UNIVERSE SEED - THE DEFINITIVE SYNC...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        const companyId = 1;
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // --- 1. HRMS (Employee) ---
        console.log('👥 Seeding HRMS Employee...');
        const empId = uuidv4();
        await client.query(`
            INSERT INTO employees (id, company_id, name, base_salary, status, join_date) 
            VALUES ($1, $2, 'John Universe (Auditor)', 85000, 'Active', $3)
        `, [empId, companyId, lastMonth]);
        
        // --- 2. CRM (Lead to Party) ---
        console.log('🎯 Seeding CRM Lead & Customer...');
        const leadId = uuidv4();
        await client.query(`
            INSERT INTO leads (id, name, company, email, status) 
            VALUES ($1, 'Michael Scott', 'Dunder Mifflin Paper Co.', 'michael@dunder.com', 'Converted')
        `, [leadId]);
        
        const partyId = uuidv4();
        await client.query(`
            INSERT INTO parties (id, name, type, status, gstin) 
            VALUES ($1, 'DUNDER_MIFFLIN_OMS', 'Customer', 'Active', '27XXXYYYZZZ')
        `, [partyId]);
        
        const customerLedgerId = uuidv4();
        await client.query(`
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group) 
            VALUES ($1, $2, 'U_DM_PAPER', 'DUNDER_MIFFLIN_OMS', 'Asset', 'Sundry Debtors')
        `, [customerLedgerId, companyId]);

        // --- 3. Inventory & Purchase Cycle ---
        console.log('📦 Seeding Inventory & Purchase Flow...');
        const prodId = uuidv4();
        await client.query(`
            INSERT INTO products (id, name, generic_name, manufacturer, therapeutic_category, code, uom, mrp, purchase_rate, selling_rate) 
            VALUES ($1, $2, 'PREMIUM COPY PAPER', 'UNIVERSE IND', 'OFFICE SUPPLIES', $3, $4, $5, $6, $7)
        `, [prodId, 'UNIVERSE_PREMIUM_PAPER_V3', 'U-PAPER-V3', 'Ream', 600, 200, 550]);
        
        const supplierId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_SUPPLIER_GLOBAL'")).rows[0].id;
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc';
        const inventoryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Inventory'")).rows[0].id;

        const pVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'UNIV/PUR/V3', $3, 'Purchase', 'POSTED')`, [pVchId, companyId, lastMonth]);
        
        // Stock In 2000 Reams @ 200
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'IN', referenceType: 'Purchase', referenceId: pVchId, referenceNumber: 'UNIV/PUR/V3', quantity: 2000, costPerUnit: 200, movementDate: lastMonth });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: pVchId, voucherType: 'Purchase', transactionDate: lastMonth, debit: 400000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: pVchId, voucherType: 'Purchase', transactionDate: lastMonth, credit: 400000 });

        // --- 4. OMS (Sales Cycle) ---
        console.log('📈 Seeding OMS Sales Cycle...');
        const salesAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'")).rows[0].id;
        const cogsAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Cost of Goods Sold'")).rows[0].id;

        // Create OMS Order
        const orderId = uuidv4();
        await client.query(`INSERT INTO orders (id, distributor_id, order_date, total_amount, status) VALUES ($1, $2, $3, 275000, 'Delivered')`, [orderId, partyId, today]);

        const sVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'UNIV/SALE/V3', $3, 'Sales', 'POSTED')`, [sVchId, companyId, today]);
        
        // Stock Out 500 Reams @ 550 (Total 275,000)
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'OUT', referenceType: 'Sales', referenceId: sVchId, referenceNumber: 'UNIV/SALE/V3', quantity: 500, costPerUnit: 200, movementDate: today });
        await postToGeneralLedger(client, { accountId: customerLedgerId, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, debit: 275000 });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, credit: 275000 });
        
        // COGS
        await postToGeneralLedger(client, { accountId: cogsAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, debit: 100000 });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, credit: 100000 });

        // --- 5. Financial Payout ---
        console.log('💸 Seeding Payroll Payout...');
        const salaryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Salaries & Wages'")).rows[0].id;
        const bankAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Bank Account'")).rows[0].id;

        const payVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'UNIV/PAY/V3', $3, 'Payment', 'POSTED')`, [payVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: salaryAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, debit: 85000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, credit: 85000 });

        await client.query('COMMIT');
        console.log('🌌 MASTER UNIVERSE SEED V3 - SYNC COMPLETED SUCCESSFULLY.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SEED FAILED:', e);
    } finally {
        client.release();
        process.exit();
    }
}

masterUniverseSeed();
