const express = require('express');
const router = express.Router();
const pool = require('../db');
// Authentication handled via verifyTokenMiddleware in index.js

/**
 * GET /api/oms
 * Fetch all orders with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      status = 'ALL',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (distributor_name ILIKE $' + (params.length + 1) + ' OR id::text ILIKE $' + (params.length + 1) + ')';
      params.push(`%${search}%`);
    }

    if (status !== 'ALL') {
      whereClause += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT 
        id,
        distributor_id as "distributorId",
        distributor_name as "distributorName",
        order_date as "date",
        total_amount as "totalAmount",
        status,
        priority,
        credit_status as "creditStatus"
      FROM orders
      ${whereClause}
      ORDER BY order_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/oms/dropdown
 */
router.get('/dropdown', async (req, res) => {
  try {
    const distributorsQuery = "SELECT id as value, name as label FROM parties WHERE type = 'Debtor' ORDER BY name";
    const distributorsResult = await pool.query(distributorsQuery);

    res.json({
      success: true,
      data: {
        distributors: distributorsResult.rows,
        statuses: [
          { value: 'ALL', label: 'All Statuses' },
          { value: 'Pending Approval', label: 'Pending Approval' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Processing', label: 'Processing' },
          { value: 'Shipped', label: 'Shipped' },
          { value: 'Delivered', label: 'Delivered' },
          { value: 'Rejected', label: 'Rejected' },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/oms/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const orderResult = await pool.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
    const itemsResult = await pool.query(itemsQuery, [id]);

    const data = {
      ...orderResult.rows[0],
      items: itemsResult.rows
    };

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/oms
 * Create new order
 */
router.post('/', async (req, res) => {
  try {
    const { distributorId, distributorName, items, packingSpecs, labelingSpecs, priority } = req.body;

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    const orderQuery = `
      INSERT INTO orders (distributor_id, distributor_name, total_amount, packing_specs, labeling_specs, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const orderResult = await pool.query(orderQuery, [
      distributorId,
      distributorName,
      totalAmount,
      packingSpecs,
      labelingSpecs,
      priority || 'Normal'
    ]);

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, approved_quantity, rate, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.productId, item.productName, item.quantity, item.quantity, item.rate, item.quantity * item.rate]
      );
    }

    res.status(201).json({ success: true, data: { id: orderId }, message: 'Order placed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
