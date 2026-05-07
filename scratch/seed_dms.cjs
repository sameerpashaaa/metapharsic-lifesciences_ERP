const { Pool } = require('pg');
// require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'metapharsic_erp',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing DMS data
    await client.query('DELETE FROM dms_audit_trail');
    await client.query('DELETE FROM dms_workflows');
    await client.query('DELETE FROM dms_versions');
    await client.query('DELETE FROM dms_documents');

    const adminId = 'd26d50c6-d597-47a4-8f43-77e80954f329'; // Test Pharmacist
    const adminName = 'Test Pharmacist';

    console.log('Inserting Documents...');

    const docs = [
      ['DOC-001', 'SOP for Tablet Compression', 'SOP', 'PDF', '2.1', 'Active', '2025-10-15', adminId, adminName],
      ['DOC-002', 'Drug License 20B Renewal', 'License', 'PDF', '1.0', 'Active', '2028-01-09', adminId, adminName],
      ['DOC-003', 'Q3 Quality Audit Report', 'Report', 'DOCX', '1.0', 'Archived', null, adminId, adminName],
      ['DOC-004', 'Fire Safety Certificate', 'Compliance', 'JPG', '1.0', 'Expiring', '2023-11-20', adminId, adminName],
      ['DOC-005', 'Employee Hygiene Policy', 'Policy', 'PDF', '3.0', 'Draft', '2024-09-12', adminId, adminName],
      ['DOC-008', 'Annual Environmental Compliance Report', 'Compliance', 'PDF', '1.0', 'Pending', '2024-11-01', adminId, adminName]
    ];

    for (const doc of docs) {
      await client.query(`
        INSERT INTO dms_documents (id, title, category, file_type, current_version, status, expiry_date, author_id, author_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, doc);
    }

    console.log('Inserting Versions...');
    const versions = [
      ['DOC-001', '2.1', '/documents/tablet_compression_v2.1.pdf', 2400000, 'Updated compression parameters', adminId, adminName],
      ['DOC-001', '2.0', '/documents/tablet_compression_v2.0.pdf', 2300000, 'Revised equipment specifications', adminId, adminName],
      ['DOC-002', '1.0', '/documents/drug_license_2023.pdf', 1100000, 'Initial license upload', adminId, adminName]
    ];

    for (const v of versions) {
      await client.query(`
        INSERT INTO dms_versions (document_id, version_label, file_url, file_size_bytes, change_log, uploaded_by, uploaded_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, v);
    }

    console.log('Inserting Workflows...');
    const workflows = [
      ['DOC-005', 'Review', 'HR Manager', '2023-11-15', 'In Progress'],
      ['DOC-008', 'Approval', 'EHS Head', '2023-11-25', 'Pending']
    ];

    for (const w of workflows) {
      await client.query(`
        INSERT INTO dms_workflows (document_id, current_step, assigned_to, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
      `, w);
    }

    await client.query('COMMIT');
    console.log('✅ DMS Seeding Successful');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('❌ Seeding Failed:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
