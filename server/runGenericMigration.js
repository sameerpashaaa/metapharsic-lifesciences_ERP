#!/usr/bin/env node
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

const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('Usage: node runGenericMigration.js <migration-file-path>');
    process.exit(1);
}

const fullPath = path.isAbsolute(migrationFile) ? migrationFile : path.join(process.cwd(), migrationFile);

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Reading migration file:', fullPath);
        const sql = fs.readFileSync(fullPath, 'utf8');

        console.log('🚀 Starting migration...');
        console.log('═'.repeat(60));

        // Use a more robust split for statements
        // This is still simple but should work for basic migrations
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        let executed = 0;
        for (const statement of statements) {
            try {
                console.log(`\n⏳ Executing statement...`);
                await client.query(statement);
                executed++;
                console.log(`✅ OK`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  Already exists: ${error.message}`);
                    executed++;
                } else {
                    console.error(`❌ ERROR: ${error.message}`);
                    throw error;
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`\n✅ Migration completed!`);
        console.log(`   Total statements executed: ${executed}/${statements.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
