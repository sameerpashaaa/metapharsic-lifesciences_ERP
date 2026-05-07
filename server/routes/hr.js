const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { verifyTokenMiddleware, verifyRoleMiddleware } = require('../utils/jwt');

/**
 * GET /api/hr/employees
 * Fetch all employees
 */
router.get('/employees', verifyTokenMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, contact, email, headquarters, assigned_area as "assignedArea", 
              sales_target as "salesTarget", total_sales as "totalSales", 
              target_achievement as "targetAchievement", status, join_date as "joinDate",
              base_salary as "baseSalary", incentives, deductions 
       FROM employees 
       ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Failed to fetch employees', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/performance-stats
 */
router.get('/performance-stats', verifyTokenMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*)::INT as "totalEmployees",
        COUNT(*) FILTER (WHERE status = 'Active')::INT as "activeEmployees",
        COUNT(*) FILTER (WHERE target_achievement >= 100)::INT as "starPerformers",
        COUNT(*) FILTER (WHERE target_achievement < 80)::INT as "attentionNeeded",
        ROUND(COALESCE(AVG(target_achievement), 0)::NUMERIC, 2)::FLOAT as "averageAchievement"
      FROM employees
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to fetch performance stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/employees
 */
router.post('/employees', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const { name, contact, email, headquarters, assignedArea, salesTarget, baseSalary } = req.body;
    const result = await db.query(
      `INSERT INTO employees (name, contact, email, headquarters, assigned_area, sales_target, base_salary, status, join_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', NOW(), $8) RETURNING *`,
      [name, contact, email, headquarters, assignedArea, salesTarget, baseSalary, req.user.userId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create employee', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
