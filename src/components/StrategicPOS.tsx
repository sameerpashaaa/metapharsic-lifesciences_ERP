import React, { useState, useEffect } from 'react';
import { 
  Search, CreditCard, ArrowUpRight, ArrowDownLeft, FileText, Calendar, 
  Wallet, Check, X, Plus, PieChart, TrendingUp, DollarSign, RefreshCcw, 
  Filter, User, MapPin, Stethoscope, Pill, MapPinned, Briefcase, Printer, 
  Download, Eye, Edit3, Trash2, Save, XCircle, Package, Layers, 
  AlertCircle, ShoppingCart, Power, Minus, Gift, History, Calculator,
  LayoutDashboard, ShoppingBag, Receipt, Users, Clock, Settings,
  Database, FileSpreadsheet, BarChart3, ShieldCheck, ClipboardList
} from 'lucide-react';
import TallyVoucherEntry from './TallyVoucherEntry';
import POSTerminalModal from './POSTerminalModal';
import { MOCK_PRODUCTS } from '../constants';
import { Product, Batch, SalesInvoice, SalesInvoiceItem, Party, VoucherTypeMaster, VoucherType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  saveInvoice, getAllInvoices, getInvoiceById, searchProducts, getAllParties, 
  saveParty, getAllProducts, getAllVoucherTypes, saveVoucherType, deleteVoucherType,
  saveProduct, deleteProduct, updateInvoice, deleteInvoice
} from '../services/databaseService';
import { apiClient } from '../services/apiClient';
import { calculateLineItem, calculateInvoiceSummary, calculateBatchValuation, validateDiscount, applyScheme, calculateRates } from '../utils/tallyERP11Calculations';
import { EnterpriseLayout } from './UniversalLayout';
import { printPOSInvoice, exportPOSInvoiceToExcel } from '../utils/accountingExport';
import { numberToWords } from '../utils/numberToWords';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

interface POSDashboardInvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  amount: number;
  status: string;
  items_sold: number;
}

interface POSDashboardSummary {
  tables: string[];
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueChangePercent: number;
  invoicesGenerated: number;
  itemsSoldToday: number;
  pendingDrafts: number;
  monthlyRevenue: number;
  recentInvoices: POSDashboardInvoiceRow[];
}

import { useAppStore } from '../store/useAppStore';

const StrategicPOS: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotifications();
  const { posTerminalOpen, setPosTerminalOpen, posInternalTab, setPosInternalTab } = useAppStore();

  // --- State: Tabs & Navigation ---
  // ... rest of the component

  const [openTabs, setOpenTabs] = useState<{id: string, label: string}[]>([
    { id: 'POS_DASHBOARD', label: 'POS Terminal' }
  ]);
  const [activeTab, setActiveTab] = useState<string>('POS_DASHBOARD');

  const openTab = (id: string, label: string) => {
    if (!openTabs.find(t => t.id === id)) {
      setOpenTabs([...openTabs, { id, label }]);
    }
    setActiveTab(id);
  };

  // Listen for internal tab requests from main sidebar
  useEffect(() => {
    if (posInternalTab) {
      const tabMap: Record<string, string> = {
        'INVOICE_HISTORY': 'Sales History',
        'PRODUCT_CATALOG': 'Item Master',
        'CUSTOMER_LIST': 'Customers',
        'VOUCHER_TYPE_SETUP': 'Voucher Types'
      };
      
      if (tabMap[posInternalTab]) {
        openTab(posInternalTab, tabMap[posInternalTab]);
        // Clear the request after handling
        setPosInternalTab(null);
      }
    }
  }, [posInternalTab, setPosInternalTab]);

  const closeTab = (id: string) => {
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);
    if (activeTab === id && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      setActiveTab('POS_DASHBOARD');
      if (!openTabs.find(t => t.id === 'POS_DASHBOARD')) {
        setOpenTabs([{ id: 'POS_DASHBOARD', label: 'POS Terminal' }]);
      }
    }
  };

  // --- Sidebar Items Configuration ---
  const sidebarItems: any[] = [];

  // --- Top Ribbon Actions ---
  const topActions = [
    { label: 'Counter Sale (F8)', onClick: () => openTab('NEW_INVOICE', 'Counter Sale'), icon: <ShoppingCart size={14}/> },
    { label: 'Wholesale (F9)', onClick: () => openTab('WHOLESALE_BILL', 'Wholesale'), icon: <Briefcase size={14}/> },
    { label: 'Returns (F10)', onClick: () => openTab('VOUCHER_ENTRY_Return', 'Return Voucher'), icon: <RefreshCcw size={14}/> },
    { label: 'Day Book', onClick: () => openTab('DAY_BOOK', 'Day Book'), icon: <Receipt size={14}/> },
  ];

  // --- Shared POS State (from POSInventoryStyle) ---
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState<SalesInvoiceItem[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<SalesInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('Counter Customer');
  const [posDashboardSummary, setPosDashboardSummary] = useState<POSDashboardSummary>({
    tables: ['sales_invoices', 'sales_invoice_items', 'parties'],
    todayRevenue: 0,
    yesterdayRevenue: 0,
    revenueChangePercent: 0,
    invoicesGenerated: 0,
    itemsSoldToday: 0,
    pendingDrafts: 0,
    monthlyRevenue: 0,
    recentInvoices: []
  });
  
  // --- Voucher Type Setup State ---
  const [voucherTypeMasters, setVoucherTypeMasters] = useState<VoucherTypeMaster[]>([]);
  const [selectedVoucherType, setSelectedVoucherType] = useState<VoucherTypeMaster | null>(null);
  const [isEditingVT, setIsEditingVT] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [vtForm, setVtForm] = useState<Partial<VoucherTypeMaster>>({
    name: '',
    alias: '',
    typeOfVoucher: 'Sale',
    abbreviation: '',
    methodOfVoucherNumbering: 'Automatic',
    useEffectiveDates: false,
    makeOptionalByDefault: false,
    allowNarration: true,
    provideNarrationsForEachLedger: false,
    printAfterSaving: false,
    nameOfClass: []
  });

  const loadTestCaseData = () => {
    setVtForm({
      name: 'Pharmacy Retail POS',
      alias: 'RETAIL_POS',
      typeOfVoucher: 'Sale',
      abbreviation: 'POS',
      methodOfVoucherNumbering: 'Automatic',
      useEffectiveDates: true,
      makeOptionalByDefault: false,
      allowNarration: true,
      provideNarrationsForEachLedger: false,
      printAfterSaving: true,
      nameOfClass: ['Standard Billing', 'GST Exempt', 'Staff Discount']
    });
    addNotification({
      type: 'info',
      title: 'Voucher Setup Test Data',
      message: 'Test Case data loaded. Review and click Accept to save.',
      priority: 'medium',
      module: 'POS',
      sourceTable: 'sales_invoices',
      sourceLabel: 'POS sales workflow'
    });
  };

  // --- Party Management State ---
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [isEditingParty, setIsEditingParty] = useState(false);
  const [partyForm, setPartyForm] = useState<Partial<Party>>({
    name: '',
    type: 'Debtor',
    gstin: '',
    mobile: '',
    email: '',
    address: '',
    status: 'Active',
    current_balance: 0
  });
  const [partySearch, setPartySearch] = useState('');

  // --- Product Management State ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    genericName: '',
    manufacturer: '',
    packing: '',
    uom: 'Strip',
    hsn: '',
    gst: 12,
    minStockLevel: 50,
    reorderLevel: 100,
    therapeuticCategory: 'OTC',
    totalStock: 0
  });
  const [catalogSearch, setCatalogSearch] = useState('');

  // --- Custom Confirmation Dialog State ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadPosDashboardSummary = async () => {
  try {
  const response = await apiClient.get(`/pos/dashboard-summary?t=${Date.now()}`);
  const summaryData = response?.success ? response.data : response;

  const mappedInvoices = Array.isArray(summaryData?.recentInvoices) 
  ? summaryData.recentInvoices.map((inv: any) => ({
  ...inv,
  id: inv.id || inv.invoice_number || inv.invoice_no,
  invoiceNumber: inv.invoice_number || inv.invoice_no || inv.id || 'N/A',
  invoice_number: inv.invoice_number || inv.invoice_no || inv.id || 'N/A',
  customerName: inv.customer_name || inv.party_name || 'Counter Customer',
  customer_name: inv.customer_name || inv.party_name || 'Counter Customer',
  date: inv.date || inv.invoice_date || new Date().toISOString(),
  invoice_date: inv.date || inv.invoice_date || new Date().toISOString(),
  amount: Number(inv.net_amount || inv.amount || inv.net_payable || 0),
  status: inv.status || 'Completed',
  items_sold: Number(inv.items_sold || 0)
  })) 
  : [];

  setPosDashboardSummary({
  tables: summaryData?.tables || ['sales_invoices', 'sales_invoice_items', 'parties'],
  todayRevenue: Number(summaryData?.todayRevenue || 0),
  yesterdayRevenue: Number(summaryData?.yesterdayRevenue || 0),
  revenueChangePercent: Number(summaryData?.revenueChangePercent || 0),
  invoicesGenerated: Number(summaryData?.invoicesGenerated || 0),
  itemsSoldToday: Number(summaryData?.itemsSoldToday || 0),
  pendingDrafts: Number(summaryData?.pendingDrafts || 0),
  monthlyRevenue: Number(summaryData?.monthlyRevenue || 0),
  recentInvoices: mappedInvoices
  });
  } catch (error) {
  console.error('StrategicPOS: Failed to load dashboard summary', error);
  }
  };
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('StrategicPOS: Loading initial data...');
        const [invoicesData, productsData, partiesData, vtData] = await Promise.all([
          getAllInvoices(),
          getAllProducts(),
          getAllParties(),
          getAllVoucherTypes()
        ]);
        try {
          await loadPosDashboardSummary();
        } catch (e) {
          console.warn('StrategicPOS: Dashboard summary failed to load', e);
        }
        
        console.log('StrategicPOS: Data loaded successfully', { 
          invoices: invoicesData?.length, 
          products: productsData?.length, 
          parties: partiesData?.length,
          voucherTypes: vtData?.length
        });
        
        setSavedInvoices(invoicesData || []);
        setAvailableProducts(productsData || []);
        setAvailableParties(partiesData || []);
        setVoucherTypeMasters(vtData || []);
      } catch (err: any) {
        console.error('StrategicPOS: Failed to load data', err);
        addNotification({
          type: 'error',
          title: 'POS Initialization Failed',
          message: `Initialization Failed: ${err.message || 'Check connection to Metapharsic Hub.'}`,
          priority: 'high',
          module: 'POS',
          sourceTable: 'sales_invoices',
          sourceLabel: 'POS initialization state'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Keyboard Shortcuts for Voucher Type Setup (Tally Style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'VOUCHER_TYPE_SETUP' && isEditingVT) {
        // Ctrl+A to Accept (Save)
        if (e.ctrlKey && (e.key.toLowerCase() === 'a')) {
          e.preventDefault();
          handleSaveVoucherType();
        }
        // Escape to Quit (Exit form)
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditingVT(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isEditingVT, vtForm, selectedVoucherType]);

  const handleViewInvoice = async (invoiceId: string) => {
    if (!invoiceId) {
      console.warn('StrategicPOS: handleViewInvoice called without invoiceId');
      return;
    }
    
    const cleanId = String(invoiceId).trim();
    
    try {
      setLoading(true);
      console.log('StrategicPOS: Fetching invoice:', cleanId);
      const invoice = await getInvoiceById(cleanId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setShowInvoicePreview(true);
      } else {
        console.error('StrategicPOS: Invoice not found for ID:', cleanId);
        addNotification({
          type: 'error',
          title: 'Invoice Not Found',
          message: `The invoice details for ${cleanId} could not be retrieved from the server.`,
          priority: 'medium',
          module: 'POS',
          sourceTable: 'sales_invoices',
          sourceLabel: 'Invoice view attempt'
        });
      }
    } catch (err: any) {
      console.error('StrategicPOS: Failed to view invoice:', err);
      addNotification({
        type: 'error',
        title: 'Error Loading Invoice',
        message: err.message || 'Check your connection to the server.',
        priority: 'high',
        module: 'POS',
        sourceTable: 'sales_invoices',
        sourceLabel: 'Invoice view attempt'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoucherType = async () => {
    if (!vtForm.name || !vtForm.typeOfVoucher) return;
    
    const newVT: VoucherTypeMaster = {
      id: selectedVoucherType?.id || `VT-${Date.now()}`,
      name: vtForm.name!,
      alias: vtForm.alias,
      typeOfVoucher: vtForm.typeOfVoucher as VoucherType,
      abbreviation: vtForm.abbreviation || vtForm.name!.substring(0, 4),
      methodOfVoucherNumbering: vtForm.methodOfVoucherNumbering as any || 'Automatic',
      useEffectiveDates: !!vtForm.useEffectiveDates,
      makeOptionalByDefault: !!vtForm.makeOptionalByDefault,
      allowNarration: !!vtForm.allowNarration,
      provideNarrationsForEachLedger: !!vtForm.provideNarrationsForEachLedger,
      printAfterSaving: !!vtForm.printAfterSaving,
      nameOfClass: vtForm.nameOfClass || []
    };

    const success = await saveVoucherType(newVT);
    if (success) {
      const updatedList = await getAllVoucherTypes();
      setVoucherTypeMasters(updatedList);
      setIsEditingVT(false);
      setSelectedVoucherType(null);
      addNotification({
        type: 'success',
        title: 'Voucher Type Saved',
        message: `Voucher Type "${newVT.name}" successfully active and synchronized with Master Database.`,
        priority: 'low',
        module: 'POS',
        sourceTable: 'sales_invoices',
        sourceLabel: 'POS voucher configuration'
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Voucher Sync Failed',
        message: 'Master Sync Failed. Check database connection or permissions.',
        priority: 'high',
        module: 'POS',
        sourceTable: 'sales_invoices',
        sourceLabel: 'POS voucher configuration'
      });
    }
  };

  const renderVoucherTypeSetup = () => (
    <div className="flex h-full gap-6 bg-[#E3E8E3] p-4 rounded-xl border border-slate-300">
      {/* Sidebar: List of Voucher Types */}
      <div className="w-64 bg-[#F5F5F5] border border-slate-400 rounded shadow-inner flex flex-col">
        <div className="bg-[#1D3557] p-2 text-white text-[10px] font-bold uppercase tracking-widest text-center">
          List of Voucher Types
        </div>
        <div className="flex-1 overflow-auto p-1">
          {voucherTypeMasters.map(vt => (
            <button 
              key={vt.id}
              onClick={() => {
                setSelectedVoucherType(vt);
                setVtForm(vt);
                setIsEditingVT(true);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-[#D4E2D4] transition-colors border-b border-slate-200 ${selectedVoucherType?.id === vt.id ? 'bg-[#D4E2D4]' : ''}`}
            >
              {vt.name}
            </button>
          ))}
          <button 
            onClick={() => {
              setSelectedVoucherType(null);
              setVtForm({
                name: '',
                alias: '',
                typeOfVoucher: 'Sale',
                abbreviation: '',
                methodOfVoucherNumbering: 'Automatic',
                useEffectiveDates: false,
                makeOptionalByDefault: false,
                allowNarration: true,
                provideNarrationsForEachLedger: false,
                printAfterSaving: false,
                nameOfClass: []
              });
              setIsEditingVT(true);
            }}
            className="w-full text-center px-3 py-3 text-xs font-black text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-2 mt-2 border-2 border-dashed border-blue-200 rounded"
          >
            <Plus size={14} /> CREATE NEW
          </button>

          <button 
            onClick={loadTestCaseData}
            className="w-full text-center px-3 py-2 text-[10px] font-black text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 mt-4 border border-emerald-200 rounded"
          >
            <Database size={12} /> LOAD TEST CASE
          </button>

          <button 
            onClick={() => setShowWorkflowGuide(true)}
            className="w-full text-center px-3 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-2 mt-2 border border-slate-200 rounded"
          >
            <AlertCircle size={12} /> WORKFLOW GUIDE
          </button>
        </div>
      </div>

      {/* Main Form: Tally Style */}
      <div className="flex-1 bg-white border border-slate-400 rounded shadow-lg flex flex-col overflow-hidden">
        <div className="bg-[#1D3557] p-2 text-white text-xs font-black flex justify-between items-center px-4">
          <span>Voucher Type Creation</span>
          <span className="text-[10px] opacity-70">Metapharsic ERP v1.0</span>
        </div>
        
        <div className="p-6 flex-1 overflow-auto bg-[#F9FBF9]">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-32 text-xs font-bold text-slate-700">Name</label>
                <div className="flex-1 flex gap-2">
                  <span className="text-slate-400">:</span>
                  <input 
                    type="text" 
                    value={vtForm.name}
                    onChange={e => setVtForm({...vtForm, name: e.target.value})}
                    className="flex-1 border-b border-slate-300 focus:border-blue-500 outline-none text-xs font-black bg-transparent"
                    placeholder="e.g. Point of Sales"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="w-32 text-xs font-bold text-slate-500 italic">(alias)</label>
                <div className="flex-1 flex gap-2">
                  <span className="text-slate-400">:</span>
                  <input 
                    type="text" 
                    value={vtForm.alias}
                    onChange={e => setVtForm({...vtForm, alias: e.target.value})}
                    className="flex-1 border-b border-slate-300 focus:border-blue-500 outline-none text-xs bg-transparent"
                  />
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6">
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-1 mb-4">General Configuration</h4>
                
                <div className="space-y-3">
                   <div className="flex items-center gap-4">
                    <label className="w-48 text-xs font-bold text-slate-700">Select type of voucher</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">:</span>
                      <select 
                        value={vtForm.typeOfVoucher}
                        onChange={e => setVtForm({...vtForm, typeOfVoucher: e.target.value as any})}
                        className="flex-1 border-b border-slate-300 focus:border-blue-500 outline-none text-xs font-black bg-transparent"
                      >
                        <option value="Sale">Sales</option>
                        <option value="Purchase">Purchase</option>
                        <option value="Journal">Journal</option>
                        <option value="Payment">Payment</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Contra">Contra</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-xs font-bold text-slate-700">Abbreviation</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">:</span>
                      <input 
                        type="text" 
                        value={vtForm.abbreviation}
                        onChange={e => setVtForm({...vtForm, abbreviation: e.target.value})}
                        className="flex-1 border-b border-slate-300 focus:border-blue-500 outline-none text-xs bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-xs font-bold text-slate-700">Method of voucher numbering</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">:</span>
                      <select 
                        value={vtForm.methodOfVoucherNumbering}
                        onChange={e => setVtForm({...vtForm, methodOfVoucherNumbering: e.target.value as any})}
                        className="flex-1 border-b border-slate-300 focus:border-blue-500 outline-none text-xs font-black bg-transparent"
                      >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-56 text-xs font-bold text-slate-700">Use effective dates for vouchers</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">?</span>
                      <button 
                        onClick={() => setVtForm({...vtForm, useEffectiveDates: !vtForm.useEffectiveDates})}
                        className={`text-xs font-black uppercase ${vtForm.useEffectiveDates ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {vtForm.useEffectiveDates ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-56 text-xs font-bold text-slate-700">Make this voucher type as 'Optional' by default</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">?</span>
                      <button 
                        onClick={() => setVtForm({...vtForm, makeOptionalByDefault: !vtForm.makeOptionalByDefault})}
                        className={`text-xs font-black uppercase ${vtForm.makeOptionalByDefault ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {vtForm.makeOptionalByDefault ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-56 text-xs font-bold text-slate-700">Allow narration in voucher</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">?</span>
                      <button 
                        onClick={() => setVtForm({...vtForm, allowNarration: !vtForm.allowNarration})}
                        className={`text-xs font-black uppercase ${vtForm.allowNarration ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {vtForm.allowNarration ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-56 text-xs font-bold text-slate-700">Provide narrations for each ledger in voucher</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">?</span>
                      <button 
                        onClick={() => setVtForm({...vtForm, provideNarrationsForEachLedger: !vtForm.provideNarrationsForEachLedger})}
                        className={`text-xs font-black uppercase ${vtForm.provideNarrationsForEachLedger ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {vtForm.provideNarrationsForEachLedger ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
               <div className="border-l border-slate-200 pl-8">
                  <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-1 mb-4">Printing Configuration</h4>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-xs font-bold text-slate-700">Print voucher after saving</label>
                    <div className="flex-1 flex gap-2">
                      <span className="text-slate-400">?</span>
                      <button 
                        onClick={() => setVtForm({...vtForm, printAfterSaving: !vtForm.printAfterSaving})}
                        className={`text-xs font-black uppercase ${vtForm.printAfterSaving ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {vtForm.printAfterSaving ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
               </div>

               <div className="border-l border-slate-200 pl-8 flex-1">
                  <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-1 mb-4">Name of Class</h4>
                  <div className="bg-white border border-slate-300 min-h-[150px] p-2">
                    {vtForm.nameOfClass?.map((cls, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 text-xs font-bold">
                        <span>{cls}</span>
                        <button onClick={() => setVtForm({...vtForm, nameOfClass: vtForm.nameOfClass?.filter((_, i) => i !== idx)})} className="text-red-500 hover:text-red-700">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="mt-2 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="New Class..." 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              setVtForm({...vtForm, nameOfClass: [...(vtForm.nameOfClass || []), val]});
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="flex-1 border-b border-slate-200 outline-none text-[10px] font-bold"
                      />
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-[#D4E2D4] p-3 flex justify-end gap-3 border-t border-slate-400">
          <button 
            onClick={() => setIsEditingVT(false)}
            className="px-6 py-1.5 bg-white border border-slate-400 text-slate-700 text-xs font-black uppercase hover:bg-slate-50"
          >
            Esc: Quit
          </button>
          <button 
            onClick={handleSaveVoucherType}
            className="px-8 py-1.5 bg-[#1D3557] text-white text-xs font-black uppercase hover:bg-blue-800 shadow-lg"
          >
            Ctrl+A: Accept
          </button>
        </div>
      </div>
    </div>
  );

  const addBatchToCart = (product: Product, batch: Batch) => {
    const newItem: SalesInvoiceItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      genericName: product.genericName,
      hsn: product.hsn,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: 1,
      freeQuantity: 0,
      uom: product.uom,
      mrp: batch.mrp,
      rate: batch.sellingRate,
      discountPercent: 0,
      discountAmount: 0,
      taxableValue: batch.sellingRate,
      gstPercent: product.gst,
      cgstAmount: (batch.sellingRate * (product.gst / 2)) / 100,
      sgstAmount: (batch.sellingRate * (product.gst / 2)) / 100,
      igstAmount: 0,
      totalAmount: batch.sellingRate + (batch.sellingRate * product.gst / 100),
      purchaseRate: batch.purchaseRate,
      maxStock: batch.stock
    };
    setCartItems([...cartItems, newItem]);
    openTab('NEW_INVOICE', 'Counter Sale');
  };

  // Stats for Dashboard
  const stats = {
    totalToday: posDashboardSummary.todayRevenue,
    countToday: posDashboardSummary.invoicesGenerated,
    itemsToday: posDashboardSummary.itemsSoldToday,
    totalMonth: posDashboardSummary.monthlyRevenue,
    totalPending: posDashboardSummary.pendingDrafts,
    growth: posDashboardSummary.revenueChangePercent
  };

  // --- Render Functions for Tabs ---
  
  const renderLiveDashboard = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">POS Dashboard Source</p>
          <p className="text-xs font-bold text-slate-700">Live from {posDashboardSummary.tables.join(' + ')}</p>
        </div>
        <button
          onClick={() => openTab('INVOICE_HISTORY', 'Sales History')}
          className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline"
        >
          Open Sales Register
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 shrink-0">
        <button
          onClick={() => openTab('INVOICE_HISTORY', 'Sales History')}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Today's Revenue</p>
            <h3 className="text-xl font-black text-[#1D3557]">{formatCurrency(stats.totalToday)}</h3>
            <p className={`mt-1 text-[10px] font-bold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.growth >= 0 ? 'Up' : 'Down'} {Math.abs(stats.growth)}% from yesterday
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><DollarSign size={20} /></div>
        </button>

        <button
          onClick={() => openTab('INVOICE_HISTORY', 'Sales History')}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoices Generated</p>
            <h3 className="text-xl font-black text-slate-800">{stats.countToday}</h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400">Total items sold: {stats.itemsToday}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-slate-600"><Receipt size={20} /></div>
        </button>

        <button
          onClick={() => openTab('INVOICE_HISTORY', 'Sales History')}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-amber-200 hover:bg-amber-50/40"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending Drafts</p>
            <h3 className="text-xl font-black text-amber-600">{stats.totalPending}</h3>
            <p className="mt-1 text-[10px] font-bold text-amber-600">Requires completion</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Clock size={20} /></div>
        </button>

        <button
          onClick={() => openTab('INVOICE_HISTORY', 'Sales History')}
          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly Revenue</p>
            <h3 className="text-xl font-black text-emerald-600">{formatCurrency(stats.totalMonth)}</h3>
            <p className="mt-1 text-[10px] font-bold text-emerald-600">This month from live billing</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><TrendingUp size={20} /></div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 shrink-0">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
              <History size={14} className="text-blue-600" />
              Recent Invoices (Live Feed)
            </h3>
            <button onClick={() => openTab('INVOICE_HISTORY', 'Sales History')} className="text-[10px] font-black text-blue-600 hover:underline">VIEW ALL</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                <tr>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posDashboardSummary.recentInvoices.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => handleViewInvoice(inv.id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 group"
                  >
                    <td className="p-4 font-mono text-xs font-bold text-blue-700 group-hover:underline">{inv.invoice_number}</td>
                    <td className="p-4 text-xs font-bold text-slate-700">{inv.customer_name}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4 text-right text-xs font-black">{formatCurrency(inv.amount)}</td>
                    <td className="p-4 text-center">
                      <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${inv.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => {
                            setEditingInvoice({
                              id: inv.id,
                              invoiceNumber: inv.invoice_number,
                              date: inv.invoice_date,
                              customerName: inv.customer_name,
                              patientName: inv.patient_name,
                              customerMobile: inv.customer_mobile,
                              doctorName: inv.doctor_name,
                              items: inv.items || []
                            });
                            openTab('EDIT_INVOICE', `Edit: ${inv.invoice_number}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="Edit Invoice"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingInvoice({
                              id: inv.id,
                              invoiceNumber: inv.invoice_number,
                              date: inv.invoice_date,
                              customerName: inv.customer_name,
                              patientName: inv.patient_name,
                              customerMobile: inv.customer_mobile,
                              doctorName: inv.doctor_name,
                              items: inv.items || []
                            });
                            openTab('VOUCHER_ENTRY_Return', `Return: ${inv.invoice_number}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-all"
                          title="Sales Return (Credit Note)"
                        >
                          <RefreshCcw size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posDashboardSummary.recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs font-bold text-slate-400">
                      No invoice records available from the database for this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-xl bg-[#1D3557] p-6 text-white shadow-xl flex-1 flex flex-col justify-center">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <ShoppingCart size={100} />
            </div>
            <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Quick Terminal</h4>
            <h2 className="mb-6 text-2xl font-black">Start New Billing</h2>
            <p className="mb-8 text-sm leading-relaxed text-blue-100/70">Fast-track retail counter sales with optimized search and batch selection.</p>
            <button
              onClick={() => setPosTerminalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-400"
            >
              <Plus size={18} /> Open POS Terminal
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <Database size={14} className="text-blue-600" />
              Linked Tables
            </h4>
            <div className="space-y-4 text-xs font-bold text-slate-600">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span>Revenue and totals</span>
                <span className="font-mono text-blue-700">sales_invoices</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span>Items & quantities</span>
                <span className="font-mono text-blue-700">sales_invoice_items</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span>Customer names</span>
                <span className="font-mono text-blue-700">parties</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const renderVoucherEntry = (type: any) => (
    <TallyVoucherEntry 
      initialType={type} 
      initialItems={type === 'Sales' ? cartItems : []}
      editingInvoice={activeTab === 'EDIT_INVOICE' || activeTab.startsWith('VOUCHER_ENTRY_Return') ? editingInvoice : null}
      onClose={() => {
        closeTab(activeTab);
        if (activeTab === 'EDIT_INVOICE' || activeTab.startsWith('VOUCHER_ENTRY_Return')) setEditingInvoice(null);
      }} 
      onSuccess={() => {
        if (activeTab === 'EDIT_INVOICE' || activeTab.startsWith('VOUCHER_ENTRY_Return')) setEditingInvoice(null);
        // Refresh invoices list after successful save
        const load = async () => {
          const [invoiceData] = await Promise.all([
            getAllInvoices(),
            loadPosDashboardSummary()
          ]);
          setSavedInvoices(invoiceData);
        };
        load();
      }}
    />
  );

  const handleSaveParty = async () => {
    if (!partyForm.name) return;
    setLoading(true);
    try {
      const partyData: any = {
        ...partyForm,
        id: isEditingParty && (partyForm as any).id ? (partyForm as any).id : `PARTY-${Date.now()}`
      };
      const success = await saveParty(partyData);
      if (success) {
        const updated = await getAllParties();
        setAvailableParties(updated);
        setShowPartyModal(false);
      }
    } catch (err) {
      console.error('Failed to save party:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.genericName || !productForm.manufacturer) return;
    setLoading(true);
    try {
      const productData: any = {
        ...productForm,
        id: isEditingProduct && (productForm as any).id ? (productForm as any).id : `PROD-${Date.now()}`
      };
      const success = await saveProduct(productData);
      if (success) {
        const updated = await getAllProducts();
        setAvailableProducts(updated);
        setShowProductModal(false);
        addNotification({
          type: 'success',
          title: isEditingProduct ? 'Product Updated' : 'Product Created',
          message: `Product "${productData.name}" saved successfully.`,
          priority: 'medium',
          module: 'Inventory',
          sourceTable: 'products',
          sourceLabel: 'Product Save'
        });
      }
    } catch (err: any) {
      console.error('Failed to save product:', err);
      addNotification({
        type: 'error',
        title: 'Save Product Failed',
        message: err.message || 'An error occurred.',
        priority: 'high',
        module: 'Inventory',
        sourceTable: 'products',
        sourceLabel: 'Product Save'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product Master SKU',
      message: 'Are you sure you want to delete this product? All linked batches will be permanently removed! This action is irreversible.',
      onConfirm: async () => {
        setLoading(true);
        try {
          const success = await deleteProduct(id);
          if (success) {
            const updated = await getAllProducts();
            setAvailableProducts(updated);
            addNotification({
              type: 'success',
              title: 'Product Deleted',
              message: 'Product deleted successfully from the master ledger.',
              priority: 'medium',
              module: 'Inventory',
              sourceTable: 'products',
              sourceLabel: 'Product Delete'
            });
          }
        } catch (err: any) {
          console.error('Failed to delete product:', err);
          addNotification({
            type: 'error',
            title: 'Delete Product Failed',
            message: err.message || 'An error occurred.',
            priority: 'high',
            module: 'Inventory',
            sourceTable: 'products',
            sourceLabel: 'Product Delete'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteInvoice = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Sales Invoice',
      message: 'Are you sure you want to delete this sales invoice? Linked item sales and batch stocks will be automatically restored/re-adjusted in the database! This action is irreversible.',
      onConfirm: async () => {
        setLoading(true);
        try {
          const success = await deleteInvoice(id);
          if (success) {
            setShowInvoicePreview(false);
            const updated = await getAllInvoices();
            setSavedInvoices(updated);
            await loadPosDashboardSummary();
            addNotification({
              type: 'success',
              title: 'Invoice Deleted',
              message: 'Invoice deleted successfully. Inventory batch stocks have been rolled back correctly.',
              priority: 'high',
              module: 'POS',
              sourceTable: 'sales_invoices',
              sourceLabel: 'Invoice Delete'
            });
          }
        } catch (err: any) {
          console.error('Failed to delete invoice:', err);
          addNotification({
            type: 'error',
            title: 'Delete Invoice Failed',
            message: err.message || 'An error occurred.',
            priority: 'high',
            module: 'POS',
            sourceTable: 'sales_invoices',
            sourceLabel: 'Invoice Delete'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const renderCustomerDatabase = () => (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
           <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Enterprise Customer Database</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Manage Debtors, Creditors & Distribution Partners</p>
           </div>
        </div>
        <div className="flex gap-3">
           <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                placeholder="Search by Name, Mobile or GSTIN..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
           </div>
           <button 
             onClick={() => {
                setIsEditingParty(false);
                setPartyForm({ name: '', type: 'Debtor', status: 'Active', current_balance: 0 });
                setShowPartyModal(true);
             }}
             className="px-4 py-2 bg-[#1D3557] text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:bg-blue-800 transition-all flex items-center gap-2"
           >
              <Plus size={14} /> Add New Party
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-4">Party Name / Contact</th>
                  <th className="p-4 text-center">Type</th>
                  <th className="p-4">GSTIN / Registration</th>
                  <th className="p-4 text-right">Current Balance</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic font-medium">
                {(() => {
                  const filtered = availableParties.filter(p => 
                    !partySearch || 
                    p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
                    p.mobile?.includes(partySearch) ||
                    (p.code || p.gstin || '').toLowerCase().includes(partySearch.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-400 italic font-black uppercase tracking-widest">
                           No matching party records found.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map(party => (
                    <tr key={party.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <p className="text-xs font-black text-slate-800 uppercase">{party.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{party.mobile || 'No Mobile'}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${party.type === 'Creditor' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {party.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-[10px] font-mono font-bold text-slate-600">{party.code || party.gstin || 'N/A'}</p>
                        <p className="text-[8px] text-emerald-600 font-black uppercase">Verified KYC</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className={`text-xs font-black ${(party.currentBalance || party.current_balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          ₹{Math.abs(party.currentBalance || party.current_balance || 0).toLocaleString()}
                          <span className="ml-1 text-[8px] opacity-60 uppercase">{(party.currentBalance || party.current_balance) < 0 ? 'Dr' : 'Cr'}</span>
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                           <button 
                             onClick={() => {
                                setIsEditingParty(true);
                                setPartyForm(party);
                                setShowPartyModal(true);
                             }}
                             className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" 
                             title="Edit Party"
                           >
                              <Edit3 size={14} />
                           </button>
                           <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Records">
                              <Trash2 size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
             <span>Total Records: {availableParties.length}</span>
             <span className="text-blue-600 italic">Database Linked: PostgreSQL [Production-Main]</span>
          </div>
      </div>

      {showPartyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
                 <h3 className="font-black text-sm uppercase tracking-widest">{isEditingParty ? 'Update Party Master' : 'Create New Party'}</h3>
                 <X size={18} className="cursor-pointer" onClick={() => setShowPartyModal(false)}/>
              </div>
              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Party Name</label>
                       <input 
                         type="text" 
                         value={partyForm.name}
                         onChange={e => setPartyForm({...partyForm, name: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold outline-none focus:border-blue-500"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                       <select 
                         value={partyForm.type}
                         onChange={e => setPartyForm({...partyForm, type: e.target.value as any})}
                         className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold outline-none"
                       >
                          <option value="Debtor">Debtor (Customer)</option>
                          <option value="Creditor">Creditor (Supplier)</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">Mobile Number</label>
                       <input 
                         type="text" 
                         value={partyForm.mobile}
                         onChange={e => setPartyForm({...partyForm, mobile: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">GSTIN</label>
                       <input 
                         type="text" 
                         value={partyForm.gstin}
                         onChange={e => setPartyForm({...partyForm, gstin: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase">Opening Balance</label>
                       <input 
                         type="number" 
                         value={partyForm.current_balance}
                         onChange={e => setPartyForm({...partyForm, current_balance: parseFloat(e.target.value)})}
                         className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-bold outline-none"
                       />
                    </div>
                 </div>
              </div>
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
                  <button onClick={() => setShowPartyModal(false)} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase hover:bg-slate-100 rounded">Cancel</button>
                  <button onClick={handleSaveParty} className="px-8 py-2 bg-emerald-600 text-white text-xs font-black uppercase rounded shadow-lg hover:bg-emerald-700">
                    {isEditingParty ? 'Update Master' : 'Save Ledger'}
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  const handlePrint = () => {
    if (selectedInvoice) {
      printPOSInvoice({
        ...selectedInvoice,
        items: selectedInvoice.items.map((item: any) => ({
          productName: item.product_name || item.productName || 'Product',
          quantity: item.quantity,
          rate: item.selling_rate || item.rate,
          totalAmount: item.total_amount || item.totalAmount || (item.quantity * (item.selling_rate || item.rate))
        }))
      });
    }
  };

  const handleExport = () => {
    if (selectedInvoice) {
      exportPOSInvoiceToExcel({
        ...selectedInvoice,
        items: selectedInvoice.items.map((item: any) => ({
          productName: item.product_name || item.productName || 'Product',
          quantity: item.quantity,
          rate: item.selling_rate || item.rate,
          totalAmount: item.total_amount || item.totalAmount || (item.quantity * (item.selling_rate || item.rate))
        }))
      });
    }
  };

  return (
    <EnterpriseLayout
      title="Strategic Point of Sale"
      subtitle="Enterprise Accounting & Billing Terminal"
      sidebarItems={sidebarItems}
      showSidebar={false}
      tabs={openTabs.map(t => ({
        ...t,
        isActive: activeTab === t.id,
        onClick: () => setActiveTab(t.id),
        onClose: () => closeTab(t.id)
      }))}
      topActions={topActions}
    >
      {activeTab === 'POS_DASHBOARD' && renderLiveDashboard()}
      {activeTab.startsWith('VOUCHER_ENTRY_') && renderVoucherEntry(activeTab.split('_').pop() as any)}
      {activeTab === 'NEW_INVOICE' && renderVoucherEntry('Sales')}
      {activeTab === 'EDIT_INVOICE' && renderVoucherEntry('Sales')}
      {activeTab === 'WHOLESALE_BILL' && renderVoucherEntry('Sales')}
      {activeTab === 'VOUCHER_TYPE_SETUP' && renderVoucherTypeSetup()}
      {activeTab === 'CUSTOMER_LIST' && renderCustomerDatabase()}
      {activeTab === 'PRODUCT_CATALOG' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-xs text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Package size={14} className="text-blue-600"/>
              Inventory Catalog
            </h3>
            <div className="flex gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog..." 
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button 
                onClick={() => {
                  setProductForm({
                    name: '',
                    genericName: '',
                    manufacturer: '',
                    packing: '',
                    uom: 'Strip',
                    hsn: '',
                    gst: 12,
                    minStockLevel: 50,
                    reorderLevel: 100,
                    therapeuticCategory: 'OTC',
                    totalStock: 0
                  });
                  setIsEditingProduct(false);
                  setShowProductModal(true);
                }}
                className="px-4 py-1.5 bg-[#1D3557] text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:bg-blue-800 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Add New SKU
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Generic</th>
                  <th className="p-4">Manufacturer</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = availableProducts.filter(prod => 
                    !catalogSearch || 
                    prod.name?.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                    prod.genericName?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    prod.manufacturer?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    prod.therapeuticCategory?.toLowerCase().includes(catalogSearch.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-20 text-center text-slate-400 italic font-black uppercase tracking-widest">
                          No matching product catalog records found.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map(prod => (
                    <React.Fragment key={prod.id}>
                      <tr className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4">
                          <p className="text-xs font-black text-slate-800 uppercase">{prod.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{prod.packing}</p>
                        </td>
                        <td className="p-4 text-xs text-slate-600">{prod.genericName}</td>
                        <td className="p-4 text-xs font-bold text-slate-500">{prod.manufacturer}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${prod.totalStock > 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {prod.totalStock} {prod.uom}
                          </span>
                        </td>
                        <td className="p-4">
                           <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase">{prod.therapeuticCategory}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Add to Bill">
                              <Plus size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                setProductForm(prod);
                                setIsEditingProduct(true);
                                setShowProductModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" 
                              title="Edit SKU"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" 
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Render batches if they exist */}
                      {prod.batches && prod.batches.map(batch => (
                        <tr key={batch.id} className="bg-slate-50/50 border-l-4 border-blue-200">
                          <td className="p-2 pl-8 text-[10px] font-bold text-slate-500">Batch: {batch.batchNumber}</td>
                          <td className="p-2 text-[10px] text-slate-400">Exp: {batch.expiryDate}</td>
                          <td className="p-2 text-[10px] text-slate-400">MRP: ₹{batch.mrp}</td>
                          <td className="p-2 text-center text-[10px] font-black text-blue-600">{batch.stock}</td>
                          <td className="p-2 text-[10px] font-bold text-slate-500">Rate: ₹{batch.sellingRate}</td>
                          <td className="p-2 text-center">
                            <button 
                              onClick={() => addBatchToCart(prod, batch)}
                              className="px-3 py-1 bg-[#1D3557] text-white text-[9px] font-black uppercase rounded hover:bg-blue-600 transition-colors"
                            >
                              SELECT
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'INVOICE_HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-xs text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <History size={14} className="text-blue-600"/>
              Complete Sales Register
            </h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-green-600" title="Export to Excel">
                <Download size={16} />
              </button>
              <button className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-indigo-600" title="Print Register">
                <Printer size={16} />
              </button>
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search Invoice No or Customer..." 
                  className="w-full pl-10 pr-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none"
                />
              </div>
              <input type="date" className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0">
              <tr>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Subtotal</th>
                <th className="p-4 text-right">GST</th>
                <th className="p-4 text-right">Net Amount</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedInvoices
                .filter(inv => 
                  !searchTerm || 
                  inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(inv => (
                <tr 
                  key={inv.id} 
                  onClick={() => handleViewInvoice(inv.id)}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <td className="p-4 font-mono text-xs font-bold text-blue-700 group-hover:underline">{inv.invoiceNumber}</td>
                  <td className="p-4 text-xs font-bold text-slate-700">{inv.customerName}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {formatDate(inv.date)}
                  </td>
                  <td className="p-4 text-xs font-bold text-right">{formatCurrency(inv.taxableValue)}</td>
                  <td className="p-4 text-xs font-bold text-right">{formatCurrency(inv.totalGst)}</td>
                  <td className="p-4 text-xs font-black text-right">{formatCurrency(inv.netAmount)}</td>
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-1.5">
                      <button 
                        onClick={() => {
                          handleViewInvoice(inv.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingInvoice({
                            id: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            date: inv.date,
                            customerName: inv.customerName,
                            patientName: inv.patientName,
                            customerMobile: inv.customerMobile,
                            doctorName: inv.doctorName,
                            items: inv.items || []
                          });
                          openTab('EDIT_INVOICE', `Edit: ${inv.invoiceNumber}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="Edit Invoice"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingInvoice({
                            id: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            date: inv.date,
                            customerName: inv.customerName,
                            patientName: inv.patientName,
                            customerMobile: inv.customerMobile,
                            doctorName: inv.doctorName,
                            items: inv.items || []
                          });
                          openTab('VOUCHER_ENTRY_Return', `Return: ${inv.invoiceNumber}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-all"
                        title="Sales Return (Credit Note)"
                      >
                        <RefreshCcw size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Other tabs would be implemented similarly */}
      {showInvoicePreview && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><FileText size={20} /></div>
                <div>
                  <h3 className="font-black text-lg">Invoice Preview</h3>
                  <p className="text-xs text-blue-200 font-bold tracking-widest uppercase">{selectedInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInvoicePreview(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-slate-50">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#1D3557] rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
                      <div>
                        <h2 className="text-xl font-black text-[#1D3557]">Metapharsic Enterprise Hub</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Pharma Distribution & Accounting</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-bold space-y-1">
                      <p>H-12, Industrial Area, Phase II</p>
                      <p>New Delhi, India - 110020</p>
                      <p>GSTIN: 07AAMCM4321A1Z9</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <h1 className="text-4xl font-black text-slate-200 uppercase tracking-tighter">Tax Invoice</h1>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 inline-block text-left">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Inv No:</span>
                        <span className="text-xs font-black text-blue-700">{selectedInvoice.invoiceNumber}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Date:</span>
                        <span className="text-xs font-black text-slate-800">{formatDate(selectedInvoice.date)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">{selectedInvoice.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Party Details */}
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-50 pb-1">Bill To</h4>
                    <h3 className="font-black text-slate-800">{selectedInvoice.customerName}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">N/A Location</p>
                    <p className="text-xs text-slate-400 font-bold mt-1 italic">GSTIN: {selectedInvoice.party_gstin || 'Unregistered'}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">Delivery</h4>
                    <p className="text-xs text-slate-500 font-bold">Counter Delivery</p>
                    <p className="text-xs text-slate-500 font-bold">Self-Pickup</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#1D3557] text-white text-[10px] font-black uppercase tracking-widest border-b border-[#1D3557]">
                      <tr>
                        <th className="p-3">Description of Goods</th>
                        <th className="p-3 w-32 border-l border-white/10 text-center">Batch</th>
                        <th className="p-3 w-20 border-l border-white/10 text-center">Qty</th>
                        <th className="p-3 w-24 border-l border-white/10 text-right">Rate</th>
                        <th className="p-3 w-32 border-l border-white/10 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <p className="text-xs font-black text-slate-800">{item.product_name || item.productName || 'Unknown Product'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.product_code || 'SKU-N/A'}</p>
                          </td>
                          <td className="p-3 text-center border-l border-slate-100">
                            <span className="font-mono text-xs font-bold text-blue-600">{item.batch_number || item.batchNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-center text-xs font-black text-slate-800 border-l border-slate-100">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-right text-xs font-bold border-l border-slate-100">
                            {formatCurrency(item.selling_rate || item.rate)}
                          </td>
                          <td className="p-3 text-right text-xs font-black border-l border-slate-100 text-[#1D3557]">
                            {formatCurrency(item.total_amount || item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div className="flex justify-end pt-6">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                      <span>Gross Amount</span>
                      <span>{formatCurrency(selectedInvoice.taxableValue || selectedInvoice.items?.reduce((s: number, i: any) => s + (i.total_amount || i.totalAmount || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                      <span>Total Tax (GST)</span>
                      <span className="text-blue-600">+ {formatCurrency(selectedInvoice.totalGst || (selectedInvoice.netAmount - (selectedInvoice.taxableValue || 0)))}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-[#1D3557] uppercase tracking-widest">Net Payable</span>
                      <span className="text-xl font-black text-[#1D3557]">{formatCurrency(selectedInvoice.netAmount)}</span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Amount in words</p>
                      <p className="text-[10px] font-black text-blue-800 uppercase leading-tight">PostgreSQL Restored Data Block #001</p>
                    </div>
                  </div>
                </div>

                {/* Footer Watermark */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              </div>
            </div>

            <div className="bg-[#D4E2D4] p-4 flex justify-between items-center border-t border-slate-300">
              <div className="flex gap-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Generated by {selectedInvoice.created_by || 'System'}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setEditingInvoice(selectedInvoice);
                    setShowInvoicePreview(false);
                    openTab('EDIT_INVOICE', `Edit: ${selectedInvoice.invoiceNumber || selectedInvoice.invoice_number}`);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 rounded shadow-sm flex items-center gap-2"
                >
                  <Edit3 size={16} /> Edit Invoice
                </button>
                <button 
                  onClick={() => {
                    setEditingInvoice(selectedInvoice);
                    setShowInvoicePreview(false);
                    openTab('VOUCHER_ENTRY_Return', `Return: ${selectedInvoice.invoiceNumber || selectedInvoice.invoice_number}`);
                  }}
                  className="px-6 py-2 bg-teal-600 text-white text-xs font-black uppercase hover:bg-teal-700 rounded shadow-sm flex items-center gap-2"
                >
                  <RefreshCcw size={16} /> Return Invoice
                </button>
                <button 
                  onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                  className="px-6 py-2 bg-red-600 text-white text-xs font-black uppercase hover:bg-red-700 rounded shadow-sm flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete Invoice
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-6 py-2 bg-white border border-slate-400 text-slate-700 text-xs font-black uppercase hover:bg-slate-50 rounded shadow-sm flex items-center gap-2"
                >
                  <Printer size={16} /> Print Document
                </button>
                <button 
                  onClick={handleExport}
                  className="px-6 py-2 bg-white border border-slate-400 text-slate-700 text-xs font-black uppercase hover:bg-slate-50 rounded shadow-sm flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} /> Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showWorkflowGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
                 <h3 className="font-black text-sm uppercase tracking-widest">ERP Workflow Guide: Voucher Setup</h3>
                 <X size={18} className="cursor-pointer" onClick={() => setShowWorkflowGuide(false)}/>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black flex-shrink-0">1</div>
                    <div>
                       <h4 className="text-sm font-black text-slate-800 uppercase">Define Voucher Master</h4>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">Create specialized voucher types (e.g., 'Retail POS', 'Institutional Sale') under the Setup menu. Configure numbering methods and printing preferences.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black flex-shrink-0">2</div>
                    <div>
                       <h4 className="text-sm font-black text-slate-800 uppercase">Database Synchronization</h4>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">Click 'Accept' (Ctrl+A). The voucher type is instantly pushed to the PostgreSQL central database, making it available across all terminals.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black flex-shrink-0">3</div>
                    <div>
                       <h4 className="text-sm font-black text-slate-800 uppercase">Operational Entry</h4>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">Navigate to Voucher Entry. Use function keys (F4-F9) to select your custom voucher types. The system automatically pulls the specific configuration defined in Step 1.</p>
                    </div>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4 mt-4">
                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Check size={20}/></div>
                    <p className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed">Pro Tip: Use 'LOAD TEST CASE' in the setup sidebar to instantly populate a pharmacy-optimized POS voucher configuration for testing.</p>
                 </div>
              </div>
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                  <button onClick={() => setShowWorkflowGuide(false)} className="px-8 py-2 bg-[#1D3557] text-white text-xs font-black uppercase rounded shadow-lg hover:bg-blue-800 transition-all">Got it, Proceed</button>
              </div>
           </div>
        </div>
      )}
      {showProductModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-[#1D3557] p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Package size={20} /></div>
                <div>
                  <h3 className="font-black text-base">{isEditingProduct ? 'Edit Product Master' : 'Add New Product SKU'}</h3>
                  <p className="text-[10px] text-blue-200 font-bold tracking-widest uppercase">Inventory Ledger Definition</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Product Name *</label>
                  <input 
                    type="text" 
                    value={productForm.name || ''} 
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Generic Formula *</label>
                  <input 
                    type="text" 
                    value={productForm.genericName || ''} 
                    onChange={e => setProductForm({ ...productForm, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol IP"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Manufacturer *</label>
                  <input 
                    type="text" 
                    value={productForm.manufacturer || ''} 
                    onChange={e => setProductForm({ ...productForm, manufacturer: e.target.value })}
                    placeholder="e.g. Cipla Ltd"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Therapeutic Category</label>
                  <select 
                    value={productForm.therapeuticCategory || 'OTC'} 
                    onChange={e => setProductForm({ ...productForm, therapeuticCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="OTC">OTC (Over the Counter)</option>
                    <option value="Schedule H">Schedule H (Prescription)</option>
                    <option value="Schedule H1">Schedule H1 (Controlled)</option>
                    <option value="Analgesic">Analgesic (Pain Relief)</option>
                    <option value="Antibiotic">Antibiotic</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Packing Description</label>
                  <input 
                    type="text" 
                    value={productForm.packing || ''} 
                    onChange={e => setProductForm({ ...productForm, packing: e.target.value })}
                    placeholder="e.g. 10x15 Tablets"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Unit of Measure (UOM)</label>
                  <select 
                    value={productForm.uom || 'Strip'} 
                    onChange={e => setProductForm({ ...productForm, uom: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Box">Box</option>
                    <option value="Vial">Vial</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Ampoule">Ampoule</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">HSN Code</label>
                  <input 
                    type="text" 
                    value={productForm.hsn || ''} 
                    onChange={e => setProductForm({ ...productForm, hsn: e.target.value })}
                    placeholder="e.g. 300490"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">GST Rate (%)</label>
                  <select 
                    value={productForm.gst || 12} 
                    onChange={e => setProductForm({ ...productForm, gst: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Min Stock Level</label>
                  <input 
                    type="number" 
                    value={productForm.minStockLevel || 0} 
                    onChange={e => setProductForm({ ...productForm, minStockLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Reorder Level</label>
                  <input 
                    type="number" 
                    value={productForm.reorderLevel || 0} 
                    onChange={e => setProductForm({ ...productForm, reorderLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowProductModal(false)}
                className="px-6 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-black uppercase rounded shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProduct}
                disabled={!productForm.name || !productForm.genericName || !productForm.manufacturer}
                className="px-8 py-2 bg-[#1D3557] text-white text-xs font-black uppercase rounded shadow-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {isEditingProduct ? 'Update SKU' : 'Create SKU'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wider">Are you sure?</h3>
              </div>
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="text-white hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 space-y-4">
              <p className="text-xs font-bold text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-black uppercase rounded shadow-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-6 py-2 bg-red-600 text-white text-xs font-black uppercase rounded shadow-lg hover:bg-red-700 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global POSTerminalModal is handled in App.tsx */}
    </EnterpriseLayout>
  );
};

export default StrategicPOS;
