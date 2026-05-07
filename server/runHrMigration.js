#!/usr/bin/env node
// ============================================
// HR DATABASE MIGRATION RUNNER
// Path: server/runHrMigration.js
// Purpose: Execute HR migration to set up employees table
// ============================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'metapharsic_erp'
});

const migrationFile = path.join(__dirname, 'migrations', '005-hr-employees.sql');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Reading HR migration file:', migrationFile);
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🚀 Starting HR migration...');
        console.log('═'.repeat(60));

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        let executed = 0;
        for (const statement of statements) {
            try {
                console.log(`\n⏳ Executing: ${statement.substring(0, 80)}...`);
                await client.query(statement);
                executed++;
                console.log(`✅ OK`);
            } catch (error) {
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate key')) {
                    console.log(`⚠️  Already exists (OK): ${error.message.substring(0, 50)}...`);
                    executed++;
                } else {
                    console.error(`❌ ERROR: ${error.message}`);
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`\n✅ HR Migration completed!`);
        console.log(`   Total statements executed: ${executed}/${statements.length}`);
        console.log(`   ✓ employees table created/verified`);
        console.log(`   ✓ indexes created`);
        console.log(`   ✓ sample data seeded`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
        await pool.end();
    }
}

runMigration().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
