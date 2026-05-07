const db = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Unified Ledger Helper for Metapharsic ERP
 * Handles all background ledger postings for Sales, Purchases, and Inventory.
 */

/**
 * Records a transaction in the General Ledger
 * @param {Object} client - DB Client (for transaction support)
 * @param {Object} params - Entry details
 */
async function postToGeneralLedger(client, {
    accountId,      // UUID of the account
    voucherId,      // UUID of source document
    voucherType,    // 'Sales', 'Purchase', 'JV', 'Payment', etc.
    transactionDate,// Date of transaction
    debit = 0,
    credit = 0,
    narration = ''
}) {
    try {
        if (!accountId) throw new Error('Account ID is required for GL posting');
        
        // 1. Calculate running balance for this account
        const balanceResult = await client.query(
            'SELECT COALESCE(SUM(debit - credit), 0) as balance FROM general_ledger WHERE account_id = $1',
            [accountId]
        );
        const prevBalance = parseFloat(balanceResult.rows[0]?.balance || 0);
        const runningBalance = prevBalance + parseFloat(debit) - parseFloat(credit);

        // 2. Insert GL Entry
        await client.query(
            `INSERT INTO general_ledger (
                id, account_id, voucher_id, voucher_type, transaction_date, 
                debit, credit, running_balance, is_reconciled, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, clock_timestamp())`,
            [
                uuidv4(), accountId, voucherId, voucherType, transactionDate, 
                debit, credit, runningBalance
            ]
        );
        
        return true;
    } catch (error) {
        console.error('❌ GL Posting Error:', error);
        throw error;
    }
}

/**
 * Records a stock movement in the Stock Ledger
 * @param {Object} client - DB Client
 * @param {Object} params - Movement details
 */
async function postToStockLedger(client, {
    companyId,
    godownId = null,
    productId,
    batchId = null,
    movementType,       // 'IN', 'OUT'
    referenceType,      // 'Sale', 'Purchase', 'Transfer', etc.
    referenceId,
    referenceNumber,
    quantity,
    costPerUnit = 0,
    movementDate,
    narration = '',
    createdBy = null
}) {
    try {
        const in_qty = movementType === 'IN' ? quantity : 0;
        const out_qty = movementType === 'OUT' ? quantity : 0;
        
        // 1. Get current running balance for this product/batch
        const prevEntry = await client.query(
            `SELECT running_balance FROM stock_ledger_entries 
             WHERE product_id = $1 AND (batch_id = $2 OR $2 IS NULL)
             ORDER BY movement_date DESC, created_at DESC, id DESC LIMIT 1`,
            [productId, batchId]
        );
        
        const prevBalance = parseFloat(prevEntry.rows[0]?.running_balance || 0);
        const runningBalance = prevBalance + in_qty - out_qty;
        const totalCost = quantity * costPerUnit;

        // 2. Insert Stock Ledger Entry
        await client.query(
            `INSERT INTO stock_ledger_entries (
                id, company_id, godown_id, product_id, batch_id, movement_type, 
                reference_type, reference_id, reference_number, in_qty, out_qty,
                running_balance, cost_per_unit, total_cost, movement_date, narration, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, clock_timestamp())`,
            [
                uuidv4(), companyId, godownId, productId, batchId, movementType,
                referenceType, referenceId, referenceNumber, in_qty, out_qty,
                runningBalance, costPerUnit, totalCost, movementDate, narration, createdBy
            ]
        );

        return true;
    } catch (error) {
        console.error('❌ Stock Ledger Error:', error);
        throw error;
    }
}

/**
 * Finds a ledger account by typical search criteria
 * Useful for finding "Sales Account", "Purchase Account", etc.
 */
async function findAccount(client, companyId, search) {
    const { rows } = await client.query(
        `SELECT id FROM chart_of_accounts 
         WHERE company_id = $1 AND (account_name ILIKE $2 OR account_code = $3)
         LIMIT 1`,
        [companyId, `%${search}%`, search]
    );
    return rows[0]?.id || null;
}

module.exports = {
    postToGeneralLedger,
    postToStockLedger,
    findAccount
};
