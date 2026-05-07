const fs = require('fs');
const path = require('path');
const db = require('../server/db');

async function apply() {
    try {
        console.log('--- Cleaning Existing Tables (if any) ---');
        await db.query(`
            DROP TABLE IF EXISTS rnd_experiments CASCADE;
            DROP TABLE IF EXISTS rnd_formulations CASCADE;
            DROP TABLE IF EXISTS qc_test_results CASCADE;
            DROP TABLE IF EXISTS qc_reports CASCADE;
            DROP TABLE IF EXISTS production_orders CASCADE;
            DROP TABLE IF EXISTS boms CASCADE;
            DROP TABLE IF EXISTS branches CASCADE;
        `);
        console.log('✅ Tables Cleaned');

        console.log('--- Applying Migration ---');
        const migrationPath = path.join(__dirname, '../server/migrations/20260416_enterprise_sync.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migrationSql);
        console.log('✅ Migration Applied Successfully');

        console.log('--- Seeding Enterprise Data ---');
        // 1. Branches
        await db.query(`DELETE FROM branches`); // Clean start for seeds
        const branchResult = await db.query(`
            INSERT INTO branches (name, type, location, city, state, manager, contact, is_hq)
            VALUES 
            ('Delhi HQ', 'Warehouse', 'Okhla Ind Area', 'Delhi', 'Delhi', 'Sanjeev Kumar', '9876543210', true),
            ('Mumbai Hub', 'Distribution', 'Andheri East', 'Mumbai', 'Maharashtra', 'Amitabh S', '9123456780', false),
            ('Lucknow Retail', 'Retail', 'Hazratganj', 'Lucknow', 'Uttar Pradesh', 'Rohan V', '8877665544', false)
            RETURNING id, name;
        `);
        console.log('✅ Branches Seeded');

        // 2. R&D formulations
        await db.query(`DELETE FROM rnd_formulations`);
        const rndFormResult = await db.query(`
            INSERT INTO rnd_formulations (product_name, dosage_form, version, stage, target_cost)
            VALUES 
            ('MetFormin ER 500mg', 'Tablet', '2.1', 'Stability', 1.4500),
            ('Amoxicillin Oral Suspension', 'Syrup', '1.0', 'Pilot', 12.2000),
            ('Versatile Vaccine V1', 'Injection', '0.5', 'Lab Scale', 450.0000)
            RETURNING id, product_name;
        `);
        console.log('✅ R&D Formulations Seeded');

        // 3. R&D experiments
        if (rndFormResult.rows.length > 0) {
            const formId = rndFormResult.rows[0].id;
            await db.query(`
                INSERT INTO rnd_experiments (formulation_id, test_name, assigned_to, status, result_data)
                VALUES 
                ('${formId}', 'Stability Test (40°C/75% RH)', 'Dr. Arun Kumar', 'In Progress', 'Observations recorded for Day 30'),
                ('${formId}', 'Dissolution Profile', 'Sarah Jones', 'Completed', '98% drug release in 45 mins')
            `);
            console.log('✅ R&D Experiments Seeded');
        }

        // 4. Products for MFG
        const productsResult = await db.query("SELECT id, name FROM products WHERE deleted_at IS NULL LIMIT 2");
        if (productsResult.rows.length > 0) {
            const prodId = productsResult.rows[0].id;
            
            // Create BOM
            const bomResult = await db.query(`
                INSERT INTO boms (product_id, version, status)
                VALUES ('${prodId}', '1.0', 'Active')
                RETURNING id;
            `);
            const bomId = bomResult.rows[0].id;

            // Create Production Order
            const poResult = await db.query(`
                INSERT INTO production_orders (order_no, product_id, bom_id, quantity, status, start_date)
                VALUES ('PO-ENTERPRISE-001', '${prodId}', '${bomId}', 5000, 'In Progress', CURRENT_DATE)
                RETURNING id;
            `);
            console.log('✅ Manufacturing Data Seeded');

            // Create QC Record
            const poId = poResult.rows[0].id;
            const qcResult = await db.query(`
                INSERT INTO qc_reports (production_order_id, batch_number, tester_name, status, overall_result)
                VALUES ('${poId}', 'BATCH-ENT-001', 'Sumit Verma', 'Pending', 'Awaiting bulk assay results')
                RETURNING id;
            `);
            const qcId = qcResult.rows[0].id;

            // Add QC Parameters
            await db.query(`
                INSERT INTO qc_test_results (qc_report_id, parameter_name, specification, result_value, status)
                VALUES 
                ('${qcId}', 'Average Weight', '500mg ± 5%', '502mg', 'Pass'),
                ('${qcId}', 'Disintegration Time', '< 15 mins', '8 mins', 'Pass')
            `);
            console.log('✅ QC Data Seeded');
        }

        console.log('🚀 ALL SYSTEM DATA RESTORED SUCCESSFULLY');
        process.exit(0);
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

apply();
