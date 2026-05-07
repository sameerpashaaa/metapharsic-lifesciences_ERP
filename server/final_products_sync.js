/**
 * MIGRATION: Final Products Table Sync
 * Adds columns used by ItemMaster & Inventory modules
 */

const db = require('./db');

async function runMigration() {
    console.log('🚀 Starting Final Products Master Migration...');
    
    try {
        // Core columns for SKU preservation
        await db.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
            ADD COLUMN IF NOT EXISTS mrp NUMERIC(12, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS purchase_rate NUMERIC(12, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS selling_rate NUMERIC(12, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ptr NUMERIC(12, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS pts NUMERIC(12, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS opening_stock INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS scheme TEXT,
            ADD COLUMN IF NOT EXISTS maintain_batches BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS created_by UUID;
        `);

        // Migration from category to stockGroup if needed
        // For now, CATEGORY column exists, we'll use it since it matches backend routes/inventory.js

        console.log('✅ Products table synchronized with all Enterprise columns.');
        
        console.log('🏁 Migration complete.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

runMigration();
