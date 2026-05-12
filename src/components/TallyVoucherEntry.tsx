import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
 Plus, Printer, Save, X, Search, ChevronRight, 
 ArrowRight, Calculator, Clock, HelpCircle, AlertCircle, Trash2, Maximize2, Minimize2, PanelRightClose, Pause, Paperclip, Calendar, Minus,
 LayoutGrid, ChevronLeft, UserCircle, History, Package, DollarSign, Wallet, ShoppingCart, ArrowUpRight, ArrowDownLeft, FileText, RefreshCcw, ShoppingBag, Settings as SettingsIcon, Menu, Activity, Dna, Heart, Stethoscope, User, Users, MapPin, Phone, Hash, Pill, Beaker, FileText as FileTextIcon, ChevronDown, ChevronUp, Mail, MessageSquare, Share2
} from 'lucide-react';
import { useDataFetch } from '../hooks/useDataFetch';
import { useCompany } from '../context/CompanyContext';
import { apiClient } from '../services/apiClient';
import { saveInvoice, savePurchase } from '../services/databaseService';
import { printPOSInvoice } from '../utils/accountingExport';
import { numberToWords } from '../utils/numberToWords';
import { useAppStore } from '../store/useAppStore';
import type { Purchase, SalesInvoice, SalesInvoiceItem } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';

interface VoucherEntryProps {
 initialType?: 'Sales' | 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Purchase' | 'Return';
 onClose: () => void;
 onSuccess?: () => void;
 initialItems?: any[];
 editingInvoice?: any;
}

const ClockDisplay: React.FC = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono font-black text-primary text-sm tracking-tighter">{time}</span>;
};

const TallyVoucherEntry: React.FC<VoucherEntryProps> = ({ initialType = 'Sales', onClose, onSuccess, initialItems, editingInvoice }) => {
 const { company } = useCompany();
  const { posState, setPosState } = useAppStore();
 const [voucherType, setVoucherType] = useState(initialType);
 const [invoiceNo, setInvoiceNo] = useState('1');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [partyName, setPartyName] = useState('Counter Customer');
 const [patientName, setPatientName] = useState('');
 const [patientAddress, setPatientAddress] = useState('');
 const [customerMobile, setCustomerMobile] = useState('');
 const [patientAge, setPatientAge] = useState('');
 const [patientDob, setPatientDob] = useState('');
 const [patientGender, setPatientGender] = useState('Male');
 const [patientDetailsCollapsed, setPatientDetailsCollapsed] = useState(false);
 const [abhaNo, setAbhaNo] = useState('');
 const [abhaAddress, setAbhaAddress] = useState('');
 const [doctorName, setDoctorName] = useState('');
 const [salesLedger, setSalesLedger] = useState('Sales');
 
  // Side Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add new state variables
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [validTill, setValidTill] = useState('');
  const [scheduleType, setScheduleType] = useState('None');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState([{ method: 'Cash', amount: '' }]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Stats summary (mock or from API)
  const [posStats, setPosStats] = useState({
    todaySales: 0,
    pendingPayments: 0,
    totalTransactions: 0,
    heldBillsCount: 0,
    shiftStatus: 'Open'
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<any>(null);
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [returnInvoiceData, setReturnInvoiceData] = useState<any>(null);
  const [showShortcutsLegend, setShowShortcutsLegend] = useState(false);

  const { data: dashboardData } = useDataFetch('/api/pos/dashboard-summary');
  const { data: invoicesData } = useDataFetch('/api/pos/invoices');
  
  const patientHistory = useMemo(() => {
    if (!patientName) return [];
    const list = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.data || []);
    return list
      .filter((inv: any) => {
        const name = String(inv.patient_name || inv.customer_name || '').toLowerCase();
        return name === patientName.toLowerCase();
      })
      .slice(0, 5);
  }, [invoicesData, patientName]);

  useEffect(() => {
    if (dashboardData && !Array.isArray(dashboardData)) {
      setPosStats({
        todaySales: dashboardData.todayRevenue || 0,
        pendingPayments: dashboardData.pendingDrafts || 0,
        totalTransactions: dashboardData.invoicesGenerated || 0,
        heldBillsCount: heldBills.length,
        shiftStatus: 'Open'
      });
    }
  }, [dashboardData, heldBills]);
  
  const [items, setItems] = useState<any[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map(item => ({
        name: item.productName || item.name || '',
        quantity: String(item.quantity || ''),
        rate: String(item.rate || item.sellingRate || ''),
        amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate || item.sellingRate) || 0),
        product_id: item.productId || item.id,
        batch_id: item.batchId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        mrp: item.mrp,
        stockAvailable: item.stockAvailable || 0,
        gstPercent: item.gstPercent || 0,
        discPercent: item.discPercent || 0,
        hsn: item.hsn || ''
      }));
    }
    return [{ name: '', quantity: '', rate: '', amount: 0, stockAvailable: 0, batchNumber: '', expiryDate: '', mrp: 0, gstPercent: 0, discPercent: 0 }];
  });

  const handleHoldBill = () => {
    if (items.some((i: any) => i.name !== '')) {
      setHeldBills((prev: any) => [...prev, { invoiceNo: invoiceNo, partyName: partyName, items: items }]);
      setItems([{ name: '', quantity: '', rate: '', discPercent: '', amount: 0, stockAvailable: 0, batchNumber: '', expiryDate: '', hsn: '', product_id: '', batch_id: '' }]);
      setPartyName('Counter Customer');
      setScanMessage('Bill #'+invoiceNo+' placed on hold');
      setTimeout(() => setScanMessage(''), 3000);
    }
  };

  const handleRestoreBill = (index: number) => {
    const bill = heldBills[index];
    if (bill) {
      setItems(bill.items);
      setPartyName(bill.partyName);
      setHeldBills((prev: any) => prev.filter((_: any, i: number) => i !== index));
    }
    setShowHeldBills(false);
  };

  const getExpiryStatus = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return { label: 'Good', color: '#1D9E75' };
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { label: 'Good', color: '#1D9E75' };
      const now = new Date();
      const months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
      if (months < 0) return { label: 'Expired', color: '#E24B4A' };
      if (months < 3) return { label: 'Near Exp.', color: '#E24B4A' };
      if (months < 6) return { label: 'Exp. Soon', color: '#EF9F27' };
    } catch (e) {
      return { label: 'Good', color: '#1D9E75' };
    }
    return { label: 'Good', color: '#1D9E75' };
  };

  const totals = useMemo(() => {
    let itemCount = 0;
    let totalQty = 0;
    let subTotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    const gstSlabs: Record<string, number> = { '5%': 0, '12%': 0, '18%': 0, '28%': 0, '0%': 0 };

    items.forEach(i => {
      if (i.name && parseFloat(i.quantity) > 0) {
        itemCount++;
        totalQty += parseFloat(i.quantity) || 0;
        
        const qty = parseFloat(i.quantity) || 0;
        const rate = parseFloat(i.rate) || 0;
        const mrp = parseFloat(i.mrp) || 0;
        const discP = parseFloat(i.discPercent) || 0;
        const gstP = parseFloat(i.gstPercent) || 0;

        const lineAmount = qty * rate;
        subTotal += lineAmount;
        
        const lineDiscount = qty * (mrp - rate);
        totalDiscount += lineDiscount > 0 ? lineDiscount : 0;

        if (gstP > 0) {
          const lineGst = lineAmount - (lineAmount / (1 + gstP / 100));
          totalGst += lineGst;
          const slabKey = `${gstP}%`;
          gstSlabs[slabKey] = (gstSlabs[slabKey] || 0) + lineGst;
        }
      }
    });
    
    return { itemCount, totalQty, subTotal, totalDiscount, totalGst, gstSlabs, totalPayable: subTotal };
  }, [items]);

  
 const [narration, setNarration] = useState('');
 const [loading, setLoading] = useState(false);
 const [scanValue, setScanValue] = useState('');
 
 const [showDropdown, setShowDropdown] = useState<{ type: 'party' | 'item', index?: number } | null>(null);
 const [scanMessage, setScanMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
 const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(0);
 const dropdownListRef = useRef<HTMLDivElement>(null);
 const scanInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (editingInvoice) {
 setVoucherType(initialType === 'Return' ? 'Return' : 'Sales');
 setInvoiceNo(editingInvoice.invoiceNumber || editingInvoice.invoice_no || '1');
 setDate(editingInvoice.date ? new Date(editingInvoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
 setPartyName(editingInvoice.customer_name || editingInvoice.party_name || 'Counter Customer');
 setPatientName(editingInvoice.patient_name || '');
 setCustomerMobile(editingInvoice.customer_mobile || '');
 setDoctorName(editingInvoice.doctor_name || '');
 
 const invItems = editingInvoice.items || [];
 if (invItems.length > 0) {
 setItems(
 invItems.map((item: any) => ({
 name: item.product_name || item.name || '',
 quantity: String(item.quantity || ''),
 rate: String(item.rate || item.selling_rate || ''),
 amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate || item.selling_rate) || 0),
 product_id: item.product_id || item.productId,
 batch_id: item.batch_id || item.batchId,
 batchNumber: item.batch_number || item.batchNumber,
 expiry_date: item.expiry_date || item.expiryDate,
 expiryDate: item.expiry_date || item.expiryDate,
 mrp: item.mrp || item.rate || 0,
 gstPercent: item.gst_percent || item.gstPercent || 0,
 discPercent: item.discount_percent || item.discPercent || 0,
 stockAvailable: item.current_stock || 0
 })).concat({ name: '', quantity: '', rate: '', amount: 0, stockAvailable: 0, mrp: 0, gstPercent: 0, discPercent: 0 })
 );
 }
 }
 }, [editingInvoice]);

 // Custom Confirmation & Alert Dialog State
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

 const [alertDialog, setAlertDialog] = useState<{
 isOpen: boolean;
 title: string;
 message: string;
 }>({
 isOpen: false,
 title: '',
 message: ''
 });

 // Search/Dropdown data
 const { data: productsData, loading: productsLoading } = useDataFetch('/api/pos/products');
 const { data: partiesData, loading: partiesLoading } = useDataFetch('/api/pos/parties');
 const { data: dbVoucherTypes } = useDataFetch('/api/pos/voucher-types');
 
 const [selectedParty, setSelectedParty] = useState<any>(null);

 // Dynamic voucher type mapping
 const activeVoucherTypes = useMemo(() => {
 const defaults = [
 { key: 'F4', label: 'Contra', type: 'Contra', icon: <RefreshCcw size={18}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
 { key: 'F5', label: 'Payment', type: 'Payment', icon: <ArrowUpRight size={18}/>, color: 'text-amber-600', bg: 'bg-amber-50' },
 { key: 'F6', label: 'Receipt', type: 'Receipt', icon: <ArrowDownLeft size={18}/>, color: 'text-indigo-600', bg: 'bg-indigo-50' },
 { key: 'F7', label: 'Journal', type: 'Journal', icon: <FileText size={18}/>, color: 'text-purple-600', bg: 'bg-purple-50' },
 { key: 'F8', label: 'Sales', type: 'Sales', icon: <ShoppingCart size={18}/>, color: 'text-accent', bg: 'bg-highlight' },
 { key: 'F9', label: 'Purchase', type: 'Purchase', icon: <ShoppingBag size={18}/>, color: 'text-orange-600', bg: 'bg-orange-50' },
 { key: 'F10', label: 'Returns', type: 'Return', icon: <RefreshCcw size={18}/>, color: 'text-rose-600', bg: 'bg-rose-50' },
 ];

 const vtList = Array.isArray(dbVoucherTypes) ? dbVoucherTypes : (dbVoucherTypes?.data || []);
 if (!vtList || vtList.length === 0) return defaults;

 return defaults.map(def => {
 const custom = vtList.find((vt: any) => vt.type_of_voucher === def.type || vt.typeOfVoucher === def.type);
 return custom ? { ...def, label: custom.name, realId: custom.id } : def;
 });
 }, [dbVoucherTypes]);

 // Handle Keyboard Shortcuts
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (['F2', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(e.key)) {
 e.preventDefault();
 if (e.key === 'F2') {
 const dateEl = document.getElementById('voucher-date');
 dateEl?.focus();
 return;
 }
 const found = activeVoucherTypes.find(v => v.key === e.key);
 if (found) setVoucherType(found.type as any);
 }
 if (e.ctrlKey && e.key === 'a') {
 e.preventDefault();
 handleSave(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [voucherType, items, partyName, activeVoucherTypes]);

 // Auto-focus scanner
 useEffect(() => {
 if (['Sales', 'Purchase'].includes(voucherType)) {
 setTimeout(() => scanInputRef.current?.focus(), 100);
 }
 }, [voucherType]);

 const filteredParties = useMemo(() => {
 if (!showDropdown || showDropdown.type !== 'party') return [];
 const list = Array.isArray(partiesData) ? partiesData : (partiesData?.data || []);
 const query = searchQuery.toLowerCase().trim();
 
 return list.filter((p: any) => 
 String(p.name || '').toLowerCase().includes(query) ||
 String(p.mobile || '').includes(query)
 ).sort((a: any, b: any) => {
 const aName = String(a.name || '').toLowerCase();
 const bName = String(b.name || '').toLowerCase();
 if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
 if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
 return 0;
 });
 }, [showDropdown, partiesData, searchQuery]);

 const filteredItems = useMemo(() => {
 if (!showDropdown || showDropdown.type !== 'item') return [];
 const getSafeList = (d: any) => {
 if (Array.isArray(d)) return d;
 if (d && Array.isArray(d.data)) return d.data;
 return [];
 };
 const isInventoryVoucher = ['Sales', 'Purchase', 'Return'].includes(voucherType);
 const list = isInventoryVoucher ? (Array.isArray(productsData) ? productsData : (productsData?.data || [])) : getSafeList(partiesData);
 const query = searchQuery.toLowerCase().trim();
    let flatList: any[] = [];
    
    if (isInventoryVoucher) {
      list.forEach((product: any) => {
        const productCode = String(product.code || product.product_code || product.id || '').toLowerCase();
        const matchesQuery = String(product.name || '').toLowerCase().includes(query)
          || productCode.includes(query)
          || String(product.hsn || '').toLowerCase().includes(query)
          || String(product.genericName || product.generic_name || '').toLowerCase().includes(query);
        
        if (matchesQuery) {
          const batches = product.batches || [];
          if (batches.length === 0) {
            flatList.push({ ...product, _type: 'product_no_stock' });
          } else {
            batches.forEach((batch: any) => {
              flatList.push({ ...product, _type: 'batch', _batch: batch });
            });
          }
        }
      });
    } else {
      flatList = list.filter((p: any) => 
        String(p.name || '').toLowerCase().includes(query) ||
        String(p.account_code || p.hsn || '').toLowerCase().includes(query)
      );
    }
 
    return flatList.sort((a: any, b: any) => {
      const aName = String(a.name || '').toLowerCase();
      const bName = String(b.name || '').toLowerCase();
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
      return 0;
    });
 }, [showDropdown, productsData, partiesData, searchQuery, voucherType]);

 function getBatchNo(batch: any) {
 return String(batch?.batch_no || batch?.batch_number || batch?.batchNumber || '');
 }

 function getProductCode(product: any) {
 return String(product?.code || product?.product_code || product?.sku || '');
 }

 function getSellingRate(product: any, batch?: any) {
 return Number(batch?.selling_rate || batch?.sellingRate || product?.selling_rate || product?.sellingRate || batch?.mrp || product?.mrp || 0);
 }

 function getPurchaseRate(product: any, batch?: any) {
 return Number(batch?.purchase_rate || batch?.purchaseRate || product?.purchase_rate || product?.purchaseRate || 0);
 }

 const applyProductToRow = (index: number, product: any, batch?: any) => {
 const rate = voucherType === 'Purchase' ? getPurchaseRate(product, batch) : getSellingRate(product, batch);
 const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      name: product.name,
      product_id: product.id,
      productCode: getProductCode(product),
      genericName: product.generic_name || product.genericName || '',
      hsn: product.hsn || product.hsnCode || '',
      batch_id: batch?.id || '',
      batchNumber: getBatchNo(batch),
      expiryDate: batch?.expiry_date || batch?.expiryDate || '',
      mrp: Number(batch?.mrp || product.mrp || rate || 0),
      purchaseRate: getPurchaseRate(product, batch),
      rate: String(rate || ''),
      rack: product.rack || '',
      manufacturer: product.manufacturer || '',
      scheduleType: product.scheduleType || '',
      gstPercent: product.gst || product.gst_percent || 0,
      discPercent: '0.00',
      stockAvailable: batch?.stock || batch?.quantity || product.totalStock || product.current_stock || 0,
      quantity: newItems[index].quantity || '1'
    };
    const q = parseFloat(newItems[index].quantity) || 1;
    const r = parseFloat(newItems[index].rate) || 0;
    newItems[index].amount = q * r;
    
    if (index === newItems.length - 1) {
      newItems.push({ name: '', quantity: '', rate: '', amount: 0, stockAvailable: 0, mrp: 0, gstPercent: 0, discPercent: 0 });
    }
    setItems(newItems);
 };

 const handleScanSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const rawCode = scanValue.trim();
 if (!rawCode) return;
 const code = rawCode.toLowerCase();
 const products = Array.isArray(productsData) ? productsData : (productsData?.data || []);
 const matches = products.flatMap((product: any) => {
 const batches = product.batches?.length ? product.batches : [undefined];
 return batches
 .filter((batch: any) => {
 const productCode = getProductCode(product).toLowerCase();
 const batchNo = getBatchNo(batch).toLowerCase();
 return productCode === code || batchNo === code || product.name?.toLowerCase() === code;
 })
 .map((batch: any) => ({ product, batch }));
 });

 if (matches.length === 0) {
 setScanMessage(`No product found for ${rawCode}`);
 setTimeout(() => setScanMessage(''), 3000);
 return;
 }

 const targetIndex = items.findIndex(i => !i.name) >= 0 ? items.findIndex(i => !i.name) : items.length - 1;
 applyProductToRow(targetIndex, matches[0].product, matches[0].batch);
 setScanValue('');
 };

 const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    const qty = parseFloat(newItems[index].quantity) || 0;
    const mrp = parseFloat(newItems[index].mrp) || 0;
    const discP = parseFloat(newItems[index].discPercent) || 0;
    let rate = parseFloat(newItems[index].rate) || 0;

    if (field === 'discPercent' || field === 'mrp') {
      rate = mrp * (1 - discP / 100);
      newItems[index].rate = String(rate.toFixed(2));
    } else if (field === 'rate') {
      rate = parseFloat(value) || 0;
      if (mrp > 0) {
        newItems[index].discPercent = String(((1 - rate / mrp) * 100).toFixed(2));
      }
    }

    newItems[index].amount = qty * rate;
    
    if (index === items.length - 1 && value !== '' && field === 'name') {
      newItems.push({ name: '', quantity: '', rate: '', amount: 0, stockAvailable: 0, mrp: 0, gstPercent: 0, discPercent: 0 });
    }
    setItems(newItems);
 };

 const addItem = () => {
 setItems(prev => [...prev, { name: '', quantity: '', rate: '', amount: 0, stockAvailable: 0 }]);
 };

 const calculateTotal = () => {
 return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
 };

 const handleSave = async (print: boolean = false) => {
 try {
 const total = calculateTotal();
 const filledItems = items.filter(i => i.name && parseFloat(i.quantity) > 0);
 if (total === 0 || filledItems.length === 0) return;
 setLoading(true);
 
 const isSalesOrPurchase = ['Sales', 'Purchase', 'Return'].includes(voucherType);
 let response;

 if (isSalesOrPurchase) {
      const generatedInvoiceNo = editingInvoice ? (editingInvoice.invoice_number || invoiceNo) : `${voucherType.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const payload = {
        invoice_no: generatedInvoiceNo,
        invoice_number: generatedInvoiceNo,
        invoice_date: date,
        date: date,
        party_id: selectedParty?.id || null,
        party_name: partyName,
        customer_name: partyName,
        patient_name: patientName,
        customer_mobile: customerMobile,
        doctor_name: doctorName,
        prescription_no: prescriptionNo,
        payment_mode: paymentModes[0]?.method || 'Cash',
        sub_total: totals.subTotal,
        taxable_value: totals.subTotal - totals.totalGst,
        total_taxable: totals.subTotal - totals.totalGst,
        total_gst: totals.totalGst,
        total_discount: totals.totalDiscount,
        round_off: Math.round(totals.totalPayable) - totals.totalPayable,
        net_amount: totals.totalPayable,
        net_payable: totals.totalPayable,
        items: filledItems.map(i => ({
          product_id: i.product_id,
          product_name: i.name,
          batch_id: i.batch_id,
          batch_number: i.batchNumber,
          quantity: parseFloat(i.quantity),
          rate: parseFloat(i.rate),
          mrp: parseFloat(i.mrp || i.rate),
          taxable_value: i.amount / (1 + (parseFloat(i.gstPercent) || 0) / 100),
          gst_percent: parseFloat(i.gstPercent) || 0,
          total_amount: i.amount
        })),
        payments: paymentModes.map(m => ({ method: m.method, amount: m.amount }))
      };

      if (voucherType === 'Return') response = await apiClient.post('/api/pos/returns', payload);
      else if (editingInvoice) response = await apiClient.put(`/api/pos/invoices/${editingInvoice.id}`, payload);
      else response = await apiClient.post('/api/pos/invoices', payload);

      if (response && response.success) {
        setLastSavedInvoice(payload);
        if (print) {
          printPOSInvoice(payload, company);
        } else {
          setShowShareModal(true);
        }
      } else {
        throw new Error(response?.error || 'Server responded with failure');
      }
 } else {
    response = await apiClient.post('/api/accounting/journal-vouchers', {
      voucherType,
      date,
      totalAmount: total,
      narration
    });
    if (!response || !response.success) throw new Error(response?.error || 'Failed to save voucher');
 }
 
 if (response && response.success) {
 if (onSuccess) onSuccess();
 if (!isSalesOrPurchase) onClose();
 }
 } catch (err: any) {
 console.error('POS Save Error:', err);
 setAlertDialog({ isOpen: true, title: 'Save Failed', message: err.message || 'Could not save transaction.' });
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = () => {
 setConfirmDialog({
 isOpen: true,
 title: 'Delete Voucher',
 message: 'Are you sure you want to delete this voucher? This action is irreversible.',
 onConfirm: () => {
 setAlertDialog({
 isOpen: true,
 title: 'Deletion Successful',
 message: 'Deletion successful (Simulated for New Vouchers).'
 });
 setTimeout(() => onClose(), 1500);
 }
 });
 };

  // Helper Components
  const HeaderControls = () => (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setPosState('full')} 
        disabled={posState === 'full'}
        title="Expand to Fullscreen"
        className={`h-10 px-3 rounded-xl flex items-center gap-2 border transition-all text-[11px] font-black tracking-widest ${posState === 'full' ? 'bg-page border-border text-slate-300' : 'bg-white border-border text-secondary hover:text-primary hover:bg-page shadow-sm'}`}
      >
        <Maximize2 size={14} /> {posState !== 'side' && 'EXPAND'}
      </button>
      <button 
        onClick={() => setPosState('side')} 
        disabled={posState === 'side'}
        title="Snap to Side Panel"
        className={`h-10 px-3 rounded-xl flex items-center gap-2 border transition-all text-[11px] font-black tracking-widest ${posState === 'side' ? 'bg-page border-border text-slate-300' : 'bg-white border-border text-secondary hover:text-primary hover:bg-page shadow-sm'}`}
      >
        <PanelRightClose size={14} /> {posState !== 'side' && 'SIDE'}
      </button>
      <button 
        onClick={() => setPosState('mini')} 
        title="Minimize to Corner"
        className="h-10 px-3 rounded-xl flex items-center gap-2 border border-border bg-white text-secondary text-[11px] font-black tracking-widest hover:text-primary hover:bg-page transition-all shadow-sm"
      >
        <Minimize2 size={14} /> {posState !== 'side' && 'MINIMISE'}
      </button>
    </div>
  );

  const renderDrawer = () => (
    <>
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[101] transition-transform duration-300 ease-out border-r border-border ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border flex justify-between items-center bg-page/50">
            <div>
              <h2 className="text-lg font-black text-primary tracking-tight">TERMINAL MODES</h2>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Select Operation</p>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-page rounded-xl transition-colors text-secondary hover:text-primary">
              <ChevronLeft size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeVoucherTypes.map((mode: any) => (
              <button
                key={mode.key}
                onClick={() => {
                  setVoucherType(mode.type as any);
                  setDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${voucherType === mode.type ? 'bg-white border-accent shadow-sm ring-1 ring-accent/20' : 'bg-transparent border-transparent hover:bg-page hover:border-border'}`}
              >
                <div className={`p-2.5 rounded-xl ${mode.bg || 'bg-page'} ${mode.color || 'text-primary'}`}>
                  {mode.icon || <FileText size={18}/>}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black ${voucherType === mode.type ? 'text-primary' : 'text-slate-600'}`}>{mode.label}</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{mode.key}</p>
                </div>
                {voucherType === mode.type && <div className="ml-auto w-2 h-2 rounded-full bg-accent animate-pulse" />}
              </button>
            ))}
          </div>
          
          <div className="p-6 bg-page/30 border-t border-border mt-auto">
            <div className="flex items-center gap-3 text-secondary">
              <UserCircle size={20} />
              <div>
                <p className="text-xs font-black text-primary uppercase">Operator Session</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Active • v4.2.1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderDropdown = (type: 'party' | 'item', index?: number) => {
    if (!showDropdown || showDropdown.type !== type) return null;
    if (type === 'item' && showDropdown.index !== index) return null;
    const isLoading = type === 'party' ? partiesLoading : productsLoading;
    const filtered = type === 'party' ? filteredParties : filteredItems;

    return (
      <div className="absolute left-0 top-full mt-2 w-[520px] bg-white border border-border shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-[100] max-h-80 animate-in fade-in zoom-in-95 duration-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-page/50 px-4 py-3 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {type === 'party' ? <UserCircle size={16} className="text-accent" /> : <Package size={16} className="text-accent" />}
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{type === 'party' ? 'Select Ledger / Customer' : 'Select Stock Product'}</span>
          </div>
          {isLoading && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={dropdownListRef}>
          {filtered.length === 0 && !isLoading && (
            <div className="p-12 text-center text-slate-400">
               <Search size={32} className="mx-auto mb-2 opacity-20" />
               <p className="text-xs font-black text-primary uppercase">No matching records</p>
            </div>
          )}
          {filtered.map((row: any, idx: number) => {
            const isSelected = idx === dropdownSelectedIndex;
            return (
              <div key={idx} onMouseDown={(e) => {
                e.preventDefault();
                if (type === 'party') { 
                  setPartyName(row.name); 
                  setSelectedParty(row);
                  if (row.mobile) setCustomerMobile(row.mobile);
                  setShowDropdown(null); 
                }
                else { applyProductToRow(index!, row, row._batch); setShowDropdown(null); }
              }} onMouseEnter={() => setDropdownSelectedIndex(idx)} className={`px-4 py-3 border-b border-border/50 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'bg-highlight border-accent/30' : 'hover:bg-page'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-accent text-white' : 'bg-page text-secondary'}`}>
                    {type === 'party' ? <User size={14} /> : <Beaker size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{row.name || row.account_name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">{row.type || row.category || (row._batch ? 'BATCH' : 'ITEM')}</span>
                      {row.mobile && <span className="text-[9px] font-black text-secondary/60"> • {row.mobile}</span>}
                    </div>
                  </div>
                </div>
                {(type === 'party' && row.currentBalance !== undefined) && (
                  <div className="text-right">
                    <p className={`text-xs font-black ${row.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{Math.abs(row.currentBalance).toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-secondary uppercase">{row.currentBalance > 0 ? 'Due' : 'Advance'}</p>
                  </div>
                )}
                {row._batch && (
                  <div className="text-right">
                    <p className={`text-xs font-black ${isSelected ? 'text-accent' : 'text-primary'}`}>₹{(row._batch.selling_rate || row._batch.mrp).toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-secondary uppercase">{row._batch.stock || 0} In Stock</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const [paymentModes, setPaymentModes] = useState<{method: string, amount: number, tendered?: number}[]>([
    { method: 'Cash', amount: 0, tendered: 0 }
  ]);

  useEffect(() => {
    if (showPaymentModal) {
      setPaymentModes([{ method: 'Cash', amount: totals.totalPayable, tendered: totals.totalPayable }]);
    }
  }, [showPaymentModal, totals.totalPayable]);

  const handlePaymentModeChange = (index: number, field: string, value: any) => {
    const newModes = [...paymentModes];
    (newModes[index] as any)[field] = value;
    setPaymentModes(newModes);
  };

  const addPaymentMode = () => {
    const remaining = totals.totalPayable - paymentModes.reduce((sum, m) => sum + m.amount, 0);
    setPaymentModes([...paymentModes, { method: 'Card', amount: Math.max(0, remaining) }]);
  };

  const removePaymentMode = (index: number) => {
    setPaymentModes(paymentModes.filter((_, i) => i !== index));
  };

  const totalPaid = paymentModes.reduce((sum, m) => sum + m.amount, 0);
  const remainingToPay = totals.totalPayable - totalPaid;

  const handleShare = (method: 'Email' | 'WhatsApp') => {
    if (!lastSavedInvoice) return;
    const mobile = customerMobile || lastSavedInvoice.customer_mobile;
    const invoiceNo = lastSavedInvoice.invoice_number;
    const amount = lastSavedInvoice.net_amount;

    if (method === 'WhatsApp') {
      const text = encodeURIComponent(`Hello, your invoice #${invoiceNo} for ₹${amount} from ${company?.name || 'Metapharsic Life Sciences'} is ready. View it here: ${window.location.origin}/invoice/${invoiceNo}`);
      window.open(`https://wa.me/${mobile}?text=${text}`, '_blank');
    } else {
      setAlertDialog({ isOpen: true, title: 'Email Sent', message: `Invoice #${invoiceNo} has been emailed to the patient.` });
    }
    setShowShareModal(false);
  };

  const searchReturnInvoice = async () => {
    if (!returnInvoiceNo) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/pos/invoices?search=${returnInvoiceNo}`);
      const list = Array.isArray(res) ? res : (res.data || []);
      const found = list.find((inv: any) => inv.invoice_number === returnInvoiceNo || inv.invoice_no === returnInvoiceNo);
      if (found) setReturnInvoiceData(found);
      else setAlertDialog({ isOpen: true, title: 'Not Found', message: 'Invoice not found.' });
    } catch (e) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Failed to fetch invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentModal = () => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-border">
        <div className="p-8 border-b border-border flex justify-between items-center bg-page/30">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-accent/10 text-accent"><Wallet size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-primary uppercase">Payment Terminal</h3>
              <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Select Mode & Complete Transaction</p>
            </div>
          </div>
          <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[60vh] space-y-8">
          <div className="flex justify-between items-end bg-page rounded-3xl p-6 border border-border">
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Total Payable</p>
              <p className="text-4xl font-black text-primary">₹{totals.totalPayable.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Remaining</p>
              <p className={`text-xl font-black ${remainingToPay <= 0 ? 'text-accent' : 'text-rose-600'}`}>₹{remainingToPay.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="text-xs font-black text-primary uppercase tracking-widest">Payment Mode(s)</h4>
               <button onClick={addPaymentMode} className="text-[10px] font-black text-accent hover:underline uppercase">+ Add Split</button>
            </div>
            {paymentModes.map((mode, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-border bg-white space-y-4 relative group">
                {paymentModes.length > 1 && (
                  <button onClick={() => removePaymentMode(idx)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><Minus size={14}/></button>
                )}
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-secondary uppercase">Mode</label>
                    <select value={mode.method} onChange={e => handlePaymentModeChange(idx, 'method', e.target.value)} className="h-10 bg-page border border-border rounded-xl px-3 text-xs font-black text-primary outline-none focus:border-accent">
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="Credit">Credit Account</option>
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-secondary uppercase">Amount</label>
                    <input type="number" value={mode.amount} onChange={e => handlePaymentModeChange(idx, 'amount', parseFloat(e.target.value) || 0)} className="h-10 bg-page border border-border rounded-xl px-3 text-xs font-black text-primary outline-none focus:border-accent" />
                  </div>
                </div>

                {mode.method === 'Cash' && (
                  <div className="flex gap-4 pt-2 border-t border-border/50">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-secondary uppercase">Tendered</label>
                      <input type="number" value={mode.tendered} onChange={e => handlePaymentModeChange(idx, 'tendered', parseFloat(e.target.value) || 0)} className="h-10 bg-emerald-50 border border-emerald-100 rounded-xl px-3 text-xs font-black text-emerald-700 outline-none" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-secondary uppercase">Change Due</label>
                      <div className="h-10 flex items-center px-3 text-sm font-black text-accent">₹{Math.max(0, (mode.tendered || 0) - mode.amount).toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {mode.method === 'UPI' && (
                  <div className="flex flex-col items-center gap-4 pt-4 border-t border-border/50">
                    <QRCodeSVG value={`upi://pay?pa=metapharsic@upi&pn=Metapharsic&am=${mode.amount}&cu=INR`} size={120} level="H" />
                    <p className="text-[9px] font-black text-secondary uppercase">Scan to pay ₹{mode.amount}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-page/30 border-t border-border flex gap-4">
          <button onClick={() => setShowPaymentModal(false)} className="flex-1 h-14 rounded-2xl border border-border bg-white text-secondary font-black text-xs uppercase hover:bg-page transition-all">Cancel</button>
          <button onClick={() => { handleSave(false); setShowPaymentModal(false); }} disabled={remainingToPay > 0 || loading} className="flex-[2] h-14 rounded-2xl bg-accent text-white font-black text-xs uppercase hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50 disabled:grayscale">Confirm & Save Invoice</button>
        </div>
      </div>
    </div>
  );

  const renderReturnModal = () => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-border">
        <div className="p-8 border-b border-border flex justify-between items-center bg-page/30">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600"><RefreshCcw size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-primary uppercase">Return / Exchange</h3>
              <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Process Returns & Credit Notes</p>
            </div>
          </div>
          <button onClick={() => setShowReturnModal(false)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl"><X size={24} /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input type="text" value={returnInvoiceNo} onChange={e => setReturnInvoiceNo(e.target.value)} placeholder="Original Invoice No." className="w-full h-14 bg-page border border-border rounded-2xl px-5 text-sm font-bold outline-none focus:border-accent" />
              <button onClick={searchReturnInvoice} className="absolute right-3 top-2 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-black transition-all"><Search size={18}/></button>
            </div>
          </div>

          {returnInvoiceData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 rounded-2xl bg-highlight/30 border border-accent/20">
                <p className="text-[10px] font-black text-secondary uppercase">Patient: <span className="text-primary">{returnInvoiceData.patient_name || returnInvoiceData.customer_name}</span></p>
                <p className="text-[10px] font-black text-secondary uppercase">Date: <span className="text-primary">{formatDate(returnInvoiceData.date || returnInvoiceData.invoice_date)}</span></p>
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-page sticky top-0">
                    <tr>
                      <th className="p-3 font-black text-secondary uppercase">Item</th>
                      <th className="p-3 text-right font-black text-secondary uppercase">Qty</th>
                      <th className="p-3 text-right font-black text-secondary uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(returnInvoiceData.items || []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="p-3 font-bold text-primary">{item.product_name}</td>
                        <td className="p-3 text-right font-black text-slate-600">{item.quantity}</td>
                        <td className="p-3 text-right font-black text-accent">₹{item.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase">Action</label>
                  <select className="h-10 bg-page border border-border rounded-xl px-3 text-xs font-black outline-none">
                    <option>Full Return</option>
                    <option>Partial Return</option>
                    <option>Exchange</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase">Refund Mode</label>
                  <select className="h-10 bg-page border border-border rounded-xl px-3 text-xs font-black outline-none">
                    <option>Cash</option>
                    <option>Wallet Credit</option>
                    <option>Original Mode</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-page/30 border-t border-border flex gap-4">
          <button onClick={() => setShowReturnModal(false)} className="flex-1 h-14 rounded-2xl border border-border bg-white text-secondary font-black text-xs uppercase">Cancel</button>
          <button onClick={() => { setAlertDialog({ isOpen: true, title: 'Success', message: 'Return processed successfully.' }); setShowReturnModal(false); }} disabled={!returnInvoiceData} className="flex-[2] h-14 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase shadow-xl disabled:opacity-50">Process Return</button>
        </div>
      </div>
    </div>
  );

  const renderShareModal = () => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-border p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-accent flex items-center justify-center mx-auto border-4 border-emerald-100"><Share2 size={32} /></div>
        <div>
          <h3 className="text-xl font-black text-primary uppercase">Share Invoice</h3>
          <p className="text-xs font-bold text-secondary mt-2">Invoice #{lastSavedInvoice?.invoice_number} saved ✓</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button onClick={() => handleShare('Email')} className="h-14 rounded-2xl border border-border bg-white flex items-center justify-center gap-3 text-xs font-black text-primary hover:bg-page transition-all"><Mail size={18} className="text-blue-500" /> Share via Email</button>
          <button onClick={() => handleShare('WhatsApp')} className="h-14 rounded-2xl border border-border bg-white flex items-center justify-center gap-3 text-xs font-black text-primary hover:bg-page transition-all"><MessageSquare size={18} className="text-emerald-500" /> Share via WhatsApp</button>
          <button onClick={() => { printPOSInvoice(lastSavedInvoice, company); setShowShareModal(false); }} className="h-14 rounded-2xl border border-border bg-white flex items-center justify-center gap-3 text-xs font-black text-primary hover:bg-page transition-all"><Printer size={18} className="text-slate-600" /> Print Receipt</button>
        </div>
        <button onClick={() => setShowShareModal(false)} className="text-xs font-black text-secondary hover:text-primary uppercase tracking-widest">Close</button>
      </div>
    </div>
  );

  const renderShortcutsLegend = () => (
    <div className="absolute right-6 top-20 w-72 bg-white border border-border shadow-2xl rounded-2xl p-6 z-[100] animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Keyboard Shortcuts</h4>
        <button onClick={() => setShowShortcutsLegend(false)}><X size={14}/></button>
      </div>
      <div className="space-y-2.5">
        {[
          { key: 'F2', action: 'Add New Item' },
          { key: 'F4', action: 'Focus Scanner' },
          { key: 'F6', action: 'Toggle Patient Details' },
          { key: 'F8', action: 'Hold Bill' },
          { key: 'F10', action: 'Open Payment / Save' },
          { key: 'Esc', action: 'Exit / Close' },
          { key: 'Alt + R', action: 'Return / Exchange' },
          { key: 'Alt + E', action: 'Email Invoice' },
          { key: 'Alt + W', action: 'WhatsApp Invoice' },
        ].map((s, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-secondary uppercase">{s.action}</span>
            <span className="px-1.5 py-0.5 rounded-lg bg-page border border-border text-[10px] font-black text-primary">{s.key}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // usePOSShortcuts custom hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if any modal is open (except shortcuts legend)
      if (showPaymentModal || showReturnModal || showShareModal || showHeldBills || alertDialog.isOpen || confirmDialog.isOpen) {
        if (e.key === 'Escape') {
          setShowPaymentModal(false);
          setShowReturnModal(false);
          setShowShareModal(false);
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        addItem();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        scanInputRef.current?.focus();
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setPatientDetailsCollapsed(!patientDetailsCollapsed);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowReturnModal(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'e' && lastSavedInvoice) {
        e.preventDefault();
        setShowShareModal(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        // Bill level discount logic could be added
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaymentModal, showReturnModal, showShareModal, showHeldBills, alertDialog, confirmDialog, patientDetailsCollapsed, lastSavedInvoice, items]);

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden bg-page select-none font-sans text-primary border-l border-border relative">
      {renderDrawer()}
      {showPaymentModal && renderPaymentModal()}
      {showReturnModal && renderReturnModal()}
      {showShareModal && renderShareModal()}
      {showShortcutsLegend && renderShortcutsLegend()}

      {/* SMART POS HEADER BAR */}
      <div className={`flex items-center justify-between px-6 bg-white border-b border-border shrink-0 z-10 ${posState === 'side' ? 'h-14' : 'h-16'}`}>
        <div className="flex items-center gap-6">
          <button onClick={() => setDrawerOpen(true)} className="p-2.5 rounded-xl hover:bg-page transition-all border border-border bg-white text-secondary hover:text-primary shadow-sm group">
            <Menu size={22} className="group-hover:scale-110 transition-transform" />
          </button>
          <div className="h-8 w-[1px] bg-border mx-1"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(76,175,114,0.6)] animate-pulse`} />
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                {voucherType.toUpperCase()} MODE
                <span className="text-[10px] font-bold px-2 py-0.5 bg-highlight text-accent rounded-full border border-accent/20">LIVE</span>
              </h1>
            </div>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.15em] mt-0.5">Voucher Reference: #{invoiceNo}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <button onClick={() => setShowReturnModal(true)} className="h-10 px-4 rounded-xl flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black tracking-widest hover:bg-rose-100 transition-all uppercase"><RefreshCcw size={14}/> Returns</button>
             <button onClick={() => setShowShortcutsLegend(!showShortcutsLegend)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-page border border-border text-secondary hover:text-primary transition-all shadow-sm"><HelpCircle size={18}/></button>
          </div>
          <div className="h-10 w-[1px] bg-border mx-1"></div>
          <div className="hidden xl:flex flex-col items-end mr-4">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Session Time</p>
            <ClockDisplay />
          </div>
          <div className="h-10 w-[1px] bg-border mx-2"></div>
          <HeaderControls />
          <div className="h-10 w-[1px] bg-border mx-2"></div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* COMPACT SUMMARY STRIP */}
      <div className="h-14 bg-white/50 border-b border-border px-6 flex items-center gap-4 overflow-x-auto shrink-0 backdrop-blur-sm">
        {[
          { label: "Today's Sales", value: formatCurrency(posStats.todaySales), icon: <DollarSign size={12}/>, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: "Transactions", value: String(posStats.totalTransactions), icon: <History size={12}/>, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: "Held Bills", value: String(posStats.heldBillsCount), icon: <Pause size={12}/>, color: 'text-accent', bg: 'bg-highlight' },
          { label: "Shift", value: posStats.shiftStatus, icon: <Activity size={12}/>, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border bg-white shadow-none shrink-0">
            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none">{stat.label}</span>
              <span className="text-xs font-black text-primary mt-1 leading-none">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 gap-6 bg-page/50">
        
        {/* META ROW & SCANNER */}
        <div className={`grid gap-6 ${posState === 'side' ? 'grid-cols-1' : 'grid-cols-3'} shrink-0`}>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2 px-1"><Package size={12} className="text-accent" /> SCANNER</span>
            <div className="relative h-[52px] bg-white rounded-2xl border border-border flex items-center p-1 focus-within:border-accent transition-all shadow-sm">
              <Search size={18} className="text-secondary ml-3" />
              <input ref={scanInputRef} type="text" value={scanValue} onChange={e => setScanValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleScanSubmit(e as any); }} placeholder="Scan barcode..." className="flex-1 bg-transparent text-sm font-bold text-primary px-3 outline-none" />
              {scanMessage && <div className="absolute -bottom-5 left-4 text-[10px] font-bold text-accent animate-pulse">{scanMessage}</div>}
            </div>
          </div>

          <div className={`grid gap-4 ${posState === 'side' ? 'grid-cols-1' : 'col-span-2 grid-cols-2'}`}>
            <div className="flex flex-col gap-2 relative">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2 px-1"><User size={12} className="text-accent" /> Party / Customer</span>
              <div className="h-[52px] bg-white border border-border rounded-2xl flex items-center px-4 relative shadow-sm focus-within:border-accent transition-all">
                <input type="text" value={partyName} onChange={e => { setPartyName(e.target.value); setSearchQuery(e.target.value); }} onFocus={() => setShowDropdown({ type: 'party' })} onBlur={() => setTimeout(() => setShowDropdown(null), 200)} className="flex-1 bg-transparent text-sm font-bold text-primary outline-none" />
                {renderDropdown('party')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2 px-1"><Calendar size={12} className="text-accent" /> Entry Date</span>
              <div className="h-[52px] bg-white border border-border rounded-2xl flex items-center px-4 shadow-sm">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} id="voucher-date" className="flex-1 bg-transparent text-sm font-black text-primary outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* PATIENT DETAILS */}
        {voucherType === 'Sales' && (
          <div className="bg-white border border-border rounded-3xl p-5 shadow-sm relative overflow-hidden group shrink-0">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-accent opacity-50"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-highlight text-accent"><Heart size={18} /></div>
                <div>
                  <h3 className="text-sm font-black text-primary uppercase">Patient Details</h3>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Medical Info</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowHistory(!showHistory)} className="text-[11px] font-black text-accent hover:underline flex items-center gap-1.5 uppercase"><History size={14} /> {showHistory ? 'Hide' : 'View'} History</button>
                <button onClick={() => setPatientDetailsCollapsed(!patientDetailsCollapsed)} className="p-1.5 rounded-lg bg-page text-secondary hover:text-primary transition-colors border border-border">
                  {patientDetailsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </div>
            </div>

            {!patientDetailsCollapsed && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Patient Name', icon: User, value: patientName, setter: setPatientName, placeholder: 'Patient Name' },
                    { label: 'Contact', icon: Phone, value: customerMobile, setter: setCustomerMobile, placeholder: 'Mobile' },
                    { label: 'Doctor', icon: Stethoscope, value: doctorName, setter: setDoctorName, placeholder: 'Dr. Name' },
                    { label: 'ABHA ID', icon: Hash, value: abhaNo, setter: setAbhaNo, placeholder: 'ABHA ID' }
                  ].map((field, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><field.icon size={12} className="text-accent/60" /> {field.label}</label>
                      <input type="text" value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white transition-all rounded-t-lg" />
                    </div>
                  ))}
                </div>

                {/* NEW PATIENT ROW 2 (Age, DOB, Gender) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Activity size={12} className="text-accent/60" /> Age (Yrs)</label>
                    <input type="number" maxLength={3} value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="Age" className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Calendar size={12} className="text-accent/60" /> DOB (dd-mm-yyyy)</label>
                    <input type="date" value={patientDob} onChange={e => setPatientDob(e.target.value)} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Users size={12} className="text-accent/60" /> Gender</label>
                    <select value={patientGender} onChange={e => setPatientGender(e.target.value)} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* EXPANDED PATIENT ROW 3 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6 pt-6 border-t border-border/50">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><FileTextIcon size={12} className="text-accent/60" /> Rx Number</label>
                    <input type="text" value={prescriptionNo} onChange={e => setPrescriptionNo(e.target.value)} placeholder="Rx number" className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Calendar size={12} className="text-accent/60" /> Rx Date</label>
                    <input type="date" value={prescriptionDate} onChange={e => {
                        setPrescriptionDate(e.target.value);
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          d.setDate(d.getDate() + 30);
                          setValidTill(d.toISOString().split('T')[0]);
                        }
                      }} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Pill size={12} className="text-accent/60" /> Schedule</label>
                    <select value={scheduleType} onChange={e => setScheduleType(e.target.value)} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg">
                      <option value="None">None</option>
                      <option value="Schedule H">Schedule H</option>
                      <option value="Schedule H1">Schedule H1</option>
                      <option value="Schedule X">Schedule X</option>
                      <option value="OTC">OTC</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Clock size={12} className="text-accent/60" /> Valid Till</label>
                    <input type="date" value={validTill} onChange={e => setValidTill(e.target.value)} className="bg-page/50 border-b-2 border-border text-[13px] font-bold text-primary h-10 px-3 outline-none focus:border-accent focus:bg-white rounded-t-lg" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 px-1"><Paperclip size={12} className="text-accent/60" /> File</label>
                    <div className="relative h-10">
                      <input type="file" onChange={e => setPrescriptionFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="h-full w-full bg-page/50 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-secondary text-[11px] font-bold px-3">
                        <Paperclip size={14} />
                        <span className="truncate">{prescriptionFile ? prescriptionFile.name : 'Upload...'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY PANEL */}
            {showHistory && (
              <div className="mt-8 pt-8 border-t-2 border-border border-dashed animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 mb-4"><History size={16} className="text-accent" /><h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Purchase History</h4></div>
                <div className="bg-page/50 rounded-2xl border border-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-border">
                      <tr>
                        <th className="p-3 text-[9px] font-black text-secondary uppercase tracking-widest">Date</th>
                        <th className="p-3 text-[9px] font-black text-secondary uppercase tracking-widest">Voucher</th>
                        <th className="p-3 text-right text-[9px] font-black text-secondary uppercase tracking-widest">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {patientHistory.length > 0 ? patientHistory.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="p-3 text-xs font-bold text-slate-600">{formatDate(inv.date || inv.invoice_date)}</td>
                          <td className="p-3 text-xs font-black text-primary">{inv.invoice_number || inv.invoice_no}</td>
                          <td className="p-3 text-right text-xs font-black text-accent">₹{(inv.net_amount || 0).toLocaleString()}</td>
                        </tr>
                      )) : <tr><td colSpan={3} className="p-6 text-center text-xs font-bold text-secondary italic">No previous records found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY LIST */}
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-highlight text-accent"><LayoutGrid size={18} /></div>
              <div>
                <h3 className="text-sm font-black text-primary uppercase">Inventory Items</h3>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Billing Queue • {items.length - 1} items</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowHeldBills(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-border text-[11px] font-black text-secondary hover:text-accent hover:border-accent rounded-xl transition-all shadow-sm">
                <Pause size={14} /> HELD: {heldBills.length}
              </button>
              <button onClick={addItem} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[11px] font-black rounded-xl hover:bg-black transition-all shadow-lg">+ ADD ROW</button>
            </div>
          </div>

          <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 580px)' }}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-page/50 border-b border-border sticky top-0 z-20">
                  <tr>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center w-12">#</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest w-[25%]">ITEM DESCRIPTION</th>
                    {['Sales', 'Purchase'].includes(voucherType) && (
                      <>
                        <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center">BATCH</th>
                        <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center">EXPIRY</th>
                      </>
                    )}
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-right">MRP</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center w-28">QTY</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center w-20">DISC %</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-center w-16">GST %</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-right">RATE</th>
                    <th className="py-4 px-4 text-[10px] font-black text-secondary tracking-widest text-right w-32">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const expData = getExpiryStatus(item.expiryDate);
                    return (
                      <tr key={idx} className={`group hover:bg-page transition-colors ${item.amount > 0 ? 'bg-white' : 'bg-page/10'}`}>
                        <td className="py-4 px-4 text-[13px] font-black text-secondary text-center">{idx + 1}</td>
                        <td className="py-4 px-4 relative">
                          <div className="flex flex-col gap-1">
                            <input type="text" value={item.name} placeholder="Type product..." onChange={e => { handleItemChange(idx, 'name', e.target.value); setSearchQuery(e.target.value); }} onFocus={() => setShowDropdown({ type: 'item', index: idx })} onBlur={() => setTimeout(() => setShowDropdown(null), 200)} className="w-full bg-transparent text-[13px] font-black text-primary outline-none" />
                            {item.name && (
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${item.stockAvailable > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : item.stockAvailable > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                  {item.stockAvailable > 10 ? `In Stock: ${item.stockAvailable}` : item.stockAvailable > 0 ? `Low: ${item.stockAvailable}` : 'Out of Stock'}
                                </span>
                              </div>
                            )}
                          </div>
                          {renderDropdown('item', idx)}
                        </td>
                        {['Sales', 'Purchase'].includes(voucherType) && (
                          <>
                            <td className="py-4 px-4 text-[13px] font-bold text-primary text-center font-mono">{item.batchNumber || '-'}</td>
                            <td className="py-4 px-4 text-[13px] text-center font-mono font-black" style={{ color: expData.color }}>
                              <div className="flex items-center justify-center gap-1.5">
                                {expData.label === 'Expired' && <AlertCircle size={14} className="text-rose-600" />}
                                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase() : '-'}
                              </div>
                              {expData.label === 'Expired' && <p className="text-[8px] mt-1 font-black uppercase text-rose-600">Expired</p>}
                            </td>
                          </>
                        )}
                        <td className="py-4 px-4 text-right">
                          <input type="text" value={item.mrp || ''} placeholder="0" onChange={e => handleItemChange(idx, 'mrp', e.target.value)} className="w-16 bg-transparent text-[13px] font-black text-primary text-right outline-none" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2 bg-page/50 rounded-xl p-1 border border-border group-hover:bg-white transition-all">
                            <button onClick={() => handleItemChange(idx, 'quantity', String(Math.max(0, Number(item.quantity || 0) - 1)))} className="w-7 h-7 rounded-lg bg-white border border-border text-secondary hover:text-accent flex items-center justify-center shadow-sm"><Minus size={14}/></button>
                            <input type="text" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="w-10 bg-transparent text-[13px] font-black text-primary text-center outline-none" />
                            <button onClick={() => handleItemChange(idx, 'quantity', String(Number(item.quantity || 0) + 1))} className="w-7 h-7 rounded-lg bg-white border border-border text-secondary hover:text-accent flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <input type="text" value={item.discPercent} placeholder="0.00" onChange={e => handleItemChange(idx, 'discPercent', e.target.value)} className="w-12 bg-transparent text-[13px] font-black text-primary text-center outline-none border-b border-dashed border-border focus:border-accent" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-[11px] font-black px-2 py-0.5 bg-page border border-border text-secondary rounded-lg">{item.gstPercent}%</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <input type="text" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="w-16 bg-transparent text-[13px] font-black text-primary text-right outline-none" />
                        </td>
                        <td className="py-4 px-4 text-[13px] font-black text-primary text-right">₹{(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-page/50 border-t border-border p-6 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-8">
                <div className="flex flex-col gap-1"><span className="text-[10px] font-black text-secondary uppercase">Items</span><span className="text-sm font-black text-primary">{totals.itemCount} SKU</span></div>
                <div className="w-[1px] h-10 bg-border"></div>
                <div className="flex flex-col gap-1"><span className="text-[10px] font-black text-secondary uppercase">Quantity</span><span className="text-sm font-black text-primary">{totals.totalQty} Units</span></div>
              </div>
              <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-secondary uppercase">Total Value</span><span className="text-lg font-black text-primary tracking-tight">₹{totals.subTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* BILL SUMMARY PANEL */}
        {voucherType === 'Sales' && (
          <div className="bg-white border border-border rounded-3xl p-5 shadow-sm relative overflow-hidden shrink-0">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-highlight text-accent"><Calculator size={18} /></div>
                <div>
                  <h3 className="text-sm font-black text-primary uppercase">Bill Summary</h3>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">Tax & Discount Breakdown</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex justify-between items-center p-3 bg-page/30 rounded-2xl border border-border/50">
                  <span className="text-[10px] font-bold text-secondary uppercase">Subtotal</span>
                  <span className="text-xs font-black text-primary">₹{totals.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-page/30 rounded-2xl border border-border/50">
                  <span className="text-[10px] font-bold text-secondary uppercase text-rose-600">Total Discount (-)</span>
                  <span className="text-xs font-black text-rose-600">₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-page/30 rounded-2xl border border-border/50">
                  <span className="text-[10px] font-bold text-secondary uppercase">Total GST (+)</span>
                  <span className="text-xs font-black text-primary">₹{totals.totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent/10 rounded-2xl border border-accent/20">
                  <span className="text-[10px] font-bold text-accent uppercase">Round Off</span>
                  <span className="text-xs font-black text-accent">₹{(Math.round(totals.totalPayable) - totals.totalPayable).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(totals.gstSlabs).map(([slab, amount]) => (
                  (amount as number) > 0 && (
                    <div key={slab} className="px-3 py-1 bg-page border border-border rounded-full text-[9px] font-bold text-secondary uppercase">
                      GST @ {slab}: <span className="text-primary font-black ml-1">₹{(amount as number).toFixed(2)}</span>
                    </div>
                  )
                ))}
              </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-white border-t border-border p-6 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
        <div className={`flex gap-8 items-center ${posState === 'side' ? 'flex-col items-stretch gap-4' : ''}`}>
          <div className="flex-1 flex flex-col gap-2">
            <div className="relative group">
              <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-accent" />
              <input type="text" placeholder="Add narration..." value={narration} onChange={e => setNarration(e.target.value)} className="w-full bg-page/50 border border-border rounded-2xl h-[52px] pl-12 pr-4 text-sm font-bold text-primary outline-none focus:border-accent focus:bg-white shadow-sm" />
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase italic px-2">₹ In Words: {numberToWords(calculateTotal())} Only</span>
          </div>

          <div className="flex flex-col items-end px-4 border-l border-border h-14 justify-center">
            <span className="text-[10px] font-black text-secondary uppercase mb-1">Total Payable</span>
            <span className="text-3xl font-black text-accent tracking-tighter">₹{calculateTotal().toLocaleString()}</span>
          </div>

          <div className={`flex gap-3 h-[52px] ${posState === 'side' ? 'grid grid-cols-2' : ''}`}>
            <button onClick={onClose} className="px-6 rounded-2xl border border-border bg-white text-secondary text-[11px] font-black hover:bg-page transition-all shadow-sm flex items-center justify-center gap-2"><X size={16} /> EXIT</button>
            <button onClick={handleHoldBill} className="px-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 text-[11px] font-black hover:bg-amber-100 transition-all shadow-sm flex items-center justify-center gap-2"><Pause size={16} /> HOLD</button>
            <button onClick={() => handleSave(true)} disabled={loading} className="px-6 rounded-2xl border border-border bg-white text-primary text-[11px] font-black hover:bg-page transition-all shadow-sm flex items-center justify-center gap-2"><Printer size={16} /> PRINT</button>
            <button onClick={() => voucherType === 'Sales' ? setShowPaymentModal(true) : handleSave(false)} disabled={loading || calculateTotal() === 0} className="px-8 rounded-2xl bg-accent text-white text-[11px] font-black hover:bg-[#3d8c5b] transition-all shadow-lg uppercase">Save {voucherType === 'Sales' ? '& Pay' : 'Invoice'}</button>
          </div>
        </div>
      </div>

      {/* HELD BILLS MODAL */}
      {showHeldBills && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center bg-page/30">
              <div className="flex items-center gap-3"><div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600"><Pause size={20} /></div><div><h3 className="text-lg font-black text-primary uppercase">Held Bills</h3><p className="text-[10px] font-bold text-secondary uppercase">Restore Transactions</p></div></div>
              <button onClick={() => setShowHeldBills(false)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {heldBills.length === 0 ? <div className="py-12 text-center text-secondary italic">No bills on hold.</div> : heldBills.map((bill, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border hover:border-accent hover:bg-highlight/20 transition-all flex items-center justify-between group">
                  <div><p className="text-sm font-black text-primary">Bill #{bill.invoiceNo}</p><p className="text-xs font-bold text-secondary">{bill.partyName}</p></div>
                  <button onClick={() => handleRestoreBill(i)} className="px-4 py-2 bg-white border border-border text-[11px] font-black text-primary rounded-xl hover:bg-accent hover:text-white transition-all">RESTORE</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALERT DIALOG */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-border">
            <div className="bg-highlight p-6 flex items-center gap-4 border-b border-accent/20">
              <div className="p-2.5 rounded-2xl bg-white text-accent shadow-sm"><Activity size={24} /></div>
              <div><h3 className="text-lg font-black text-emerald-900 uppercase">{alertDialog.title}</h3></div>
            </div>
            <div className="p-8 text-sm font-bold text-slate-600 leading-relaxed">{alertDialog.message}</div>
            <div className="p-6 bg-page/30 border-t border-border flex justify-end">
              <button onClick={() => setAlertDialog({ ...alertDialog, isOpen: false })} className="px-8 h-12 bg-primary text-white text-[11px] font-black rounded-xl hover:bg-black transition-all">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TallyVoucherEntry;
