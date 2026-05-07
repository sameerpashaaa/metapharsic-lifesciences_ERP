# 🎬 ERP Unified Design System - Visual Architecture

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
│                   http://localhost:5173                             │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
           ┌────────────────────────────────────────┐
           │   REACT COMPONENT (InventoryRefactored)│
           ├────────────────────────────────────────┤
           │ • Renders ERPLayout with header         │
           │ • Shows FilterBar for user input        │
           │ • Displays DataTable with live data     │
           │ • Handles pagination controls          │
           └────────────────────────────────────────┘
                         ↓ uses
           ┌────────────────────────────────────────┐
           │   useDataFetch Hook                    │
           ├────────────────────────────────────────┤
           │ • Checks database status               │
           │ • Fetches from API                     │
           │ • Caches results (5min)                │
           │ • Handles errors & retries             │
           └────────────────────────────────────────┘
                         ↓
    HTTP GET http://localhost:5000/api/inventory
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                           │
│                     Port: 5000                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │ Route Handler: GET /api/inventory                       │      │
│  ├─────────────────────────────────────────────────────────┤      │
│  │ 1. Check authentication token                          │      │
│  │ 2. Validate query parameters (search, filter, page)   │      │
│  │ 3. Build SQL query with WHERE clauses                 │      │
│  │ 4. Execute query on database                          │      │
│  │ 5. Return filtered results as JSON                     │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                         ↓
    Connection Pool (pg library)
                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                              │
│                   metapharsic_erp                                   │
│              localhost:5432                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SELECT * FROM products WHERE name ILIKE '%search%'               │
│                   AND expiry_status = 'OK'                        │
│                   AND current_stock > reorder_level               │
│                   ORDER BY name ASC                               │
│                   LIMIT 20 OFFSET 0                               │
│                                                                   │
│  Returns: [                                                       │
│    {                                                              │
│      id: 'uuid123',                                              │
│      code: 'PAR-100',                                            │
│      name: 'PARACETAMOL 500MG',                                  │
│      currentStock: 450,                                          │
│      reorderLevel: 100,                                          │
│      expiryStatus: 'OK',                                         │
│      totalValue: 45000,                                          │
│      batchCount: 5                                               │
│    },                                                            │
│    ... more records                                              │
│  ]                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                         ↑
        ┌────────────────┴────────────────┐
        ↑                                 ↑
    Products Table              Batches Table
    (150 records)             (2000 records)
```

---

## Component Lifecycle Flow

```
USER NAVIGATES TO /inventory
          ↓
┌────────────────────────────────────┐
│ 1. Component Mounts               │
│    ├─ useDatabaseStatus() called  │
│    └─ useDataFetch() called       │
└────────────────────────────────────┘
          ↓
┌────────────────────────────────────┐
│ 2. Database Check                 │
│    └─ Connected?                  │
│       ├─ YES → Continue           │
│       └─ NO → Show error + retry  │
└────────────────────────────────────┘
          ↓
┌────────────────────────────────────┐
│ 3. Fetch Initial Data             │
│    └─ [LOADING] spinner shown     │
│    └─ GET /api/inventory          │
│    └─ First 20 records loaded     │
└────────────────────────────────────┘
          ↓
┌────────────────────────────────────┐
│ 4. Render Page                    │
│    ├─ Header with title           │
│    ├─ FilterBar                   │
│    ├─ Statistics cards            │
│    ├─ DataTable with records      │
│    ├─ Pagination controls         │
│    └─ Success animations          │
└────────────────────────────────────┘
          ↓
┌────────────────────────────────────┐
│ 5. User Interaction               │
│    ├─ Change filter               │
│    │  └─ useSearch() filters      │
│    ├─ Search for item             │
│    │  └─ Client-side search       │
│    ├─ Go to page 2                │
│    │  └─ Pagination subset sent   │
│    ├─ Click Refresh               │
│    │  └─ New API call, cache skip │
│    └─ Export data                 │
│       └─ CSV file downloaded      │
└────────────────────────────────────┘
```

---

## State Management Flow

```
Component State
├─ Filters
│  ├─ searchTerm: string
│  ├─ status: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED'
│  ├─ source: 'ALL' | 'PCD' | 'OWN_MANUFACTURING' | 'TRADING'
│  ├─ dateFrom: ISO date string
│  └─ dateTo: ISO date string
│
├─ Tabs
│  └─ activeTab: 'INVENTORY' | 'VALUATION' | 'EXPIRY' | 'ALERTS'
│
├─ Modals
│  ├─ showAddProductModal: boolean
│  ├─ showAddBatchModal: boolean
│  ├─ showBatchDetails: boolean
│  └─ selectedProduct: InventoryItem | null
│
└─ Forms
   └─ adjustmentForm: { productId, quantity, reason, notes }

         ↓ When filter changes
         
useSearch Hook
├─ Input: Original data array
├─ Process: Full-text search on multiple fields
└─ Output: Filtered array

         ↓ When search result changes
         
usePagination Hook
├─ Input: Filtered array + page size (20)
├─ Process: Calculate pages, current subset
└─ Output: { paginatedData, currentPage, totalPages, goToPage() }

         ↓ When component needs refresh
         
useDataFetch Hook
├─ Check: Is data in cache? (<5 min old)
│  ├─ YES → Use cached data (instant)
│  └─ NO → Fetch from API
├─ Retry: If API fails, retry up to 3 times
├─ Update: When new data arrives, refetch()
└─ Cache: Store for 5 minutes with timestamp
```

---

## API Response Structure

```
ALL API Responses Follow This Pattern:
{
  "success": true|false,
  "data": [...] or null,
  "message": "User-friendly message",
  "error": "Error description if failed",
  "timestamp": "2026-03-30T12:00:00Z",
  
  // For list endpoints only:
  "total": 125,
  "page": 1,
  "pageSize": 20,
  "totalPages": 7
}

Example: GET /api/inventory (Success)
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "code": "PAR-100",
      "name": "PARACETAMOL 500MG",
      "genericName": "Paracetamol",
      "currentStock": 450,
      "reorderLevel": 100,
      "lastReceivedDate": "2026-03-20",
      "expiryStatus": "OK",
      "totalValue": 45000,
      "batchCount": 5
    },
    ... 19 more records
  ],
  "total": 125,
  "page": 1,
  "pageSize": 20,
  "totalPages": 7
}

Example: GET /api/inventory (Error)
{
  "success": false,
  "data": null,
  "error": "Database connection failed",
  "message": "Please check if PostgreSQL is running"
}
```

---

## Component Hierarchy

```
App.tsx (Routes)
│
├─ /inventory
│  └─ InventoryRefactored.tsx
│     ├─ ERPLayout (from UniversalLayout)
│     │  ├─ Header with title & buttons
│     │  ├─ FilterBar (from UniversalLayout)
│     │  ├─ StatCard (from UniversalLayout) x5
│     │  ├─ Tabs (from UniversalLayout)
│     │  ├─ DataTable (from UniversalLayout)
│     │  └─ Pagination controls
│     │
│     └─ Hooks Used:
│        ├─ useDatabaseStatus() → Shows connection status
│        ├─ useDataFetch() → Fetches /api/inventory
│        ├─ useSearch() → Filters results
│        └─ usePagination() → Handles pagination
│
├─ /accounts
│  └─ Accounts.tsx (WILL USE SAME PATTERN)
│     ├─ ERPLayout
│     ├─ FilterBar
│     ├─ DataTable
│     └─ Hooks: useDatabaseStatus, useDataFetch, useSearch, usePagination
│
├─ /manufacturing
│  └─ Manufacturing.tsx (WILL USE SAME PATTERN)
│
├─ ... (20+ more components using same pattern)
```

---

## Database Schema (Simplified)

```
┌──────────────────────────┐
│       products           │
├──────────────────────────┤
│ id (UUID) PRIMARY KEY    │
│ code (VARCHAR) UNIQUE    │
│ name (VARCHAR)           │
│ generic_name (VARCHAR)   │
│ current_stock (INT)      │◄────────┐
│ reorder_level (INT)      │         │
│ reorder_qty (INT)        │         │
│ mrp (DECIMAL)            │         │
│ ptr (DECIMAL)            │         │
│ pts (DECIMAL)            │         │
│ expiry_status (VARCHAR)  │         │
│ source (VARCHAR)         │         │
│ created_at (TIMESTAMP)   │         │
│ updated_at (TIMESTAMP)   │         │
│ is_active (BOOLEAN)      │         │
└──────────────────────────┘         │
         ▲                           │
         │                           │
    1:N  │                      (Total Value
    ├────┼────────┐            = stock × mrp)
    │            │
┌───┴──────┐  ┌──┴──────────────────┐
│ batches  │  │ inventory_          │
├──────────┤  │ adjustments         │
│ id (PK)  │  ├────────────────────┤
│ product_ │  │ id (PK)             │
│ id (FK)  │  │ product_id (FK)     │
│ batch_no │  │ quantity (INT)      │
│ quantity │  │ reason (VARCHAR)    │
│ expiry_  │  │ adjusted_by (FK)    │
│ date     │  │ adjusted_at (TIME)  │
│ mrp      │  └────────────────────┘
│ ptr      │
│ status   │
└──────────┘
```

---

## Error Handling Flow

```
User Action (e.g., filter change)
         ↓
useDataFetch() called
         ↓
┌─────────────────────────────────────┐
│ Try: Fetch from API                │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Success?                           │
├─────────────────────────────────────┤
│ ├─ YES → Cache data & render      │
│ └─ NO → Check retry count         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Retry available?                   │
├─────────────────────────────────────┤
│ ├─ YES → Wait exponential time    │
│ │         (100ms, 200ms, 400ms)   │
│ │         → Retry...              │
│ └─ NO → Show error to user        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ User Sees:                         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐│
│ │ ❌ Database Connection Failed   ││
│ │                                 ││
│ │ Error: [Descriptive message]    ││
│ │                                 ││
│ │ [🔄 Retry] button               ││
│ └─────────────────────────────────┘│
│                                     │
│ OR helpful error message             │
└─────────────────────────────────────┘
```

---

## Performance Optimization

```
First Load (Cold):
  1. Component mount → 50ms
  2. Database check → 100ms
  3. API call (network) → 300ms
  4. Render table → 100ms
  Total: ~550ms (Spinner shown)

Subsequent Loads (Cached):
  1. Component mount → 50ms
  2. Database check → 100ms (cached)
  3. Data from cache → 0ms (instant)
  4. Render table → 100ms
  Total: ~250ms (Almost instant)

Filter Change (Client-side):
  1. Filter update → 10ms
  2. useSearch() filter → 50ms
  3. usePagination() → 50ms
  4. Render → 100ms
  Total: ~200ms (No network call)

Export (Large Dataset):
  1. Fetch full data → 500ms
  2. Generate CSV → 200ms
  3. Download file → 100ms
  Total: ~800ms

Caching Strategy:
  ├─ API responses: 5min TTL
  ├─ Database status: 30sec TTL
  ├─ Dropdown lists: 10min TTL
  └─ User preferences: Local storage
```

---

## Deployment Architecture (Future)

```
Production Environment
┌─────────────────────────────────────────────────────┐
│                    CDN                              │
│              (Vite dist/ assets)                    │
│           Static files + compression                │
└─────────────────────────────────────────────────────┘
                        ↓

┌─────────────────────────────────────────────────────┐
│                 Load Balancer                       │
│              (nginx/haproxy)                        │
└─────────────────────────────────────────────────────┘
         ↓                           ↓

┌───────────────────────┐     ┌───────────────────────┐
│   Backend Instance 1  │     │   Backend Instance 2  │
│   Express.js + Node   │     │   Express.js + Node   │
│   Port: 5000          │     │   Port: 5000          │
└───────────────────────┘     └───────────────────────┘
         ↓                           ↓

┌─────────────────────────────────────────────────────┐
│        Database Connection Pool Manager             │
│          (Multiple connections)                     │
└─────────────────────────────────────────────────────┘
         ↓

┌─────────────────────────────────────────────────────┐
│        PostgreSQL Primary (metapharsic_erp)        │
│              Replication: ON                        │
│              Backups: Daily                         │
└─────────────────────────────────────────────────────┘
         ↓
         
Replicas:
├─ Read Replica 1 (Analytics)
├─ Read Replica 2 (Backup)
└─ Standby Replica (Failover)
```

---

This architecture ensures:
- ✅ Consistent user experience
- ✅ Fast response times
- ✅ Reliable data access
- ✅ Professional appearance
- ✅ Scalable infrastructure
- ✅ Easy maintenance
