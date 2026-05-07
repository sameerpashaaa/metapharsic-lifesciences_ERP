const db = require('../db');

async function debugInvoice() {
    const invNo = 'INV/2024-25/001';
    console.log(`--- DEBUGGING INVOICE: ${invNo} ---`);
    
    try {
        // 1. Check sales_invoices
        const header = await db.query("SELECT * FROM sales_invoices WHERE invoice_no = $1 OR invoice_number = $1", [invNo]);
        console.log('Header found:', header.rows.length > 0 ? 'YES' : 'NO');
        if (header.rows.length > 0) console.table(header.rows);

        // 2. Check general_ledger
        const ledger = await db.query("SELECT * FROM general_ledger WHERE bill_reference = $1", [invNo]);
        console.log('Ledger entries found:', ledger.rows.length);
        if (ledger.rows.length > 0) console.table(ledger.rows);

        // 3. Check journal_vouchers
        const jv = await db.query("SELECT * FROM journal_vouchers WHERE voucher_no = $1", [invNo]);
        console.log('Journal Vouchers found:', jv.rows.length);
        if (jv.rows.length > 0) console.table(jv.rows);

        // 4. Check sales_invoices (Partial match)
        const partial = await db.query("SELECT id, invoice_no FROM sales_invoices WHERE invoice_no LIKE $1", [`%${invNo}%`]);
        console.log('Partial matches in sales_invoices:', partial.rows.length);
        if (partial.rows.length > 0) console.table(partial.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugInvoice();
