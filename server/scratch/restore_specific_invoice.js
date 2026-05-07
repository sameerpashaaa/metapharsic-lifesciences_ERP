const db = require('../db');
const { randomUUID } = require('crypto');

async function restoreInvoice() {
    const invNo = 'INV/2024-25/001';
    console.log(`--- RESTORING INVOICE LINK: ${invNo} ---`);
    
    try {
        const partyRes = await db.query("SELECT id FROM parties WHERE name = 'GLOBAL_DISTRIBUTION_CORP' LIMIT 1");
        const partyId = partyRes.rows[0]?.id || null;
        
        const productId = (await db.query("SELECT id FROM products LIMIT 1")).rows[0]?.id;

        // 1. Create Sales Invoice Header
        const invId = randomUUID();
        await db.query(`
            INSERT INTO sales_invoices (
                id, invoice_number, invoice_no, party_id, invoice_date, date, 
                net_payable, net_amount, invoice_type, status, created_at
            ) VALUES ($1, $2, $2, $3, '2025-04-30', '2025-04-30', 250000, 250000, 'Wholesale', 'Completed', NOW())
        `, [invId, invNo, partyId]);
        
        console.log('✅ Created Sales Invoice Header');

        // 2. Create Sales Invoice Items
        if (productId) {
            await db.query(`
                INSERT INTO sales_invoice_items (
                    id, invoice_id, product_id, quantity, rate, total_amount, created_at
                ) VALUES ($1, $2, $3, 100, 2500, 250000, NOW())
            `, [randomUUID(), invId, productId]);
            console.log('✅ Created Sales Invoice Item');
        }

        console.log('--- RESTORATION COMPLETE ---');
    } catch (e) {
        console.error('❌ Restoration Failed:', e.message);
    } finally {
        process.exit();
    }
}

restoreInvoice();
