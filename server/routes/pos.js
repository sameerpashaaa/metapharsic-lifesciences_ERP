const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { verifyTokenMiddleware, verifyRoleMiddleware } = require('../utils/jwt');
const logger = require('../utils/logger');
const ledgerHelper = require('../utils/ledgerHelper');

// Middleware
router.use(verifyTokenMiddleware);
router.use(verifyRoleMiddleware(['ADMIN', 'PHARMACIST', 'SALES_MANAGER', 'ACCOUNTANT']));

/**
 * GET /api/pos/parties
 * Fetch customers/debtors for POS billing
 */
router.get('/parties', async (req, res) => {
    try {
        const { rows } = await db.query(
            "SELECT id, name, mobile, current_balance FROM parties WHERE type = 'Debtor' AND status = 'Active' ORDER BY name"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pos/invoices
 * List all invoices
 */
router.get('/invoices', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT si.*, u.name as created_by_name 
             FROM sales_invoices si 
             LEFT JOIN users u ON si.created_by = u.id 
             ORDER BY si.date DESC, si.created_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pos/invoices/:id
 * Fetch single invoice with items (Robust lookup)
 */
router.get('/invoices/:id', async (req, res) => {
    try {
        const id = req.params.id ? req.params.id.trim() : null;
        if (!id) return res.status(400).json({ success: false, error: 'ID is required' });

        let invoice;

        // 1. Try direct ID lookup (handles UUID or string ID)
        try {
            const { rows } = await db.query(
                `SELECT si.*, u.name as created_by_name 
                 FROM sales_invoices si 
                 LEFT JOIN users u ON si.created_by = u.id 
                 WHERE si.id::text = $1`,
                [id]
            );
            if (rows.length > 0) invoice = rows[0];
        } catch (e) {
            // Likely invalid UUID format error, ignore and try next
            logger.debug('ID lookup failed, trying invoice_number');
        }

        // 2. If not found by ID, try lookup by invoice_number or invoice_no
        if (!invoice) {
            const { rows } = await db.query(
                `SELECT si.*, u.name as created_by_name 
                 FROM sales_invoices si 
                 LEFT JOIN users u ON si.created_by = u.id 
                 WHERE si.invoice_number = $1 OR si.invoice_no = $1 OR si.id::text = $1`,
                [id]
            );
            if (rows.length > 0) invoice = rows[0];
        }

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        // Fetch items with product and batch details (Flexible column naming)
        const { rows: items } = await db.query(
            `SELECT sii.*, p.name as product_name, p.generic_name, 
             b.id as batch_id, b.expiry_date
             FROM sales_invoice_items sii
             LEFT JOIN products p ON sii.product_id = p.id
             LEFT JOIN batches b ON sii.batch_id = b.id
             WHERE sii.invoice_id = $1 OR sii.sales_invoice_id = $1`,
            [invoice.id]
        );

        // Map items to include batch number regardless of column name
        const fullItems = await Promise.all(items.map(async (item) => {
            if (item.batch_id) {
                const { rows: [batch] } = await db.query('SELECT * FROM batches WHERE id = $1', [item.batch_id]);
                if (batch) {
                    return {
                        ...item,
                        batch_number: batch.batch_number || batch.batch_no || '-',
                        batch_no: batch.batch_number || batch.batch_no || '-'
                    };
                }
            }
            return { ...item, batch_number: '-', batch_no: '-' };
        }));

        invoice.items = fullItems;
        res.json({ success: true, data: invoice });
    } catch (error) {
        logger.error('POS Invoice Details Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/pos/invoices
 * Create a new Sales Invoice with Transactional Integrity
 */
router.post('/invoices', async (req, res) => {
    const client = await db.pool.connect();
    try {
        // Hardened parameter extraction protecting against varying property naming conventions
        const invoice_number = req.body.invoice_number || req.body.invoice_no;
        const date = req.body.date || req.body.invoice_date || new Date();
        const customer_name = req.body.customer_name || req.body.party_name || req.body.patient_name || 'Counter Customer';
        const customer_mobile = req.body.customer_mobile || '';
        const doctor_name = req.body.doctor_name || '';
        const payment_mode = req.body.payment_mode || 'Cash';
        const sub_total = Number(req.body.sub_total || req.body.net_payable || req.body.net_amount || 0);
        const taxable_value = Number(req.body.taxable_value || req.body.total_taxable || sub_total);
        const total_gst = Number(req.body.total_gst || (sub_total - taxable_value) || 0);
        const total_discount = Number(req.body.total_discount || 0);
        const round_off = Number(req.body.round_off || 0);
        const net_amount = Number(req.body.net_amount || req.body.net_payable || sub_total);
        const items = req.body.items || [];
        const party_id = req.body.party_id || null;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'No items provided' });
        }

        await client.query('BEGIN');

        const companyId = req.user?.companyId || 1;
        const userId = req.user?.userId || req.user?.id;

        // 1. Create Invoice Header
        const invoiceResult = await client.query(
            `INSERT INTO sales_invoices (
                invoice_number, date, customer_name, customer_mobile, doctor_name, 
                payment_mode, sub_total, taxable_value, total_gst, total_discount, 
                round_off, net_amount, status, created_by, party_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id`,
            [
                invoice_number, date, customer_name, customer_mobile, doctor_name,
                payment_mode, sub_total, taxable_value, total_gst, total_discount,
                round_off, net_amount, 'Completed', userId, party_id
            ]
        );
        const invoiceId = invoiceResult.rows[0].id;

        // 2. Create Journal Voucher record for Sales
        const voucherId = uuidv4();
        await client.query(
            `INSERT INTO journal_vouchers (
                id, company_id, party_id, voucher_type, voucher_no, voucher_date, 
                narration, total_debit, total_credit, status, created_by
            ) VALUES ($1, $2, $3, 'Sales', $4, $5, $6, $7, $8, 'Posted', $9)`,
            [voucherId, companyId, party_id, invoice_number, date, `Sales Invoice ${invoice_number}`, net_amount, net_amount, userId]
        );

        // 3. Process Items & Stock Ledger
        for (const item of items) {
            // Apply defensive property extraction to shield from property-casing mismatches
            const itemRate = Number(item.rate || item.selling_rate || 0);
            const itemTaxable = Number(item.taxable_value || item.amount || item.total_amount || (item.quantity * itemRate) || 0);
            const itemTotal = Number(item.total_amount || item.totalAmount || (item.quantity * itemRate) || 0);
            const itemGst = Number(item.gst_percent || item.gstPercent || 0);
            const dbProductId = (item.product_id && item.product_id !== 'manual' && item.product_id !== 'undefined') ? item.product_id : null;
            const dbBatchId = (item.batch_id && item.batch_id !== 'undefined') ? item.batch_id : null;

            await client.query(
                `INSERT INTO sales_invoice_items (
                    invoice_id, product_id, batch_id, quantity, mrp, rate, 
                    discount_percent, discount_amount, taxable_value, gst_percent, total_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    invoiceId, 
                    dbProductId, 
                    dbBatchId, 
                    Number(item.quantity || 0), 
                    Number(item.mrp || itemRate), 
                    itemRate,
                    Number(item.discount_percent || 0), 
                    Number(item.discount_amount || item.discount || 0), 
                    itemTaxable, 
                    itemGst, 
                    itemTotal
                ]
            );

            // Post to Stock Ledger IF verified product is present
            if (dbProductId) {
                await ledgerHelper.postToStockLedger(client, {
                    companyId,
                    productId: dbProductId,
                    batchId: dbBatchId,
                    movementType: 'OUT',
                    referenceType: 'Sale',
                    referenceId: invoiceId,
                    referenceNumber: invoice_number,
                    quantity: Number(item.quantity || 0),
                    movementDate: date,
                    narration: `POS Sale: ${invoice_number}`,
                    createdBy: userId
                });
            }
        }

        // 4. General Ledger Postings
        const salesAcct = await ledgerHelper.findAccount(client, companyId, 'Sales');
        const taxAcct = await ledgerHelper.findAccount(client, companyId, 'GST Payable');
        let debitAcct;
        
        if (payment_mode === 'Cash') debitAcct = await ledgerHelper.findAccount(client, companyId, 'Cash in Hand');
        else if (payment_mode === 'Credit') debitAcct = await ledgerHelper.findAccount(client, companyId, 'Sundry Debtors');
        else debitAcct = await ledgerHelper.findAccount(client, companyId, 'Bank Accounts');

        // A. Debit Party/Cash/Bank
        await ledgerHelper.postToGeneralLedger(client, {
            accountId: debitAcct,
            partyId: payment_mode === 'Credit' ? party_id : null,
            voucherId: voucherId,
            voucherType: 'Sales',
            transactionDate: date,
            debit: net_amount,
            credit: 0,
            narration: `Invoice ${invoice_number}`
        });

        // B. Credit Sales
        await ledgerHelper.postToGeneralLedger(client, {
            accountId: salesAcct,
            voucherId: voucherId,
            voucherType: 'Sales',
            transactionDate: date,
            debit: 0,
            credit: taxable_value,
            narration: `Taxable Sales: ${invoice_number}`
        });

        // C. Credit GST
        if (total_gst > 0) {
            await ledgerHelper.postToGeneralLedger(client, {
                accountId: taxAcct,
                voucherId: voucherId,
                voucherType: 'Sales',
                transactionDate: date,
                debit: 0,
                credit: total_gst,
                narration: `GST on Sales: ${invoice_number}`
            });
        }

        await client.query('COMMIT');
        res.json({ success: true, invoiceId, invoice_number });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('POS Invoice Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

/**
 * POST /api/pos/returns
 * Create a Sales Return with Stock Reversal
 */
router.post('/returns', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const {
            invoice_no, // Return memo number
            invoice_date,
            party_name,
            items,
            net_payable,
            total_taxable,
            party_id
        } = req.body;

        await client.query('BEGIN');
        const companyId = req.user?.companyId || 1;
        const userId = req.user?.userId || req.user?.id;

        const voucherId = uuidv4();
        // 1. Create Return Voucher Header
        await client.query(
            `INSERT INTO journal_vouchers (
                id, company_id, party_id, voucher_type, voucher_no, voucher_date, 
                narration, total_debit, total_credit, status, created_by
            ) VALUES ($1, $2, $3, 'Sales Return', $4, $5, $6, $7, $8, 'Posted', $9)`,
            [voucherId, companyId, party_id, invoice_no, invoice_date, `Sales Return: ${invoice_no}`, net_payable, net_payable, userId]
        );

        // 2. Process Items & Revert Stock
        for (const item of items) {
            await client.query("UPDATE batches SET stock = stock + $1 WHERE id = $2", [item.quantity, item.batch_id]);
            
            await ledgerHelper.postToStockLedger(client, {
                companyId,
                productId: item.product_id,
                batchId: item.batch_id,
                movementType: 'IN',
                referenceType: 'Return',
                referenceId: voucherId,
                referenceNumber: invoice_no,
                quantity: item.quantity,
                movementDate: invoice_date,
                narration: `Sales Return: ${invoice_no}`,
                createdBy: userId
            });
        }

        // 3. Accounting Entries
        const salesReturnAcct = await ledgerHelper.findAccount(client, companyId, 'Sales Returns') || await ledgerHelper.findAccount(client, companyId, 'Sales');
        const taxAcct = await ledgerHelper.findAccount(client, companyId, 'GST Payable');
        const partyAcct = await ledgerHelper.findAccount(client, companyId, 'Sundry Debtors');

        // A. Debit Sales Return
        await ledgerHelper.postToGeneralLedger(client, {
            accountId: salesReturnAcct,
            voucherId: voucherId,
            voucherType: 'Sales Return',
            transactionDate: invoice_date,
            debit: total_taxable,
            credit: 0,
            narration: `Return taxable: ${invoice_no}`
        });

        // B. Debit GST
        const totalGst = net_payable - total_taxable;
        if (totalGst > 0) {
            await ledgerHelper.postToGeneralLedger(client, {
                accountId: taxAcct,
                voucherId: voucherId,
                voucherType: 'Sales Return',
                transactionDate: invoice_date,
                debit: totalGst,
                credit: 0,
                narration: `Return GST: ${invoice_no}`
            });
        }

        // C. Credit Party
        await ledgerHelper.postToGeneralLedger(client, {
            accountId: partyAcct,
            partyId: party_id,
            voucherId: voucherId,
            voucherType: 'Sales Return',
            transactionDate: invoice_date,
            debit: 0,
            credit: net_payable,
            narration: `Return to Party: ${invoice_no}`
        });

        await client.query('COMMIT');
        res.json({ success: true, message: 'Return processed successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/pos/invoices/:id
 */
router.delete('/invoices/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Get Invoice Details
        const { rows: [invoice] } = await client.query("SELECT * FROM sales_invoices WHERE id = $1", [req.params.id]);
        if (!invoice) throw new Error('Invoice not found');

        // 2. Find linked Journal Voucher
        const { rows: [jv] } = await client.query("SELECT id FROM journal_vouchers WHERE voucher_no = $1 AND voucher_type = 'Sales'", [invoice.invoice_number]);
        
        // 3. Revert Stock
        const { rows: items } = await client.query("SELECT * FROM sales_invoice_items WHERE invoice_id = $1", [req.params.id]);
        for (const item of items) {
            await client.query("UPDATE batches SET stock = stock + $1 WHERE id = $2", [item.quantity, item.batch_id]);
        }

        // 4. Clear Ledger Entries using helper
        // Pass stock lookup parameters explicitly to guarantee clean deletion of stock records
        await ledgerHelper.clearLedgerEntries(client, jv ? jv.id : null, 'Sales', { 
            stockRefId: req.params.id, 
            stockRefType: 'Sale' 
        });

        if (jv) {
            await client.query("DELETE FROM journal_vouchers WHERE id = $1", [jv.id]);
        }

        // 5. Delete Invoice
        await client.query("DELETE FROM sales_invoices WHERE id = $1", [req.params.id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Invoice and accounting entries deleted' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

/**
 * GET /api/pos/dashboard-summary
 */
router.get('/dashboard-summary', async (req, res) => {
    try {
        const todayResult = await db.query("SELECT COALESCE(SUM(net_amount), 0) as revenue, COUNT(*) as count FROM sales_invoices WHERE date::date = CURRENT_DATE");
        const yesterdayResult = await db.query("SELECT COALESCE(SUM(net_amount), 0) as revenue FROM sales_invoices WHERE date::date = CURRENT_DATE - INTERVAL '1 day'");
        const monthlyResult = await db.query("SELECT COALESCE(SUM(net_amount), 0) as revenue FROM sales_invoices WHERE date >= date_trunc('month', CURRENT_DATE)");
        const itemsResult = await db.query(`
            SELECT COALESCE(SUM(quantity), 0) as items 
            FROM sales_invoice_items sii 
            JOIN sales_invoices si ON sii.invoice_id = si.id 
            WHERE si.date::date = CURRENT_DATE
        `);
        const recentResult = await db.query(`
            SELECT si.*, u.name as created_by_name 
            FROM sales_invoices si 
            LEFT JOIN users u ON si.created_by = u.id 
            ORDER BY si.created_at DESC LIMIT 10
        `);

        const todayRevenue = parseFloat(todayResult.rows[0]?.revenue || 0);
        const yesterdayRevenue = parseFloat(yesterdayResult.rows[0]?.revenue || 0);
        const changePercent = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

        res.json({
            success: true,
            data: {
                todayRevenue,
                yesterdayRevenue,
                revenueChangePercent: changePercent,
                invoicesGenerated: parseInt(todayResult.rows[0]?.count || 0),
                itemsSoldToday: parseInt(itemsResult.rows[0]?.items || 0),
                pendingDrafts: 0,
                monthlyRevenue: parseFloat(monthlyResult.rows[0]?.revenue || 0),
                recentInvoices: recentResult.rows,
                tables: ['sales_invoices', 'sales_invoice_items', 'parties']
            }
        });
    } catch (error) {
        logger.error('POS Dashboard Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pos/voucher-types
 */
router.get('/voucher-types', async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM voucher_types ORDER BY name");
        if (rows.length === 0) {
            return res.json({
                success: true,
                data: [
                    { name: 'Sales', type_of_voucher: 'Sales', abbreviation: 'Sales' },
                    { name: 'Payment', type_of_voucher: 'Payment', abbreviation: 'Pymt' },
                    { name: 'Receipt', type_of_voucher: 'Receipt', abbreviation: 'Rcpt' },
                    { name: 'Contra', type_of_voucher: 'Contra', abbreviation: 'Cont' },
                    { name: 'Journal', type_of_voucher: 'Journal', abbreviation: 'Jv' }
                ]
            });
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error('POS VoucherTypes Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/pos/products
 * Fetches all active products with nested available stock batches for integration
 */
router.get('/products', async (req, res) => {
    try {
        const { rows: products } = await db.query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY name');
        const fullProducts = await Promise.all(products.map(async (p) => {
            // Use SELECT * to be flexible with column names (stock vs quantity vs available_qty)
            const { rows: batches } = await db.query(
                'SELECT * FROM batches WHERE product_id = $1 ORDER BY expiry_date ASC',
                [p.id]
            );

            // Filter available batches in memory to be schema-agnostic
            const availableBatches = batches.filter(b => (b.stock || b.quantity || b.available_qty || 0) > 0);

            return {
                id: p.id,
                name: p.name,
                genericName: p.generic_name,
                packing: p.packing,
                uom: p.uom,
                hsn: p.hsn,
                gst: parseFloat(p.gst || 12),
                scheduleType: p.schedule_type,
                totalStock: parseInt(p.current_stock || 0),
                batches: availableBatches.map(b => ({
                    id: b.id,
                    batchNumber: b.batch_number || b.batch_no,
                    expiryDate: b.expiry_date,
                    stock: parseInt(b.stock || b.available_qty || b.quantity || 0),
                    mrp: parseFloat(b.mrp || 0),
                    purchaseRate: parseFloat(b.purchase_rate || 0),
                    sellingRate: parseFloat(b.selling_rate || 0)
                }))
            };
        }));
        res.json({ success: true, data: fullProducts });
    } catch (error) {
        logger.error('POS Products Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
