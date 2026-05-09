const db = require('./server/db');

async function test() {
  try {
    await db.query('SELECT 1');
    console.log('DB Connected');
    
    const queries = [
      { name: 'Accounts', query: `
          WITH ledger_totals AS (
            SELECT account_id, COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit
            FROM general_ledger GROUP BY account_id
          ),
          balances AS (
            SELECT coa.account_type, coa.account_name, COALESCE(coa.opening_balance, 0) AS opening_balance,
              COALESCE(lt.total_debit, 0) AS total_debit, COALESCE(lt.total_credit, 0) AS total_credit,
              CASE WHEN coa.account_type IN ('Asset', 'Expense') THEN COALESCE(coa.opening_balance, 0) + COALESCE(lt.total_debit, 0) - COALESCE(lt.total_credit, 0)
              ELSE COALESCE(coa.opening_balance, 0) + COALESCE(lt.total_credit, 0) - COALESCE(lt.total_debit, 0) END AS closing_balance
            FROM chart_of_accounts coa LEFT JOIN ledger_totals lt ON lt.account_id = coa.id WHERE coa.company_id = 1
          )
          SELECT COUNT(*)::int AS total_accounts FROM balances` },
      { name: 'Inventory', query: 'SELECT COUNT(*)::int AS total_products FROM products WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true' },
      { name: 'PCD', query: `
          SELECT
            COUNT(*) FILTER (WHERE p.status = 'Active')::int AS active_partners,
            COUNT(*)::int AS total_partners,
            COUNT(DISTINCT p.territory)::int AS total_territories,
            COALESCE(SUM(CASE WHEN t.status = 'Verified' THEN t.amount ELSE 0 END), 0) AS verified_sales,
            COUNT(*) FILTER (WHERE t.status = 'Verified')::int AS verified_transactions
          FROM pcd_partners p
          LEFT JOIN pcd_transactions t
            ON t.partner_id = p.id AND t.company_id = p.company_id
          WHERE p.company_id = 1` },
      { name: 'CRM', query: 'SELECT COUNT(*)::int AS total_leads FROM leads' },
      { name: 'Sales', query: 'SELECT COUNT(*)::int AS total_invoices FROM sales_invoices WHERE COALESCE(company_id, 1) = 1' },
      { name: 'DMS', query: `
          SELECT
            COUNT(*)::int AS total_documents,
            COUNT(*) FILTER (WHERE status = 'Active')::int AS active_documents,
            COUNT(*) FILTER (
              WHERE status = 'Expiring'
                 OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days')
            )::int AS expiring_documents,
            COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft_documents
          FROM dms_documents` }
    ];

    for (let q of queries) {
      try {
        await db.query(q.query);
        console.log(q.name + ': OK');
      } catch (e) {
        console.error(q.name + ' FAILED:', e.message);
      }
    }
  } catch (e) {
    console.error('Fatal:', e);
  } finally {
    process.exit(0);
  }
}

test();
