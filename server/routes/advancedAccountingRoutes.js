const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyTokenMiddleware, verifyRoleMiddleware, verify2FAMiddleware } = require('../utils/jwt');
const logger = require('../utils/logger');

// Helper to wrap async routes
const asyncRoute = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// BANK RECONCILIATION API
// ============================================
router.get('/bank-reconciliation', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM bank_reconciliations WHERE company_id = $1 ORDER BY statement_date DESC',
            [req.user.companyId || 1]
        );
        res.json(rows);
    } catch (error) {
        logger.error('Failed to fetch reconciliations', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch bank reconciliations' });
    }
}));

router.post('/bank-reconciliation', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), asyncRoute(async (req, res) => {
    try {
        const { accountId, statementDate, closingBalanceBank, closingBalanceBooks, unreconciledDifference } = req.body;
        const status = unreconciledDifference === 0 ? 'Completed' : 'Pending';

        const { rows } = await db.query(
            `INSERT INTO bank_reconciliations (account_id, statement_date, closing_balance_per_bank, closing_balance_per_books, unreconciled_difference, reconciliation_status, company_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [accountId, statementDate, closingBalanceBank, closingBalanceBooks, unreconciledDifference, status, req.user.companyId || 1, req.user.userId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Failed to save bank reconciliation', { error: error.message });
        res.status(500).json({ error: 'Failed to save bank reconciliation' });
    }
}));

// ============================================
// BUDGETS API
// ============================================
router.get('/budgets', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM budgets WHERE company_id = $1 ORDER BY financial_year DESC',
            [req.user.companyId || 1]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
}));

router.post('/budgets', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), asyncRoute(async (req, res) => {
    try {
        const { accountId, costCenterId, financialYear, budgetAmount } = req.body;
        const { rows } = await db.query(
            `INSERT INTO budgets (account_id, cost_center_id, financial_year, budget_amount, company_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [accountId, costCenterId, financialYear, budgetAmount, req.user.companyId || 1]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}));

// ============================================
// FIXED ASSETS API
// ============================================
router.get('/fixed-assets', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM fixed_assets WHERE company_id = $1', [req.user.companyId || 1]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
}));

router.post('/fixed-assets', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'ACCOUNTANT']), asyncRoute(async (req, res) => {
    try {
        const { assetName, assetCode, accountId, purchaseDate, purchaseValue, depreciationMethod, depreciationRatePercent, location } = req.body;
        const { rows } = await db.query(
            `INSERT INTO fixed_assets (asset_name, asset_code, account_id, purchase_date, purchase_value, current_value, depreciation_method, depreciation_rate_percent, location, company_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [assetName, assetCode, accountId, purchaseDate, purchaseValue, purchaseValue, depreciationMethod, depreciationRatePercent, location, req.user.companyId || 1]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}));

// ============================================
// GST / TDS / TAX CONFIGURATION API
// ============================================
router.get('/taxes', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM tax_configurations');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch taxes' });
    }
}));

router.post('/taxes', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN']), asyncRoute(async (req, res) => {
    try {
        const { taxType, taxName, rate, accountId } = req.body;
        const { rows } = await db.query(
            `INSERT INTO tax_configurations (tax_type, tax_name, rate, account_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            [taxType, taxName, rate, accountId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}));

// ============================================
// FOREX RATES API
// ============================================
router.get('/forex', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM forex_rates ORDER BY effective_date DESC LIMIT 50');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch forex rates' });
    }
}));

router.post('/forex', verifyTokenMiddleware, verifyRoleMiddleware(['ADMIN', 'FINANCE_MANAGER']), asyncRoute(async (req, res) => {
    try {
        const { currencyCode, exchangeRate, effectiveDate } = req.body;
        const { rows } = await db.query(
            `INSERT INTO forex_rates (currency_code, exchange_rate, effective_date) VALUES ($1, $2, $3) RETURNING *`,
            [currencyCode, exchangeRate, effectiveDate]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}));

module.exports = router;
