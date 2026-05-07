const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metapharsic_erp',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runQueries() {
    await client.connect();
    const companyId = 1;

    const queries = [
        { name: 'accounts', sql: `
          WITH ledger_totals AS (
            SELECT
              account_id,
              COALESCE(SUM(debit), 0) AS total_debit,
              COALESCE(SUM(credit), 0) AS total_credit
            FROM general_ledger
            GROUP BY account_id
          ),
          balances AS (
            SELECT
              coa.account_type,
              coa.account_name,
              COALESCE(coa.opening_balance, 0) AS opening_balance,
              COALESCE(lt.total_debit, 0) AS total_debit,
              COALESCE(lt.total_credit, 0) AS total_credit,
              CASE
                WHEN coa.account_type IN ('Asset', 'Expense')
                  THEN COALESCE(coa.opening_balance, 0) + COALESCE(lt.total_debit, 0) - COALESCE(lt.total_credit, 0)
                ELSE COALESCE(coa.opening_balance, 0) + COALESCE(lt.total_credit, 0) - COALESCE(lt.total_debit, 0)
              END AS closing_balance
            FROM chart_of_accounts coa
            LEFT JOIN ledger_totals lt ON lt.account_id = coa.id
            WHERE coa.company_id = $1
          )
          SELECT COUNT(*) FROM balances
        `, params: [companyId] },
        { name: 'inventory', sql: `SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true`, params: [] },
        { name: 'pcd', sql: `SELECT COUNT(*) FROM pcd_partners p LEFT JOIN pcd_transactions t ON t.partner_id = p.id AND t.company_id = p.company_id WHERE p.company_id = $1`, params: [companyId] },
        { name: 'crm', sql: `SELECT COUNT(*) FROM leads`, params: [] },
        { name: 'sales', sql: `SELECT COUNT(*) FROM sales_invoices WHERE COALESCE(company_id, $1) = $1`, params: [companyId] },
        { name: 'dms', sql: `SELECT COUNT(*) FROM dms_documents`, params: [] }
    ];

    for (const q of queries) {
        try {
            await client.query(q.sql, q.params);
            console.log(`✅ Query ${q.name} succeeded`);
        } catch (err) {
            console.error(`❌ Query ${q.name} failed:`, err.message);
        }
    }

    await client.end();
}

runQueries().catch(console.error);
