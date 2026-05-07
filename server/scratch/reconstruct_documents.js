const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function reconstructDocuments() {
    console.log('🏗️  RE-INITIATING RECONSTRUCTION ENGINE (V4 - SCHEMA PERFECT)...');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        // 1. Fetch Stress Test Vouchers
        const vchRes = await client.query(`
            SELECT id, voucher_no, voucher_date, voucher_type, company_id 
            FROM journal_vouchers 
            WHERE voucher_no LIKE 'STR/%'
        `);
        
        console.log(`🔍 Found ${vchRes.rows.length} stress-test vouchers.`);
        
        let salesCount = 0;
        let purchaseCount = 0;
        let expenseCount = 0;

        const userId = 'c412fb69-de47-42f6-ba03-e9673f4c08b2'; 

        for (const vch of vchRes.rows) {
            const glRes = await client.query(`
                SELECT gl.*, coa.account_type, coa.account_name 
                FROM general_ledger gl
                JOIN chart_of_accounts coa ON gl.account_id = coa.id
                WHERE gl.voucher_id = $1
            `, [vch.id]);

            const entries = glRes.rows;

            if (vch.voucher_type === 'Sales') {
                const revenueEntry = entries.find(e => parseFloat(e.credit) > 0);
                if (revenueEntry) {
                    const partyRes = await client.query("SELECT id FROM parties WHERE name = 'GLOBAL_DISTRIBUTION_CORP' LIMIT 1");
                    const partyId = partyRes.rows[0]?.id;

                    await client.query(`
                        INSERT INTO sales_invoices (id, invoice_no, invoice_number, party_id, invoice_date, date, net_payable, net_amount, invoice_type, status, created_at, created_by)
                        VALUES ($1, $2, $2, $3, $4, $4, $5, $5, 'Wholesale', 'Completed', $6, $7)
                        ON CONFLICT (id) DO NOTHING
                    `, [vch.id, vch.voucher_no, partyId, vch.voucher_date, parseFloat(revenueEntry.credit), vch.voucher_date, userId]);

                    const prodRes = await client.query("SELECT id FROM products WHERE name = 'STRESS_TEST_PAPER' LIMIT 1");
                    const productId = prodRes.rows[0]?.id;
                    if (productId) {
                        await client.query(`
                            INSERT INTO sales_invoice_items (id, invoice_id, product_id, quantity, rate, amount)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT DO NOTHING
                        `, [uuidv4(), vch.id, productId, 200, 850, parseFloat(revenueEntry.credit)]);
                    }
                    salesCount++;
                }
            } else if (vch.voucher_type === 'Purchase') {
                const supplierRes = await client.query("SELECT id FROM parties WHERE type = 'Supplier' LIMIT 1");
                const supplierId = supplierRes.rows[0]?.id;
                const total = entries.find(e => parseFloat(e.debit) > 0)?.debit || 0;

                await client.query(`
                    INSERT INTO purchase_orders (id, invoice_no, supplier_id, order_date, status, created_by, created_at, company_id)
                    VALUES ($1, $2, $3, $4, 'Received', $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                `, [vch.id, vch.voucher_no, supplierId, vch.voucher_date, userId, vch.voucher_date, vch.company_id]);
                purchaseCount++;
            } else if (vch.voucher_type === 'Payment' && vch.voucher_no.includes('STR/PAY')) {
                const amount = entries.find(e => parseFloat(e.debit) > 0)?.debit || 0;
                
                // Expense schema: id, category, description, amount, date, paid_by, payment_mode, created_at
                await client.query(`
                    INSERT INTO expenses (id, category, description, amount, date, paid_by, payment_mode, created_at)
                    VALUES ($1, 'Salaries', 'STRESS_TEST_PAYROLL_SYNC', $2, $3, $4, 'Bank Transfer', $5)
                    ON CONFLICT (id) DO NOTHING
                `, [vch.id, amount, vch.voucher_date, userId, vch.voucher_date]);
                expenseCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ SYNC COMPLETE.`);
        console.log(`📊 Stats: ${salesCount} Invoices, ${purchaseCount} Purchases, ${expenseCount} Expenses backfilled.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SYNC FAILED:', e);
    } finally {
        client.release();
        process.exit();
    }
}

reconstructDocuments();
