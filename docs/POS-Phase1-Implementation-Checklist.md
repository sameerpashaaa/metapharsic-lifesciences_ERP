# POS Phase 1 Implementation Checklist
## Pharmacy-First Features Priority

**Status:** Ready for Development | **Timeline:** 8 Weeks | **Team Size:** 6-8 Developers

---

## 🔴 CRITICAL PATH (Weeks 1-4)

### Week 1: Barcode/QR Scanning System

#### 1.1 Backend Infrastructure
- [ ] Create barcode service module (`services/barcodeService.ts`)
  - Generate EAN-13/Code128 barcodes for products
  - Validate barcode checksums
  - Batch barcode generation & printing
  
- [ ] Setup QR service (`services/qrService.ts`)
  - Generate prescription QR codes (contains: Rx ID + patient hash + verification code)
  - Receipt QR generation (for digital copy tracking)
  - Decode QR at POS counter

- [ ] API Endpoints
  ```
  POST   /api/inventory/products/generate-barcodes
  GET    /api/inventory/products/:id/barcode
  POST   /api/pos/scan-barcode
  POST   /api/pos/scan-qr
  GET    /api/prescription/:qrCode/verify
  ```

#### 1.2 Frontend Components
- [ ] Barcode Scanner Input Component
  - [ ] Real-time barcode input field (auto-focus)
  - [ ] Sound feedback (beep on valid scan)
  - [ ] Fast product lookup (< 500ms)
  - [ ] Quantity entry modal

- [ ] QR Receipt Component
  - [ ] Update receipt template to include QR
  - [ ] QR links to receipt data API
  - [ ] Patient can verify via QR scan

- [ ] Barcode Management UI
  - [ ] Bulk barcode generator
  - [ ] Barcode print template
  - [ ] Barcode label generator
  - [ ] Test/validate barcodes

#### 1.3 Database Changes
```sql
ALTER TABLE products ADD (
  barcode_ean13 VARCHAR(13) UNIQUE,
  barcode_code128 VARCHAR(255),
  barcode_generated_at TIMESTAMP,
  barcode_last_printed_at TIMESTAMP
);

CREATE TABLE barcode_scans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  barcode_scanned VARCHAR(13),
  product_id UUID REFERENCES products(id),
  location VARCHAR(100),
  scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_barcode_scans_product ON barcode_scans(product_id);
```

#### 1.4 Testing
- [ ] Unit test: Barcode generation (various formats)
- [ ] Unit test: QR code generation/decoding
- [ ] Integration test: Barcode scan → Add to cart
- [ ] Integration test: QR receipt generate → Verify
- [ ] Performance test: Barcode lookup < 500ms (with 100K products)

**Deliverable:** Barcode scanning works in POS; receipts have QR codes

---

### Week 2: Expiry Date Management

#### 2.1 Backend Infrastructure
- [ ] Query optimization for expiry dates
  ```sql
  ALTER TABLE stock_ledger_entries ADD (
    expiry_date_calculated INT GENERATED ALWAYS AS (
      EXTRACT(EPOCH FROM (expiry_date - CURRENT_DATE)) / 86400
    ) STORED
  );
  
  CREATE INDEX idx_expiry_date ON stock_ledger_entries(expiry_date_calculated);
  ```

- [ ] Expiry alert service
  - API to get items expiring in next 30/60/90 days
  - Batch expiry report endpoint
  - Expiry-based low stock alerts

- [ ] API Endpoints
  ```
  GET    /api/inventory/expiry-dashboard
  GET    /api/inventory/expiry/alert-items?days=30
  GET    /api/inventory/expiry/by-godown/:godownId
  POST   /api/inventory/expiry/mark-damaged
  GET    /api/inventory/expiry/waste-report
  ```

#### 2.2 Frontend Components
- [ ] Expiry Dashboard (New Tab in Inventory)
  - [ ] Timeline view: Items expiring in 30/60/90 days
  - [ ] Count cards: High-priority, Medium, Low
  - [ ] List view: Sortable by expiry date, quantity, godown
  - [ ] Color coding: Red (< 7 days), Yellow (7-30), Green (> 30)
  
- [ ] POS Enhancement
  - [ ] Show expiry date on cart item hover
  - [ ] Warn if item expiring in < 7 days (yellow flag)
  - [ ] Block if item expiring in < 3 days (red flag)
  - [ ] Highlight cheapest-to-expiry-first in product search

- [ ] Expiry Clearance Tool
  - [ ] Create auto-discount rule: "25% off if expiring < 7 days"
  - [ ] Tag products: "Clearing Stock"
  - [ ] SMS notification to loyalty customers: "Expiry clearance sale"

#### 2.3 Database Changes
```sql
CREATE TABLE expiry_alerts (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES batches(id),
  alert_level VARCHAR(20), -- 'CRITICAL' (< 7), 'HIGH' (7-30), 'MEDIUM' (30-90)
  expiry_date DATE,
  quantity_affected INT,
  estimated_loss DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expiry_alerts_level ON expiry_alerts(alert_level);
```

#### 2.4 Testing
- [ ] Unit test: Expiry calculation (various dates)
- [ ] Unit test: Expiry alert level assignment
- [ ] Integration test: Dashboard shows correct items
- [ ] Integration test: POS warns/blocks expired items
- [ ] Performance test: Expiry query on 1M+ stock records < 2s

**Deliverable:** Expiry tracking fully visible; automated clearance suggestions

---

### Week 3: Drug Interaction Checker

#### 3.1 Setup DIN Database
- [ ] Download India DIN (Drug Index Number) master
  - [ ] Source: OpenFDA + CDSCO Indian Database
  - [ ] Create `medicine_master` table with DIN mapping
  - [ ] Populate interaction matrix (what drugs conflict)

- [ ] Database Schema
  ```sql
  CREATE TABLE medicine_master (
    id UUID PRIMARY KEY,
    din VARCHAR(10) UNIQUE,
    generic_name VARCHAR(100),
    drug_name VARCHAR(150),
    manufacturer VARCHAR(100),
    strength VARCHAR(50),
    form VARCHAR(30), -- Tablet, Injection, Syrup
    therapeutic_class VARCHAR(100),
    contraindications TEXT,
    side_effects TEXT,
    interactions JSON,
    requires_prescription BOOLEAN,
    schedule_type VARCHAR(20), -- H1, H2, H3, OTC
    created_at TIMESTAMP
  );

  CREATE TABLE drug_interactions (
    id UUID PRIMARY KEY,
    drug1_din VARCHAR(10),
    drug2_din VARCHAR(10),
    interaction_level VARCHAR(20), -- SEVERE, MODERATE, MILD
    interaction_description TEXT,
    recommendation TEXT,
    created_at TIMESTAMP
  );

  CREATE INDEX idx_drug1_din ON drug_interactions(drug1_din);
  CREATE INDEX idx_drug2_din ON drug_interactions(drug2_din);
  ```

#### 3.2 Backend Service
- [ ] Create `drugInteractionService.ts`
  ```typescript
  // Check cart for interactions
  checkCartInteractions(cartItems): InteractionWarning[]
  
  // Get specific interaction details
  getInteractionDetails(drug1Din, drug2Din): InteractionDetail
  
  // Get patient contraindications
  checkPatientContraindications(patientAge, conditions, medicines): Warning[]
  ```

- [ ] API Endpoints
  ```
  POST   /api/pharmacy/interactions/check-cart
  GET    /api/pharmacy/interactions/:din1/:din2
  GET    /api/pharmacy/medicine-master/:din
  POST   /api/pharmacy/interactions/patient-check
  ```

#### 3.3 Frontend Components
- [ ] Interaction Warning Modal
  - [ ] Displays at checkout: "⚠️ Interaction Detected"
  - [ ] Shows severity: SEVERE (Red), MODERATE (Yellow), MILD (Blue)
  - [ ] Explanation in simple language
  - [ ] "Consult Pharmacist" CTA
  - [ ] Pharmacist can override (with notes)

- [ ] Pharmacist Counseling View
  - [ ] Patient medical history input
  - [ ] Drug allergy tracking
  - [ ] Interaction check with full details
  - [ ] Counseling notes capture
  - [ ] Patient signature/consent

#### 3.4 Testing
- [ ] Unit test: Interaction detection (known pairs)
- [ ] Integration test: Cart warns on incompatible drugs
- [ ] Edge case: 3+ drugs interaction (complex matrix)
- [ ] Performance: Interaction check on 10 drugs < 1 second

**Deliverable:** Pharmacist has interaction warnings at POS; patient counseling captured

---

### Week 4: Prescription Upload & Verification

#### 4.1 Backend Infrastructure
- [ ] OCR Setup (using Tesseract or AWS Textract)
  - [ ] Extract: Patient name, Medicine name, Dosage, Quantity, Doctor name, Date
  - [ ] Validate: Doctor license in medical council database
  - [ ] Flag issues: Expired prescription (> 6 months), Duplicate

- [ ] API Endpoints
  ```
  POST   /api/pharmacy/prescription/upload
  POST   /api/pharmacy/prescription/verify-doctor
  GET    /api/pharmacy/prescription/:id
  POST   /api/pharmacy/prescription/:id/approve
  POST   /api/pharmacy/prescription/:id/reject
  GET    /api/pharmacy/prescription/patient/:patientId
  ```

#### 4.2 Frontend Components
- [ ] Prescription Upload UI
  - [ ] Drag-drop image/PDF upload
  - [ ] Camera capture for mobile
  - [ ] Preview extracted data
  - [ ] Manual correction interface
  - [ ] Doctor verification status

- [ ] Pharmacist Dashboard
  - [ ] Queue of pending prescriptions
  - [ ] Auto-extracted data with confidence score
  - [ ] Ability to reject (with reason)
  - [ ] Approve for fulfillment
  - [ ] Flag for review (if uncertain)

- [ ] Patient Portal (Future)
  - [ ] Upload prescription from home
  - [ ] Track fulfillment status
  - [ ] Pick up notification

#### 4.3 Database Changes
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY,
  patient_id UUID,
  patient_name VARCHAR(100),
  prescriber_name VARCHAR(100),
  prescriber_license_no VARCHAR(50),
  prescription_date DATE,
  image_url VARCHAR(500),
  extracted_medicines JSON,
  status VARCHAR(20), -- PENDING, VERIFIED, APPROVED, REJECTED
  verification_notes TEXT,
  verified_by_pharmacist_id UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE duplicate_prescriptions (
  id UUID PRIMARY KEY,
  original_prescription_id UUID REFERENCES prescriptions(id),
  duplicate_prescription_id UUID REFERENCES prescriptions(id),
  detected_at TIMESTAMP,
  reason VARCHAR(200)
);
```

#### 4.4 Testing
- [ ] Unit test: OCR on sample prescriptions (accuracy > 85%)
- [ ] Unit test: Doctor license validation
- [ ] Integration test: Prescription upload → Verify → Approve
- [ ] Security test: Patient data encryption (sensitive info)

**Deliverable:** Pharmacies can upload and verify prescriptions; flagged duplicates/invalid

---

## 🟡 HIGH-VALUE FEATURES (Weeks 5-8)

### Week 5-6: Temperature-Controlled Storage Module

#### 5.1 Database & Monitoring
```sql
CREATE TABLE storage_units (
  id UUID PRIMARY KEY,
  godown_id UUID REFERENCES godowns(id),
  storage_name VARCHAR(100), -- Fridge-A, Freezer-B, AC Room
  storage_type VARCHAR(50), -- FRIDGE, FREEZER, AC_ROOM, AMBIENT
  min_temp_celsius DECIMAL(5,2),
  max_temp_celsius DECIMAL(5,2),
  alert_threshold_min DECIMAL(5,2),
  alert_threshold_max DECIMAL(5,2),
  monitoring_device_id VARCHAR(100), -- IoT sensor ID
  created_at TIMESTAMP
);

CREATE TABLE temperature_logs (
  id UUID PRIMARY KEY,
  storage_unit_id UUID REFERENCES storage_units(id),
  temperature_celsius DECIMAL(5,2),
  humidity_percent DECIMAL(5,2),
  logged_at TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_temp_logs_unit_time ON temperature_logs(storage_unit_id, logged_at DESC);

CREATE TABLE batch_storage_assignment (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES batches(id),
  storage_unit_id UUID REFERENCES storage_units(id),
  quantity_stored INT,
  stored_date DATE,
  compliance_checked BOOLEAN,
  created_at TIMESTAMP
);
```

#### 5.2 IoT Integration
- [ ] Support IoT sensors: DHT22, DS18B20, or API from smart fridges
- [ ] Real-time temp dashboard
- [ ] Alert if temp out of range
- [ ] Batch damage documentation form

#### 5.3 Compliance Reporting
- [ ] Generate compliance audit report (24-hour temp logs)
- [ ] Export for regulatory inspection
- [ ] Alert history for troubleshooting

**Deliverable:** Full temperature monitoring with compliance audit trail

---

### Week 7: Commission & Salesman Management

#### 7.1 Backend Service
```typescript
// Calculate commission based on sales, returns, growth
calculateSalesmanCommission(salesmanId, period): CommissionBreakdown

// Track individual salesman metrics
getSalesmanKPIs(salesmanId, period): {
  totalSales, returns, collections, growthPercent, commission
}

// Bulk commission processing
processBulkCommissions(month, year): CommissionBatch
```

#### 7.2 Frontend Components
- [ ] Salesman Dashboard
  - [ ] Real-time sales today vs. target
  - [ ] Commission this month (projected)
  - [ ] Top products sold
  - [ ] Customer collections status
  - [ ] Mobile-friendly view

- [ ] Commission Rules Builder
  - [ ] Define tiered commission (0-50L = 3%, 50-100L = 4%, etc.)
  - [ ] Performance bonuses
  - [ ] Return deduction logic
  - [ ] Preview calculation

#### 7.3 Reporting
- [ ] Commission statement by salesman
- [ ] Commission vs. actual sales variance
- [ ] Monthly commission approval workflow

**Deliverable:** Salesmen see real-time commission; transparent payout process

---

### Week 8: Multi-Store Inventory Sync

#### 8.1 Real-Time Sync Architecture
- [ ] Central inventory sync service
- [ ] Per-store stock levels updated every 2-5 minutes
- [ ] Conflict resolution (if stock < 0)
- [ ] Reorder point automation

#### 8.2 Features
- [ ] Stock allocation: Head office decides stock per store
- [ ] Fast-moving item auto-restock
- [ ] Store-to-store transfer workflow
- [ ] Inventory shortage alerts

**Deliverable:** Head office sees real-time stock across all stores

---

## 📊 SUCCESS METRICS (Track These)

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Barcode scan speed | < 2 seconds | Timing in POS during beta |
| Interaction detection accuracy | > 95% | Test against known drug pairs |
| Prescription OCR accuracy | > 85% | Manual verification vs. extracted data |
| Temperature alert timeliness | < 5 minutes | Send alert before threshold breach |
| Commission calculation accuracy | 100% | Auto vs. manual audit |
| Multi-store sync latency | < 5 minutes | Monitor central sync service |
| Expiry waste reduction | 40% reduction | Compare before/after at beta sites |
| Customer satisfaction (beta) | NPS > 60 | Survey 20-30 pharmacists |

---

## 🛠️ TECHNICAL REQUIREMENTS

### Backend Enhancements
- [ ] Async job queue (Bull/BullMQ) for batch operations
- [ ] WebSocket for real-time updates (temp, stock, alerts)
- [ ] File storage for prescription images (AWS S3 or equivalent)
- [ ] Third-party API integrations (DIN database, IoT sensors)
- [ ] Caching layer (Redis) for fast lookups (barcodes, DIN data)

### Frontend Enhancements
- [ ] Barcode input library (JsBarcode, QuaggaJS)
- [ ] QR code generator (qrcode.react)
- [ ] Real-time data (Socket.io)
- [ ] Thermal printer support (ESC/POS)
- [ ] Prescription image viewer

### Database Capacity
- [ ] Support 5M+ barcodes
- [ ] Store 50M+ temperature logs (1 year)
- [ ] Track 1M+ prescriptions
- [ ] Handle 1000 concurrent POS terminals

---

## 💰 ESTIMATED EFFORT

| Feature | Dev Days | QA Days | Total | Risk |
|---------|----------|---------|-------|------|
| Barcode scanning | 10 | 3 | 13 | LOW |
| Expiry management | 8 | 3 | 11 | LOW |
| Drug interactions | 12 | 4 | 16 | MEDIUM |
| Prescription OCR | 14 | 4 | 18 | HIGH |
| Temperature IoT | 10 | 3 | 13 | MEDIUM |
| Commission tracking | 8 | 2 | 10 | LOW |
| Multi-store sync | 12 | 4 | 16 | MEDIUM |
| **TOTAL** | **74** | **23** | **97** | |

**Calendar Timeline:** 97 days ÷ 8-10 devs = ~10-12 weeks = Ready by mid-June 2026

---

## 🚀 GO-LIVE CHECKLIST

- [ ] 100% test coverage for critical paths
- [ ] Performance testing: Handle 1000 orders/hour per store
- [ ] Security audit: Patient data, prescription images, API keys
- [ ] Data migration: Historic inventory to new schema
- [ ] User training: Pharmacist handbook + video tutorials
- [ ] Support readiness: Help desk trained on new features
- [ ] Documentation: API docs + user guides published
- [ ] Monitoring: Set up alerts for failures, latency
- [ ] Rollback plan: Ready to revert if critical issues
- [ ] Beta site approval: Get sign-off from 3-5 customers

