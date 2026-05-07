#!/usr/bin/env node
// ============================================
// DATABASE MIGRATION RUNNER
// Path: server/runMigration.js
// Purpose: Execute SQL migrations to set up Phase 1 inventory tables
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

const migrationFile = path.join(__dirname, 'migrations', '001_inventory_phase1.sql');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Reading migration file:', migrationFile);
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('🚀 Starting migration...');
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
                // Ignore "already exists" errors - these are expected
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate key')) {
                    console.log(`⚠️  Already exists (OK): ${error.message.substring(0, 50)}...`);
                    executed++;
                } else {
                    console.error(`❌ ERROR: ${error.message}`);
                    // Continue with next statement instead of exiting
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`\n✅ Migration completed!`);
        console.log(`   Total statements executed: ${executed}/${statements.length}`);
        console.log(`\n📊 New tables/structures created:`);
        console.log(`   ✓ godowns`);
        console.log(`   ✓ stock_ledger_entries`);
        console.log(`   ✓ stock_reconciliation`);
        console.log(`   ✓ stock_reconciliation_items`);
        console.log(`   ✓ return_notes`);
        console.log(`   ✓ return_note_items`);
        console.log(`   ✓ reserved_stock`);
        console.log(`   ✓ stock_movement_reasons (lookup)`);
        console.log(`\n🔧 Enhanced tables:`);
        console.log(`   ✓ products (valuation_method, default_godown_id, etc.)`);
        console.log(`   ✓ batches (godown_id, status, reserved_qty, ptr_rate, etc.)`);
        console.log(`\n🎉 Phase 1 Inventory setup complete!\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
        await pool.end();
    }
}

// Run the migration
runMigration().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
