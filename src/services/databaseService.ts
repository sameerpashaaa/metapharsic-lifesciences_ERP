// Database Service for ERP System
// This service provides integration with backend databases
// Currently using localStorage as mock database, can be replaced with real backend API

import { SalesInvoice, Product, Party, Purchase, PurchaseReturn, Expense, Batch, MedicalRepresentative, Lead, LeadActivity, Branch, StockTransfer, BranchStock, InventoryAnalyticsData, InventoryAnalyticsItem, PCDPartner, PCDScheme, PCDTarget, SaleTransaction, VoucherTypeMaster, VoucherType } from '../types';
import { Save, Search, Plus, Archive, Calculator, TrendingUp, Download, Printer, RefreshCw, AlertCircle, Edit3, Globe } from 'lucide-react';
import { apiClient } from './apiClient';

// Mock database collections
let invoices: SalesInvoice[] = [];
let products: Product[] = [];
let parties: Party[] = [];
let purchases: Purchase[] = [];
let expenses: Expense[] = [];
let employees: MedicalRepresentative[] = [];
let leads: Lead[] = [];
let leadActivities: LeadActivity[] = [];
let stockJournals: any[] = [];
let physicalStocks: any[] = [];
let branches: Branch[] = [];
let stockTransfers: StockTransfer[] = [];

// Initialize with mock data if empty
const initializeDatabase = () => {
  const storedInvoices = localStorage.getItem('erp_invoices');
  const storedProducts = localStorage.getItem('erp_products');
  const storedParties = localStorage.getItem('erp_parties');
  const storedPurchases = localStorage.getItem('erp_purchases');
  const storedExpenses = localStorage.getItem('erp_expenses');
  const storedEmployees = localStorage.getItem('erp_employees');
  const storedLeads = localStorage.getItem('erp_leads');
  const storedLeadActivities = localStorage.getItem('erp_lead_activities');
  const storedStockJournals = localStorage.getItem('erp_stock_journals');
  const storedPhysicalStocks = localStorage.getItem('erp_physical_stocks');

  if (storedInvoices) {
    invoices = JSON.parse(storedInvoices);
  }

  if (storedProducts) {
    products = JSON.parse(storedProducts);
  }

  if (storedParties) {
    parties = JSON.parse(storedParties);
  }

  if (storedPurchases) {
    purchases = JSON.parse(storedPurchases);
  }

  if (storedExpenses) {
    expenses = JSON.parse(storedExpenses);
  }

  if (storedEmployees) {
    employees = JSON.parse(storedEmployees);
  }

  if (storedLeads) {
    leads = JSON.parse(storedLeads);
  }

  if (storedLeadActivities) {
    leadActivities = JSON.parse(storedLeadActivities);
  }

  if (storedStockJournals) {
    stockJournals = JSON.parse(storedStockJournals);
  }

  if (storedPhysicalStocks) {
    physicalStocks = JSON.parse(storedPhysicalStocks);
  }
  
  const storedBranches = localStorage.getItem('erp_branches');
  if (storedBranches) {
    branches = JSON.parse(storedBranches);
  } else {
    initializeSampleData();
  }
  
  const storedStockTransfers = localStorage.getItem('erp_stock_transfers');
  if (storedStockTransfers) {
    stockTransfers = JSON.parse(storedStockTransfers);
  }
};

// Save data to localStorage
const saveToStorage = () => {
  localStorage.setItem('erp_invoices', JSON.stringify(invoices));
  localStorage.setItem('erp_products', JSON.stringify(products));
  localStorage.setItem('erp_parties', JSON.stringify(parties));
  localStorage.setItem('erp_purchases', JSON.stringify(purchases));
  localStorage.setItem('erp_expenses', JSON.stringify(expenses));
  localStorage.setItem('erp_employees', JSON.stringify(employees));
  localStorage.setItem('erp_leads', JSON.stringify(leads));
  localStorage.setItem('erp_lead_activities', JSON.stringify(leadActivities));
  localStorage.setItem('erp_stock_journals', JSON.stringify(stockJournals));
  localStorage.setItem('erp_physical_stocks', JSON.stringify(physicalStocks));
  localStorage.setItem('erp_branches', JSON.stringify(branches));
  localStorage.setItem('erp_stock_transfers', JSON.stringify(stockTransfers));
};

// Initialize on load
// initializeDatabase();

const API_URL = '/api';

// Enhanced Invoice Operations with full Marg ERP features
export const saveInvoice = async (invoice: SalesInvoice): Promise<boolean> => {
  try {
    // Check if invoice with same number already exists
    const existingIndex = invoices.findIndex(inv => inv.invoiceNumber === invoice.invoiceNumber);
    
    if (existingIndex !== -1) {
      // Update existing invoice instead of creating duplicate
      invoices[existingIndex] = invoice;
    } else {
      // Add new invoice
      invoices.push(invoice);
    }
    
    // Ensure robust offline stock synchronization
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach(item => {
        const targetProduct = products.find(p => p.id === item.productId || p.name === item.productName);
        if (targetProduct) {
          const deductQty = Number(item.quantity) || 0;
          // 1. Deduct global total stock count
          targetProduct.totalStock = Math.max(0, (targetProduct.totalStock || 0) - deductQty);
          
          // 2. Deduct specific batch stock count
          if (item.batchId && targetProduct.batches) {
            const batch = targetProduct.batches.find(b => b.id === item.batchId || b.batchNumber === item.batchNumber);
            if (batch) {
              batch.stock = Math.max(0, (batch.stock || 0) - deductQty);
              // Add type consistency for both naming formats
              if ((batch as any).quantity !== undefined) {
                (batch as any).quantity = Math.max(0, ((batch as any).quantity || 0) - deductQty);
              }
            }
          }
        }
      });
    }
    
    saveToStorage();
    
    // Try to save to backend API using apiClient
    await apiClient.post('/invoices', invoice);
    return true;
  } catch (error) {
    console.warn('Backend API not available or error saving invoice, saved locally:', error);
    return true; 
  }
};

export const getAllInvoices = async (): Promise<SalesInvoice[]> => {
  try {
    const backendResponse = await apiClient.get('/pos/invoices');
    const backendInvoices = backendResponse.success ? backendResponse.data : (Array.isArray(backendResponse) ? backendResponse : []);
    const safeBackendInvoices = backendInvoices.map((inv: any) => ({
      ...inv,
      invoiceNumber: inv.invoice_no || inv.invoice_number || inv.invoiceNumber || inv.id,
      customerName: inv.party_name || inv.customer_name || inv.customerName || 'Counter Customer',
      date: inv.invoice_date || inv.date || new Date().toISOString().split('T')[0],
      netAmount: parseFloat(inv.net_payable || inv.net_amount || inv.netAmount || 0),
      taxableValue: parseFloat(inv.total_taxable || inv.taxable_value || inv.taxableValue || 0),
      totalGst: parseFloat(inv.total_gst || inv.totalGst || ((inv.total_cgst + inv.total_sgst) || 0))
    }));
    
    // Combine with local storage and remove duplicates
    const allInvoices = [...safeBackendInvoices, ...invoices];
    
    // Remove duplicates by invoiceNumber, keeping the most recent
    const uniqueInvoices = allInvoices.filter((invoice, index, self) => 
      index === self.findIndex(i => i.invoiceNumber === invoice.invoiceNumber)
    );
    
    // Sort by date (newest first)
    return uniqueInvoices.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching invoices from backend:', error);
    // Return local storage data as fallback with deduplication
    const uniqueInvoices = invoices.filter((invoice, index, self) => 
      index === self.findIndex(i => i.invoiceNumber === invoice.invoiceNumber)
    );
    
    // Sort by date (newest first)
    return uniqueInvoices.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
};

export const getInvoiceById = async (id: string): Promise<SalesInvoice | null> => {
  try {
    const response = await apiClient.get(`/pos/invoices/${id}`);
    if (response.success) {
      const inv = response.data;
      return {
        ...inv,
        invoiceNumber: inv.invoice_number || inv.invoiceNumber || inv.invoice_no || inv.id,
        customerName: inv.customer_name || inv.customerName || inv.party_name || 'Counter Customer',
        date: inv.date || inv.invoice_date || new Date().toISOString().split('T')[0],
        netAmount: parseFloat(inv.net_amount || inv.netAmount || inv.net_payable || 0),
        taxableValue: parseFloat(inv.taxable_value || inv.taxableValue || 0),
        totalGst: parseFloat(inv.total_gst || inv.totalGst || 0)
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to get invoice ${id}:`, error);
    return null;
  }
};


export const updateInvoice = async (invoice: any): Promise<boolean> => {
  try {
    // Update local storage
    const index = invoices.findIndex(inv => inv.id === invoice.id);
    if (index !== -1) {
      invoices[index] = invoice;
      saveToStorage();
    }
    
    // Try backend update
    await apiClient.put(`/pos/invoices/${invoice.id}`, {
      invoice_no: invoice.invoiceNumber,
      invoice_date: invoice.date,
      payment_mode: invoice.paymentMode || 'Cash',
      party_id: invoice.partyId,
      party_name: invoice.customerName,
      items: (invoice.items || []).map((item: any) => ({
        product_id: item.productId || item.product_id,
        batch_id: item.batchId || item.batch_id,
        quantity: item.quantity,
        selling_rate: item.rate || item.selling_rate,
        discount: item.discount_amount || item.discount || 0,
        cgst_rate: item.cgst_amount || 0,
        sgst_rate: item.sgst_amount || 0,
        igst_rate: item.igst_amount || 0,
        mrp: item.mrp || item.rate,
        totalAmount: item.total_amount || item.totalAmount
      })),
      total_taxable: invoice.taxableValue || invoice.subTotal || 0,
      total_cgst: (invoice.totalGst || 0) / 2,
      total_sgst: (invoice.totalGst || 0) / 2,
      total_igst: 0,
      round_off: invoice.roundOff || 0,
      net_payable: invoice.netAmount
    });
    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    // Remove from local storage
    invoices = invoices.filter(inv => inv.id !== id);
    saveToStorage();
    
    // Try backend delete
    await apiClient.delete(`/pos/invoices/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
};

// Enhanced Product Operations
export const saveProduct = async (product: Product): Promise<boolean> => {
  try {
    // Add to local storage
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex !== -1) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }
    saveToStorage();
    
    // Try backend save using apiClient
    await apiClient.post('/products', product);
    return true;
  } catch (error) {
    console.warn('Backend API not available or error saving product:', error);
    return true; // Still return true because we saved locally
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    // Remove from local storage
    products = products.filter(p => p.id !== id);
    saveToStorage();
    
    // Try backend delete using apiClient
    await apiClient.delete(`/products/${id}`);
    return true;
  } catch (error) {
    console.warn('Backend API not available or error deleting product:', error);
    return true; // Still return true because we deleted locally
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const response = await apiClient.get('/products');
    const data = response.success ? response.data : response;
    return Array.isArray(data) ? data : [...products];
  } catch (error) {
    console.error('Error fetching products from backend:', error);
    // Return local storage data as fallback
    return [...products];
  }
};

export const getProductById = async (id: string): Promise<Product | undefined> => {
  try {
    return await apiClient.get(`/products/${id}`);
  } catch (error) {
    console.error('Error fetching product:', error);
    return products.find(p => p.id === id);
  }
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    return await apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Error searching products:', error);
    // Local search fallback
    const term = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.genericName?.toLowerCase().includes(term) ||
      p.manufacturer?.toLowerCase().includes(term) ||
      p.alias?.some(alias => alias.toLowerCase().includes(term)) ||
      p.therapeuticCategory?.toLowerCase().includes(term) ||
      p.hsn?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term) ||
      p.batches?.some(b => b.barcode?.toLowerCase().includes(term))
    );
  }
};

// Enhanced Party Operations
export const saveParty = async (party: Party): Promise<boolean> => {
  try {
    // Ensure all fields are present with defaults
    const partyWithDefaults = {
      ...party,
      address: party.address || '',
      email: party.email || '',
      contactPerson: party.contactPerson || '',
      pan: party.pan || '',
      bankName: party.bankName || '',
      accountNumber: party.accountNumber || '',
      ifscCode: party.ifscCode || '',
      creditDays: party.creditDays || 0,
      category: party.category || 'Regular',
      territory: party.territory || '',
      remarks: party.remarks || ''
    };
    
    // Add to local storage
    const existingIndex = parties.findIndex(p => p.id === partyWithDefaults.id);
    if (existingIndex !== -1) {
      parties[existingIndex] = partyWithDefaults;
    } else {
      parties.push(partyWithDefaults);
    }
    saveToStorage();
    
    // Try backend save using apiClient
    // If ID looks like a UUID (length 36), it's an existing record -> PUT
    // If ID looks like 'PARTY-123...' or doesn't have 36 chars, it's new -> POST
    const isUpdate = party.id && party.id.length === 36;
    
    if (isUpdate) {
      await apiClient.put(`/pos/parties/${party.id}`, partyWithDefaults);
    } else {
      await apiClient.post('/pos/parties', partyWithDefaults);
    }
    return true;
  } catch (error) {
    console.warn('Backend API not available or error saving party:', error);
    return true;
  }
};

export const getAllParties = async (): Promise<Party[]> => {
  try {
    const response = await apiClient.get('/pos/parties');
    return response.success ? response.data : response;
  } catch (error) {
    console.error('Error fetching parties:', error);
    return [...parties];
  }
};

export const getPartyById = async (id: string): Promise<Party | undefined> => {
  try {
    const response = await apiClient.get(`/pos/parties/${id}`);
    return response.success ? response.data : response;
  } catch (error) {
    console.error('Error fetching party:', error);
    return parties.find(p => p.id === id);
  }
};

// Enhanced Purchase Operations
export const savePurchase = async (purchase: Purchase): Promise<boolean> => {
  try {
    const response = await apiClient.post('/inventory-full/purchases/direct', purchase);
    if (!response.success && response.error) throw new Error(response.error);
    purchases.push(purchase);
    saveToStorage();
    console.log(`Purchase ${purchase.id} saved to database`);
    return true;
  } catch (error) {
    console.error('Error saving purchase:', error);
    purchases.push(purchase);
    saveToStorage();
    return true; // Graceful offline fallback
  }
};

export const getAllPurchases = async (): Promise<Purchase[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...purchases]);
    }, 100);
  });
};

export const saveStockJournal = async (journal: any): Promise<boolean> => {
  try {
    const response = await apiClient.post('/inventory/stock-journals', journal);
    if (!response.success && response.error) throw new Error(response.error);
    stockJournals.push(journal);
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error saving Stock Journal:', error);
    stockJournals.push(journal);
    saveToStorage();
    return true;
  }
};

export const getAllStockJournals = async (): Promise<any[]> => {
  return [...stockJournals];
};

export const savePhysicalStock = async (stock: any): Promise<boolean> => {
  try {
    // 1. Start Reconciliation Process
    const startData = await apiClient.post('/inventory/reconciliation/start', {
      godown_id: stock.srcGodown || stock.placeOfSupply, 
      reconciliation_period_from: stock.date,
      reconciliation_period_to: stock.date
    });

    const reconciliationId = startData.data.id;

    // 2. Add each item count
    for (const item of stock.items) {
      if (!item.productId) continue;
      
      await apiClient.post(`/inventory/reconciliation/${reconciliationId}/entry`, {
        product_id: item.productId,
        batch_id: item.batchId || null,
        physical_qty: Number(item.physicalQty || item.qty || 0),
        variance_reason: stock.narration || 'Physical Count Verification',
        notes: ''
      });
    }

    // 3. Mark as Approved to apply adjustments to the stock ledger
    await apiClient.put(`/inventory/reconciliation/${reconciliationId}/status`, { status: 'Approved' });

    // Make local UI copy as fallback
    physicalStocks.push(stock);
    saveToStorage();
    return true;

  } catch (error) {
    console.error('Error saving physical stock to backend:', error);
    physicalStocks.push(stock);
    saveToStorage();
    return true;
  }
};

export const getAllPhysicalStocks = async (): Promise<any[]> => {
  return [...physicalStocks];
};

// Enhanced Expense Operations
export const saveExpense = async (expense: Expense): Promise<boolean> => {
  try {
    expenses.push(expense);
    saveToStorage();
    
    try {
      await apiClient.post('/expenses', expense);
    } catch (apiError) {
      console.warn('Backend API not available for expense save');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving expense:', error);
    return false;
  }
};

export const getAllExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await apiClient.get('/expenses');
    const backendExpenses = response.success ? response.data : response;
    const safeBackendExpenses = Array.isArray(backendExpenses) ? backendExpenses : [];
    return [...safeBackendExpenses, ...expenses];
  } catch (error) {
    console.warn('Error fetching expenses from backend:', error);
    return [...expenses];
  }
};

// Enhanced Analytics and Reports
export const getSalesReport = async (startDate: string, endDate: string): Promise<any> => {
  try {
    return await apiClient.get(`/reports/sales?start=${startDate}&end=${endDate}`);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    // Local calculation fallback
    const filteredInvoices = invoices.filter(inv =>
      inv.date >= startDate && inv.date <= endDate
    );

    const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.netAmount || 0), 0);
    const totalItems = filteredInvoices.reduce((sum, inv) => sum + inv.totalItems, 0);
    const totalInvoices = filteredInvoices.length;

    return {
      totalSales,
      totalItems,
      totalInvoices,
      averageInvoiceValue: totalInvoices > 0 ? totalSales / totalInvoices : 0,
      invoices: filteredInvoices
    };
  }
};

export const getInventoryReport = async (): Promise<any> => {
  try {
    return await apiClient.get('/reports/inventory');
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    // Local calculation fallback
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.totalStock <= p.minStockLevel);
    const outOfStockProducts = products.filter(p => p.totalStock <= 0);
    const totalStockValue = products.reduce((sum, p) =>
      sum + (p.batches?.reduce((bSum, b) => bSum + (b.stock * b.purchaseRate), 0) || 0), 0
    );

    return {
      totalProducts,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      totalStockValue,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.totalStock,
        minStock: p.minStockLevel,
        status: p.totalStock <= 0 ? 'Out of Stock' :
          p.totalStock <= p.minStockLevel ? 'Low Stock' : 'In Stock'
      }))
    };
  }
};

// Marg ERP Specific Features
export const getInvoiceByNumber = async (invoiceNumber: string): Promise<SalesInvoice | undefined> => {
  try {
    return await apiClient.get(`/invoices/number/${invoiceNumber}`);
  } catch (error) {
    console.error('Error fetching invoice by number:', error);
    return invoices.find(inv => inv.invoiceNumber === invoiceNumber);
  }
};

export const getCustomerOutstanding = async (customerId: string): Promise<number> => {
  try {
    const data = await apiClient.get(`/customers/${customerId}/outstanding`);
    return data.outstanding || 0;
  } catch (error) {
    console.error('Error fetching customer outstanding:', error);
    return 0;
  }
};

export const getStockLedger = async (productId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/inventory-full/stock-ledger?product_id=${productId}`);
    return response.success ? response.data : response;
  } catch (error) {
    console.error('Error fetching stock ledger:', error);
    return [];
  }
};

export const getBatchDetails = async (batchId: string): Promise<Batch | undefined> => {
  try {
    const response = await apiClient.get(`/inventory-full/batches/${batchId}`);
    return response.success ? response.data : response;
  } catch (error) {
    console.error('Error fetching batch details:', error);
    // Search in local products
    for (const product of products) {
      const batch = product.batches?.find(b => b.id === batchId);
      if (batch) return batch;
    }
    return undefined;
  }
};

// Phase 6: Last Rate Tracking
export const getLastRate = async (customerId: string, productId: string): Promise<{rate: number, discount: number} | null> => {
  try {
    const customerInvoices = invoices.filter(inv => inv.customerId === customerId || inv.customerName === customerId);
    if (customerInvoices.length === 0) return null;

    // Find last invoice containing this product
    for (const inv of customerInvoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
      const item = inv.items.find(i => i.productId === productId);
      if (item) {
        return { rate: item.rate, discount: item.discountPercent };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching last rate:', error);
    return null;
  }
};

export const getInventoryAnalytics = async (): Promise<InventoryAnalyticsData> => {
  const allProducts = await getAllProducts();
  const allInvoices = await getAllInvoices();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
  const sixMonthsAhead = new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000));

  // 1. Calculate Velocity & Movement
  const items: InventoryAnalyticsItem[] = allProducts.map(p => {
    const pInvoices = allInvoices.filter(inv => inv.items.some(i => i.productId === p.id));
    const recentSales = pInvoices.filter(inv => new Date(inv.date) >= sixMonthsAgo);
    const lastSale = pInvoices.length > 0 ? new Date(Math.max(...pInvoices.map(inv => new Date(inv.date).getTime()))) : null;

    // Use total transaction volume across 6 months, artificially boosting for demonstration if empty
    let velocity = recentSales.length;
    if (velocity === 0 && pInvoices.length > 0) velocity = pInvoices.length;

    // Dynamic FSN
    let fsn: 'F' | 'S' | 'N' = 'N';
    if (velocity > 3) fsn = 'F'; // Adjusted for better data visualization spread
    else if (velocity > 0) fsn = 'S';

    // VED Mock (based on category/schedule)
    let ved: 'V' | 'E' | 'D' = 'D'; // Default to Desirable
    if (p.scheduleType === 'H1' || p.therapeuticCategory?.toLowerCase().includes('life') || p.therapeuticCategory?.toLowerCase().includes('antibiotic')) ved = 'V';
    else if (p.therapeuticCategory?.toLowerCase().includes('essential') || p.therapeuticCategory?.toLowerCase().includes('pain')) ved = 'E';

    return {
      productId: p.id,
      name: p.name,
      totalStock: p.totalStock,
      stockValue: p.totalStock * (p.purchaseRate || 0),
      velocity,
      status: p.totalStock < (p.minStockLevel || 10) ? 'Critical' : 'Healthy',
      abc: 'C',
      fsn,
      ved
    };
  });

  // 2. ABC Analysis (Cumulative Value)
  const sortedByValue = [...items].sort((a, b) => b.stockValue - a.stockValue);
  const totalEnterpriseValue = sortedByValue.reduce((acc, curr) => acc + curr.stockValue, 0);
  let runningValue = 0;

  sortedByValue.forEach(item => {
    runningValue += item.stockValue;
    const percent = totalEnterpriseValue > 0 ? (runningValue / totalEnterpriseValue) * 100 : 100;
    if (percent <= 70) item.abc = 'A';
    else if (percent <= 90) item.abc = 'B';
    else item.abc = 'C';
  });

  // 3. Structural Analysis
  const data: InventoryAnalyticsData = {
    abcAnalysis: {
      categoryA: items.filter(i => i.abc === 'A'),
      categoryB: items.filter(i => i.abc === 'B'),
      categoryC: items.filter(i => i.abc === 'C'),
      summary: {
        countA: items.filter(i => i.abc === 'A').length,
        valueA: items.filter(i => i.abc === 'A').reduce((s, i) => s + i.stockValue, 0),
        countB: items.filter(i => i.abc === 'B').length,
        valueB: items.filter(i => i.abc === 'B').reduce((s, i) => s + i.stockValue, 0),
        countC: items.filter(i => i.abc === 'C').length,
        valueC: items.filter(i => i.abc === 'C').reduce((s, i) => s + i.stockValue, 0),
      }
    },
    fsnAnalysis: {
      fast: items.filter(i => i.fsn === 'F'),
      slow: items.filter(i => i.fsn === 'S'),
      nonMoving: items.filter(i => i.fsn === 'N'),
    },
    vedAnalysis: {
      vital: items.filter(i => i.ved === 'V'),
      essential: items.filter(i => i.ved === 'E'),
      desirable: items.filter(i => i.ved === 'D'),
    },
    expiryLifecycle: {
      expired: items.filter(i => {
         const p = allProducts.find(prod => prod.id === i.productId);
         if ((p as any)?.isReturned) return false;
         return p?.expiryDate && new Date(p.expiryDate) < now;
      }),
      nearExpiry: items.filter(i => {
         const p = allProducts.find(prod => prod.id === i.productId);
         if ((p as any)?.isReturned) return false;
         return p?.expiryDate && new Date(p.expiryDate) >= now && new Date(p.expiryDate) < sixMonthsAhead;
      }),
      safe: items.filter(i => {
         const p = allProducts.find(prod => prod.id === i.productId);
         if ((p as any)?.isReturned) return false;
         return !p?.expiryDate || new Date(p.expiryDate) >= sixMonthsAhead;
      }),
    },
    deadStock: items.filter(i => {
       const p = allProducts.find(prod => prod.id === i.productId);
       if ((p as any)?.isLiquidating) return false;
       
       const pInvoices = allInvoices.filter(inv => inv.items.some(line => line.productId === i.productId));
       const lastSale = pInvoices.length > 0 ? new Date(Math.max(...pInvoices.map(inv => new Date(inv.date).getTime()))) : null;
       return !lastSale || lastSale < ninetyDaysAgo;
    })
  };

  return data;
};

// --- DATA WRITING OPERATIONS FOR INVENTORY ANALYTICS ---

export const createDraftPurchaseOrder = async (products: {productId: string, name: string, quantity: number, price: number}[]): Promise<boolean> => {
  try {
    const newPurchase: Purchase = {
      id: `PO-${Date.now()}`,
      invoiceNo: `DRAFT-${Date.now()}`,
      supplierId: 'DEFAULT_SUPPLIER',
      supplierName: 'Pending Supplier Assignment',
      date: new Date().toISOString(),
      items: products.map(p => ({
        productId: p.productId,
        productName: p.name,
        batchNo: 'TBD',
        expiryDate: 'TBD',
        quantity: p.quantity,
        purchaseRate: p.price,
        mrp: p.price * 1.2,
        amount: p.quantity * p.price,
      })),
      totalAmount: products.reduce((acc, p) => acc + (p.quantity * p.price), 0),
      status: 'Ordered',
      paymentStatus: 'Unpaid'
    };
    
    purchases.push(newPurchase);
    saveToStorage();
    
    const response = await fetch(`${API_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPurchase),
    });
    
    if (!response.ok) console.warn('Backend API not available for draft purchase order');
    return true;
  } catch (err) {
    console.error('Error creating draft purchase order:', err);
    return false;
  }
};

export const processExpiryReturn = async (productId: string): Promise<boolean> => {
  try {
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    const now = new Date();
    
    // First try returning by actual batches if they exist
    let expiredBatches = (product.batches || []).filter(b => b.expiryDate && new Date(b.expiryDate) < now && b.stock > 0);
    
    // Fallback: if no batches found, but the root product itself is expired
    if (expiredBatches.length === 0 && product.expiryDate && new Date(product.expiryDate) < now && product.totalStock > 0) {
      // Synthesize a batch representing the total stock
      expiredBatches = [{
        id: `BATCH-MOCK-${Date.now()}`,
        batchNumber: 'ROOT-BATCH',
        expiryDate: product.expiryDate,
        stock: product.totalStock,
        purchaseRate: product.purchaseRate || 0,
        mrp: product.mrp || 0,
        sellingRate: product.sellingRate || 0,
        manufacturingDate: '',
        location: 'Default Godown'
      }];
      product.totalStock = 0; // Explicitly flush root stock
    }

    if (expiredBatches.length === 0) return true;
    
    const returnEntry: PurchaseReturn = {
      id: `RET-${Date.now()}`,
      returnNo: `RET-${Date.now()}`,
      date: new Date().toISOString(),
      supplierId: 'DEFAULT_SUPPLIER',
      supplierName: product.manufacturer || 'Unknown',
      items: expiredBatches.map(b => ({
        productId: product.id,
        productName: product.name,
        batchNo: b.batchNumber,
        quantity: b.stock,
        returnRate: b.purchaseRate,
        amount: b.stock * b.purchaseRate,
        reason: 'Expired'
      })),
      totalAmount: expiredBatches.reduce((acc, b) => acc + (b.stock * b.purchaseRate), 0),
      status: 'Completed'
    };
    
    // Standard batch stock depletion
    if (product.batches && product.batches.length > 0) {
      expiredBatches.forEach(eb => {
        const actualBatch = product.batches!.find(b => b.batchNumber === eb.batchNumber);
        if (actualBatch) {
          product.totalStock -= actualBatch.stock;
          actualBatch.stock = 0;
        }
      });
    }

    // Flag for UI to stop rendering it under expiry tab
    (product as any).isReturned = true;
    
    const pIndex = products.findIndex(p => p.id === product.id);
    if (pIndex !== -1) products[pIndex] = product;
    saveToStorage();
    
    try {
      await apiClient.post('/returns', returnEntry);
    } catch (apiError) {
      console.warn('Backend API not available for processing return');
    }
    return true;
  } catch (err) {
    console.error('Error processing expiry return:', err);
    return false;
  }
};

export const liquidateStock = async (productId: string): Promise<boolean> => {
  try {
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    let updated = false;
    product.batches?.forEach(b => {
      // Unconditionally discount the batch to push it out
      b.sellingRate = Number((b.sellingRate * 0.7).toFixed(2));
      updated = true;
    });
    
    if (updated) {
       // Flag it to drop off the UI visually
       (product as any).isLiquidating = true;
       
       const pIndex = products.findIndex(p => p.id === product.id);
       if (pIndex !== -1) products[pIndex] = product;
       saveToStorage();
       
       try {
         await apiClient.put(`/products/${product.id}`, product);
       } catch (apiError) {
         console.warn('Backend API not available for liquidating product');
       }
    }
    return true;
  } catch (err) {
    console.error('Error liquidating stock:', err);
    return false;
  }
};

// Clear all data (for testing)
export const clearAllData = () => {
  invoices = [];
  products = [];
  parties = [];
  purchases = [];
  expenses = [];
  employees = [];
  saveToStorage();
  console.log('All database cleared');
};

// ==================== EMPLOYEE DATABASE OPERATIONS ====================

export const getAllEmployees = async (): Promise<MedicalRepresentative[]> => {
  try {
    const response = await apiClient.get('/hr/employees');
    return response.success ? response.data : response;
  } catch (error) {
    console.warn('Error fetching employees from backend:', error);
    return employees;
  }
};

export const getEmployeeById = async (id: string): Promise<MedicalRepresentative | undefined> => {
  try {
    const response = await apiClient.get(`/hr/employees/${id}`);
    return response.success ? response.data : response;
  } catch (error) {
    console.warn('Error fetching employee:', error);
    return employees.find(e => e.id === id);
  }
};

export const saveEmployee = async (employee: MedicalRepresentative): Promise<boolean> => {
  try {
    const response = await apiClient.post('/hr/employees', employee);
    const savedEmployee = response.success ? response.data : response;
    
    const index = employees.findIndex(e => e.id === savedEmployee.id);
    if (index >= 0) {
      employees[index] = savedEmployee;
    } else {
      employees.push(savedEmployee);
    }
    saveToStorage();
    return true;
  } catch (error) {
    console.warn('Error saving employee to backend:', error);
    // Local fallback
    const index = employees.findIndex(e => e.id === employee.id);
    if (index >= 0) {
      employees[index] = employee;
    } else {
      employees.push(employee);
    }
    saveToStorage();
    return true;
  }
};

export const updateEmployeeSales = async (employeeId: string, salesAmount: number): Promise<boolean> => {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return false;
  
  employee.totalSales += salesAmount;
  employee.targetAchievement = Math.round((employee.totalSales / employee.salesTarget) * 100);
  
  try {
    await apiClient.put(`/hr/employees/${employeeId}/sales`, { 
      salesAmount, 
      totalSales: employee.totalSales, 
      targetAchievement: employee.targetAchievement 
    });
    saveToStorage();
    return true;
  } catch (error) {
    console.warn('Error updating employee sales on backend:', error);
    saveToStorage();
    return true;
  }
};

export const deleteEmployee = async (id: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/hr/employees/${id}`);
    employees = employees.filter(e => e.id !== id);
    saveToStorage();
    return true;
  } catch (error) {
    console.warn('Error deleting employee on backend:', error);
    employees = employees.filter(e => e.id !== id);
    saveToStorage();
    return true;
  }
};

export const getEmployeePerformanceStats = async (): Promise<{
  totalEmployees: number;
  activeEmployees: number;
  starPerformers: number;
  attentionNeeded: number;
  averageAchievement: number;
  topPerformer: MedicalRepresentative | null;
}> => {
  try {
    const response = await apiClient.get('/hr/performance-stats');
    const stats = response.success ? response.data : response;
    
    // We also need the top performer which might not be in the simple stats API
    const allEmployees = await getAllEmployees();
    const topPerformer = allEmployees.length > 0 
      ? allEmployees.reduce((max, e) => e.targetAchievement > max.targetAchievement ? e : max, allEmployees[0])
      : null;
      
    return {
      ...stats,
      topPerformer
    };
  } catch (error) {
    console.warn('Error fetching performance stats from backend, calculating locally:', error);
    const allEmployees = await getAllEmployees();
    
    const activeEmployees = allEmployees.filter(e => e.status === 'Active');
    const starPerformers = allEmployees.filter(e => e.targetAchievement >= 100);
    const attentionNeeded = allEmployees.filter(e => e.targetAchievement < 80);
    const averageAchievement = allEmployees.length > 0 
      ? Math.round(allEmployees.reduce((acc, e) => acc + e.targetAchievement, 0) / allEmployees.length)
      : 0;
    const topPerformer = allEmployees.length > 0 
      ? allEmployees.reduce((max, e) => e.targetAchievement > max.targetAchievement ? e : max, allEmployees[0])
      : null;
    
    return {
      totalEmployees: allEmployees.length,
      activeEmployees: activeEmployees.length,
      starPerformers: starPerformers.length,
      attentionNeeded: attentionNeeded.length,
      averageAchievement,
      topPerformer
    };
  }
};

export const getAllBranches = async (): Promise<Branch[]> => {
  if (branches.length === 0) initializeSampleData();
  return branches;
};

export const saveBranch = async (branch: Branch): Promise<boolean> => {
  const index = branches.findIndex(b => b.id === branch.id);
  if (index !== -1) {
    branches[index] = branch;
  } else {
    branches.push(branch);
  }
  saveToStorage();
  return true;
};

export const getAllStockTransfers = async (): Promise<StockTransfer[]> => {
  return stockTransfers;
};

export const saveStockTransfer = async (transfer: StockTransfer): Promise<boolean> => {
  try {
    const response = await apiClient.post('/inventory/stock-transfers', transfer);
    if (!response.success && response.error) throw new Error(response.error);
    const index = stockTransfers.findIndex(t => t.id === transfer.id);
    if (index !== -1) {
      stockTransfers[index] = transfer;
    } else {
      stockTransfers.push(transfer);
    }
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error saving Stock Transfer:', error);
    const index = stockTransfers.findIndex(t => t.id === transfer.id);
    if (index !== -1) {
      stockTransfers[index] = transfer;
    } else {
      stockTransfers.push(transfer);
    }
    saveToStorage();
    return true;
  }
};

export const getAggregatedStock = async (productId: string): Promise<BranchStock[]> => {
  const p = products.find(prod => prod.id === productId);
  if (!p) return [];
  
  const allBranches = await getAllBranches();
  if (p.branchStocks && p.branchStocks.length > 0) {
    return p.branchStocks;
  }
  
  return allBranches.map((b, i) => ({
    branchId: b.id,
    branchName: b.name,
    stock: i === 0 ? Math.floor(p.totalStock * 0.7) : Math.floor(i === 1 ? p.totalStock * 0.2 : p.totalStock * 0.1)
  }));
};

// Initialize with sample data if database is empty
export const initializeSampleData = () => {
  if (branches.length === 0) {
    branches = [
      { id: 'BR-001', name: 'Delhi HQ', type: 'Warehouse', location: 'Okhla Ind Area', city: 'Delhi', state: 'Delhi', manager: 'Sanjeev Kumar', contact: '9876543210', isHQ: true },
      { id: 'BR-002', name: 'Mumbai Hub', type: 'Distribution', location: 'Andheri East', city: 'Mumbai', state: 'Maharashtra', manager: 'Amitabh S', contact: '9123456780' },
      { id: 'BR-003', name: 'Lucknow Retail', type: 'Retail', location: 'Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', manager: 'Rohan V', contact: '8877665544' }
    ];
  }

  if (products.length === 0) {
    // Initialize with MOCK_PRODUCTS from constants
    products = [
      {
        id: 'PROD-001',
        name: 'Crocin 650mg',
        alias: ['Paracetamol', 'Calpol', 'Dolo'],
        source: 'OWN_MANUFACTURING',
        genericName: 'Paracetamol',
        manufacturer: 'Glenmark Pharmaceuticals',
        therapeuticCategory: 'Analgesic & Antipyretic',
        packing: '15 Tablet Strip',
        uom: 'Strip',
        hsn: '30049099',
        gst: 12,
        minStockLevel: 50,
        reorderLevel: 100,
        rack: 'A1',
        scheduleType: 'OTC',
        barcode: '8901234567890',
        composition: 'Paracetamol 650mg',
        unitsPerPack: 15,
        totalStock: 250,
        mrp: 25.00,
        purchaseRate: 20.00,
        sellingRate: 25.00,
        scheme: '10+1',
        batches: [
          {
            id: 'BATCH-001',
            batchNumber: 'CRN00123',
            expiryDate: '2025-12-31',
            stock: 150,
            mrp: 25.00,
            purchaseRate: 20.00,
            sellingRate: 25.00,
            barcode: '8901234567890-B1',
            location: 'A1'
          },
          {
            id: 'BATCH-002',
            batchNumber: 'CRN00124',
            expiryDate: '2026-06-30',
            stock: 100,
            mrp: 25.00,
            purchaseRate: 20.00,
            sellingRate: 25.00,
            location: 'A1'
          }
        ]
      },
      {
        id: 'PROD-002',
        name: 'Azithral 500mg',
        alias: ['Azithromycin', 'Zithromax'],
        source: 'PCD',
        genericName: 'Azithromycin',
        manufacturer: 'Alembic Pharmaceuticals',
        therapeuticCategory: 'Antibiotic',
        packing: '5 Tablet Strip',
        uom: 'Strip',
        hsn: '30049099',
        gst: 12,
        minStockLevel: 30,
        reorderLevel: 50,
        rack: 'B2',
        scheduleType: 'H',
        composition: 'Azithromycin 500mg',
        unitsPerPack: 5,
        totalStock: 120,
        mrp: 120.00,
        purchaseRate: 90.00,
        sellingRate: 110.00,
        scheme: '5+1',
        batches: [
          {
            id: 'BATCH-003',
            batchNumber: 'AZT00456',
            expiryDate: '2025-08-15',
            stock: 80,
            mrp: 85.00,
            purchaseRate: 70.00,
            sellingRate: 85.00,
            location: 'B2'
          },
          {
            id: 'BATCH-004',
            batchNumber: 'AZT00457',
            expiryDate: '2026-02-28',
            stock: 40,
            mrp: 85.00,
            purchaseRate: 70.00,
            sellingRate: 85.00,
            location: 'B2'
          }
        ]
      },
      {
        id: 'PROD-003',
        name: 'Pantocid DSR',
        alias: ['Pantoprazole', 'Rabeprazole'],
        source: 'TRADING',
        genericName: 'Pantoprazole + Domperidone',
        manufacturer: 'Sun Pharmaceuticals',
        therapeuticCategory: 'Gastrointestinal',
        packing: '10 Capsule Strip',
        uom: 'Strip',
        hsn: '30049099',
        gst: 12,
        minStockLevel: 40,
        reorderLevel: 80,
        rack: 'C3',
        scheduleType: 'H1',
        composition: 'Pantoprazole 400mg + Domperidone 30mg',
        unitsPerPack: 10,
        totalStock: 180,
        batches: [
          {
            id: 'BATCH-005',
            batchNumber: 'PNT00789',
            expiryDate: '2025-11-20',
            stock: 120,
            mrp: 120.00,
            purchaseRate: 95.00,
            sellingRate: 120.00,
            location: 'C3'
          },
          {
            id: 'BATCH-006',
            batchNumber: 'PNT00790',
            expiryDate: '2026-05-15',
            stock: 60,
            mrp: 120.00,
            purchaseRate: 95.00,
            sellingRate: 120.00,
            location: 'C3'
          }
        ]
      }
    ];
    saveToStorage();
    console.log('Sample products initialized');
  }

  if (parties.length === 0) {
    parties = [
      {
        id: 'P1',
        name: 'Wellness Distributors',
        type: 'Debtor',
        gstin: '27AAAAA0000A1Z5',
        mobile: '9888877777',
        city: 'Pune',
        currentBalance: 27000,
        route: 'Route A - City',
        ledger: [
          { id: 'L1', date: '2023-10-25', voucherType: 'Sale', voucherNo: 'INV-5501', debit: 27000, credit: 0, balance: 27000, narration: 'Sales Invoice' }
        ],
        address: '123 Business Park, Pune',
        email: 'info@wellnessdistributors.com',
        contactPerson: 'Mr. Rajesh Sharma',
        pan: 'AAAPL1234P',
        bankName: 'ICICI Bank',
        accountNumber: 'XXXXXXXXXX1234',
        ifscCode: 'ICIC0001234',
        creditDays: 30,
        category: 'Premium',
        territory: 'Maharashtra',
        remarks: 'Long-standing customer with excellent payment history'
      },
      {
        id: 'P2',
        name: 'MediCare Franchise',
        type: 'Debtor',
        gstin: '27BBBBB0000B1Z5',
        mobile: '9777766666',
        city: 'Nashik',
        currentBalance: 120000,
        route: 'Route B - North',
        ledger: [
          { id: 'L2', date: '2023-10-24', voucherType: 'Sale', voucherNo: 'INV-5502', debit: 120000, credit: 0, balance: 120000, narration: 'Sales Invoice' }
        ],
        address: '456 Medical Complex, Nashik',
        email: 'contact@medicarefranchise.com',
        contactPerson: 'Dr. Priya Nair',
        pan: 'BBBPW4567Q',
        bankName: 'HDFC Bank',
        accountNumber: 'XXXXXXXXXX5678',
        ifscCode: 'HDFC0005678',
        creditDays: 45,
        category: 'Corporate',
        territory: 'Maharashtra',
        remarks: 'Corporate client with bulk orders'
      },
      {
        id: 'S1',
        name: 'Apex Labs (Procurement)',
        type: 'Creditor',
        gstin: '29ABCDE1234F1Z5',
        mobile: '9876543210',
        city: 'Pune',
        currentBalance: -15000,
        ledger: [
          { id: 'L3', date: '2023-10-20', voucherType: 'Purchase', voucherNo: 'PUR-23-001', debit: 0, credit: 15000, balance: -15000, narration: 'Purchase Invoice' }
        ],
        address: '789 Industrial Estate, Pune',
        email: 'procurement@apexlabs.com',
        contactPerson: 'Ms. Sunita Reddy',
        pan: 'CCCPC9012R',
        bankName: 'State Bank of India',
        accountNumber: 'XXXXXXXXXX9012',
        ifscCode: 'SBIN0009012',
        creditDays: 0,
        category: 'Corporate',
        territory: 'Maharashtra',
        remarks: 'Primary supplier for raw materials'
      }
    ];
    saveToStorage();
    console.log('Sample parties initialized');
  }

  // Initialize sample employees if empty
  if (employees.length === 0) {
    employees = [
      {
        id: 'MR001',
        name: 'Rajesh Kumar',
        contact: '9876543210',
        email: 'rajesh.kumar@metapharsic.com',
        headquarters: 'Pune',
        assignedArea: 'Pune Central',
        salesTarget: 500000,
        totalSales: 625000,
        targetAchievement: 125,
        status: 'Active',
        joinDate: '2022-03-15',
        baseSalary: 35000,
        incentives: 15000,
        deductions: 2500
      },
      {
        id: 'MR002',
        name: 'Priya Sharma',
        contact: '9876543211',
        email: 'priya.sharma@metapharsic.com',
        headquarters: 'Mumbai',
        assignedArea: 'Mumbai West',
        salesTarget: 600000,
        totalSales: 540000,
        targetAchievement: 90,
        status: 'Active',
        joinDate: '2021-06-20',
        baseSalary: 40000,
        incentives: 12000,
        deductions: 3000
      },
      {
        id: 'MR003',
        name: 'Amit Patel',
        contact: '9876543212',
        email: 'amit.patel@metapharsic.com',
        headquarters: 'Nashik',
        assignedArea: 'Nashik Region',
        salesTarget: 400000,
        totalSales: 280000,
        targetAchievement: 70,
        status: 'Active',
        joinDate: '2023-01-10',
        baseSalary: 30000,
        incentives: 5000,
        deductions: 2000
      },
      {
        id: 'MR004',
        name: 'Sneha Gupta',
        contact: '9876543213',
        email: 'sneha.gupta@metapharsic.com',
        headquarters: 'Pune',
        assignedArea: 'Pune East',
        salesTarget: 450000,
        totalSales: 495000,
        targetAchievement: 110,
        status: 'On Leave',
        joinDate: '2020-08-05',
        baseSalary: 38000,
        incentives: 18000,
        deductions: 2800
      },
      {
        id: 'MR005',
        name: 'Vikram Singh',
        contact: '9876543214',
        email: 'vikram.singh@metapharsic.com',
        headquarters: 'Kolhapur',
        assignedArea: 'South Maharashtra',
        salesTarget: 350000,
        totalSales: 245000,
        targetAchievement: 70,
        status: 'Active',
        joinDate: '2022-11-15',
        baseSalary: 28000,
        incentives: 4000,
        deductions: 1800
      },
      {
        id: 'MR006',
        name: 'Neha Desai',
        contact: '9876543215',
        email: 'neha.desai@metapharsic.com',
        headquarters: 'Nagpur',
        assignedArea: 'Vidarbha Region',
        salesTarget: 550000,
        totalSales: 715000,
        targetAchievement: 130,
        status: 'Active',
        joinDate: '2019-04-12',
        baseSalary: 45000,
        incentives: 25000,
        deductions: 3500
      }
    ];
    saveToStorage();
    console.log('Sample employees initialized');
  }

  // Initialize sample leads if empty
  if (leads.length === 0) {
    leads = [
      {
        id: 'L1',
        name: 'Amit Kumar',
        companyName: 'Health First Pharma',
        location: 'Mumbai',
        contact: '9876543210',
        email: 'amit@healthfirst.com',
        status: 'New',
        source: 'Website',
        priority: 'High',
        nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Interested in PCD for Cardiac range',
        activities: [
          {
            id: 'A1',
            leadId: 'L1',
            type: 'Call',
            description: 'Initial inquiry call received from website',
            performedBy: 'Sales Team',
            performedAt: new Date().toISOString(),
            duration: 15,
            outcome: 'Interested in catalog'
          }
        ],
        createdAt: new Date().toISOString(),
        assignedTo: 'Rajesh Sharma',
        estimatedValue: 500000,
        productInterest: ['Cardiac', 'Diabetes']
      },
      {
        id: 'L2',
        name: 'Sneha Gupta',
        companyName: 'Gupta Medicals',
        location: 'Delhi',
        contact: '9988776655',
        email: 'sneha@guptamedicals.com',
        status: 'Contacted',
        source: 'Referral',
        priority: 'Medium',
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Sent price list, waiting for feedback',
        activities: [
          {
            id: 'A2',
            leadId: 'L2',
            type: 'Email',
            description: 'Sent price catalog via email',
            performedBy: 'Sales Team',
            performedAt: new Date().toISOString()
          },
          {
            id: 'A3',
            leadId: 'L2',
            type: 'Follow-up',
            description: 'Scheduled follow-up call',
            performedBy: 'Sales Team',
            performedAt: new Date().toISOString(),
            followUpRequired: true,
            followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'Priya Patel',
        estimatedValue: 300000,
        productInterest: ['Antibiotics', 'Pain Management']
      },
      {
        id: 'L3',
        name: 'Rahul Verma',
        companyName: 'Verma Distributors',
        location: 'Pune',
        contact: '9123456789',
        email: 'rahul@vermadist.com',
        status: 'Qualified',
        source: 'Cold Call',
        priority: 'Urgent',
        nextFollowUp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Meeting scheduled for next week',
        activities: [
          {
            id: 'A4',
            leadId: 'L3',
            type: 'Meeting',
            description: 'Discovery meeting at client office',
            performedBy: 'Sales Manager',
            performedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 45,
            outcome: 'Qualified lead - high potential'
          },
          {
            id: 'A5',
            leadId: 'L3',
            type: 'Demo',
            description: 'Product demonstration',
            performedBy: 'Product Team',
            performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 60,
            outcome: 'Positive response'
          },
          {
            id: 'A6',
            leadId: 'L3',
            type: 'Proposal Sent',
            description: 'Sent commercial proposal',
            performedBy: 'Sales Manager',
            performedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'Rajesh Sharma',
        estimatedValue: 800000,
        productInterest: ['Cardiac', 'Neurology', 'Ortho']
      },
      {
        id: 'L4',
        name: 'Dr. Priya Shah',
        companyName: 'Shah Medical Center',
        location: 'Ahmedabad',
        contact: '9823456710',
        email: 'priya@shahmedical.com',
        status: 'Proposal',
        source: 'Exhibition',
        priority: 'High',
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Interested in hospital supply contract',
        activities: [
          {
            id: 'A7',
            leadId: 'L4',
            type: 'Meeting',
            description: 'Met at Pharma Expo 2024',
            performedBy: 'Sales Team',
            performedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 30,
            outcome: 'Showed interest'
          },
          {
            id: 'A8',
            leadId: 'L4',
            type: 'Quote Sent',
            description: 'Sent quotation for hospital supplies',
            performedBy: 'Sales Manager',
            performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'Amit Patel',
        estimatedValue: 1200000,
        productInterest: ['Hospital Supplies', 'Surgical', 'Critical Care']
      },
      {
        id: 'L5',
        name: 'Suresh Patel',
        companyName: 'Patel Pharma Distributors',
        location: 'Surat',
        contact: '9876543299',
        email: 'suresh@patelpharma.com',
        status: 'Converted',
        source: 'Referral',
        priority: 'High',
        nextFollowUp: '',
        notes: 'Converted to customer - first order placed',
        activities: [
          {
            id: 'A9',
            leadId: 'L5',
            type: 'Contract Signed',
            description: 'PCD franchise agreement signed',
            performedBy: 'Sales Manager',
            performedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            outcome: 'Converted to customer'
          },
          {
            id: 'A10',
            leadId: 'L5',
            type: 'Payment Received',
            description: 'First order payment received',
            performedBy: 'Accounts Team',
            performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            outcome: '₹150,000 received'
          }
        ],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'Rajesh Sharma',
        estimatedValue: 600000,
        productInterest: ['General Medicine', 'Antibiotics']
      }
    ];
    saveToStorage();
    console.log('Sample leads initialized');
  }

  // Phase 6: Sample Invoices for Last Rate testing
  if (invoices.length === 0) {
    invoices = [
      {
        id: 'INV-SAMPLE-1',
        invoiceNumber: 'INV/2024-25/001',
        date: '2024-03-10',
        time: '14:30',
        customerId: 'P1',
        customerName: 'Wellness Distributors',
        customerMobile: '9888877777',
        items: [
          {
            id: 'item-s1',
            productId: 'PROD-001',
            productName: 'Crocin 650mg',
            genericName: 'Paracetamol',
            hsn: '30049099',
            batchId: 'BATCH-001',
            batchNumber: 'CRN00123',
            expiryDate: '2025-12-31',
            quantity: 10,
            freeQuantity: 0,
            uom: 'Strip',
            mrp: 25.00,
            rate: 22.50, // Special rate given
            discountPercent: 5,
            discountAmount: 11.25,
            taxableValue: 200,
            gstPercent: 12,
            cgstAmount: 12,
            sgstAmount: 12,
            igstAmount: 0,
            totalAmount: 225.00,
            purchaseRate: 20.00,
            maxStock: 500
          }
        ],
        totalItems: 1,
        totalQuantity: 10,
        subTotal: 225,
        taxableValue: 200,
        totalDiscount: 11.25,
        totalGst: 24,
        roundOff: 0,
        netAmount: 225,
        paymentMode: 'Cash',
        amountReceived: 225,
        balanceDue: 0,
        status: 'Completed'
      }
    ];
    saveToStorage();
    console.log('Sample invoices initialized for Phase 6');
  }

  console.log('Database initialized with sample data');
};

console.log('databaseService.ts: Initializing Database...');
try {
  initializeDatabase();
  console.log('databaseService.ts: Database initialized successfully');
} catch (err) {
  console.error('databaseService.ts: Database initialization FAILED:', err);
}

// ==================== VOUCHER TYPE MASTER OPERATIONS ====================

export const getAllVoucherTypes = async (): Promise<VoucherTypeMaster[]> => {
  try {
    const response = await apiClient.get('/pos/voucher-types');
    if (response.success) {
      return response.data;
    }
    return getDefaultVoucherTypes();
  } catch (error) {
    console.error('Error fetching voucher types:', error);
    // Fallback to local storage if needed, but return defaults if that also fails
    const stored = localStorage.getItem('erp_voucher_types');
    return stored ? JSON.parse(stored) : getDefaultVoucherTypes();
  }
};

const getDefaultVoucherTypes = (): VoucherTypeMaster[] => [
  {
    id: 'VT-001',
    name: 'Sales',
    typeOfVoucher: 'Sale',
    abbreviation: 'Sale',
    methodOfVoucherNumbering: 'Automatic',
    useEffectiveDates: false,
    makeOptionalByDefault: false,
    allowNarration: true,
    provideNarrationsForEachLedger: false,
    printAfterSaving: false
  },
  {
    id: 'VT-002',
    name: 'Purchase',
    typeOfVoucher: 'Purchase',
    abbreviation: 'Purc',
    methodOfVoucherNumbering: 'Automatic',
    useEffectiveDates: false,
    makeOptionalByDefault: false,
    allowNarration: true,
    provideNarrationsForEachLedger: false,
    printAfterSaving: false
  },
  {
    id: 'VT-003',
    name: 'Point of Sales',
    typeOfVoucher: 'Sale',
    abbreviation: 'POS',
    methodOfVoucherNumbering: 'Automatic',
    useEffectiveDates: true,
    makeOptionalByDefault: false,
    allowNarration: true,
    provideNarrationsForEachLedger: false,
    printAfterSaving: true,
    nameOfClass: ['Standard', 'Exempt']
  }
];

export const saveVoucherType = async (voucherType: VoucherTypeMaster): Promise<boolean> => {
  try {
    const response = await apiClient.post('/pos/voucher-types', voucherType);
    if (response.success) {
      // Also update local storage as a cache
      const stored = localStorage.getItem('erp_voucher_types');
      let types = stored ? JSON.parse(stored) : [];
      const index = types.findIndex((t: any) => t.id === voucherType.id);
      if (index !== -1) types[index] = response.data;
      else types.push(response.data);
      localStorage.setItem('erp_voucher_types', JSON.stringify(types));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving voucher type:', error);
    return false;
  }
};

export const deleteVoucherType = async (id: string): Promise<boolean> => {
  try {
    // Note: Backend delete route not yet implemented in pos.js, but we'll add it if needed
    // For now, we'll just return true and log
    console.warn('Backend delete for voucher types not yet fully implemented');
    return true;
  } catch (error) {
    console.error('Error deleting voucher type:', error);
    return false;
  }
};

// ==================== CRM DATABASE FUNCTIONS ====================

// Lead Operations
export const getAllLeads = async (): Promise<Lead[]> => {
  return leads;
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
  return leads.find(l => l.id === id) || null;
};

export const saveLead = async (lead: Lead): Promise<boolean> => {
  try {
    const existingIndex = leads.findIndex(l => l.id === lead.id);
    if (existingIndex !== -1) {
      leads[existingIndex] = lead;
    } else {
      leads.push(lead);
    }
    saveToStorage();
    
    // Try backend API
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!response.ok) throw new Error('Backend save failed');
    } catch (apiError) {
      console.log('Saved to local storage (backend unavailable)');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving lead:', error);
    return false;
  }
};

export const deleteLead = async (id: string): Promise<boolean> => {
  try {
    leads = leads.filter(l => l.id !== id);
    // Also delete related activities
    leadActivities = leadActivities.filter(a => a.leadId !== id);
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
};

export const updateLeadStatus = async (id: string, status: Lead['status']): Promise<boolean> => {
  try {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      lead.status = status;
      lead.activities.push({
        id: `A-${Date.now()}`,
        leadId: id,
        type: 'Status Change',
        description: `Status changed to ${status}`,
        performedBy: 'System',
        performedAt: new Date().toISOString()
      });
      saveToStorage();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating lead status:', error);
    return false;
  }
};

// Lead Activity Operations
export const getLeadActivities = async (leadId: string): Promise<LeadActivity[]> => {
  return leadActivities.filter(a => a.leadId === leadId);
};

export const addLeadActivity = async (activity: LeadActivity): Promise<boolean> => {
  try {
    leadActivities.push(activity);
    
    // Also update lead's activities array
    const lead = leads.find(l => l.id === activity.leadId);
    if (lead) {
      lead.activities.push(activity);
      if (activity.followUpRequired && activity.followUpDate) {
        lead.nextFollowUp = activity.followUpDate;
      }
    }
    
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error adding activity:', error);
    return false;
  }
};

export const deleteLeadActivity = async (activityId: string): Promise<boolean> => {
  try {
    leadActivities = leadActivities.filter(a => a.id !== activityId);
    
    // Also remove from lead's activities
    leads.forEach(lead => {
      lead.activities = lead.activities.filter(a => a.id !== activityId);
    });
    
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
};

// CRM Statistics
export const getCRMStats = async () => {
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const contactedLeads = leads.filter(l => l.status === 'Contacted').length;
  const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
  const proposalLeads = leads.filter(l => l.status === 'Proposal').length;
  const negotiationLeads = leads.filter(l => l.status === 'Negotiation').length;
  const convertedLeads = leads.filter(l => l.status === 'Converted').length;
  const lostLeads = leads.filter(l => l.status === 'Lost').length;
  const onHoldLeads = leads.filter(l => l.status === 'On Hold').length;
  
  const totalActivities = leadActivities.length;
  const totalEstimatedValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  
  // Source breakdown
  const sourceBreakdown = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Priority breakdown
  const priorityBreakdown = leads.reduce((acc, lead) => {
    acc[lead.priority] = (acc[lead.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Activity type breakdown
  const activityTypeBreakdown = leadActivities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    proposalLeads,
    negotiationLeads,
    convertedLeads,
    lostLeads,
    onHoldLeads,
    totalActivities,
    totalEstimatedValue,
    conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
    sourceBreakdown,
    priorityBreakdown,
    activityTypeBreakdown
  };
};

// Search and Filter
export const searchLeads = async (query: string): Promise<Lead[]> => {
  const lowerQuery = query.toLowerCase();
  return leads.filter(lead => 
    lead.name.toLowerCase().includes(lowerQuery) ||
    lead.companyName.toLowerCase().includes(lowerQuery) ||
    lead.contact.includes(query) ||
    (lead.email && lead.email.toLowerCase().includes(lowerQuery)) ||
    lead.location.toLowerCase().includes(lowerQuery)
  );
};

export const filterLeads = async (filters: {
  status?: Lead['status'];
  priority?: Lead['priority'];
  source?: Lead['source'];
  assignedTo?: string;
}): Promise<Lead[]> => {
  return leads.filter(lead => {
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.priority && lead.priority !== filters.priority) return false;
    if (filters.source && lead.source !== filters.source) return false;
    if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) return false;
    return true;
  });
};

// Bulk Operations
export const bulkUpdateLeadStatus = async (ids: string[], status: Lead['status']): Promise<boolean> => {
  try {
    ids.forEach(id => {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        lead.status = status;
        lead.activities.push({
          id: `A-${Date.now()}-${id}`,
          leadId: id,
          type: 'Status Change',
          description: `Bulk status update to ${status}`,
          performedBy: 'System',
          performedAt: new Date().toISOString()
        });
      }
    });
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    return false;
  }
};

export const bulkDeleteLeads = async (ids: string[]): Promise<boolean> => {
  try {
    leads = leads.filter(l => !ids.includes(l.id));
    leadActivities = leadActivities.filter(a => !ids.includes(a.leadId));
    saveToStorage();
    return true;
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    return false;
  }
};

// Export functions
export const exportLeadsToCSV = (): string => {
  const headers = ['ID', 'Name', 'Company', 'Email', 'Contact', 'Location', 'Status', 'Priority', 'Source', 'Assigned To', 'Estimated Value', 'Next Follow Up', 'Created At'];
  const rows = leads.map(lead => [
    lead.id,
    lead.name,
    lead.companyName,
    lead.email || '',
    lead.contact,
    lead.location,
    lead.status,
    lead.priority,
    lead.source,
    lead.assignedTo || '',
    lead.estimatedValue || 0,
    lead.nextFollowUp,
    lead.createdAt
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const exportLeadsToJSON = (): string => {
  return JSON.stringify(leads, null, 2);
};

// ==========================================
// PURCHASE MANAGEMENT DATABASE FUNCTIONS
// ==========================================

export interface ThreeWayMatch {
  id: string;
  poId: string;
  poNumber: string;
  grnId: string;
  grnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poAmount: number;
  grnAmount: number;
  invoiceAmount: number;
  variance: number;
  variancePercent: number;
  status: 'matched' | 'partial' | 'mismatch' | 'pending';
  matchDate?: string;
  discrepancies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorRating {
  id: string;
  supplierId: string;
  supplierName: string;
  overallRating: number;
  qualityRating: number;
  deliveryRating: number;
  priceRating: number;
  serviceRating: number;
  totalTransactions: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  averageLeadTime: number;
  lastRated: string;
  trend: 'improving' | 'stable' | 'declining';
  reviews: VendorReview[];
}

export interface VendorReview {
  id: string;
  vendorId: string;
  rating: number;
  quality: number;
  delivery: number;
  price: number;
  service: number;
  comment: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ReorderPoint {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  maxStock: number;
  avgDailyConsumption: number;
  leadTimeDays: number;
  status: 'ok' | 'reorder' | 'critical' | 'excess';
  suggestedOrderDate: string;
  supplierId: string;
  supplierName: string;
  lastPurchaseRate: number;
  autoReorder: boolean;
  lastUpdated: string;
}

export interface ApprovalWorkflow {
  id: string;
  documentType: 'PO' | 'GRN' | 'Invoice';
  documentId: string;
  documentNo: string;
  amount: number;
  requestedBy: string;
  requestedAt: string;
  currentLevel: number;
  totalLevels: number;
  approvers: ApproverLevel[];
  status: 'pending' | 'approved' | 'rejected';
  completedAt?: string;
}

export interface ApproverLevel {
  level: number;
  role: string;
  userId?: string;
  name?: string;
  status: 'pending' | 'approved' | 'rejected';
  actionAt?: string;
  comments?: string;
}

export interface PurchaseBudget {
  id: string;
  category: string;
  department?: string;
  budgetedAmount: number;
  spentAmount: number;
  committedAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  status: 'under' | 'near' | 'over';
  period: string;
  fiscalYear: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for Purchase Management
let threeWayMatches: ThreeWayMatch[] = [];
let vendorRatings: VendorRating[] = [];
let reorderPoints: ReorderPoint[] = [];
let approvalWorkflows: ApprovalWorkflow[] = [];
let purchaseBudgets: PurchaseBudget[] = [];

// Initialize Purchase Management data
const initPurchaseManagement = () => {
  const storedMatches = localStorage.getItem('erp_three_way_matches');
  const storedRatings = localStorage.getItem('erp_vendor_ratings');
  const storedReorder = localStorage.getItem('erp_reorder_points');
  const storedApprovals = localStorage.getItem('erp_approval_workflows');
  const storedBudgets = localStorage.getItem('erp_purchase_budgets');

  if (storedMatches) threeWayMatches = JSON.parse(storedMatches);
  if (storedRatings) vendorRatings = JSON.parse(storedRatings);
  if (storedReorder) reorderPoints = JSON.parse(storedReorder);
  if (storedApprovals) approvalWorkflows = JSON.parse(storedApprovals);
  if (storedBudgets) purchaseBudgets = JSON.parse(storedBudgets);
};

// Save Purchase Management data
const savePurchaseData = () => {
  localStorage.setItem('erp_three_way_matches', JSON.stringify(threeWayMatches));
  localStorage.setItem('erp_vendor_ratings', JSON.stringify(vendorRatings));
  localStorage.setItem('erp_reorder_points', JSON.stringify(reorderPoints));
  localStorage.setItem('erp_approval_workflows', JSON.stringify(approvalWorkflows));
  localStorage.setItem('erp_purchase_budgets', JSON.stringify(purchaseBudgets));
};

// Initialize on load
initPurchaseManagement();

// Three-Way Matching Functions
export const getThreeWayMatches = async (): Promise<ThreeWayMatch[]> => {
  return threeWayMatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createThreeWayMatch = async (match: Omit<ThreeWayMatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThreeWayMatch> => {
  const newMatch: ThreeWayMatch = {
    ...match,
    id: `MATCH-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  threeWayMatches.push(newMatch);
  savePurchaseData();
  return newMatch;
};

// Vendor Rating Functions
export const getVendorRatings = async (): Promise<VendorRating[]> => {
  return vendorRatings.sort((a, b) => b.overallRating - a.overallRating);
};

export const createVendorRating = async (rating: Omit<VendorRating, 'id'>): Promise<VendorRating> => {
  const newRating: VendorRating = {
    ...rating,
    id: `VR-${Date.now()}`
  };
  vendorRatings.push(newRating);
  savePurchaseData();
  return newRating;
};

// Reorder Point Functions
export const getReorderPoints = async (): Promise<ReorderPoint[]> => {
  return reorderPoints;
};

export const createReorderPoint = async (reorder: Omit<ReorderPoint, 'id' | 'lastUpdated'>): Promise<ReorderPoint> => {
  const newReorder: ReorderPoint = {
    ...reorder,
    id: `RO-${Date.now()}`,
    lastUpdated: new Date().toISOString()
  };
  reorderPoints.push(newReorder);
  savePurchaseData();
  return newReorder;
};

// Approval Workflow Functions
export const getApprovalWorkflows = async (): Promise<ApprovalWorkflow[]> => {
  return approvalWorkflows.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
};

export const createApprovalWorkflow = async (workflow: Omit<ApprovalWorkflow, 'id'>): Promise<ApprovalWorkflow> => {
  const newWorkflow: ApprovalWorkflow = {
    ...workflow,
    id: `APR-${Date.now()}`
  };
  approvalWorkflows.push(newWorkflow);
  savePurchaseData();
  return newWorkflow;
};

// Purchase Budget Functions
export const getPurchaseBudgets = async (): Promise<PurchaseBudget[]> => {
  return purchaseBudgets;
};

export const createPurchaseBudget = async (budget: Omit<PurchaseBudget, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseBudget> => {
  const newBudget: PurchaseBudget = {
    ...budget,
    id: `BUD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  purchaseBudgets.push(newBudget);
  savePurchaseData();
  return newBudget;
};

// Initialize Sample Data
export const initializePurchaseManagementSampleData = () => {
  if (threeWayMatches.length === 0) {
    threeWayMatches = [
      {
        id: 'MATCH-001',
        poId: 'PO-001', poNumber: 'PO/2025/001', grnId: 'GRN-001', grnNumber: 'GRN/2025/001',
        invoiceId: 'INV-001', invoiceNumber: 'INV/SUN/001', supplierId: 'SUP-001', supplierName: 'Sun Pharma Distributors',
        poAmount: 150000, grnAmount: 148500, invoiceAmount: 148500, variance: -1500, variancePercent: -1.0,
        status: 'matched', matchDate: '2025-02-15', discrepancies: [],
        createdAt: '2025-02-15T10:00:00', updatedAt: '2025-02-15T10:00:00'
      },
      {
        id: 'MATCH-002',
        poId: 'PO-002', poNumber: 'PO/2025/002', grnId: 'GRN-002', grnNumber: 'GRN/2025/002',
        invoiceId: 'INV-002', invoiceNumber: 'INV/CIP/045', supplierId: 'SUP-002', supplierName: 'Cipla Ltd',
        poAmount: 250000, grnAmount: 250000, invoiceAmount: 262500, variance: 12500, variancePercent: 5.0,
        status: 'mismatch', discrepancies: ['GST rate difference', 'Freight charges not in PO'],
        createdAt: '2025-02-16T09:00:00', updatedAt: '2025-02-16T09:00:00'
      }
    ];
  }

  if (vendorRatings.length === 0) {
    vendorRatings = [
      {
        id: 'VR-001',
        supplierId: 'SUP-001', supplierName: 'Sun Pharma Distributors', overallRating: 4.5,
        qualityRating: 4.8, deliveryRating: 4.2, priceRating: 4.0, serviceRating: 4.5,
        totalTransactions: 45, onTimeDeliveries: 42, lateDeliveries: 3, averageLeadTime: 5,
        lastRated: '2025-02-01', trend: 'improving', reviews: []
      },
      {
        id: 'VR-002',
        supplierId: 'SUP-002', supplierName: 'Cipla Ltd', overallRating: 4.2,
        qualityRating: 4.5, deliveryRating: 4.0, priceRating: 4.3, serviceRating: 4.0,
        totalTransactions: 32, onTimeDeliveries: 28, lateDeliveries: 4, averageLeadTime: 7,
        lastRated: '2025-01-28', trend: 'stable', reviews: []
      }
    ];
  }

  if (reorderPoints.length === 0) {
    reorderPoints = [
      {
        id: 'RO-001',
        productId: 'PROD-001', productName: 'Paracetamol 500mg Tablets', currentStock: 150,
        reorderPoint: 200, reorderQuantity: 500, maxStock: 1000, avgDailyConsumption: 25,
        leadTimeDays: 3, status: 'reorder', suggestedOrderDate: '2025-02-18',
        supplierId: 'SUP-001', supplierName: 'Sun Pharma Distributors', lastPurchaseRate: 2.5,
        autoReorder: false, lastUpdated: '2025-02-17T10:00:00'
      },
      {
        id: 'RO-002',
        productId: 'PROD-002', productName: 'Amoxicillin 250mg Capsules', currentStock: 50,
        reorderPoint: 150, reorderQuantity: 400, maxStock: 800, avgDailyConsumption: 20,
        leadTimeDays: 5, status: 'critical', suggestedOrderDate: '2025-02-16',
        supplierId: 'SUP-002', supplierName: 'Cipla Ltd', lastPurchaseRate: 4.2,
        autoReorder: false, lastUpdated: '2025-02-17T10:00:00'
      }
    ];
  }

  if (approvalWorkflows.length === 0) {
    approvalWorkflows = [
      {
        id: 'APR-001',
        documentType: 'PO', documentId: 'PO-005', documentNo: 'PO/2025/005',
        amount: 450000, requestedBy: 'Purchase Manager', requestedAt: '2025-02-15T10:30:00',
        currentLevel: 2, totalLevels: 3,
        approvers: [
          { level: 1, role: 'Department Head', name: 'John Smith', status: 'approved', actionAt: '2025-02-15T11:00:00', comments: 'Approved' },
          { level: 2, role: 'Finance Manager', status: 'pending' },
          { level: 3, role: 'Director', status: 'pending' }
        ],
        status: 'pending'
      },
      {
        id: 'APR-002',
        documentType: 'Invoice', documentId: 'INV-015', documentNo: 'INV/SUN/089',
        amount: 125000, requestedBy: 'Accounts Executive', requestedAt: '2025-02-16T09:00:00',
        currentLevel: 1, totalLevels: 2,
        approvers: [
          { level: 1, role: 'Finance Manager', status: 'pending' },
          { level: 2, role: 'Director', status: 'pending' }
        ],
        status: 'pending'
      }
    ];
  }

  if (purchaseBudgets.length === 0) {
    purchaseBudgets = [
      {
        id: 'BUD-001',
        category: 'Raw Materials', budgetedAmount: 2000000, spentAmount: 1450000,
        committedAmount: 300000, remainingAmount: 250000, utilizationPercent: 72.5,
        status: 'under', period: 'FY 2025-26', fiscalYear: '2025-26',
        createdAt: '2025-04-01T00:00:00', updatedAt: '2025-02-17T10:00:00'
      },
      {
        id: 'BUD-002',
        category: 'Packaging Materials', budgetedAmount: 500000, spentAmount: 420000,
        committedAmount: 50000, remainingAmount: 30000, utilizationPercent: 94.0,
        status: 'near', period: 'FY 2025-26', fiscalYear: '2025-26',
        createdAt: '2025-04-01T00:00:00', updatedAt: '2025-02-17T10:00:00'
      }
    ];
  }

  savePurchaseData();
};

// ==========================================
// GODOWN MANAGEMENT
// ==========================================

export interface Godown {
  id: string;
  name: string;
  address?: string;
  manager_id?: string;
  manager_name?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

let godowns: Godown[] = [];

const initGodowns = () => {
  const stored = localStorage.getItem('erp_godowns');
  if (stored) {
    godowns = JSON.parse(stored);
  }
};

const saveGodowns = () => {
  localStorage.setItem('erp_godowns', JSON.stringify(godowns));
};

initGodowns();

export const getAllGodowns = async (): Promise<Godown[]> => {
  try {
    const token = localStorage.getItem('erp_token') || (localStorage.getItem('accessToken') || localStorage.getItem('token')) || '';
    const response = await fetch(`${API_URL}/inventory/godowns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
         return result.data.map((g: any) => ({
            id: g.id,
            name: g.name,
            address: g.address,
            manager_id: g.manager_id,
            is_default: g.is_default,
            status: g.status,
            created_at: g.created_at || new Date().toISOString()
         }));
      }
    }
  } catch (error) {
    console.warn('API godowns failed, falling back to local storage', error);
  }
  return [...godowns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getGodownById = async (id: string): Promise<Godown | null> => {
  return godowns.find(g => g.id === id) || null;
};

export const createGodown = async (data: Partial<Godown>): Promise<Godown> => {
  const now = new Date().toISOString();
  const newGodown: Godown = {
    id: `GOD-${Date.now()}`,
    name: data.name || 'Unnamed Godown',
    address: data.address,
    manager_id: data.manager_id,
    manager_name: data.manager_name,
    is_default: data.is_default || false,
    status: 'active',
    created_at: now,
    updated_at: now
  };
  
  // If this is set as default, unset others
  if (newGodown.is_default) {
    godowns = godowns.map(g => ({ ...g, is_default: false }));
  }
  
  godowns.push(newGodown);
  saveGodowns();
  return newGodown;
};

export const updateGodown = async (id: string, data: Partial<Godown>): Promise<Godown> => {
  const index = godowns.findIndex(g => g.id === id);
  if (index === -1) {
    throw new Error('Godown not found');
  }
  
  // If setting as default, unset others
  if (data.is_default) {
    godowns = godowns.map(g => g.id === id ? g : { ...g, is_default: false });
  }
  
  godowns[index] = {
    ...godowns[index],
    ...data,
    updated_at: new Date().toISOString()
  };
  
  saveGodowns();
  return godowns[index];
};

export const deleteGodown = async (id: string): Promise<boolean> => {
  const index = godowns.findIndex(g => g.id === id);
  if (index === -1) return false;
  
  godowns.splice(index, 1);
  saveGodowns();
  return true;
};

// Initialize sample godowns if empty
export const initializeGodownSampleData = () => {
  if (godowns.length === 0) {
    godowns = [
      {
        id: 'GOD-001',
        name: 'Main Warehouse',
        address: 'Plot 45, Industrial Area, Baddi, HP',
        manager_id: 'EMP-001',
        manager_name: 'Warehouse Manager',
        is_default: true,
        status: 'active',
        created_at: '2024-01-01T00:00:00',
        updated_at: '2024-01-01T00:00:00'
      },
      {
        id: 'GOD-002',
        name: 'Cold Storage',
        address: 'Plot 46, Industrial Area, Baddi, HP',
        manager_id: 'EMP-002',
        manager_name: 'Cold Storage In-charge',
        is_default: false,
        status: 'active',
        created_at: '2024-01-15T00:00:00',
        updated_at: '2024-01-15T00:00:00'
      }
    ];
    saveGodowns();
  }
};

// ==============================================
// STRATEGIC PCD NETWORK FUNCTIONS
// ==============================================

// PCD Schemes
export const savePCDScheme = async (scheme: PCDScheme): Promise<boolean> => {
  try {
    const schemes = JSON.parse(localStorage.getItem('pcd_schemes') || '[]');
    const existingIndex = schemes.findIndex((s: PCDScheme) => s.id === scheme.id);
    if (existingIndex !== -1) {
      schemes[existingIndex] = scheme;
    } else {
      schemes.push(scheme);
    }
    localStorage.setItem('pcd_schemes', JSON.stringify(schemes));
    return true;
  } catch (error) {
    console.error('Error saving PCD scheme:', error);
    return false;
  }
};

export const getAllPCDSchemes = async (): Promise<PCDScheme[]> => {
  try {
    return JSON.parse(localStorage.getItem('pcd_schemes') || '[]');
  } catch (error) {
    console.error('Error fetching PCD schemes:', error);
    return [];
  }
};

// PCD Targets
export const savePCDTarget = async (target: PCDTarget): Promise<boolean> => {
  try {
    const targets = JSON.parse(localStorage.getItem('pcd_targets') || '[]');
    const existingIndex = targets.findIndex((t: PCDTarget) => t.id === target.id);
    if (existingIndex !== -1) {
      targets[existingIndex] = target;
    } else {
      targets.push(target);
    }
    localStorage.setItem('pcd_targets', JSON.stringify(targets));
    return true;
  } catch (error) {
    console.error('Error saving PCD target:', error);
    return false;
  }
};

export const getAllPCDTargets = async (): Promise<PCDTarget[]> => {
  try {
    return JSON.parse(localStorage.getItem('pcd_targets') || '[]');
  } catch (error) {
    console.error('Error fetching PCD targets:', error);
    return [];
  }
};

// PCD Partners
export const savePCDPartner = async (partner: PCDPartner): Promise<boolean> => {
  try {
    const partners = JSON.parse(localStorage.getItem('pcd_partners') || '[]');
    const existingIndex = partners.findIndex((p: PCDPartner) => p.id === partner.id);
    if (existingIndex !== -1) {
      partners[existingIndex] = partner;
    } else {
      partners.push(partner);
    }
    localStorage.setItem('pcd_partners', JSON.stringify(partners));
    return true;
  } catch (error) {
    console.error('Error saving PCD partner:', error);
    return false;
  }
};

export const getAllPCDPartners = async (): Promise<PCDPartner[]> => {
  try {
    return JSON.parse(localStorage.getItem('pcd_partners') || '[]');
  } catch (error) {
    console.error('Error fetching PCD partners:', error);
    return [];
  }
};

// PCD Medical Representatives
export const saveMedicalRepresentative = async (mr: MedicalRepresentative): Promise<boolean> => {
  try {
    const employeesData = JSON.parse(localStorage.getItem('erp_employees') || '[]');
    const existingIndex = employeesData.findIndex((e: MedicalRepresentative) => e.id === mr.id);
    if (existingIndex !== -1) {
      employeesData[existingIndex] = mr;
    } else {
      employeesData.push(mr);
    }
    localStorage.setItem('erp_employees', JSON.stringify(employeesData));
    employees = employeesData; // update in-memory
    return true;
  } catch (error) {
    console.error('Error saving MR:', error);
    return false;
  }
};

export const getAllMedicalRepresentatives = async (): Promise<MedicalRepresentative[]> => {
  try {
    return JSON.parse(localStorage.getItem('erp_employees') || '[]');
  } catch (error) {
    console.error('Error fetching MRs:', error);
    return [];
  }
};

// PCD Transactions (Sale Transactions)
export const savePCDTransaction = async (transaction: SaleTransaction): Promise<boolean> => {
  try {
    const transactions = JSON.parse(localStorage.getItem('pcd_transactions') || '[]');
    const existingIndex = transactions.findIndex((t: SaleTransaction) => t.id === transaction.id);
    if (existingIndex !== -1) {
      transactions[existingIndex] = transaction;
    } else {
      transactions.push(transaction);
    }
    localStorage.setItem('pcd_transactions', JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('Error saving PCD transaction:', error);
    return false;
  }
};

export const getAllPCDTransactions = async (): Promise<SaleTransaction[]> => {
  try {
    return JSON.parse(localStorage.getItem('pcd_transactions') || '[]');
  } catch (error) {
    console.error('Error fetching PCD transactions:', error);
    return [];
  }
};
