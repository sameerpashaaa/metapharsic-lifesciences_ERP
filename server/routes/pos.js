const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyTokenMiddleware, verifyRoleMiddleware } = require('../utils/jwt');
const logger = require('../utils/logger');
console.log('✅ POS Routes module loaded and initializing...');

// Middleware
router.use(verifyTokenMiddleware);
router.use(verifyRoleMiddleware(['ADMIN', 'PHARMACIST', 'POS_OPERATOR']));

/**
 * GET /api/pos/invoices
 * Fetch all sales invoices with pagination and filters
 */
router.get('/invoices', async (req, res) => {
  try {
    const { search = '', status = 'All', page = 1, limit = 20, dateFrom = '', dateTo = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT si.*, p.name as party_name,
             COUNT(sii.id) as item_count,
             SUM(sii.quantity * sii.rate) as total_amount
      FROM sales_invoices si
      LEFT JOIN parties p ON si.party_id = p.id
      LEFT JOIN sales_invoice_items sii ON si.id = sii.invoice_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (si.invoice_number ILIKE $${params.length + 1} 
                  OR p.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (status !== 'All') {
      query += ` AND si.status = $${params.length + 1}`;
      params.push(status);
    }

    if (dateFrom) {
      query += ` AND si.invoice_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND si.invoice_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    query += ` GROUP BY si.id, p.name
              ORDER BY si.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM sales_invoices WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ` AND (invoice_number ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }
    if (status !== 'All') {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    const { rows: countRows } = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countRows[0].count),
        pages: Math.ceil(parseInt(countRows[0].count) / limit)
      }
    });

    logger.http('GET', '/api/pos/invoices', 200, rows.length, req.ip, req.user.userId);
  } catch (error) {
    logger.error('Failed to fetch invoices', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

/**
 * GET /api/pos/invoices/:id
 * Fetch single invoice with items
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: invoice } = await db.query(
      `SELECT si.*, p.* FROM sales_invoices si
       LEFT JOIN parties p ON si.party_id = p.id
       WHERE si.id = $1`,
      [id]
    );

    if (!invoice.length) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const { rows: items } = await db.query(
      `SELECT sii.*, pr.name as product_name, pr.code as product_code
       FROM sales_invoice_items sii
       LEFT JOIN products pr ON sii.product_id = pr.id
       WHERE sii.invoice_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...invoice[0],
        items
      }
    });

    logger.http('GET', `/api/pos/invoices/${id}`, 200, 1, req.ip, req.user.userId);
  } catch (error) {
    logger.error(`Failed to fetch invoice ${id}`, { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

/**
 * GET /api/pos/products
 * Fetch products for POS (active only)
 */
router.get('/products', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, COUNT(b.id) as batch_count,
             SUM(b.quantity) as current_stock
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      WHERE p.is_active = true
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name ILIKE $${params.length + 1} 
                  OR p.code ILIKE $${params.length + 1}
                  OR p.generic_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.id
              ORDER BY p.name
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);

    // Get batches for each product
    const products = await Promise.all(rows.map(async (p) => {
      const { rows: batches } = await db.query(
        `SELECT *,
                batch_no as batch_number,
                batch_no as "batchNumber",
                expiry_date as "expiryDate",
                purchase_rate as "purchaseRate",
                selling_rate as "sellingRate"
         FROM batches 
         WHERE product_id = $1 AND quantity > 0 AND expiry_date > NOW()
         ORDER BY expiry_date ASC`,
        [p.id]
      );
      return { ...p, batches };
    }));

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

    logger.http('GET', '/api/pos/products', 200, products.length, req.ip, req.user.userId);
  } catch (error) {
    logger.error('Failed to fetch POS products', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/pos/parties
 * Fetch all parties/customers
 */
router.get('/parties', async (req, res) => {
  try {
    const { search = '' } = req.query;

    let query = "SELECT id, name, gstin, mobile, type, current_balance as \"currentBalance\", status, address, email, city FROM parties WHERE status = 'Active'";
    const params = [];

    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR gstin ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name LIMIT 100';

    const { rows } = await db.query(query, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error('Failed to fetch parties', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch parties' });
  }
});

/**
 * POST /api/pos/invoices
 * Create new sales invoice
 */
router.post('/invoices', async (req, res) => {
  try {
    const {
      invoice_no,
      invoice_date,
      invoice_type = 'Retail',
      party_id,
      payment_mode = 'Cash',
      party_name,
      party_code,
      items = [],
      total_taxable = 0,
      total_cgst = 0,
      total_sgst = 0,
      total_igst = 0,
      round_off = 0,
      freight_charges = 0,
      net_payable = 0
    } = req.body;

    if (!invoice_no || !invoice_date || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice number, date, and at least one item are required'
      });
    }

    // Create party if not exists (for walk-in customers)
    let finalPartyId = party_id;
    if (!finalPartyId && party_name) {
      const { rows: partyResult } = await db.query(
        `INSERT INTO parties (name, mobile, type, status)
         VALUES ($1, $2, 'Customer', 'Active')
         RETURNING id`,
        [party_name, '']
      );
      finalPartyId = partyResult[0].id;
    }

    // Insert invoice
    const { rows: invoiceResult } = await db.query(
      `INSERT INTO sales_invoices 
       (invoice_number, date, time, invoice_date, party_id, payment_mode, customer_name,
        taxable_value, sub_total, total_gst, round_off, 
        net_payable, net_amount, status, created_by)
       VALUES ($1, $2, CURRENT_TIME, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Completed', $12)
       RETURNING id, invoice_number, created_at`,
      [invoice_no, invoice_date, finalPartyId, payment_mode, party_name,
       total_taxable, total_taxable, (total_cgst + total_sgst + total_igst), round_off,
       net_payable, net_payable, req.user?.userId || null]
    );

    const invoiceId = invoiceResult[0].id;

    // Insert line items
    for (const item of items) {
      await db.query(
        `INSERT INTO sales_invoice_items 
         (invoice_id, product_id, batch_id, quantity, rate, 
          discount_amount, taxable_value, cgst_amount, sgst_amount, igst_amount, mrp, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $11, $7, $8, $9, $10, $11)`,
        [invoiceId, item.product_id === 'manual' ? null : item.product_id, item.batch_id || null, item.quantity, item.selling_rate,
         item.discount || 0, item.cgst_rate || 0, item.sgst_rate || 0, item.igst_rate || 0, item.mrp, item.totalAmount || (item.quantity * item.selling_rate)]
      );

      // Update batch quantity
      if (item.batch_id) {
        await db.query(
          `UPDATE batches SET quantity = quantity - $1 WHERE id = $2`,
          [item.quantity, item.batch_id]
        );
      }
    }

    res.status(201).json({
      success: true,
      data: invoiceResult[0],
      message: 'Invoice created successfully'
    });

    logger.http('POST', '/api/pos/invoices', 201, items.length, req.ip, req.user.userId);
  } catch (error) {
    logger.error('Failed to create invoice', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

/**
 * GET /api/pos/parties/:id
 * Fetch a single party by ID
 */
router.get('/parties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT id, name, mobile, gstin, city, email, address, status FROM parties WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Party not found' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch party', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to fetch party' });
  }
});

/**
 * POST /api/pos/parties
 * Create a new party
 */
router.post('/parties', async (req, res) => {
  try {
    const { name, code, mobile, gstin, city, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Party name is required' });
    }

    const { rows } = await db.query(
      `INSERT INTO parties (name, mobile, gstin, city, email, address, type, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Customer', 'Active')
       RETURNING id, name, mobile, gstin, city, email, address, status`,
      [name, mobile, gstin, city, email, address]
    );

    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('Failed to create party', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create party' });
  }
});

/**
 * PUT /api/pos/parties/:id
 * Update an existing party
 */
router.put('/parties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, gstin, city, email, address, status, type, current_balance } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Party name is required' });
    }

    const { rows } = await db.query(
      `UPDATE parties 
       SET name = $1, mobile = $2, gstin = $3, city = $4, email = $5, address = $6, status = $7, type = $8, current_balance = $9
       WHERE id = $10 
       RETURNING *`,
      [name, mobile, gstin, city, email, address, status || 'Active', type || 'Debtor', current_balance || 0, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Party not found' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('Failed to update party', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update party' });
  }
});

/**
 * GET /api/pos/dropdown
 * Fetch dropdown data for POS
 */
router.get('/lists/dropdown', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        invoiceTypes: ['Retail', 'Wholesale', 'Tax Invoice', 'Bill of Supply', 'Debit Note', 'Credit Note'],
        paymentModes: ['Cash', 'UPI', 'Card', 'Credit', 'Multi'],
        creditTerms: ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'],
        deliveryModes: ['Counter', 'Delivery', 'Courier', 'Chilling']
      }
    });
  } catch (error) {
    logger.error('Failed to fetch dropdown lists', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

/**
 * GET /api/pos/voucher-types
 * Fetch all voucher types
 */
router.get('/voucher-types', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM voucher_types ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Failed to fetch voucher types', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch voucher types' });
  }
});

/**
 * POST /api/pos/voucher-types
 * Create or update a voucher type
 */
router.post('/voucher-types', async (req, res) => {
  try {
    const {
      id, name, alias, typeOfVoucher, abbreviation, methodOfVoucherNumbering,
      useEffectiveDates, makeOptionalByDefault, allowNarration,
      provideNarrationsForEachLedger, printAfterSaving, nameOfClass
    } = req.body;

    let result;
    if (id && !id.startsWith('VT-')) {
      // It's a real UUID from database
      result = await db.query(
        `UPDATE voucher_types SET 
          name = $1, alias = $2, type_of_voucher = $3, abbreviation = $4, 
          method_of_voucher_numbering = $5, use_effective_dates = $6,
          make_optional_by_default = $7, allow_narration = $8,
          provide_narrations_for_each_ledger = $9, print_after_saving = $10,
          name_of_class = $11, updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 RETURNING *`,
        [name, alias, typeOfVoucher, abbreviation, methodOfVoucherNumbering,
         useEffectiveDates, makeOptionalByDefault, allowNarration,
         provideNarrationsForEachLedger, printAfterSaving, nameOfClass, id]
      );
    } else {
      // It's a new record
      result = await db.query(
        `INSERT INTO voucher_types 
         (name, alias, type_of_voucher, abbreviation, method_of_voucher_numbering,
          use_effective_dates, make_optional_by_default, allow_narration,
          provide_narrations_for_each_ledger, print_after_saving, name_of_class)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [name, alias, typeOfVoucher, abbreviation, methodOfVoucherNumbering,
         useEffectiveDates, makeOptionalByDefault, allowNarration,
         provideNarrationsForEachLedger, printAfterSaving, nameOfClass]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to save voucher type', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to save voucher type' });
  }
});

/**
 * GET /api/pos/terminal/summary
 * Fetch summary stats for POS terminal and Intelligence Dashboard
 */
router.get('/terminal/summary', async (req, res) => {
  try {
    // Get total revenue for last 30 days
    const { rows: monthlyRows } = await db.query(`
      SELECT COALESCE(SUM(net_payable), 0) as total 
      FROM sales_invoices 
      WHERE invoice_date >= NOW() - INTERVAL '30 days'
      AND status = 'Completed'
    `);

    // Get total revenue for previous 30 days (for growth)
    const { rows: prevRows } = await db.query(`
      SELECT COALESCE(SUM(net_payable), 0) as total 
      FROM sales_invoices 
      WHERE invoice_date >= NOW() - INTERVAL '60 days' 
      AND invoice_date < NOW() - INTERVAL '30 days'
      AND status = 'Completed'
    `);

    const currentTotal = parseFloat(monthlyRows[0].total);
    const prevTotal = parseFloat(prevRows[0].total);
    let growth = 0;
    if (prevTotal > 0) {
      growth = ((currentTotal - prevTotal) / prevTotal) * 100;
    }

    // Get stats by payment mode
    const { rows: paymentStats } = await db.query(`
      SELECT payment_mode, COALESCE(SUM(net_payable), 0) as total, COUNT(*) as count
      FROM sales_invoices
      WHERE invoice_date >= NOW() - INTERVAL '30 days'
      AND status = 'Completed'
      GROUP BY payment_mode
    `);

    res.json({
      success: true,
      data: {
        monthlyRevenue: currentTotal,
        growth: Math.round(growth),
        paymentStats: paymentStats,
        transactionCount: paymentStats.reduce((s, p) => s + parseInt(p.count), 0),
        totalMonth: currentTotal // For stats section in StrategicPOS
      }
    });

    logger.http('GET', '/api/pos/terminal/summary', 200, 1, req.ip, req.user.userId);
  } catch (error) {
    logger.error('Failed to fetch terminal summary', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch terminal summary' });
  }
});

/**
 * GET /api/pos/dashboard-summary
 * Fetch POS dashboard KPIs and recent invoices directly from the database
 */
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { rows: summaryRows } = await db.query(`
      WITH max_date_cte AS (
        SELECT COALESCE(MAX(COALESCE(invoice_date, date, created_at)::date), CURRENT_DATE) as max_date FROM sales_invoices
      ),
      normalized_invoices AS (
        SELECT
          si.id,
          COALESCE(si.invoice_date, si.date, si.created_at) AS invoice_ts,
          COALESCE(si.net_payable, si.net_amount, 0)::numeric AS net_total,
          COALESCE(si.status, 'Completed') AS status
        FROM sales_invoices si
      ),
      invoice_items AS (
        SELECT
          COALESCE(sii.invoice_id, sii.invoice_id) AS invoice_id,
          COALESCE(SUM(sii.quantity), 0)::numeric AS item_quantity
        FROM sales_invoice_items sii
        GROUP BY COALESCE(sii.invoice_id, sii.invoice_id)
      )
      SELECT
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = (SELECT max_date FROM max_date_cte)
        ), 0) AS today_revenue,
        COUNT(*) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = (SELECT max_date FROM max_date_cte)
        )::int AS invoices_generated,
        COALESCE(SUM(ii.item_quantity) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = (SELECT max_date FROM max_date_cte)
        ), 0)::int AS items_sold_today,
        COUNT(*) FILTER (
          WHERE ni.status IN ('Draft', 'Pending')
        )::int AS pending_drafts,
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts >= date_trunc('month', (SELECT max_date FROM max_date_cte))
            AND ni.invoice_ts < date_trunc('month', (SELECT max_date FROM max_date_cte)) + INTERVAL '1 month'
        ), 0) AS monthly_revenue,
        COALESCE(SUM(ni.net_total) FILTER (
          WHERE ni.status = 'Completed'
            AND ni.invoice_ts::date = (SELECT max_date FROM max_date_cte) - INTERVAL '1 day'
        ), 0) AS yesterday_revenue
      FROM normalized_invoices ni
      LEFT JOIN invoice_items ii ON ii.invoice_id = ni.id
    `);

    const { rows: recentInvoiceRows } = await db.query(`
      WITH invoice_item_counts AS (
        SELECT
          COALESCE(sii.invoice_id, sii.invoice_id) AS invoice_id,
          COALESCE(SUM(sii.quantity), 0)::int AS items_sold
        FROM sales_invoice_items sii
        GROUP BY COALESCE(sii.invoice_id, sii.invoice_id)
      )
      SELECT
        si.id,
        COALESCE(si.invoice_number, si.invoice_number, si.id::text) AS invoice_number,
        COALESCE(p.name, si.customer_name, 'Counter Customer') AS customer_name,
        COALESCE(si.invoice_date, si.date, si.created_at) AS invoice_date,
        COALESCE(si.net_payable, si.net_amount, 0)::numeric AS amount,
        COALESCE(si.status, 'Completed') AS status,
        COALESCE(iic.items_sold, 0) AS items_sold
      FROM sales_invoices si
      LEFT JOIN parties p ON p.id = si.party_id
      LEFT JOIN invoice_item_counts iic ON iic.invoice_id = si.id
      ORDER BY COALESCE(si.invoice_date, si.date, si.created_at) DESC, si.created_at DESC NULLS LAST
      LIMIT 10
    `);

    const summary = summaryRows[0] || {};
    const todayRevenue = parseFloat(summary.today_revenue || 0);
    const yesterdayRevenue = parseFloat(summary.yesterday_revenue || 0);
    const revenueDelta = todayRevenue - yesterdayRevenue;
    const revenueChangePercent = yesterdayRevenue > 0
      ? Math.round((revenueDelta / yesterdayRevenue) * 100)
      : (todayRevenue > 0 ? 100 : 0);

    res.json({
      success: true,
      data: {
        tables: ['sales_invoices', 'sales_invoice_items', 'parties'],
        todayRevenue,
        yesterdayRevenue,
        revenueChangePercent,
        invoicesGenerated: parseInt(summary.invoices_generated || 0, 10),
        itemsSoldToday: parseInt(summary.items_sold_today || 0, 10),
        pendingDrafts: parseInt(summary.pending_drafts || 0, 10),
        monthlyRevenue: parseFloat(summary.monthly_revenue || 0),
        recentInvoices: recentInvoiceRows.map((invoice) => ({
          ...invoice,
          amount: parseFloat(invoice.amount || 0)
        }))
      }
    });

    logger.http('GET', '/api/pos/dashboard-summary', 200, recentInvoiceRows.length, req.ip, req.user.userId);
  } catch (error) {
    logger.error('Failed to fetch POS dashboard summary', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch POS dashboard summary' });
  }
});

module.exports = router;
