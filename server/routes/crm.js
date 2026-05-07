const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');
const { verifyTokenMiddleware, verify2FAMiddleware } = require('../utils/jwt');

// Helper to wrap async routes
const asyncRoute = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// DASHBOARD STATS
// ============================================
router.get('/stats', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_leads,
                COUNT(*) FILTER (WHERE status = 'New') as new_leads,
                COUNT(*) FILTER (WHERE status = 'Converted') as converted_leads,
                COUNT(*) FILTER (WHERE priority = 'Urgent') as urgent_leads,
                COALESCE(SUM(estimated_value), 0) as total_pipeline_value
            FROM leads 
            WHERE company_id = $1
        `;
        const { rows } = await db.query(statsQuery, [req.user.companyId || 1]);
        
        const stats = rows[0];
        stats.conversion_rate = stats.total_leads > 0 
            ? ((stats.converted_leads / stats.total_leads) * 100).toFixed(1) 
            : 0;

        res.json(stats);
    } catch (error) {
        logger.error('Failed to fetch CRM stats', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch CRM stats' });
    }
}));

// ============================================
// LEADS CRUD
// ============================================

// GET all leads
router.get('/leads', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { status, priority, search } = req.query;
        let query = 'SELECT * FROM leads WHERE company_id = $1';
        let params = [req.user.companyId || 1];
        let paramIdx = 2;

        if (status && status !== 'All') {
            query += ` AND status = $${paramIdx++}`;
            params.push(status);
        }

        if (priority && priority !== 'All') {
            query += ` AND priority = $${paramIdx++}`;
            params.push(priority);
        }

        if (search) {
            query += ` AND (name ILIKE $${paramIdx} OR company_name ILIKE $${paramIdx} OR contact ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        query += ' ORDER BY created_at DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        logger.error('Failed to fetch leads', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
}));

// GET single lead
router.get('/leads/:id', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM leads WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId || 1]);
        if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
}));

// POST new lead
router.post('/leads', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    const { 
        name, companyName, email, contact, location, status, priority, 
        source, nextFollowUp, estimatedValue, assignedTo, notes 
    } = req.body;

    try {
        const { rows } = await db.query(
            `INSERT INTO leads (
                name, company_name, email, contact, location, status, priority, 
                source, next_follow_up, estimated_value, assigned_to, notes, company_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                name, companyName, email, contact, location, status || 'New', priority || 'Medium',
                source, nextFollowUp || null, estimatedValue || 0, assignedTo || null, notes, req.user.companyId || 1
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Failed to create lead', { error: error.message });
        res.status(500).json({ error: 'Failed to create lead' });
    }
}));

// PUT update lead
router.put('/leads/:id', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    const { 
        name, companyName, email, contact, location, status, priority, 
        source, nextFollowUp, estimatedValue, assignedTo, notes 
    } = req.body;

    try {
        const { rows } = await db.query(
            `UPDATE leads SET 
                name = $1, company_name = $2, email = $3, contact = $4, location = $5, 
                status = $6, priority = $7, source = $8, next_follow_up = $9, 
                estimated_value = $10, assigned_to = $11, notes = $12, updated_at = NOW()
            WHERE id = $13 AND company_id = $14 RETURNING *`,
            [
                name, companyName, email, contact, location, status, priority,
                source, nextFollowUp, estimatedValue, assignedTo, notes, req.params.id, req.user.companyId || 1
            ]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Failed to update lead', { error: error.message });
        res.status(500).json({ error: 'Failed to update lead' });
    }
}));

// DELETE lead
router.delete('/leads/:id', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rowCount } = await db.query('DELETE FROM leads WHERE id = $1 AND company_id = $2', [req.params.id, req.user.companyId || 1]);
        if (rowCount === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
}));

// ============================================
// LEAD ACTIVITIES
// ============================================

// GET activities for a lead
router.get('/leads/:id/activities', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY performed_at DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
}));

// POST new activity
router.post('/leads/:id/activities', verifyTokenMiddleware, asyncRoute(async (req, res) => {
    const { type, description, duration, outcome, followUpRequired, followUpDate } = req.body;

    try {
        const { rows } = await db.query(
            `INSERT INTO lead_activities (
                lead_id, type, description, performed_by, duration, 
                outcome, follow_up_required, follow_up_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                req.params.id, type, description, req.user.userId, duration || null,
                outcome, followUpRequired || false, followUpDate || null
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Failed to create activity', { error: error.message });
        res.status(500).json({ error: 'Failed to create activity' });
    }
}));

module.exports = router;
