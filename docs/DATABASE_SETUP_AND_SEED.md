# Metapharsic Lifesciences ERP - Database Setup & Seed Guide

This document explains how to set up the dummy database and outlines the realistic seed data provided for testing the Metapharsic Lifesciences ERP application.

## 1. Overview of Seed Data

A comprehensive master seed script has been generated at:
`server/migrations/20260507_master_seed_data.sql`

This script provides a realistic, interconnected dataset across the application's primary modules:
- **Users**: Admin, Pharmacist, and Accountant roles.
- **Products**: Real-world pharmaceutical examples (Paracetamol, Amoxicillin, Cough Syrup) with appropriate HSN codes, GST rates, and schedule types (OTC, H).
- **Inventory (Batches)**: Stock levels, expiry dates (future-dated), and pricing (MRP, Purchase, Selling rates).
- **Parties**: Simulates B2B Distributors (Creditors) and Retail/Hospital customers (Debtors).
- **Transactions**: Sample Sales Invoices, Purchase Orders, and Expenses.
- **Accounting**: A basic Chart of Accounts, Journal Vouchers, and General Ledger entries.

## 2. Table Relationships Explained

The database enforces referential integrity. Here's how the key seeded entities relate:

1. **`products` -> `batches` (1:N)**: A single product master record has multiple physical batches. Batches track expiry and current stock at a specific location.
2. **`sales_invoices` -> `sales_invoice_items` (1:N)**: An invoice links to multiple line items.
3. **`sales_invoice_items` -> `products` & `batches`**: Each line item references exactly which product and specific batch was sold to accurately deduct stock and calculate profit margins.
4. **`purchases` -> `parties`**: Every purchase order is linked to a supplier (Creditor) from the `parties` table.
5. **`journal_vouchers` -> `journal_voucher_entries` -> `chart_of_accounts`**: Double-entry accounting is maintained. A voucher has multiple entries (debits/credits) that map to specific ledger accounts.
6. **`general_ledger`**: Serves as the immutable log of all accounting impacts, linking back to the `journal_vouchers`.

## 3. Test Credentials

The seed script creates the following user accounts. All accounts use the same default password.

> [!IMPORTANT]
> **Default Password for all accounts:** `admin123`

| Role | Username | Notes |
| :--- | :--- | :--- |
| **System Admin** | `admin` | Full access to all modules |
| **Pharmacist** | `pharmacist1` | Access to POS, Sales, and Inventory |
| **Accountant** | `accountant` | Access to Ledgers, Vouchers, and Expenses |

*(Note: The password is hashed using standard `bcryptjs`. If your local setup uses plain-text passwords or a different salt/hash mechanism, you may need to update the `password_hash` column manually).*

## 4. Setup Instructions

You have two options to apply this seed data to your local PostgreSQL database:

### Option A: Using `psql` (Recommended)

Run the SQL file directly against your database using the PostgreSQL command-line tool. Replace `metapharsic_db` and `postgres` with your actual database name and user.

```bash
psql -U postgres -d metapharsic_db -f server/migrations/20260507_master_seed_data.sql
```

### Option B: Using a GUI Client
1. Open pgAdmin, DBeaver, or your preferred SQL client.
2. Connect to your local database.
3. Open the `server/migrations/20260507_master_seed_data.sql` file.
4. Execute the entire script.

### Option C: Using Node.js
If you prefer running a Node script (similar to your existing `runMigration.js`), we have provided a wrapper script at `server/seed-master.js`.

```bash
cd server
node seed-master.js
```

## 5. Idempotency

The SQL script uses `ON CONFLICT DO NOTHING` for tables with `UNIQUE` constraints (e.g., `username`, `batch_number`, `invoice_number`). 
However, for tables without strict unique constraints (like `products`, `parties`), running the script multiple times *may* create duplicate rows. It is recommended to run this on a fresh database or carefully clear existing test data first.
