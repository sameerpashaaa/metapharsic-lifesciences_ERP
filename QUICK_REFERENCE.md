# ⚡ QUICK REFERENCE CARD - Component Refactoring

**Print this. Keep it handy. Use it for every component!**

---

## 📋 5-Step Component Update Checklist

### STEP 1: Frontend Component (15 min)
```javascript
// File: /components/YourModule.tsx

// 1. Import core libraries
import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

// 2. Import UI components
import {
  ERPLayout,
  FilterBar,
  DataTable,
  StatCard,
  Tabs,
  Badge,
  Modal,
} from '../components/UniversalLayout';

// 3. Import data hooks
import {
  useDataFetch,
  useDatabaseStatus,
  useSearch,
  usePagination,
} from '../hooks/useDataFetch';

const YourModule: React.FC = () => {
  // 4. Check database connection
  const { status: dbStatus } = useDatabaseStatus();
  
  if (!dbStatus.connected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Database Connection Failed</p>
            <p className="text-red-700 text-sm mt-1">{dbStatus.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // 5. Fetch data
  const { data, loading, error, refetch } = useDataFetch('/api/your-module');

  // 6. Setup filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'ALL',
  });

  // 7. Setup tabs and modals
  const [activeTab, setActiveTab] = useState('LIST');
  const [showModal, setShowModal] = useState(false);

  // 8. Advanced features
  const { results } = useSearch(data || [], ['name', 'code']);
  const pagination = usePagination(results, 20);

  // 9. Event handlers
  const handleRefresh = async () => {
    await refetch();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.goToPage(1);
  };

  // 10. Render
  return (
    <ERPLayout
      title="Your Module Name"
      description="Professional description"
      onRefresh={handleRefresh}
      onExport={() => {}} // Optional
      onPrint={() => {}}  // Optional
      isLoading={loading}
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total" value={data?.length || 0} color="blue" />
      </div>

      <FilterBar
        filters={[
          {
            id: 'searchTerm',
            label: 'Search',
            type: 'text',
            value: filters.searchTerm,
            onChange: (v) => handleFilterChange('searchTerm', v),
          },
        ]}
      />

      <DataTable
        columns={[
          { key: 'id', label: 'ID', width: '10%' },
          { key: 'name', label: 'Name', width: '30%' },
          { key: 'status', label: 'Status', width: '15%' },
        ]}
        data={pagination.paginatedData}
        loading={loading}
      />

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex gap-2 justify-end">
          <button onClick={() => pagination.goToPage(pagination.currentPage - 1)}>
            Previous
          </button>
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          <button onClick={() => pagination.goToPage(pagination.currentPage + 1)}>
            Next
          </button>
        </div>
      )}
    </ERPLayout>
  );
};

export default YourModule;
```

### STEP 2: Backend Route (10 min)
```javascript
// File: /server/routes/your-module.js

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all with filters
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT id, name, status 
      FROM your_table 
      WHERE name ILIKE $1 
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [`%${search}%`, limit, offset]);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single record
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM your_table WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, status } = req.body;
    const result = await pool.query(
      'INSERT INTO your_table (name, status) VALUES ($1, $2) RETURNING *',
      [name, status]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { name, status } = req.body;
    const result = await pool.query(
      'UPDATE your_table SET name = $1, status = $2 WHERE id = $3 RETURNING *',
      [name, status, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE soft delete
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE your_table SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### STEP 3: Register Route in Backend (2 min)
```javascript
// File: /server/index.js (or app.js)

// Add this line with other route registrations:
app.use('/api/your-module', require('./routes/your-module'));

// Example:
// app.use('/api/inventory', require('./routes/inventory'));
// app.use('/api/accounts', require('./routes/accounts'));
// app.use('/api/your-module', require('./routes/your-module')); ← ADD THIS
```

### STEP 4: Test API (5 min)
```bash
# Test basic endpoint
curl http://localhost:5000/api/your-module

# Test with search
curl "http://localhost:5000/api/your-module?search=test"

# Test with pagination
curl "http://localhost:5000/api/your-module?page=1&limit=20"

# Expected response:
# {"success": true, "data": [...], "total": 125}
```

### STEP 5: Test in Browser (5 min)
```
1. Go to http://localhost:5173/your-module
2. Wait for page to load
3. Verify data displays
4. Try each filter
5. Try search
6. Try pagination
7. Click Refresh button
8. ✅ SUCCESS!
```

---

## 🎨 Column Types & Rendering

### Standard Columns
```typescript
// Plain text
{ key: 'name', label: 'Product Name', width: '25%' }

// Currency
{
  key: 'price',
  label: 'Price (₹)',
  width: '12%',
  align: 'right',
  render: (value) => `₹${value.toLocaleString()}`
}

// Date
{
  key: 'createdDate',
  label: 'Created On',
  width: '12%',
  render: (value) => new Date(value).toLocaleDateString()
}

// Status with badge
{
  key: 'status',
  label: 'Status',
  width: '12%',
  render: (value) => (
    <Badge
      text={value}
      variant={value === 'ACTIVE' ? 'success' : 'danger'}
    />
  )
}

// Action button
{
  key: 'actions',
  label: 'Actions',
  width: '10%',
  render: (value, row) => (
    <button onClick={() => handleEdit(row)}>Edit</button>
  )
}

// Conditional coloring
{
  key: 'stock',
  label: 'Stock',
  width: '10%',
  render: (value, row) => (
    <div className={value <= row.reorderLevel ? 'text-red-600 font-bold' : ''}>
      {value}
    </div>
  )
}
```

---

## 🔧 Filter Types

```typescript
// Text search
{
  id: 'search',
  label: 'Search',
  type: 'text',
  placeholder: 'Search by name...',
  value: filters.search,
  onChange: (v) => handleFilterChange('search', v)
}

// Date
{
  id: 'dateFrom',
  label: 'From Date',
  type: 'date',
  value: filters.dateFrom,
  onChange: (v) => handleFilterChange('dateFrom', v)
}

// Dropdown/Select
{
  id: 'status',
  label: 'Status',
  type: 'select',
  value: filters.status,
  onChange: (v) => handleFilterChange('status', v),
  options: [
    { value: 'ALL', label: 'All Items' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ]
}
```

---

## 💾 Database Table Template

```sql
CREATE TABLE your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'ACTIVE',
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true
);

-- Add index for performance
CREATE INDEX idx_your_table_name ON your_table(name);
CREATE INDEX idx_your_table_status ON your_table(status);
CREATE INDEX idx_your_table_is_active ON your_table(is_active);
```

---

## 🖱️ Common Events

```typescript
// On filter change
const handleFilterChange = (key: string, value: string) => {
  setFilters(prev => ({ ...prev, [key]: value }));
  pagination.goToPage(1); // Reset to page 1
};

// On search input
setQuery(searchValue);

// On refresh
const handleRefresh = async () => {
  await refetch();
  notifyUser.success('Data refreshed');
};

// On row click
const handleRowClick = (row) => {
  setSelectedItem(row);
  setShowDetailModal(true);
};

// On export
const handleExport = () => {
  const csv = [
    ['Column1', 'Column2', 'Column3'],
    ...data.map(item => [item.field1, item.field2, item.field3])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.csv';
  a.click();
};
```

---

## 🚨 Common Error Handling

```typescript
// Database connection error
if (!dbStatus.connected) {
  return <ErrorAlert message={dbStatus.error} />;
}

// API error
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    ❌ {error}
  </div>
)}

// Empty state
{!loading && data?.length === 0 && (
  <div className="text-center py-12 text-slate-500">
    📭 No records found
  </div>
)}

// Loading spinner
{loading && (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-transparent border-t-blue-500"></div>
  </div>
)}
```

---

## 📊 Statistics Card Colors

```typescript
// Color options: blue, success, warning, danger, info, neutral
<StatCard title="Total" value={100} color="blue" />
<StatCard title="Active" value={95} color="success" />
<StatCard title="Pending" value={5} color="warning" />
<StatCard title="Failed" value={0} color="danger" />
```

---

## ⌚ Time Estimates

| Task | Time |
|------|------|
| Copy template & adapt | 10 min |
| Create API route | 5 min |
| Register route | 2 min |
| Test API | 5 min |
| Test in browser | 5 min |
| **TOTAL** | **25-30 min** |

---

## ✅ Before Committing

- [ ] `npm run type-check` passes
- [ ] No console errors
- [ ] API endpoint tested
- [ ] Filters work
- [ ] Search works
- [ ] Pagination works
- [ ] Export works
- [ ] Refresh works
- [ ] Error states display properly
- [ ] Empty state shows when no data
- [ ] Database connection check visible

---

## 🆘 If Something Breaks

### Component renders as blank
```
1. Check browser console for errors
2. Verify API endpoint URL is correct
3. Test API manually: curl http://localhost:5000/api/your-module
4. Check database connection
```

### "Cannot find module" error
```
1. Verify import paths are correct
2. Check file exists in expected location
3. Run: npm run type-check
4. Restart dev server: npm run dev
```

### API returns error
```
1. Check backend terminal for error logs
2. Verify database connection
3. Verify table exists in database
4. Test query directly in psql
```

### Filters not working
```
1. Verify onChange handlers are connected
2. Check FilterBar is receiving correct filters array
3. Verify data is being filtered correctly
4. Test with hardcoded filter first
```

---

## 🎯 Remember

- ✅ Use templates - they work!
- ✅ Test after each step
- ✅ Keep components simple
- ✅ Let useDataFetch handle complexity
- ✅ Check error messages - they're helpful
- ✅ Database connection first, always!
- ✅ When in doubt, copy from InventoryRefactored.tsx

---

**Good Luck! You've got this! 🚀**

Questions? Check:
- `COMPONENT_STANDARDIZATION_GUIDE.md`
- `IMPLEMENTATION_ROADMAP.md`  
- `components/InventoryRefactored.tsx` (working example)
