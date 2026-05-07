# ERP Component Standardization Guide

**Date:** March 30, 2026  
**Status:** ✅ Implementation Framework Ready

---

## Overview

This guide ensures all 67+ ERP components follow a consistent, professional format matching the Day Book UI standard.

---

## Component Structure Template

Every component should follow this structure:

```tsx
import React, { useState, useEffect } from 'react';
import { ERPLayout, FilterBar, DataTable, StatCard, Tabs, Badge, Modal } from '../components/UniversalLayout';
import { useDataFetch, useSearch, usePagination, useDatabaseStatus } from '../hooks/useDataFetch';

interface ModuleProps {
  // Optional props
}

const YourModule: React.FC<ModuleProps> = () => {
  // ============================================
  // 1. DATABASE CONNECTIVITY CHECK
  // ============================================
  const { status: dbStatus } = useDatabaseStatus();

  // ============================================
  // 2. DATA FETCHING (Using standardized hook)
  // ============================================
  const { data: items, loading, error, refetch } = useDataFetch('/api/your-endpoint');
  
  // ============================================
  // 3. FILTER STATES
  // ============================================
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().slice(0, 7) + '-01',
    dateTo: new Date().toISOString().split('T')[0],
    searchTerm: ''
  });

  // ============================================
  // 4. TAB & VIEW STATES
  // ============================================
  const [activeTab, setActiveTab] = useState('LIST');

  // ============================================
  // 5. MODAL & FORM STATES
  // ============================================
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // ============================================
  // 6. ADVANCED FEATURES
  // ============================================
  const { query, setQuery, results: searchResults } = useSearch(items || [], ['name', 'particulars']);
  const pagination = usePagination(searchResults, 20);

  // ============================================
  // 7. HANDLERS
  // ============================================
  const handleRefresh = async () => {
    await refetch();
  };

  const handleExport = () => {
    // Export logic
  };

  const handlePrint = () => {
    // Print logic
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // ============================================
  // 8. CONDITIONAL RENDERING (Database status)
  // ============================================
  if (!dbStatus.connected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        ⚠️ Database Connection Failed: {dbStatus.error}
      </div>
    );
  }

  // ============================================
  // 9. RENDER COMPONENT
  // ============================================
  return (
    <ERPLayout
      title="Your Module Name"
      description="Chronological record of all transactions — live from database"
      onRefresh={handleRefresh}
      onExport={handleExport}
      onPrint={handlePrint}
      isLoading={loading}
    >
      {/* STATS SECTION */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total" value={data?.length || 0} color="blue" />
      </div> */}

      {/* FILTER BAR */}
      <FilterBar
        filters={[
          {
            id: 'dateFrom',
            label: 'Period From',
            type: 'date',
            value: filters.dateFrom,
            onChange: (v) => handleFilterChange('dateFrom', v)
          },
          {
            id: 'dateTo',
            label: 'Period To',
            type: 'date',
            value: filters.dateTo,
            onChange: (v) => handleFilterChange('dateTo', v)
          }
        ]}
        showSearch={true}
        searchValue={filters.searchTerm}
        onSearchChange={(v) => handleFilterChange('searchTerm', v)}
      />

      {/* TABS (If needed) */}
      {/* <Tabs
        tabs={[
          { id: 'LIST', label: 'List View' },
          { id: 'DETAIL', label: 'Detailed View' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      /> */}

      {/* DATA TABLE */}
      <DataTable
        columns={[
          { key: 'date', label: 'Date', width: '12%' },
          { key: 'particulars', label: 'Particulars', width: '30%' },
          { key: 'vchType', label: 'Vch Type', width: '15%' },
          { key: 'vchNo', label: 'Vch No.', width: '12%' },
          {
            key: 'debit',
            label: 'Debit (₹)',
            align: 'right',
            render: (value) => value ? `₹${value.toLocaleString()}` : '-'
          },
          {
            key: 'credit',
            label: 'Credit (₹)',
            align: 'right',
            render: (value) => value ? `₹${value.toLocaleString()}` : '-'
          }
        ]}
        data={pagination.paginatedData}
        loading={loading}
        emptyMessage="No records found"
        onRowClick={(row) => setSelectedItem(row)}
      />

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={() => pagination.goToPage(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <div className="px-4 py-2 text-slate-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <button
            onClick={() => pagination.goToPage(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </ERPLayout>
  );
};

export default YourModule;
```

---

## Database Connectivity Checklist

### ✅ Every Component Must:

- [ ] Import `useDataFetch` hook
- [ ] Call `useDatabaseStatus()` at top
- [ ] Show error message if `dbStatus.connected === false`
- [ ] Use proper API endpoint format: `/api/module-name`
- [ ] Handle loading state with spinner
- [ ] Handle error state with user message
- [ ] Show empty state with helpful message

### Database Connection Verification:

```typescript
// Add this check in every component
const { status: dbStatus } = useDatabaseStatus();

if (!dbStatus.connected) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-700 font-semibold">❌ Database Connection Failed</p>
      <p className="text-red-600 text-sm">{dbStatus.error}</p>
      <p className="text-red-500 text-xs mt-2">
        Ensure PostgreSQL is running and backend server is active
      </p>
    </div>
  );
}
```

---

## API Endpoint Standards

All components should use these endpoint patterns:

```
GET    /api/module-name              - List all records
GET    /api/module-name/:id          - Get single record
POST   /api/module-name              - Create record
PUT    /api/module-name/:id          - Update record
DELETE /api/module-name/:id          - Delete record
GET    /api/module-name/search?q=    - Search records
```

### Example Endpoints:

```
/api/daybook              - Day Book entries
/api/accounts             - Accounts/General Ledger
/api/inventory            - Inventory items
/api/purchase             - Purchase orders
/api/sales                - Sales invoices
/api/parties              - Customer/Supplier master
/api/employees            - Employee records
/api/manufacturing        - Manufacturing records
```

---

## Tab & Dropdown Activation Guide

### Tabs Implementation:

```tsx
// 1. Define all available tabs
const tabs = [
  { id: 'LIST', label: 'List View' },
  { id: 'GRID', label: 'Grid View' },
  { id: 'SUMMARY', label: 'Summary' }
];

// 2. Use Tabs component
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
/>

// 3. Render content based on active tab
{activeTab === 'LIST' && <ListView data={data} />}
{activeTab === 'GRID' && <GridView data={data} />}
{activeTab === 'SUMMARY' && <SummaryView data={data} />}
```

### Dropdown Implementation:

```tsx
// 1. Add dropdown filter
{
  id: 'voucherType',
  label: 'Voucher Type',
  type: 'select',
  value: filters.voucherType,
  onChange: (v) => handleFilterChange('voucherType', v),
  options: [
    { value: 'All', label: 'All' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Receipt', label: 'Receipt' },
    { value: 'Payment', label: 'Payment' }
  ]
}

// 2. Filter data based on selection
const filteredData = activeVoucherType === 'All' 
  ? data 
  : data?.filter(item => item.voucherType === activeVoucherType);
```

---

## Components to Update (Priority Order)

### 🔴 Critical (Top Priority)

- [ ] **Accounts/GeneralLedger** - Core financial module
- [ ] **Inventory** - Item Master & Stock management
- [ ] **Purchase** - Purchase orders & GRN
- [ ] **POS/Billing** - Already mostly done, minor updates
- [ ] **Dashboard** - Summary statistics

### 🟠 High Priority

- [ ] **HR/Payroll** - Employee records
- [ ] **Manufacturing** - Production orders
- [ ] **CRM** - Customer relations
- [ ] **Compliance** - Regulatory reports
- [ ] **Reports** - All report modules

### 🟡 Medium Priority

- [ ] **PCD Management** - Distributor management
- [ ] **OMS** - Order management
- [ ] **Logistics** - Shipment tracking
- [ ] **Assets** - Fixed asset register
- [ ] **R&D** - Research & development

### 🟢 Optional

- [ ] **Settings** - Configuration
- [ ] **Documents** - Document management
- [ ] **AuditLog** - Audit trail
- [ ] **Multi-Branch** - Branch operations

---

## Common UI Patterns

### 1. Loading State:
```tsx
{loading && (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-transparent border-t-blue-500"></div>
  </div>
)}
```

### 2. Error State:
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
    ❌ {error}
  </div>
)}
```

### 3. Empty State:
```tsx
{(!data || data.length === 0) && !loading && (
  <div className="text-center py-12 text-slate-500">
    📭 No records found. Try adjusting your filters.
  </div>
)}
```

### 4. Success Message:
```tsx
{successMessage && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
    ✅ {successMessage}
  </div>
)}
```

---

## Database Connectivity Verification Commands

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check database connection
curl http://localhost:5000/api/db/status

# Test sample endpoint
curl http://localhost:5000/api/daybook

# Verify authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

---

## Implementation Checklist for Each Component

Before considering a component "done":

- [ ] Uses `ERPLayout` component
- [ ] Has `FilterBar` with relevant filters
- [ ] Displays data in `DataTable`
- [ ] Shows loading spinner
- [ ] Shows error messages
- [ ] Shows empty state
- [ ] Has refresh button
- [ ] Has export button (Excel)
- [ ] Has print button
- [ ] All dropdowns populated from API
- [ ] All tabs functional
- [ ] Database status checked
- [ ] Pagination working (if >20 records)
- [ ] Search functionality working
- [ ] API endpoints tested
- [ ] Error handling complete
- [ ] No console errors
- [ ] TypeScript types aligned

---

## Smart Fetch Strategy

### Recommended API Response Format:

```json
{
  "success": true,
  "data": [
    {
      "id": "unique-id",
      "date": "2026-03-30",
      "particulars": "Description",
      "vchType": "Sales",
      "vchNo": "SAL-001",
      "debit": 1000,
      "credit": 0
    }
  ],
  "total": 125,
  "page": 1,
  "pageSize": 20,
  "timestamp": "2026-03-30T01:30:00Z"
}
```

---

## Testing the Setup

### 1. Verify Backend:
```bash
npm run dev  # Frontend on 5173
# In another terminal:
cd server && node index.js  # Backend on 5000
```

### 2. Test Login:
```
URL: http://localhost:5173
Username: admin
Password: admin
```

### 3. Verify Database:
```bash
# Check PostgreSQL
psql -U postgres -d metapharsic_erp -c "SELECT COUNT(*) FROM information_schema.tables;"

# Or from Node:
node -e "const pg = require('pg'); const pool = new pg.Pool({...}); pool.query('SELECT 1', console.log);"
```

---

## Next Steps

1. ✅ **Framework Ready** - All tools created
2. 🔄 **Update Components** - Use template above
3. 📊 **Test API Connectivity** - Verify each module
4. 🔧 **Fix Data Fetching** - Ensure database calls work
5. ✨ **Final Polish** - Consistent styling across all modules

---

## Quick Reference

| File | Purpose | Usage |
|------|---------|-------|
| `UniversalLayout.tsx` | UI components | `import { ERPLayout, FilterBar, DataTable } from...` |
| `useDataFetch.ts` | Data hooks | `const { data, loading } = useDataFetch('/api/...')` |
| This guide | Implementation | Reference when building/updating components |

---

**All systems ready for implementation. Start with critical modules first!**
