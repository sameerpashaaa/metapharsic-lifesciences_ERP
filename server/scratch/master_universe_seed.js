const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function masterUniverseSeed() {
    console.log('🌌 INITIALIZING THE MASTER UNIVERSE SEED...');
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
            INSERT INTO employees (id, employee_id, first_name, last_name, department, designation, salary_type, monthly_salary, status)
            VALUES ($1, 'EMP001', 'John', 'Sales', 'Sales', 'Executive', 'Fixed', 45000, 'Active')
        `, [emp1Id]);

        // 2. CRM Leads & Customer Conversion
        console.log('🎯 Seeding CRM Leads...');
        const leadId = uuidv4();
        await client.query(`
            INSERT INTO crm_leads (id, company_id, contact_name, company_name, email, phone, source, status)
            VALUES ($1, $2, 'Alice Johnson', 'Johnson Pharma', 'alice@johnson.com', '9876543210', 'Web', 'Converted')
        `, [leadId, companyId]);

        // Convert lead to regular Customer Account
        const customerId = uuidv4();
        await client.query(`
            INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, account_group)
            VALUES ($1, $2, 'U_CUST_01', 'ALICE_JOHNSON_PHARMA', 'Asset', 'Sundry Debtors')
        `, [customerId, companyId]);

        // 3. Products
        console.log('📦 Seeding Universe Products...');
        const prodId = uuidv4();
        await client.query(`
            INSERT INTO products (id, name, code, uom, category, mrp, purchase_rate, sale_rate)
            VALUES ($1, 'UNIVERSE_SYRINGE_5ML', 'UNIV-S05', 'Nos', 'Surgical', 15.00, 5.00, 12.00)
        `, [prodId]);

        // ---------------------------------------------------------
        // 🔄 PHASE 2: INTEGRATED BUSINESS CYCLES
        // ---------------------------------------------------------

        // A. PURCHASE CYCLE (Stock In + Accounts Payable)
        console.log('🛒 Executing Integrated Purchase Cycle...');
        const supplierId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_SUPPLIER_GLOBAL'")).rows[0].id;
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc';
        const inventoryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Inventory'")).rows[0].id;

        const purchaseVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U/PUR/001', $3, 'Purchase', 'POSTED')`, [purchaseVchId, companyId, lastMonth]);
        
        // Stock In 2000 units @ 5
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'IN', referenceType: 'Purchase', referenceId: purchaseVchId, referenceNumber: 'U/PUR/001', quantity: 2000, costPerUnit: 5, movementDate: lastMonth });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: purchaseVchId, voucherType: 'Purchase', transactionDate: lastMonth, debit: 10000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: purchaseVchId, voucherType: 'Purchase', transactionDate: lastMonth, credit: 10000 });

        // B. SALES CYCLE (Lead -> Order -> Stock Out -> GL)
        console.log('📦 Executing Integrated Sales Cycle...');
        const salesAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'")).rows[0].id;
        const cogsAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Cost of Goods Sold'")).rows[0].id;
        
        const saleVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U/SALE/001', $3, 'Sales', 'POSTED')`, [saleVchId, companyId, today]);
        
        // Stock Out 500 units @ 12
        await postToStockLedger(client, { companyId, godownId, productId: prodId, movementType: 'OUT', referenceType: 'Sales', referenceId: saleVchId, referenceNumber: 'U/SALE/001', quantity: 500, costPerUnit: 5, movementDate: today });
        await postToGeneralLedger(client, { accountId: customerId, voucherId: saleVchId, voucherType: 'Sales', transactionDate: today, debit: 6000 }); // 500 * 12
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: saleVchId, voucherType: 'Sales', transactionDate: today, credit: 6000 });
        
        // COGS Entry (Auto-calculated)
        await postToGeneralLedger(client, { accountId: cogsAcc, voucherId: saleVchId, voucherType: 'Journal', transactionDate: today, debit: 2500 }); // 500 * 5
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: saleVchId, voucherType: 'Journal', transactionDate: today, credit: 2500 });

        // C. HRMS & PAYROLL INTEGRATION
        console.log('💸 Executing HRMS Payroll Integration...');
        const salaryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Salaries & Wages'")).rows[0].id;
        const bankAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Bank Account'")).rows[0].id;

        const payrollId = uuidv4();
        await client.query(`
            INSERT INTO payroll_entries (id, employee_id, month, year, basic_salary, net_salary, status)
            VALUES ($1, $2, 'April', 2026, 45000, 45000, 'Paid')
        `, [payrollId, emp1Id]);

        const payVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'U/PAY/001', $3, 'Payment', 'POSTED')`, [payVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: salaryAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, debit: 45000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, credit: 45000, narration: 'Monthly Payroll - John Sales' });

        await client.query('COMMIT');
        console.log('🌌 MASTER UNIVERSE SEED COMPLETED SUCCESSFULLY.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ UNIVERSE SEED FAILED:', error);
    } finally {
        client.release();
        process.exit();
    }
}

masterUniverseSeed();
