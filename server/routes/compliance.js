const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyTokenMiddleware } = require('../utils/jwt');

// Middleware
router.use(verifyTokenMiddleware);

/**
 * GET /api/compliance/licenses
 */
router.get('/licenses', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM drug_licenses ORDER BY expiry_date ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/licenses
 */
router.post('/licenses', async (req, res) => {
  try {
    const { name, license_number, expiry_date, category, status, document_url } = req.body;

    if (!name || !license_number) {
      return res.status(400).json({ success: false, error: 'License name and number are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO drug_licenses (name, license_number, expiry_date, category, status, document_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, license_number, expiry_date || null, category || null, status || 'Valid', document_url || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/compliance/licenses/:id
 */
router.put('/licenses/:id', async (req, res) => {
  try {
    const { name, license_number, expiry_date, category, status, document_url } = req.body;

    if (!name || !license_number) {
      return res.status(400).json({ success: false, error: 'License name and number are required' });
    }

    const { rows } = await db.query(
      `UPDATE drug_licenses
       SET name = $1,
           license_number = $2,
           expiry_date = $3,
           category = $4,
           status = $5,
           document_url = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, license_number, expiry_date || null, category || null, status || 'Valid', document_url || null, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/compliance/licenses/:id
 */
router.delete('/licenses/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM drug_licenses WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/compliance/h1
 */
router.get('/h1', async (req, res) => {
  try {
    const { drug, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM h1_register WHERE 1=1';
    const params = [];
    
    if (drug) {
      query += ` AND drug_name ILIKE $${params.length + 1}`;
      params.push(`%${drug}%`);
    }
    
    query += ` ORDER BY entry_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/h1
 */
router.post('/h1', async (req, res) => {
  try {
    const {
      entry_date,
      invoice_no,
      patient_name,
      doctor_name,
      drug_name,
      batch_number,
      quantity
    } = req.body;

    if (!patient_name || !doctor_name || !drug_name || !quantity) {
      return res.status(400).json({ success: false, error: 'Patient, doctor, drug, and quantity are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO h1_register (entry_date, invoice_no, patient_name, doctor_name, drug_name, batch_number, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [entry_date || null, invoice_no || null, patient_name, doctor_name, drug_name, batch_number || null, quantity]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/compliance/temp-logs
 */
router.get('/temp-logs', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM temperature_logs ORDER BY log_date DESC, log_time DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compatible alias for older frontend builds.
router.get('/temp', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM temperature_logs ORDER BY log_date DESC, log_time DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/compliance/audits
 */
router.get('/audits', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM compliance_audits ORDER BY audit_date DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/audits
 */
router.post('/audits', async (req, res) => {
  try {
    const { audit_date, auditor_name, score_percentage, status, notes } = req.body;

    const { rows } = await db.query(
      `INSERT INTO compliance_audits (audit_date, auditor_name, score_percentage, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [audit_date || null, auditor_name || null, score_percentage || null, status || 'Draft', notes || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/temp-logs
 */
router.post('/temp-logs', async (req, res) => {
  try {
    const { temperature, equipment_name, checked_by, remarks } = req.body;
    const status = (temperature >= 2 && temperature <= 8) ? 'OK' : 'Warning';
    
    const { rows } = await db.query(
      'INSERT INTO temperature_logs (temperature, equipment_name, checked_by, remarks, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [temperature, equipment_name, checked_by, remarks, status]
    );
    
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
