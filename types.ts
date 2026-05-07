
export enum Tab {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  PURCHASE = 'PURCHASE',
  ACCOUNTS = 'ACCOUNTS',
  INVENTORY_VOUCHERS = 'INVENTORY_VOUCHERS',
  TALLY_VOUCHER_ENTRY = 'TALLY_VOUCHER_ENTRY',
  FINANCIAL_STATEMENTS = 'FINANCIAL_STATEMENTS',
  GENERAL_LEDGER = 'GENERAL_LEDGER',
  STRATEGIC_ACCOUNTS = 'STRATEGIC_ACCOUNTS',
  STOCK_SUMMARY = 'STOCK_SUMMARY',
  
  // Growth & Sales
  PCD = 'PCD',
  CRM = 'CRM', // New
  OMS = 'OMS', // New
  SALES = 'SALES', // New (Wholesale)
  
  // Manufacturing & Quality
  MANUFACTURING = 'MANUFACTURING',
  QC = 'QC', // New
  R_AND_D = 'R_AND_D', // New
  
  // Operations
  LOGISTICS = 'LOGISTICS', // New
  ASSETS = 'ASSETS', // New
  DOCUMENTS = 'DOCUMENTS', // New
  
  // Admin & HR
  EMPLOYEES = 'EMPLOYEES', // HR & Payroll
  REPORTS = 'REPORTS',
  COMPLIANCE = 'COMPLIANCE',
  AUDIT = 'AUDIT', // New
  BUDGET = 'BUDGET', // New
  SETTINGS = 'SETTINGS',
  MULTI_BRANCH = 'MULTI_BRANCH',
  INVENTORY_ANALYTICS = 'INVENTORY_ANALYTICS',
  INTELLIGENCE_DASHBOARD = 'INTELLIGENCE_DASHBOARD',
  LEDGER_CREATION = 'LEDGER_CREATION'
}

export type UserRole = 'ADMIN' | 'PHARMACIST' | 'CASHIER' | 'SALES_MANAGER' | 'QC_MANAGER' | 'INVENTORY_MANAGER' | 'QUALITY_MANAGER' | 'FINANCE_MANAGER' | 'HR_MANAGER' | 'PRODUCTION_MANAGER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  genericName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  lastReceivedDate: string;
  expiryStatus: 'OK' | 'EXPIRING_SOON' | 'EXPIRED';
  totalValue: number;
  batchCount: number;
}

export interface BatchLog {
  id: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  mrp: number;
  ptr: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
}

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  category: 'Medical' | 'Sales' | 'Inventory' | 'Accounts' | 'General' | 'HR' | 'Compliance';
  dueDate?: string;
  description?: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  manufacturingDate?: string;
  stock: number;
  mrp: number;
  purchaseRate: number;
  ptr?: number; // Price to Retailer
  pts?: number; // Price to Stockist
  landingCost?: number; // Purchase Rate + Tax + Expenses
  sellingRate: number;
  barcode?: string;
  qrCode?: string;
  location: string; // Rack/Shelf specific to batch
}

export interface Product {
  id: string;
  name: string; // Brand Name
  alias?: string[]; // Alternative names for easy access
  source: 'PCD' | 'OWN_MANUFACTURING' | 'TRADING'; // Source of the product
  genericName: string;
  manufacturer: string;
  therapeuticCategory: string; // e.g., Antibiotic, Analgesic
  packing: string; // e.g., 10x10 Box, 100ml Bottle
  uom: string; // Strip, Bottle, Vial
  hsn: string;
  gst: number; // Percentage
  minStockLevel: number;
  reorderLevel: number;
  secondaryUnit?: string; // e.g. "Box" if uom is "Strip"
  conversionFactor?: number; // e.g. 10 (1 Box = 10 Strips)
  stockCategory?: string; // Secondary classification
  taxType?: 'Taxable' | 'Exempt' | 'Nil Rated' | 'Non-GST';
  rack: string; // Default location
  scheduleType: 'H' | 'H1' | 'X' | 'OTC';
  isNarcotic?: boolean;
  temperatureSensitive?: boolean;
  isFastMoving?: boolean; // New
  shelfLife?: number; // New (Months)
  composition?: string; // Detailed Salt/Chemical composition
  unitsPerPack?: number; // Number of units (e.g. 10 tablets) per packing unit
  scheme?: string; // e.g. "10+1"
  trackExpiry?: boolean;
  
  // Aggregate fields for simple views
  totalStock: number;
  
  // Phase 6: Analytics
  abcClassification?: 'A' | 'B' | 'C';
  fsnClassification?: 'F' | 'S' | 'N';
  vedClassification?: 'V' | 'E' | 'D';
  movementVelocity?: number; // Sales per month
  
  // Batch Management
  batches: Batch[];

  // Legacy fields for compatibility with existing POS/Purchase (mapped from primary batch)
  batchNo?: string; 
  expiryDate?: string;
  stock?: number;
  mrp?: number;
  rate?: number; // Legacy, usually Selling Rate
  purchaseRate?: number;
  sellingRate?: number;
  ptr?: number;
  pts?: number;
  landingCost?: number;
  barcode?: string;
  branchStocks?: BranchStock[]; // Localized stock view
}

export interface InventoryAnalyticsItem {
  productId: string;
  name: string;
  totalStock: number;
  stockValue: number;
  velocity: number; // Sales per month
  status: string;
  abc: 'A' | 'B' | 'C';
  fsn: 'F' | 'S' | 'N';
  ved: 'V' | 'E' | 'D';
}

export interface InventoryAnalyticsData {
  abcAnalysis: {
    categoryA: InventoryAnalyticsItem[];
    categoryB: InventoryAnalyticsItem[];
    categoryC: InventoryAnalyticsItem[];
    summary: { countA: number; valueA: number; countB: number; valueB: number; countC: number; valueC: number; };
  };
  fsnAnalysis: {
    fast: InventoryAnalyticsItem[];
    slow: InventoryAnalyticsItem[];
    nonMoving: InventoryAnalyticsItem[];
  };
  vedAnalysis: {
    vital: InventoryAnalyticsItem[];
    essential: InventoryAnalyticsItem[];
    desirable: InventoryAnalyticsItem[];
  };
  expiryLifecycle: {
    expired: InventoryAnalyticsItem[];
    nearExpiry: InventoryAnalyticsItem[]; // < 6 months
    safe: InventoryAnalyticsItem[];
  };
  deadStock: InventoryAnalyticsItem[]; // No movement > 90 days
}

// Detailed Invoice Item for POS
export interface SalesInvoiceItem {
  id: string; // unique line item id
  productId: string;
  productName: string;
  genericName: string;
  hsn: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  
  // Qty
  quantity: number;
  freeQuantity: number;
  uom: string;

  // Pricing
  mrp: number;
  rate: number; // Selling Rate
  discountPercent: number;
  discountAmount: number;
  
  // Tax & Totals
  taxableValue: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number; // Net Amount for line
  
  // Scheme
  schemeApplied?: string;
  purchaseRate: number;
  maxStock: number;
  
  // Tally ERP 11 Fields (Prices & Profit)
  ptr?: number; // Price to Retailer
  pts?: number; // Price to Stockist
  profitPerUnit?: number;
  profitPercent?: number;
}

// Detailed Invoice Header
export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  
  // Customer
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerGstin?: string;
  billingAddress?: string;
  doctorName?: string;
  patientName?: string;
  isH1?: boolean;
  
  // Items
  items: SalesInvoiceItem[];
  
  // Financials
  totalItems: number;
  totalQuantity: number;
  subTotal: number; // Before Tax
  taxableValue: number;
  totalDiscount: number;
  totalGst: number;
  roundOff: number;
  netAmount: number;
  
  // Payment
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Multi';
  paymentSplit?: {
    cash: number;
    upi: number;
    card: number;
    credit: number;
  };
  amountReceived: number;
  balanceDue: number;
  status: 'Draft' | 'Completed' | 'Hold' | 'Cancelled';
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  gstin: string;
  outstanding: number;
  type: 'Goods' | 'Services' | 'Raw Material'; // Updated
  address?: string;
  city?: string;
}

// Unified Ledger for Parties (Customers & Suppliers)
export interface PartyLedgerEntry {
  id: string;
  date: string;
  voucherType: 'Sale' | 'Purchase' | 'Receipt' | 'Payment' | 'Credit Note' | 'Debit Note';
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number; // Running Balance
  narration?: string;
}

export interface Party {
  id: string;
  name: string;
  type: 'Debtor' | 'Creditor'; // Customer | Supplier
  gstin?: string;
  mobile: string;
  city: string;
  currentBalance: number; // +ve for Dr (Receivable), -ve for Cr (Payable)
  creditLimit?: number;
  route?: string; // Beat/Area
  ledger: PartyLedgerEntry[];
  // Additional detailed fields
  address?: string;
  email?: string;
  contactPerson?: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  creditDays?: number;
  category?: 'Regular' | 'Premium' | 'VIP' | 'Corporate';
  territory?: string;
  remarks?: string;
}

export interface GSTReportEntry {
  hsn: string;
  description: string;
  taxRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface PCDPartner {
  id: string;
  name: string;
  territory: string;
  contact: string;
  email: string;
  drugLicenseNo: string;
  status: 'Active' | 'Inactive';
  joinDate: string;
  assignedMrIds?: string[];
}

export interface PCDScheme {
  id: string;
  name: string;
  description: string;
  validUntil: string;
  type: 'Volume' | 'Value' | 'Product';
  minimumOrder?: number;
  discountPercentage?: number;
  freeProducts?: string;
  terms?: string;
  eligibilityCriteria?: string;
  bonusIncentives?: string;
  targetProducts?: string;
  schemeCode?: string;
}

export interface MedicalRepresentative {
  id: string;
  name: string;
  contact: string;
  email: string;
  headquarters: string;
  assignedArea: string; // Region
  salesTarget: number;
  totalSales: number;
  targetAchievement: number; // Percentage
  status: 'Active' | 'On Leave' | 'Inactive';
  joinDate: string;
  
  // Payroll info
  baseSalary?: number;
  incentives?: number; // Fixed allowances
  deductions?: number;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  
  // Earnings
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  performanceIncentive: number;
  fixedAllowance: number; // New field for Travel/Phone allowances
  grossSalary: number;
  
  // Deductions
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net
  netPay: number;
  
  // Accrued Benefits
  gratuityAccrued: number;
}

export interface PCDTarget {
  id: string;
  partnerId: string;
  partnerName: string;
  period: string;
  targetAmount: number;
  achievedAmount: number;
  incentivePercentage: number;
  status: 'Pending' | 'Achieved' | 'Failed';
}

export interface SaleTransaction {
  id: string;
  mrId: string;
  date: string;
  chemist: string;
  area: string;
  productId?: string; // Optional link to product catalog
  productName: string;
  quantity: number;
  amount: number;
  category: 'PCD' | 'Metapharsic';
  status: 'Verified' | 'Pending';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  amount: number;
  gst?: number;
  gstAmount?: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: 'Received' | 'Pending' | 'Ordered';
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
}

export interface PurchaseReturnItem {
  productId: string;
  productName: string;
  batchNo: string;
  quantity: number;
  returnRate: number;
  amount: number;
  reason: string;
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  referenceInvoiceNo?: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  status: 'Completed' | 'Pending';
}

export interface Payment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  date: string;
  mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit Note';
  referenceNo?: string;
  notes?: string;
}

export interface SalesData {
  date: string;
  sales: number;
  profit: number;
}

export interface GeminiResponse {
  answer: string;
  relatedData?: any;
}

// --- NEW ERP TYPES ---

export interface RawMaterial {
  id: string;
  name: string;
  casNumber?: string; // Chemical Abstracts Service number
  currentStock: number; // in Kg/L
  uom: 'Kg' | 'L' | 'Grams';
  minStockLevel: number;
  costPerUnit: number;
}

export interface BillOfMaterial {
  id: string;
  productId: string; // Links to Finished Good
  productName: string;
  batchSize: number; // e.g., for 100,000 tablets
  ingredients: {
    materialId: string;
    materialName: string;
    quantityRequired: number; // in RawMaterial UOM
  }[];
}

export interface ProductionOrder {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  bomId: string;
  plannedQuantity: number;
  startDate: string;
  endDate?: string;
  status: 'Planned' | 'In Process' | 'QC Check' | 'Packaging' | 'Completed';
  currentStage: string; // e.g., "Granulation", "Compression"
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Marketing' | 'Logistics' | 'Maintenance' | 'Other';
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  paymentMode: 'Bank Transfer' | 'Cash' | 'Card';
}

// --- NEW MODULE TYPES ---

export interface Lead {
  id: string;
  name: string;
  companyName: string;
  location: string;
  contact: string;
  email?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Converted' | 'Lost' | 'On Hold';
  source: 'Website' | 'Social Media' | 'Exhibition' | 'Referral' | 'Cold Call' | 'Email Campaign' | 'Advertisement' | 'Partner' | 'Walk-in';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  nextFollowUp: string;
  notes: string;
  activities: LeadActivity[];
  createdAt: string;
  assignedTo?: string;
  estimatedValue?: number;
  productInterest?: string[];
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  description: string;
  performedBy: string;
  performedAt: string;
  duration?: number; // in minutes
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  attachments?: string[];
}

export type LeadActivityType =
  | 'Call'
  | 'Email'
  | 'Meeting'
  | 'Site Visit'
  | 'Demo'
  | 'Proposal Sent'
  | 'Quote Sent'
  | 'Follow-up'
  | 'Reminder'
  | 'Note'
  | 'Status Change'
  | 'Document Shared'
  | 'WhatsApp'
  | 'SMS'
  | 'Video Call'
  | 'Presentation'
  | 'Negotiation'
  | 'Sample Sent'
  | 'Sample Received'
  | 'Contract Sent'
  | 'Contract Signed'
  | 'Payment Received'
  | 'Task Created'
  | 'Task Completed'
  | 'Escalation';

export interface QCRecord {
  id: string;
  batchNumber: string;
  productName: string;
  testDate: string;
  testedBy: string;
  parameters: {
    parameter: string; // e.g., "pH", "Dissolution", "Assay"
    standard: string; // e.g., "6.0 - 7.0"
    result: string; // e.g., "6.5"
    status: 'Pass' | 'Fail';
  }[];
  finalStatus: 'Approved' | 'Rejected' | 'Pending';
  coaGenerated: boolean;
}

export interface DispatchEntry {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPincode: string;
  dispatchDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  transporter: string;
  transporterId: string;
  lrNumber: string; // Lorry Receipt
  ewayBillNo?: string;
  ewayBillDate?: string;
  boxes: number;
  weight: string;
  volume?: string; // Cubic meters
  packageType: 'Box' | 'Carton' | 'Pallet' | 'Drum';
  fragile: boolean;
  temperatureControlled: boolean;
  insuranceValue?: number;
  insuranceCompany?: string;
  codAmount?: number;
  shippingCost: number;
  handlingCharges: number;
  totalCharges: number;
  paymentMode: 'Prepaid' | 'COD' | 'ToPay';
  status: 'Packed' | 'Shipped' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Returned' | 'Cancelled';
  deliveryAttempts: number;
  deliveryPerson?: string;
  deliverySignature?: string;
  deliveryRemarks?: string;
  trackingUpdates: {
    timestamp: string;
    location: string;
    status: string;
    remarks?: string;
  }[];
  vehicleNumber?: string;
  driverName?: string;
  driverContact?: string;
  routeDetails?: string;
  distanceCovered?: number; // in kilometers
  fuelConsumed?: number; // in liters
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUpdatedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: 'Machinery' | 'Vehicle' | 'IT' | 'Furniture' | 'Facility' | 'Lab Equipment' | 'Production Line';
  modelNo: string;
  serialNo: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number; // Depreciated value
  status: 'Active' | 'Maintenance' | 'Retired' | 'Disposed' | 'Under Repair';
  location: string;
  assignedTo?: string; // Employee Name
  department?: string; // Department name
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
  insuranceExpiry?: string;
  insuranceValue?: number;
  insuranceCompany?: string;
  vendorId?: string;
  vendorName?: string;
  vendorContact?: string;
  depreciationMethod?: 'Straight Line' | 'Written Down Value' | 'Sum of Years';
  depreciationRate?: number;
  usefulLife?: number; // in years
  barcode?: string;
  qrCode?: string;
  lastInspectionDate?: string;
  inspectionFrequency?: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  criticality?: 'High' | 'Medium' | 'Low';
  assetTag?: string;
  specifications?: string;
  installationDate?: string;
  commissionDate?: string;
  lastModified?: string;
  modifiedBy?: string;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  type: 'Preventive' | 'Repair' | 'Calibration' | 'Emergency' | 'Inspection' | 'Upgrade';
  description: string;
  cost: number;
  performedBy: string; // Vendor or Internal
  nextScheduledDate?: string;
  status: 'Completed' | 'Pending' | 'In Progress' | 'Cancelled';
  priority: 'High' | 'Medium' | 'Low';
  partsReplaced?: string;
  laborHours?: number;
  vendorId?: string;
  vendorName?: string;
  warrantyClaim?: boolean;
  attachments?: string[]; // File paths or URLs
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: 'Maintenance' | 'Equipment' | 'IT' | 'Vehicle' | 'General';
  rating: number; // 1-5
  status: 'Active' | 'Inactive' | 'Blacklisted';
  contractExpiry?: string;
  servicesProvided: string[];
  lastServiceDate?: string;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicy {
  id: string;
  assetId: string;
  assetName: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: 'Comprehensive' | 'Third Party' | 'Fire' | 'Theft';
  coverageAmount: number;
  premiumAmount: number;
  startDate: string;
  expiryDate: string;
  renewalDate?: string;
  status: 'Active' | 'Expired' | 'Pending Renewal';
  claimHistory: InsuranceClaim[];
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  claimDate: string;
  claimAmount: number;
  settledAmount: number;
  status: 'Filed' | 'In Process' | 'Settled' | 'Rejected';
  description: string;
  documents: string[];
  settledDate?: string;
  remarks?: string;
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  assetName: string;
  fromLocation: string;
  toLocation: string;
  fromDepartment?: string;
  toDepartment?: string;
  transferDate: string;
  reason: string;
  approvedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  remarks?: string;
}

export interface AssetAlert {
  id: string;
  assetId: string;
  assetName: string;
  type: 'Maintenance Due' | 'Warranty Expiry' | 'Insurance Expiry' | 'Inspection Due' | 'Depreciation Alert';
  message: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'Active' | 'Resolved' | 'Dismissed';
  createdAt: string;
}

// DMS Related Interfaces
export interface DocRecord {
  id: string;
  title: string;
  category: 'SOP' | 'License' | 'Report' | 'Compliance' | 'Policy' | 'Other';
  type: 'PDF' | 'DOCX' | 'JPG' | 'XLSX' | 'PPTX' | 'TXT';
  size: string;
  version: string;
  uploadDate: string;
  expiryDate?: string;
  author: string;
  status: 'Active' | 'Draft' | 'Expiring' | 'Archived' | 'Deleted' | 'Pending';
}

export interface Document extends DocRecord {
  tags: string[];
  keywords: string[];
  department: string;
  approvers: string[];
  approvedBy: string[];
  approvalDate: string;
  fileSize: number;
  pageCount: number;
  documentOwner: string;
  stakeholders: string[];
  securityLevel: 'Public' | 'Confidential' | 'Internal' | 'Restricted';
  createdAt: string;
  lastModified: string;
  lastModifiedBy: string;
  viewCount: number;
  downloadCount: number;
  relatedDocuments: string[];
  workflowStatus: 'Draft' | 'In Review' | 'Approved' | 'Rejected' | 'Published';
  retentionPeriod: number; // in years
  classification: 'Regulatory' | 'Operational' | 'Financial' | 'HR' | 'Technical';
}



export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  title: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  changeLog: string;
  approvedBy: string;
  approvalDate: string;
  status: 'Current' | 'Previous' | 'Archived';
}

export interface DocumentWorkflow {
  id: string;
  documentId: string;
  documentTitle: string;
  currentStep: 'Draft' | 'Review' | 'Approval' | 'Published';
  assignedTo: string;
  dueDate: string;
  comments: WorkflowComment[];
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowComment {
  id: string;
  workflowId: string;
  author: string;
  comment: string;
  timestamp: string;
  action: 'Comment' | 'Approve' | 'Reject' | 'Request Changes';
}

export interface DocumentAuditTrail {
  id: string;
  documentId: string;
  action: 'Created' | 'Modified' | 'Viewed' | 'Downloaded' | 'Deleted' | 'Approved' | 'Rejected';
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
  category: 'Department' | 'Project' | 'Compliance' | 'Product' | 'Process';
  usageCount: number;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  category: string;
  type: string;
  relevanceScore: number;
  snippet: string;
  uploadDate: string;
  author: string;
  status: string;
}

export interface Formulation {
  id: string;
  productName: string;
  dosageForm: string; // Tablet, Syrup, etc.
  stage: 'Ideation' | 'Lab Scale' | 'Pilot' | 'Stability' | 'Ready for Mfg';
  version: string;
  startDate: string;
  targetCost: number; // Est cost per unit
  ingredients: {
    materialId: string;
    materialName: string;
    quantity: number; // mg per unit
    costPerUnit: number; // derived from RM master at time of add
  }[];
}

export interface Experiment {
  id: string;
  formulationId: string;
  formulationName: string;
  testName: string; // e.g. "Accelerated Stability 1 Month"
  startDate: string;
  endDate: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Failed';
  resultData?: string; // summary
  assignedTo: string;
}

export type OrderStatus = 'Pending Approval' | 'Approved' | 'Processing' | 'Shipped' | 'Delivered' | 'Rejected' | 'Hold';

export interface DistributorOrder {
  id: string;
  distributorId: string;
  distributorName: string;
  date: string;
  items: {
    productId: string;
    productName: string;
    quantity: number; // Requested
    approvedQuantity?: number; // Approved/Shipped (For Comparison)
    rate: number;
    amount: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
  priority: 'High' | 'Normal';
  creditStatus: 'Clear' | 'Limit Exceeded';
  packingSpecs?: string;
  labelingSpecs?: string;
  notes?: string;
}

// Legacy Type for cart compatibility (Deprecated, using SalesInvoiceItem)
export interface CartItem extends Product {
  quantity: number;
  discount: number; 
  freeQuantity: number;
  selectedBatchId?: string;
}

// Legacy Invoice (Deprecated, using SalesInvoice)
export interface Invoice {
  id: string;
  customerName: string;
  doctorName: string;
  date: string;
  time?: string;
  items: CartItem[];
  totalAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Card';
  status: 'Paid' | 'Hold' | 'Credit';
}

export interface Company {
  id: string;
  name: string;
  businessType: 'Pharmaceutical' | 'Medical Device' | 'Food Supplement' | 'Cosmetic' | 'Biotech' | 'Generic Medicine' | 'Retail Pharmacy';
  taxStructure: 'Product Wise' | 'Invoice Wise';
  financialYearStart: string; // Format: YYYY-MM-DD
  financialYearEnd: string; // Format: YYYY-MM-DD
  gstin: string;
  vatNumber?: string;
  drugLicenseNo: string;
  foodLicenseNo?: string;
  valuationMethod: 'Last Purchase' | 'Average Cost' | 'FIFO' | 'LIFO';
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// COMPREHENSIVE ACCOUNTING MODULE TYPES
// (Tally ERP like features)
// ========================================

/**
 * Chart of Accounts - Hierarchical structure for all ledgers
 * Tally: Masters > Accounts > Chart of Accounts
 */
export interface ChartOfAccount {
  id: string;
  accountCode: string; // e.g., "1001", "2001"
  accountName: string;
  accountType: AccountType; // Primary classification
  parentAccountId?: string; // For hierarchical structure
  description?: string;
  openingBalance: number;
  openingBalanceDate: string; // FY start date
  reconciliationStatus: 'Balanced' | 'Pending' | 'Variance';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  costCenter?: string; // For cost allocation
  
  // Tally ERP inspired fields
  alias?: string;
  inventoryAffected?: boolean;
  ledgerType?: string;
  activateInterest?: boolean;
  mailingName?: string;
  mailingAddress?: string;
  mailingCountry?: string;
  mailingState?: string;
  provideBankDetails?: boolean;
  panItNo?: string;
  group?: string; // Mapped from account_group in DB
  status?: 'Active' | 'Inactive'; // Added for compatibility
  accountFormat?: 'debit' | 'credit';
  gstApplicable?: boolean;
}

export type AccountType = 
  | 'Asset' // Current, Fixed, Investments
  | 'Liability' // Current, Long-term
  | 'Equity' // Capital, Retained Earnings
  | 'Income' // Sales, Other Income
  | 'Expense' // COGS, Admin, Selling

/**
 * General Ledger - Master ledger containing all transactions
 * Each account has its GL with Dr/Cr entries
 */
export interface GeneralLedgerEntry {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  date: string;
  voucherId: string; // Links to Journal/Invoice/Payment
  voucherType: VoucherType;
  voucherNo: string;
  debit: number;
  credit: number;
  runningBalance: number; // Running Dr/Cr balance
  narration?: string;
  refDocument?: string; // Original invoice/bill reference
  costCenter?: string;
  department?: string;
  isReconciled?: boolean;
  reconcilationDate?: string;
  createdAt: string;
  createdBy: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export type VoucherType = 
  | 'Journal' // JV
  | 'Sale' // Sales Invoice
  | 'Purchase' // Purchase Invoice
  | 'Receipt' // Cash/Bank Receipt
  | 'Payment' // Cash/Bank Payment
  | 'Contra' // Bank Transfer
  | 'Credit Note' // CN
  | 'Debit Note' // DN
  | 'Opening' // Opening Entry
  | 'Closing' // Closing Entry
  | 'Adjustment'; // Manual Adjustment

/**
 * Journal Voucher - For recording manual accounting entries
 * Tally: Accounting Vouchers > Journal
 */
export interface JournalVoucher {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  reference?: string;
  entries: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted' | 'Rejected';
  approvedBy?: string;
  approvalDate?: string;
  reversalEntry?: string; // Links to reversal JV if any
  createdAt: string;
  createdBy: string;
  department?: string;
  project?: string;
  internalComments?: string;
}

export interface JournalEntry {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  narration?: string;
  costCenter?: string;
}

/**
 * Trial Balance - Summary of all GL accounts
 * Tally: Reports > Trial Balance
 */
export interface TrialBalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  netBalance: number; // Dr or Cr
  balanceType: 'Dr' | 'Cr';
  asOnDate: string;
}

/**
 * Balance Sheet - Shows Financial Position
 * Tally: Reports > Balance Sheet
 */
export interface BalanceSheetReport {
  asOnDate: string;
  company: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanceCheck: boolean; // Assets = Liabilities + Equity
}

export interface BalanceSheetSection {
  currentItems: BalanceSheetLineItem[];
  fixedItems: BalanceSheetLineItem[];
  subtotal: number;
  total: number;
}

export interface BalanceSheetLineItem {
  accountId: string;
  accountName: string;
  currentYear: number;
  previousYear?: number;
  variance?: number;
  percentageOfTotal?: number;
}

/**
 * Income Statement / P&L Report
 * Tally: Reports > Profit & Loss
 */
export interface ProfitLossReport {
  period: string; // e.g., "Apr 2024 - Mar 2025"
  company: string;
  revenue: ProfitLossSection;
  expenses: ProfitLossSection;
  grossProfit: number;
  operatingIncome: number;
  netProfit: number;
  otherIncome: number;
  otherExpenses: number;
  taxExpense: number;
  netProfitAfterTax: number;
  eps?: number; // Earnings Per Share
  profitMargin?: number;
  comparison?: {
    previousPeriod: ProfitLossReport;
    variance: ProfitLossVariance;
  };
}

export interface ProfitLossSection {
  items: ProfitLossLineItem[];
  subtotal: number;
  percentage: number;
}

export interface ProfitLossLineItem {
  accountId: string;
  accountName: string;
  currentPeriod: number;
  previousPeriod?: number;
  variance?: number;
  percentageOfRevenue?: number;
}

export interface ProfitLossVariance {
  revenueVariance: number;
  expenseVariance: number;
  profitVariance: number;
  percentageChange: number;
}

/**
 * Cost Center - For cost allocation and tracking
 * Tally: Advanced > Cost Centers
 */
export interface CostCenter {
  id: string;
  costCenterCode: string;
  costCenterName: string;
  description?: string;
  category: 'Department' | 'Location' | 'Project' | 'Product Line' | 'Region';
  parentCostCenter?: string;
  budget?: number;
  manager?: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Budget vs Actual - For financial planning
 * Tally: Reports > Budget Analysis
 */
export interface BudgetMaster {
  id: string;
  budgetName: string;
  period: string; // FY 2024-25
  costCenterId: string;
  departmentId?: string;
  budgetItems: BudgetItem[];
  totalBudget: number;
  totalActual?: number;
  variance?: number;
  variancePercent?: number;
  status: 'Draft' | 'Approved' | 'Active' | 'Closed';
  approvedBy?: string;
  approvalDate?: string;
  createdAt: string;
  createdBy: string;
}

export interface BudgetItem {
  accountId: string;
  accountName: string;
  budgetAmount: number;
  actualAmount?: number;
  monthlyAllocation?: number[];
  variance?: number;
  status: 'On Track' | 'Over Budget' | 'Under Budget';
}

/**
 * Bank Reconciliation
 * Tally: Accounting Vouchers > Bank Reconciliation
 */
export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  reconciliationDate: string;
  bankStatementBalance: number;
  bookBalance: number;
  differences: ReconciliationDifference[];
  isReconciled: boolean;
  reconciliationNotes?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface ReconciliationDifference {
  id: string;
  type: 'Cheque Outstanding' | 'Deposit in Transit' | 'Bank Charge' | 'Interest' | 'Error';
  description: string;
  amount: number;
  referenceDoc?: string;
  resolvedOn?: string;
  status: 'Pending' | 'Resolved';
}

/**
 * Multi-Currency Support
 * Tally: Advanced > Multi-Currency
 */
export interface CurrencyMaster {
  id: string;
  currencyCode: string; // USD, EUR, GBP
  currencyName: string;
  symbol: string;
  exchangeRate: number; // To Base Currency (INR)
  rateAsOnDate: string;
  isActive: boolean;
}

export interface MultiCurrencyTransaction {
  id: string;
  baseCurrency: string;
  foreignCurrency: string;
  baseAmount: number;
  foreignAmount: number;
  exchangeRate: number;
  exchangeGain?: number;
  exchangeLoss?: number;
  date: string;
}

/**
 * Recurring Entries - For automatic postings
 * Tally: Accounting Vouchers > Recurring Entries
 */
export interface RecurringEntry {
  id: string;
  name: string;
  description?: string;
  type: 'Journal' | 'Contra' | 'Receipt' | 'Payment';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  startDate: string;
  endDate?: string;
  templateVoucherId: string;
  lastPostedDate?: string;
  nextPostingDate: string;
  isActive: boolean;
  autoApprove: boolean;
  createdAt: string;
  createdBy: string;
}

/**
 * TDS/TCS - Tax Deduction at Source / Tax Collection at Source
 * Tally: Accounting > TDS/TCS
 */
export interface TDSMaster {
  id: string;
  tdsSectionCode: string; // 194C, 194H, etc.
  tdsSectionName: string;
  applicableOn: 'Purchase' | 'Sale' | 'Payment';
  tdsRate: number; // Percentage
  threshold?: number; // Min invoice amount
  effectiveFrom: string;
  effectiveUpto?: string;
  description?: string;
  isActive: boolean;
}

export interface TDSEntry {
  id: string;
  voucherId: string;
  voucherType: VoucherType;
  supplierId?: string;
  supplierName?: string;
  transactionAmount: number;
  tdsApplicableAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netAmount: number;
  date: string;
  status: 'Posted' | 'Pending' | 'Cancelled';
}

/**
 * E-Invoicing Support
 * Tally: Compliance > E-Invoicing (GST)
 */
export interface EInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerGstin: string;
  buyerName: string;
  sellerGstin: string;
  sellerName: string;
  lineItems: EInvoiceLineItem[];
  totalValue: number;
  totalTax: number;
  totalWithTax: number;
  einvoiceNo?: string; // Generated by GST portal
  einvoiceStatus: 'Draft' | 'Generated' | 'Acknowledged' | 'Rejected' | 'Cancelled';
  qrCode?: string;
  irn?: string; // Invoice Reference Number
  ackNo?: string; // Acknowledgement Number
  irnGeneratedAt?: string;
  canBeCancelled: boolean;
  cancellationDate?: string;
  createdAt: string;
  createdBy: string;
}

export interface EInvoiceLineItem {
  itemId: string;
  hsnCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  discount?: number;
  taxableValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Inventory Valuation Methods
 * Tally: Advanced > Inventory > Valuation Method
 */
export interface InventoryValuation {
  id: string;
  productId: string;
  productName: string;
  valuationMethod: 'FIFO' | 'LIFO' | 'Average Cost' | 'Standard Cost' | 'Weighted Average';
  valuationDate: string;
  openingStock: number;
  openingValue: number;
  purchases: number;
  purchasesValue: number;
  sales: number;
  salesValue: number;
  closingStock: number;
  closingValue: number;
  costOfGoodsSold: number;
  variance?: number;
}

/**
 * Accounts Payable / Receivable Aging
 * Tally: Reports > Aging Analysis
 */
export interface AgingAnalysis {
  partyId: string;
  partyName: string;
  partyType: 'Debtor' | 'Creditor';
  currentBalance: number;
  currentDays: number; // 0-30 days
  days31To60: number;
  days61To90: number;
  days91Plus: number;
  totalDue: number;
  asOnDate: string;
  creditLimit?: number;
  creditLimitUtilized?: number;
  status: 'Current' | 'Overdue' | 'Severely Overdue';
}

/**
 * Inter-Company Transactions
 * Tally: Advanced > Inter-Company
 */
export interface InterCompanyTransaction {
  id: string;
  fromCompanyId: string;
  fromCompanyName: string;
  toCompanyId: string;
  toCompanyName: string;
  transactionType: 'Sale' | 'Purchase' | 'Loan' | 'Transfer';
  amount: number;
  date: string;
  reference?: string;
  glAccountFrom: string;
  glAccountTo: string;
  status: 'Posted' | 'Pending' | 'Cancelled';
}

/**
 * Pending/Draft Transactions
 * Tally: Accounting Vouchers > Draft Entries
 */
export interface PendingTransaction {
  id: string;
  voucherId?: string;
  voucherType: VoucherType;
  date: string;
  narration?: string;
  entries: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  createdBy: string;
  createdDate: string;
  notes?: string;
  status: 'Draft' | 'For Approval' | 'Rejected';
}

/**
 * Consolidation - Multi-company consolidation
 * Tally: Advanced > Consolidation (Groups feature)
 */
export interface CompanyConsolidation {
  id: string;
  parentCompanyId: string;
  childCompanies: string[]; // IDs of subsidiary companies
  consolidationType: 'Full' | 'Proportionate' | 'Equity';
  period: string;
  eliminationEntries: JournalEntry[];
  consolidatedFinancials: {
    assets: number;
    liabilities: number;
    equity: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  minortyInterest?: number;
  consolidatedAt: string;
  preparedBy: string;
}

/**
 * Audit Trail - Complete transaction history
 * Tally: Reports > Audit Trail
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'Created' | 'Modified' | 'Deleted' | 'Posted' | 'Approved' | 'Rejected' | 'Reversed';
  voucherId: string;
  voucherType: VoucherType;
  voucherNo: string;
  changes?: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  remarks?: string;
}

export interface VoucherTypeMaster {
  id: string;
  name: string;
  alias?: string;
  typeOfVoucher: VoucherType;
  abbreviation: string;
  methodOfVoucherNumbering: 'Automatic' | 'Manual' | 'None';
  useEffectiveDates: boolean;
  makeOptionalByDefault: boolean;
  allowNarration: boolean;
  provideNarrationsForEachLedger: boolean;
  printAfterSaving: boolean;
  nameOfClass?: string[];
}

export interface Branch {
  id: string;
  name: string;
  type: 'Warehouse' | 'Retail' | 'Distribution';
  location: string;
  city: string;
  state: string;
  manager: string;
  contact: string;
  isHQ?: boolean;
}

export interface BranchStock {
  branchId: string;
  branchName: string;
  stock: number;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  date: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchName: string;
  items: StockTransferItem[];
  status: 'In Transit' | 'Received' | 'Cancelled' | 'Draft';
  totalItems: number;
  totalQuantity: number;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  lrNo?: string;
  transporter?: string;
}

export interface StockTransferItem {
  id: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
  mrp: number;
  rate: number;
}
