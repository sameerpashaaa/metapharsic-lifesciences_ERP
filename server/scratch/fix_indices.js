const db = require('../db');
async function fixIndices() {
    console.log('🏗️ ADDING ANALYTICAL INDICES...');
    try {
        await db.query('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales_invoices(created_at)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_sii_product_id ON sales_invoice_items(product_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_gl_account_date ON general_ledger(account_id, transaction_date)');
        console.log('✅ INDICES ADDED SUCCESSFULLY.');
    } catch (e) {
        console.error('❌ FAILED TO ADD INDICES:', e);
    }
    process.exit();
}
fixIndices();
