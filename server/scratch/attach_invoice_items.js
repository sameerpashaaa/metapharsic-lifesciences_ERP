const db = require('../db');
const { randomUUID } = require('crypto');

async function attachItems() {
    const invId = 'a7db62ac-099a-4208-b512-b10d30cc77fd';
    console.log(`--- ATTACHING ITEMS TO INVOICE: ${invId} ---`);
    
    try {
        const productId = (await db.query("SELECT id FROM products LIMIT 1")).rows[0]?.id;

        if (productId) {
            await db.query(`
                INSERT INTO sales_invoice_items (
                    id, invoice_id, product_id, quantity, rate, total_amount, sales_invoice_id, selling_rate, 
                    mrp, taxable_value, gst_percent, cgst_amount, sgst_amount, igst_amount
                ) VALUES ($1, $2, $3, 100, 2500, 250000, $2, 2500, 2500, 250000, 18, 0, 0, 0)
            `, [randomUUID(), invId, productId]);
            console.log('✅ Created Sales Invoice Item');
        }

        console.log('--- LINKING COMPLETE ---');
    } catch (e) {
        console.error('❌ Linking Failed:', e.message);
    } finally {
        process.exit();
    }
}

attachItems();
