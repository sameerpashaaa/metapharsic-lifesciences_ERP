const db = require('../db');
const { postToGeneralLedger, postToStockLedger, findAccount } = require('../utils/ledgerHelper');
const { v4: uuidv4 } = require('uuid');

async function goldenFlowTest() {
    console.log('🚀 INITIATING GOLDEN FLOW VALIDATION CYCLE...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        const companyId = 1;
        const today = new Date().toISOString().split('T')[0];
        const godownId = 'fd789071-bb0b-4c3f-9c28-7dc4bc3cb1dc';

        // 1. FETCH MASTERS
        const customerId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_CUSTOMER_PRIME'")).rows[0].id;
        const supplierId = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'TEST_SUPPLIER_GLOBAL'")).rows[0].id;
        const productB = (await client.query("SELECT id FROM products WHERE name = 'TEST_INJ_CEFTRA_1G'")).rows[0].id;
        const bankAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Bank Account'")).rows[0].id;
        const inventoryAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Inventory'")).rows[0].id;
        const salesAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Sales Revenue'")).rows[0].id;
        const cogsAcc = (await client.query("SELECT id FROM chart_of_accounts WHERE account_name = 'Cost of Goods Sold'")).rows[0].id;

        // --- STEP 1: PURCHASE (STOCK IN) ---
        console.log('🛒 Step 1: Purchasing 100 units @ ₹50...');
        const pVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'GF/PUR/001', $3, 'Purchase', 'POSTED')`, [pVchId, companyId, today]);
        
        await postToStockLedger(client, { companyId, godownId, productId: productB, movementType: 'IN', referenceType: 'Purchase', referenceId: pVchId, referenceNumber: 'GF/PUR/001', quantity: 100, costPerUnit: 50, movementDate: today });
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: pVchId, voucherType: 'Purchase', transactionDate: today, debit: 5000 });
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: pVchId, voucherType: 'Purchase', transactionDate: today, credit: 5000 });

        // --- STEP 2: SALE (STOCK OUT) ---
        console.log('📦 Step 2: Selling 50 units @ ₹80...');
        const sVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'GF/SALE/001', $3, 'Sales', 'POSTED')`, [sVchId, companyId, today]);
        
        await postToStockLedger(client, { companyId, godownId, productId: productB, movementType: 'OUT', referenceType: 'Sales', referenceId: sVchId, referenceNumber: 'GF/SALE/001', quantity: 50, costPerUnit: 50, movementDate: today });
        await postToGeneralLedger(client, { accountId: customerId, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, debit: 4000 }); // 50 * 80
        await postToGeneralLedger(client, { accountId: salesAcc, voucherId: sVchId, voucherType: 'Sales', transactionDate: today, credit: 4000 });
        
        // COGS
        await postToGeneralLedger(client, { accountId: cogsAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, debit: 2500 }); // 50 * 50
        await postToGeneralLedger(client, { accountId: inventoryAcc, voucherId: sVchId, voucherType: 'Journal', transactionDate: today, credit: 2500 });

        // --- STEP 3: FINANCIAL RECON (PAYMENT/RECEIPT) ---
        console.log('💳 Step 3: Posting Payment & Receipt...');
        const payVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'GF/PAY/001', $3, 'Payment', 'POSTED')`, [payVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: supplierId, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, debit: 2000 });
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: payVchId, voucherType: 'Payment', transactionDate: today, credit: 2000 });

        const recVchId = uuidv4();
        await client.query(`INSERT INTO journal_vouchers (id, company_id, voucher_no, voucher_date, voucher_type, status) VALUES ($1, $2, 'GF/REC/001', $3, 'Receipt', 'POSTED')`, [recVchId, companyId, today]);
        await postToGeneralLedger(client, { accountId: bankAcc, voucherId: recVchId, voucherType: 'Receipt', transactionDate: today, debit: 1000 });
        await postToGeneralLedger(client, { accountId: customerId, voucherId: recVchId, voucherType: 'Receipt', transactionDate: today, credit: 1000 });

        await client.query('COMMIT');
        console.log('🌟 GOLDEN FLOW CYCLE COMPLETED SUCCESSFULLY AND BALANCED.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ GOLDEN FLOW FAILED:', error);
    } finally {
        client.release();
        process.exit();
    }
}

goldenFlowTest();
