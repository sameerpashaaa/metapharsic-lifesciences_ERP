const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function seedValidationData() {
    console.log('🚀 Seeding Comprehensive ERP Validation Data...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // 1. SETTINGS
        const companyId = 1;
        const transactionDate = new Date().toISOString().split('T')[0];
        const backdate35 = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const backdate95 = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 2. MASTER DATA ENRICHMENT (Categorizing accounts)
        console.log('📊 Stage 1: Categorizing Chart of Accounts...');
        await client.query(`
            UPDATE chart_of_accounts SET account_group = 'Cash in Hand' WHERE account_name = 'Cash';
            UPDATE chart_of_accounts SET account_group = 'Bank Accounts' WHERE account_name IN ('Bank Account', 'hdfc');
            UPDATE chart_of_accounts SET account_group = 'Current Assets' WHERE account_name IN ('Receivables', 'Inventory');
            UPDATE chart_of_accounts SET account_group = 'Current Liabilities' WHERE account_name IN ('Payables', 'GST Payable');
            UPDATE chart_of_accounts SET account_group = 'Direct Income' WHERE account_name = 'Sales Revenue';
            UPDATE chart_of_accounts SET account_group = 'Direct Expenses' WHERE account_name = 'Cost of Goods Sold';
            UPDATE chart_of_accounts SET account_group = 'Indirect Expenses' WHERE account_name IN ('Rent', 'Salaries & Wages', 'Utilities', 'Marketing');
        `);

        // 3. CREATE TEST PARTIES (Aging Analysis targets)
        console.log('🤝 Creating Test Parties...');
        const customerId = uuidv4();
        await client.query(`
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group)
            VALUES ($1, $2, 'CUST001', 'TEST_CUSTOMER_PRIME', 'Asset', 'Sundry Debtors')
        `, [customerId, companyId]);

        const supplierId = uuidv4();
        await client.query(`
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group)
            VALUES ($1, $2, 'VEND001', 'TEST_SUPPLIER_GLOBAL', 'Liability', 'Sundry Creditors')
        `, [supplierId, companyId]);

        // 4. CREATE TEST PRODUCTS
        console.log('📦 Creating Test Products...');
        const productA = uuidv4(); // Tablet
        const productB = uuidv4(); // Injection
        await client.query(`
            INSERT INTO products (id, name, code, uom, category, generic_name, manufacturer) VALUES
            ($1, 'TEST_TAB_MAX_500', 'TAB500', 'Strip', 'Pharma', 'Paracetamol', 'Test Labs'),
            ($2, 'TEST_INJ_CEFTRA_1G', 'CEF1G', 'Nos', 'Surgical', 'Ceftriaxone', 'SurgiCare')
        `, [productA, productB]);

        // 5. FIND CORE ACCOUNTS
        const bankAcc = await findAccount(client, companyId, 'Bank Account');
        const purchaseAcc = await findAccount(client, companyId, 'Purchase'); // Assuming purchase account exists or using Inventory
        const inventoryAcc = await findAccount(client, companyId, 'Inventory');
        const salesAcc = await findAccount(client, companyId, 'Sales Revenue');
        const cogsAcc = await findAccount(client, companyId, 'Cost of Goods Sold');
        const cashAcc = await findAccount(client, companyId, 'Cash');
        const salaryAcc = await findAccount(client, companyId, 'Salaries');

        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc'; // Main Warehouse

        // ---------------------------------------------------------
        // TRANSACTIONAL DATA
        // ---------------------------------------------------------

        // A. OPENING BALANCE (Capital Infusion)
        console.log('💰 Posting Opening Balances...');
        const capId = await findAccount(client, companyId, 'Capital');
        const jvOpId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, narration, status) VALUES ($1, $2, $3, $4, $5, 'POSTED')`, 
            [jvOpId, companyId, 'JV/OP/001', '2024-04-01', 'Opening Capital']);
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: jvOpId, voucherType: 'JV', transactionDate: '2024-04-01', debit: 1000000 });
        await postToGeneralLedger(client, { accountId: capId, voucherId: jvOpId, voucherType: 'JV', transactionDate: '2024-04-01', credit: 1000000 });

        // B. AGING SCENARIOS (Backdated Credit Sales)
        console.log('⏳ Seeding Aging Scenarios...');
        
        // 1. Sale 95 days ago (Overdue > 90)
        const s1Id = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'SALE/OLD/001', $3, 'Sales', 'POSTED')`, [s1Id, companyId, backdate95]);
        await postToGeneralLedger(client, { accountId: customerId, voucherId: s1Id, voucherType: 'Sales', transactionDate: backdate95, debit: 50000, narration: 'Old Overdue Sale' });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: s1Id, voucherType: 'Sales', transactionDate: backdate95, credit: 50000 });

        // 2. Sale 35 days ago (Overdue 30-60)
        const s2Id = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'SALE/MID/001', $3, 'Sales', 'POSTED')`, [s2Id, companyId, backdate35]);
        await postToGeneralLedger(client, { accountId: customerId, voucherId: s2Id, voucherType: 'Sales', transactionDate: backdate35, debit: 30000 });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: s2Id, voucherType: 'Sales', transactionDate: backdate35, credit: 30000 });

        // 3. Recent Sale (0-30)
        const s3Id = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'SALE/CUR/001', $3, 'Sales', 'POSTED')`, [s3Id, companyId, transactionDate]);
        await postToGeneralLedger(client, { accountId: customerId, voucherId: s3Id, voucherType: 'Sales', transactionDate: transactionDate, debit: 20000 });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: s3Id, voucherType: 'Sales', transactionDate: transactionDate, credit: 20000 });

        // C. INVENTORY FLOW (Purchase & Stock)
        console.log('📦 Seeding Inventory Transactions...');
        const p1Id = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'PUR/001', $3, 'Purchase', 'POSTED')`, [p1Id, companyId, transactionDate]);
        
        // Purchase 1000 Tablets @ 5 each
        await postToStockLedger(client, { companyId, godownId, productId: productA, movementType: 'IN', referenceType: 'Purchase', referenceId: p1Id, referenceNumber: 'PUR/001', quantity: 1000, costPerUnit: 5, movementDate: transactionDate });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: p1Id, voucherType: 'Purchase', transactionDate, debit: 5000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: p1Id, voucherType: 'Purchase', transactionDate, credit: 5000 });

        // D. CASH FLOW (Payment & Expenses)
        console.log('💸 Seeding Cash Flow (Payments & Expenses)...');
        
        // 1. Pay Supplier (Bank Outflow)
        const payId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'PAY/001', $3, 'Payment', 'POSTED')`, [payId, companyId, transactionDate]);
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: payId, voucherType: 'Payment', transactionDate, debit: 5000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: payId, voucherType: 'Payment', transactionDate, credit: 5000 });

        // 2. Clear Salary (Cash Outflow)
        const salId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'CP/001', $3, 'Payment', 'POSTED')`, [salId, companyId, transactionDate]);
        await postToGeneralLedger(client, { accountId: salaryAcc, voucherId: salId, voucherType: 'Payment', transactionDate, debit: 120000 });
        await postToGeneralLedger(client, { accountId: cashAcc, voucherId: salId, voucherType: 'Payment', transactionDate, credit: 120000, narration: 'Monthly Salaries' });

        await client.query('COMMIT');
        console.log('🎉 Validation Data Seeded SUCCESSFULLY.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding FAILED:', error);
    } finally {
        client.release();
        process.exit();
    }
}

seedValidationData();
