const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyTokenMiddleware, verifyRoleMiddleware } = require('../utils/jwt');
const logger = require('../utils/logger');

// Middleware
router.use(verifyTokenMiddleware);
router.use(verifyRoleMiddleware(['ADMIN', 'PHARMACIST', 'SALES_MANAGER']));

/**
 * GET /api/sales
 * Fetch all sales invoices (Wholesale)
 */
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      status = 'All', 
      page = 1, 
      limit = 20, 
      dateFrom = '', 
      dateTo = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT si.*, p.name as party_name,
             (SELECT COUNT(*) FROM sales_invoice_items WHERE invoice_id = si.id) as item_count
      FROM sales_invoices si
      LEFT JOIN parties p ON si.party_id = p.id
      WHERE si.invoice_type = 'Wholesale'
    `;
    const params = [];

    if (search) {
      query += ` AND (si.invoice_no ILIKE $${params.length + 1} 
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

    query += ` ORDER BY si.${sortBy} ${sortOrder}
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as count FROM sales_invoices WHERE invoice_type = 'Wholesale'";
    const countParams = [];
    if (search) {
      countQuery += ` AND (invoice_no ILIKE $${countParams.length + 1} OR (SELECT name FROM parties WHERE id = party_id) ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }
    if (status !== 'All') {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    const { rows: countRows } = await db.query(countQuery, countParams);
    const total = parseInt(countRows[0].count);

    res.json({
      success: true,
      data: rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Failed to fetch sales', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch sales' });
  }
});

/**
 * GET /api/sales/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const totalQuery = "SELECT COUNT(*) FROM sales_invoices WHERE invoice_type = 'Wholesale'";
    const revenueQuery = "SELECT SUM(net_payable) FROM sales_invoices WHERE invoice_type = 'Wholesale'";
    const monthQuery = "SELECT SUM(net_payable) FROM sales_invoices WHERE invoice_type = 'Wholesale' AND invoice_date >= date_trunc('month', CURRENT_DATE)";

    const [total, revenue, month] = await Promise.all([
      db.query(totalQuery),
      db.query(revenueQuery),
      db.query(monthQuery)
    ]);

    res.json({
      success: true,
      data: {
        totalInvoices: parseInt(total.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].sum || 0),
        monthlyRevenue: parseFloat(month.rows[0].sum || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sales/dropdown
 */
router.get('/dropdown', async (req, res) => {
  try {
    const partiesQuery = "SELECT id as value, name as label FROM parties WHERE type = 'Debtor' ORDER BY name";
    const partiesResult = await db.query(partiesQuery);

    res.json({
      success: true,
      data: {
        parties: partiesResult.rows,
        statuses: [
          { value: 'All', label: 'All Statuses' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Cancelled', label: 'Cancelled' }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
