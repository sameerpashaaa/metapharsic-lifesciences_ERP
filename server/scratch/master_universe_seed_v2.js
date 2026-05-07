const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function masterUniverseSeed() {
    console.log('🌌 INITIALIZING THE MASTER UNIVERSE SEED (V2)...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        const companyId = 1;
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // ---------------------------------------------------------
        // 🛠️ PHASE 1: MASTER DATA ENRICHMENT
        // ---------------------------------------------------------
        
        // 1. HRMS Employees
        console.log('👥 Seeding HRMS Employees...');
        const emp1Id = uuidv4();
        await client.query(`
            INSERT INTO employees (id, company_id, name, base_salary, status, join_date)
            VALUES ($1, $2, 'John Operations', 55000, 'Active', $3)
        `, [emp1Id, companyId, lastMonth]);

        // 2. CRM Leads & Party Conversion
        console.log('🎯 Seeding CRM Leads...');
        const leadId = uuidv4();
        await client.query(`
            INSERT INTO leads (id, company_id, lead_name, company_name, email, status)
            VALUES ($1, $2, 'Dr. Robert Smith', 'City Hospital', 'robert@hospital.com', 'Converted')
        `, [leadId, companyId]);

        // Create Party (Customer)
        const partyId = uuidv4();
        await client.query(`
            INSERT INTO parties (id, name, type, status, gstin)
            VALUES ($1, 'CITY_HOSPITAL_PHARMA', 'Customer', 'Active', '27AAACG1234F1ZN')
        `, [partyId]);

        // Create Ledger for this Party
        const customerAccountId = uuidv4();
        await client.query(`
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group)
            VALUES ($1, $2, 'U_CUST_CITY', 'CITY_HOSPITAL_PHARMA', 'Asset', 'Sundry Debtors')
        `, [customerAccountId, companyId]);

        // 3. Products & Batches
        console.log('📦 Seeding Universe Products...');
        const prodId = uuidv4();
        await client.query(`
            INSERT INTO products (id, name, code, uom, mrp, purchase_rate, sale_rate)
            VALUES ($1, 'UNIVERSE_MULTI_VIT', 'U-MVIT', 'Strip', 120.00, 45.00, 95.00)
        `, [prodId]);

        // ---------------------------------------------------------
        // 🔄 PHASE 2: INTEGRATED BUSINESS CYCLES
        // ---------------------------------------------------------

        // A. PURCHASE CYCLE (Stock In)
        console.log('🛒 Executing Integrated Purchase Cycle...');
        const supplierId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_SUPPLIER_GLOBAL'")).rows[0].id;
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc';
        const inventoryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Inventory'")).rows[0].id;

        const purchaseVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U2/PUR/001', $3, 'Purchase', 'POSTED')`, [purchaseVchId, companyId, lastMonth]);
        
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'IN', referenceType: 'Purchase', referenceId: purchaseVchId, referenceNumber: 'U2/PUR/001', quantity: 1000, costPerUnit: 45, movementDate: lastMonth });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: purchaseVchId, voucherType: 'Purchase', transactionDate: lastMonth, debit: 45000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: purchaseVchId, voucherType: 'Purchase', transactionDate: lastMonth, credit: 45000 });

        // B. OMS SALES CYCLE (Order -> Invoice -> Stock Out)
        console.log('📦 Executing Integrated OMS Sales Cycle...');
        const salesAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'")).rows[0].id;
        const cogsAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Cost of Goods Sold'")).rows[0].id;

        const saleOrderId = uuidv4();
        await client.query(`
            INSERT INTO orders (id, company_id, customer_id, order_date, status, total_amount)
            VALUES ($1, $2, $3, $4, 'Delivered', 9500)
        `, [saleOrderId, companyId, partyId, today]);

        const saleVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U2/SALE/001', $3, 'Sales', 'POSTED')`, [saleVchId, companyId, today]);
        
        // Stock Out 100 Strips @ 95
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'OUT', referenceType: 'Sales', referenceId: saleVchId, referenceNumber: 'U2/SALE/001', quantity: 100, costPerUnit: 45, movementDate: today });
        await postToGeneralLedger(client, { accountId: customerAccountId, voucherId: saleVchId, voucherType: 'Sales', transactionDate: today, debit: 9500 });
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: saleVchId, voucherType: 'Sales', transactionDate: today, credit: 9500 });
        
        // COGS
        await postToGeneralLedger(client, { accountId: cogsAcc, voucherId: saleVchId, voucherType: 'Journal', transactionDate: today, debit: 4500 });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: saleVchId, voucherType: 'Journal', transactionDate: today, credit: 4500 });

        // C. HRMS & EXPENSE INTEGRATION
        console.log('💸 Executing HRMS Expense Integration...');
        const salaryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Salaries & Wages'")).rows[0].id;
        const bankAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Bank Account'")).rows[0].id;

        const expVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U2/EXP/001', $3, 'Payment', 'POSTED')`, [expVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: salaryAcc, voucherId: expVchId, voucherType: 'Payment', transactionDate: today, debit: 55000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: expVchId, voucherType: 'Payment', transactionDate: today, credit: 55000, narration: 'Payroll - John Operations' });

        await client.query('COMMIT');
        console.log('🌌 MASTER UNIVERSE SEED (V2) COMPLETED SUCCESSFULLY.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ UNIVERSE SEED FAILED:', error);
    } finally {
        client.release();
        process.exit();
    }
}

masterUniverseSeed();
