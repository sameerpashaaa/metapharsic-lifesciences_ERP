
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Printer, Save, X, Search, ChevronRight, 
  ArrowRight, Calculator, Clock, HelpCircle 
} from 'lucide-react';
import { useDataFetch } from '../hooks/useDataFetch';
import { useCompany } from '../context/CompanyContext';
import { apiClient } from '../services/apiClient';
import { saveInvoice, savePurchase } from '../services/databaseService';
import { printPOSInvoice } from '../utils/accountingExport';
import type { Purchase, SalesInvoice, SalesInvoiceItem } from '../types';

interface VoucherEntryProps {
  initialType?: 'Sales' | 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Purchase';
  onClose: () => void;
  onSuccess?: () => void;
  initialItems?: any[];
}

const TallyVoucherEntry: React.FC<VoucherEntryProps> = ({ initialType = 'Sales', onClose, onSuccess, initialItems }) => {
  const { company } = useCompany();
  const [voucherType, setVoucherType] = useState(initialType);
  const [invoiceNo, setInvoiceNo] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('Counter Customer');
  const [patientName, setPatientName] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [abhaNo, setAbhaNo] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [salesLedger, setSalesLedger] = useState('Sales');
  const [items, setItems] = useState<any[]>(
    initialItems && initialItems.length > 0 
      ? initialItems.map(item => ({
          name: item.productName || item.name || '',
          quantity: item.quantity || '',
          rate: item.rate || item.sellingRate || '',
          amount: (item.quantity || 0) * (item.rate || item.sellingRate || 0),
          product_id: item.productId || item.id,
          batch_id: item.batchId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          mrp: item.mrp
        }))
      : [{ name: '', quantity: '', rate: '', amount: 0 }]
  );
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);
  const [postAccountingVoucher, setPostAccountingVoucher] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState<{ type: 'party' | 'item', index?: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(0);
  const dropdownListRef = useRef<HTMLDivElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Search/Dropdown data
  const { data: productsData } = useDataFetch('/api/pos/products');
  const { data: partiesData } = useDataFetch('/api/pos/parties');
  const { data: accountsData } = useDataFetch('/api/accounting/chart-of-accounts');
  const { data: dbVoucherTypes } = useDataFetch('/api/pos/voucher-types');

  // Dynamic voucher type mapping
  const activeVoucherTypes = useMemo(() => {
    const defaults = [
      { key: 'F4', label: 'Contra', type: 'Contra', color: 'bg-emerald-700' },
      { key: 'F5', label: 'Payment', type: 'Payment', color: 'bg-blue-700' },
      { key: 'F6', label: 'Receipt', type: 'Receipt', color: 'bg-indigo-700' },
      { key: 'F7', label: 'Journal', type: 'Journal', color: 'bg-purple-700' },
      { key: 'F8', label: 'Sales', type: 'Sales', color: 'bg-red-600' },
      { key: 'F9', label: 'Purchase', type: 'Purchase', color: 'bg-amber-700' },
    ];

    const vtList = Array.isArray(dbVoucherTypes) ? dbVoucherTypes : (dbVoucherTypes?.data || []);
    if (!vtList || vtList.length === 0) return defaults;

    // Map DB types to function keys
    return defaults.map(def => {
      // Find if there's a custom voucher type of this base type
      const custom = vtList.find((vt: any) => vt.type_of_voucher === def.type || vt.typeOfVoucher === def.type);
      return custom ? { ...def, label: custom.name, realId: custom.id } : def;
    });
  }, [dbVoucherTypes]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser F-key behavior
      if (['F4', 'F5', 'F6', 'F7', 'F8', 'F9'].includes(e.key)) {
        e.preventDefault();
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

  // Auto-focus scanner on mount and type change
  useEffect(() => {
    if (['Sales', 'Purchase'].includes(voucherType)) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [voucherType]);

  // Dropdown filtered lists with smart sorting
  const filteredParties = useMemo(() => {
    if (!showDropdown || showDropdown.type !== 'party') return [];
    const getSafeList = (d: any) => {
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    };
    const list = getSafeList(accountsData);
    const query = searchQuery.toLowerCase();
    
    return list.filter((p: any) => 
      (p.name || p.account_name || '').toLowerCase().includes(query) ||
      (p.account_code || p.hsn || '').toString().toLowerCase().includes(query)
    ).sort((a: any, b: any) => {
      const aName = (a.name || a.account_name || '').toLowerCase();
      const bName = (b.name || b.account_name || '').toLowerCase();
      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [showDropdown, accountsData, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!showDropdown || showDropdown.type !== 'item') return [];
    const getSafeList = (d: any) => {
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    };
    const isInventoryVoucher = voucherType === 'Sales' || voucherType === 'Purchase';
    const list = isInventoryVoucher ? getSafeList(productsData) : getSafeList(accountsData);
    const query = searchQuery.toLowerCase();
    
    let flatList: any[] = [];
    if (isInventoryVoucher) {
      list.forEach((product: any) => {
        const productCode = (product.code || product.product_code || '').toString().toLowerCase();
        const matchesQuery = product.name.toLowerCase().includes(query)
          || productCode.includes(query)
          || (product.hsn || '').toString().toLowerCase().includes(query)
          || product.genericName?.toLowerCase().includes(query)
          || product.generic_name?.toLowerCase().includes(query)
          || (product.batches || []).some((batch: any) => getBatchNo(batch).toLowerCase().includes(query));
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
        (p.name || p.account_name || '').toLowerCase().includes(query) ||
        (p.account_code || p.hsn || '').toString().toLowerCase().includes(query)
      );
    }
    
    return flatList.sort((a: any, b: any) => {
      const aName = (a.name || a.account_name || '').toLowerCase();
      const bName = (b.name || b.account_name || '').toLowerCase();
      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [showDropdown, productsData, accountsData, searchQuery, voucherType]);

  function getSafeProducts() {
    if (Array.isArray(productsData)) return productsData;
    if (productsData && Array.isArray((productsData as any).data)) return (productsData as any).data;
    return [];
  }

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
    handleItemChange(index, 'name', product.name);
    handleItemChange(index, 'product_id', product.id);
    handleItemChange(index, 'productCode', getProductCode(product));
    handleItemChange(index, 'genericName', product.generic_name || product.genericName || '');
    handleItemChange(index, 'hsn', product.hsn || product.hsnCode || '');
    handleItemChange(index, 'batch_id', batch?.id || '');
    handleItemChange(index, 'batchNumber', getBatchNo(batch));
    handleItemChange(index, 'expiryDate', batch?.expiry_date || batch?.expiryDate || '');
    handleItemChange(index, 'mrp', Number(batch?.mrp || product.mrp || rate || 0));
    handleItemChange(index, 'purchaseRate', getPurchaseRate(product, batch));
    handleItemChange(index, 'rate', rate || '');
    handleItemChange(index, 'rack', product.rack || '');
    handleItemChange(index, 'manufacturer', product.manufacturer || '');
    handleItemChange(index, 'scheduleType', product.scheduleType || '');
    handleItemChange(index, 'gstPercent', product.gst || product.gst_percent || 0);
    if (!items[index]?.quantity) {
      handleItemChange(index, 'quantity', '1');
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = scanValue.trim();
    if (!rawCode) return;

    const code = rawCode.toLowerCase();
    const products = getSafeProducts();
    const matches = products.flatMap((product: any) => {
      const batches = product.batches?.length ? product.batches : [undefined];
      return batches
        .filter((batch: any) => {
          const productCode = getProductCode(product).toLowerCase();
          const batchNo = getBatchNo(batch).toLowerCase();
          return productCode === code
            || batchNo === code
            || product.name?.toLowerCase() === code
            || product.generic_name?.toLowerCase() === code
            || product.genericName?.toLowerCase() === code;
        })
        .map((batch: any) => ({ product, batch }));
    });

    if (matches.length === 0) {
      setScanMessage(`No product found for ${rawCode}`);
      setSearchQuery(rawCode);
      const targetIndex = Math.max(0, items.findIndex(i => !i.name));
      setShowDropdown({ type: 'item', index: targetIndex });
      setDropdownSelectedIndex(0);
      return;
    }

    const targetIndex = items.findIndex(i => !i.name) >= 0 ? items.findIndex(i => !i.name) : items.length - 1;
    applyProductToRow(targetIndex, matches[0].product, matches[0].batch);
    setScanMessage(`${matches[0].product.name} added${matches[0].batch ? ` / Batch ${getBatchNo(matches[0].batch)}` : ''}`);
    setScanValue('');
    setShowDropdown(null);
  };

  const scrollToSelectedIndex = (index: number) => {
    if (dropdownListRef.current && index >= 0) {
      const container = dropdownListRef.current;
      const rowHeight = 45; // Approx row height
      const scrollPos = index * rowHeight;
      if (scrollPos < container.scrollTop || scrollPos > container.scrollTop + container.clientHeight - rowHeight) {
         container.scrollTop = scrollPos - (container.clientHeight / 2) + (rowHeight / 2);
      }
    }
  };

  const handleKeyDownOnInput = (e: React.KeyboardEvent, index?: number, type?: 'party' | 'item') => {
    if (!showDropdown || showDropdown.type !== type) return;
    if (type === 'item' && showDropdown.index !== index) return;
    
    const listLength = type === 'party' ? filteredParties.length : filteredItems.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownSelectedIndex(prev => {
        const next = prev < listLength - 1 ? prev + 1 : prev;
        scrollToSelectedIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDropdownSelectedIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        scrollToSelectedIndex(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (listLength > 0 && dropdownSelectedIndex >= 0 && dropdownSelectedIndex < listLength) {
        if (type === 'party') {
          const p = filteredParties[dropdownSelectedIndex];
          setPartyName(p.account_name);
          setShowDropdown(null);
        } else if (type === 'item' && index !== undefined) {
          const item = filteredItems[dropdownSelectedIndex];
          if (voucherType === 'Sales' || voucherType === 'Purchase') {
            applyProductToRow(index, item, item._type === 'batch' ? item._batch : undefined);
          } else {
             handleItemChange(index, 'name', item.account_name || item.name);
             handleItemChange(index, 'product_id', item.id);
          }
          setShowDropdown(null);
        }
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(null);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill logic for Product Search (simulated for now, would use productsData)
    if (field === 'name' && productsData && (voucherType === 'Sales' || voucherType === 'Purchase')) {
      const productsList = Array.isArray(productsData) ? productsData : (productsData?.data || []);
      const query = String(value).toLowerCase();
      const match = productsList.find((p: any) =>
        p.name.toLowerCase().includes(query)
        || getProductCode(p).toLowerCase() === query
        || (p.batches || []).some((b: any) => getBatchNo(b).toLowerCase() === query)
      );
      if (match && value.length > 3) {
        newItems[index].product_id = match.id;
        newItems[index].productCode = getProductCode(match);
        newItems[index].hsn = match.hsn;
        if (match.batches?.[0]) {
          newItems[index].batch_id = match.batches[0].id;
          newItems[index].batchNumber = getBatchNo(match.batches[0]);
          newItems[index].expiryDate = match.batches[0].expiryDate || match.batches[0].expiry_date;
          newItems[index].rate = voucherType === 'Purchase' ? getPurchaseRate(match, match.batches[0]) : getSellingRate(match, match.batches[0]);
          newItems[index].mrp = match.batches[0].mrp;
        }
      }
    }

    if (field === 'quantity' || field === 'rate') {
      const q = parseFloat(newItems[index].quantity) || 0;
      const r = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = q * r;
    }
    
    // Add new row if last row is being typed in
    if (index === items.length - 1 && value !== '') {
      newItems.push({ name: '', quantity: '', rate: '', amount: 0 });
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const getFilledItems = () => {
    return items.filter(i => i.name && parseFloat(i.quantity) > 0);
  };

  const buildLocalInvoice = (invoiceNumber: string, total: number): SalesInvoice => {
    const filledItems = getFilledItems();
    const invoiceItems: SalesInvoiceItem[] = filledItems.map((item, index) => ({
      id: `${invoiceNumber}-${index + 1}`,
      productId: item.product_id || 'manual',
      productName: item.name,
      genericName: item.genericName || '',
      hsn: item.hsn || '',
      batchId: item.batch_id || '',
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
      quantity: parseFloat(item.quantity) || 0,
      freeQuantity: 0,
      uom: 'pcs',
      mrp: item.mrp || parseFloat(item.rate) || 0,
      rate: parseFloat(item.rate) || 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableValue: item.amount || 0,
      gstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: item.amount || 0,
      purchaseRate: item.purchaseRate || 0,
      maxStock: item.maxStock || 0
    }));

    return {
      id: `INV-${Date.now()}`,
      invoiceNumber,
      date,
      time: new Date().toLocaleTimeString(),
      customerName: partyName || 'Counter Customer',
      customerMobile: '',
      items: invoiceItems,
      totalItems: invoiceItems.length,
      totalQuantity: invoiceItems.reduce((sum, item) => sum + item.quantity, 0),
      subTotal: total,
      taxableValue: total,
      totalDiscount: 0,
      totalGst: 0,
      roundOff: 0,
      netAmount: total,
      paymentMode: 'Cash',
      amountReceived: total,
      balanceDue: 0,
      status: 'Completed'
    };
  };

  const buildPurchase = (purchaseNumber: string, total: number): Purchase => {
    return {
      id: `PUR-${Date.now()}`,
      invoiceNo: purchaseNumber,
      supplierId: '',
      supplierName: partyName || 'Counter Supplier',
      date,
      items: getFilledItems().map(item => ({
        productId: item.product_id || '',
        productName: item.name,
        batchNo: item.batchNumber || '',
        expiryDate: item.expiryDate || date,
        quantity: parseFloat(item.quantity) || 0,
        purchaseRate: parseFloat(item.rate) || 0,
        mrp: Number(item.mrp || item.rate || 0),
        amount: item.amount || 0,
        gst: 0,
        gstAmount: 0
      })),
      totalAmount: total,
      status: 'Received',
      paymentStatus: 'Unpaid'
    };
  };

  const buildAccountingVoucherPayload = (total: number, generatedInvoiceNo: string) => {
    if (voucherType === 'Sales' || voucherType === 'Purchase') {
      const isSales = voucherType === 'Sales';
      return {
        voucherNo: `${voucherType.substring(0,3).toUpperCase()}/${new Date().getFullYear()}/${generatedInvoiceNo}`,
        date,
        narration: narration || `${voucherType} invoice ${generatedInvoiceNo}`,
        totalDebit: total,
        totalCredit: total,
        voucherType,
        status: 'Posted',
        entries: [
          {
            accountId: partyName || 'Counter Customer',
            debit: isSales ? total : 0,
            credit: isSales ? 0 : total,
            narration: partyName || 'Counter Customer'
          },
          {
            accountId: salesLedger || (isSales ? 'Sales' : 'Purchase'),
            debit: isSales ? 0 : total,
            credit: isSales ? total : 0,
            narration: salesLedger || voucherType
          }
        ]
      };
    }

    const entries = getFilledItems().filter(i => i.amount > 0).map(i => ({
      accountId: i.product_id || i.name,
      debit: voucherType === 'Payment' || voucherType === 'Contra' ? i.amount : 0,
      credit: voucherType === 'Receipt' || voucherType === 'Journal' ? i.amount : 0,
      narration: i.name
    }));

    const balancingEntry = {
      accountId: partyName,
      debit: voucherType === 'Receipt' ? total : 0,
      credit: voucherType === 'Payment' || voucherType === 'Contra' ? total : 0,
      narration: 'Offset'
    };

    return {
      voucherNo: `${voucherType.substring(0,3).toUpperCase()}/${new Date().getFullYear()}/${invoiceNo}`,
      date,
      narration,
      totalDebit: total,
      totalCredit: total,
      voucherType,
      status: 'Posted',
      entries: [...entries, balancingEntry]
    };
  };

  const handleSave = async (print: boolean = false) => {
    try {
      const total = calculateTotal();
      const filledItems = getFilledItems();
      if (total === 0 || filledItems.length === 0) return;
      setLoading(true);
      
      const isSalesOrPurchase = voucherType === 'Sales' || voucherType === 'Purchase';
      
      let response;
      if (isSalesOrPurchase) {
        // POS/Trade Invoice Flow
        const generatedInvoiceNo = invoiceNo.includes('-') ? invoiceNo : `${voucherType.substring(0,3).toUpperCase()}-${invoiceNo}-${Date.now().toString().slice(-4)}`;
        if (voucherType === 'Purchase') {
          const purchase = buildPurchase(generatedInvoiceNo, total);
          const savedPurchase = await savePurchase(purchase);
          response = { success: savedPurchase, data: { invoice_number: generatedInvoiceNo } };
        } else {
          const payload = {
          invoice_no: generatedInvoiceNo,
          invoice_date: date,
          party_name: partyName,
          patient_name: patientName,
          doctor_name: doctorName,
          payment_mode: 'Cash',
          items: filledItems.map(i => ({
            product_id: i.product_id || 'manual',
            product_name: i.name,
            batch_id: i.batch_id,
            batch_number: i.batchNumber,
            expiry_date: i.expiryDate,
            quantity: parseFloat(i.quantity),
            selling_rate: parseFloat(i.rate),
            mrp: i.mrp || parseFloat(i.rate),
            discount: 0,
            totalAmount: i.amount,
            hsn: i.hsn,
            rack: i.rack,
            manufacturer: i.manufacturer,
            scheduleType: i.scheduleType,
            gstPercent: i.gstPercent
          })),
          net_payable: total,
          total_taxable: filledItems.reduce((acc, i) => {
            const gst = parseFloat(i.gstPercent || 0);
            const amount = parseFloat(i.amount || 0);
            return acc + (amount / (1 + gst / 100));
          }, 0),
          status: 'Completed'
          };
          try {
            response = await apiClient.post('/api/pos/invoices', payload);
          } catch (invoiceError) {
            console.warn('Backend invoice save failed; saving invoice locally instead.', invoiceError);
            const savedLocally = await saveInvoice(buildLocalInvoice(generatedInvoiceNo, total));
            response = { success: savedLocally, data: { invoice_number: generatedInvoiceNo }, localOnly: true };
          }

          if (response.success && print) {
            printPOSInvoice({ 
              ...payload, 
              patientName,
              patientAddress,
              customerMobile,
              abhaNo,
              abhaAddress,
              doctorName,
              netAmount: total,
              subTotal: payload.total_taxable,
              items: payload.items.map((i:any) => ({ ...i, productName: i.product_name, batchNumber: i.batch_number, expiryDate: i.expiry_date })) 
            }, company);
          }
        }

        if (postAccountingVoucher) {
          try {
            await apiClient.post('/api/accounting/journal-vouchers', buildAccountingVoucherPayload(total, generatedInvoiceNo));
          } catch (voucherError) {
            console.warn('Optional accounting voucher was not posted. Invoice save will continue.', voucherError);
          }
        }
      } else {
        response = await apiClient.post('/api/accounting/journal-vouchers', buildAccountingVoucherPayload(total, invoiceNo));
      }
      
      if (response && (response.success || response.id)) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to save voucher:', err);
      alert(`Error saving ${voucherType === 'Sales' || voucherType === 'Purchase' ? 'invoice' : 'voucher'}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    // For now, this requires a voucher ID, which we'd get if we were editing
    alert('Deletion successful (Simulated for New Vouchers). In a real edit scenario, this would call the DELETE endpoint.');
    onClose();
  };

  const renderDropdown = (type: 'party' | 'item', index?: number) => {
    if (!showDropdown || showDropdown.type !== type) return null;
    if (type === 'item' && showDropdown.index !== index) return null;

    return (
        <div className="absolute left-0 top-full mt-0.5 w-[450px] bg-[#D4E2D4] border border-slate-400 flex flex-col shadow-2xl z-50 max-h-64 animate-in fade-in zoom-in-95 duration-100 rounded-sm overflow-hidden">
           <div className="bg-[#1D3557] text-white p-1.5 px-3 flex justify-between items-center shrink-0">
             <span className="text-[10px] font-black uppercase tracking-widest italic">
                {type === 'party' ? 'List of Ledger Accounts' : 'List of Stock Items'}
             </span>
             <X size={12} className="cursor-pointer" onMouseDown={(e) => { e.preventDefault(); setShowDropdown(null); }}/>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar bg-white" ref={dropdownListRef}>
              <div className="sticky top-0 bg-[#1D3557] text-blue-100 text-[9px] font-bold px-3 py-1.5 flex justify-between shadow-sm z-10 border-b border-blue-800">
                <span>Description</span>
                <span>{type === 'party' ? 'Balance' : (voucherType === 'Sales' ? 'Stock & Price' : 'Details')}</span>
              </div>
              
              {(() => {
                const filtered = type === 'party' ? filteredParties : filteredItems;

                if (filtered.length === 0) {
                  return <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                      <Search size={24} className="mb-2 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">No matching records found.</p>
                      <p className="text-[10px] italic">Try adjusting your search criteria.</p>
                  </div>;
                }

                if (type === 'party') {
                  return filtered.map((p: any, idx: number) => {
                    const isSelected = idx === dropdownSelectedIndex;
                    return (
                      <div 
                        key={p.id}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setPartyName(p.account_name);
                            setShowDropdown(null);
                        }}
                        onMouseEnter={() => setDropdownSelectedIndex(idx)}
                        className={`px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors flex justify-between items-center group
                          ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-800'}
                        `}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">{p.account_name}</span>
                          <span className={`text-[8px] uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{p.account_type || 'Master'}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                          {p.opening_balance ? `₹${p.opening_balance.toLocaleString()}` : p.account_code}
                        </span>
                      </div>
                    );
                  });
                }

                return filtered.map((item: any, idx: number) => {
                  const isSelected = idx === dropdownSelectedIndex;
                  
                  if (item._type === 'product_no_stock') {
                    return (
                      <div 
                        key={`${item.id}-no-stock`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleItemChange(index!, 'name', item.name);
                            handleItemChange(index!, 'product_id', item.id);
                            if (item.mrp) handleItemChange(index!, 'rate', item.mrp);
                            setShowDropdown(null);
                        }}
                        onMouseEnter={() => setDropdownSelectedIndex(idx)}
                        className={`px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors flex justify-between items-center group
                          ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-50/30 hover:bg-amber-100 text-slate-800'}
                        `}
                      >
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-amber-900'}`}>{item.name} <span className="text-[9px] opacity-70 font-normal">(No Stock)</span></span>
                          <span className={`text-[8px] uppercase ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>{item.hsn || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  }

                  if (item._type === 'batch') {
                    const batch = item._batch;
                    return (
                      <div 
                        key={batch.id}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleItemChange(index!, 'name', item.name);
                            handleItemChange(index!, 'product_id', item.id);
                            handleItemChange(index!, 'batch_id', batch.id);
                            handleItemChange(index!, 'batchNumber', batch.batch_number || batch.batchNumber);
                            handleItemChange(index!, 'expiryDate', batch.expiry_date || batch.expiryDate);
                            handleItemChange(index!, 'rate', batch.selling_rate || batch.sellingRate || batch.mrp);
                            setShowDropdown(null);
                        }}
                        onMouseEnter={() => setDropdownSelectedIndex(idx)}
                        className={`px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors flex justify-between items-center group
                          ${isSelected ? 'bg-[#1D3557] text-white shadow-md' : 'hover:bg-blue-50 text-slate-800'}
                        `}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold truncate max-w-[220px]">{item.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] px-1 rounded font-mono border ${isSelected ? 'bg-blue-800 text-blue-100 border-blue-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{batch.batch_number || batch.batchNumber || 'N/A'}</span>
                            {batch.expiry_date || batch.expiryDate ? <span className={`text-[8px] ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>Exp: {new Date(batch.expiry_date || batch.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit'})}</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>₹{batch.selling_rate || batch.sellingRate || batch.mrp}</span>
                          <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{batch.quantity || batch.stock || 0} In Stock</span>
                        </div>
                      </div>
                    );
                  }

                  // Non-sales accounts (e.g., Purchase or Journal items)
                  return (
                      <div 
                        key={item.id}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleItemChange(index!, 'name', item.account_name || item.name);
                            handleItemChange(index!, 'product_id', item.id);
                            setShowDropdown(null);
                        }}
                        onMouseEnter={() => setDropdownSelectedIndex(idx)}
                        className={`px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors flex justify-between items-center group
                          ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-800'}
                        `}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold">{item.account_name || item.name}</span>
                          <span className={`text-[8px] uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{item.account_type || item.category || 'Item'}</span>
                        </div>
                      </div>
                  );
                });
              })()}
           </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#E1E8E1] select-none font-mono">
      {/* Top Banner */}
      <div className="bg-[#1D3557] text-white flex justify-between items-center px-4 py-1 text-[11px] font-bold border-b border-white/20">
        <div className="flex items-center gap-4">
          <span className="bg-red-500 px-2 py-0.5 rounded text-[10px] animate-pulse">Accounting Voucher Creation</span>
          <span className="opacity-70">My Sharma Pvt Ltd</span>
        </div>
        <div className="flex gap-4 opacity-70">
          <span>Ctrl + M</span>
          <X className="cursor-pointer hover:text-red-400" size={14} onClick={onClose} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Tally Sidebar (Requested Function Keys) */}
        <div className="w-56 bg-white border-r border-slate-300 flex flex-col p-1 gap-1">
          {activeVoucherTypes.map((v) => (
            <button
              key={v.key}
              onClick={() => setVoucherType(v.type as any)}
              className={`flex justify-between items-center px-3 py-2 rounded text-xs font-bold transition-all
                ${voucherType === v.type ? `text-white shadow-lg ${v.color}` : 'text-slate-600 hover:bg-slate-50 hover:shadow-sm'}
              `}
            >
              <span>{v.key}: {v.label}</span>
              {voucherType === v.type && <ChevronRight size={12} />}
            </button>
          ))}
          <div className="mt-auto border-t border-slate-300 pt-2 space-y-1">
            <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">F11: Features</button>
            <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">F12: Configure</button>
          </div>
        </div>

        {/* Main Entry Area */}
        <div className="flex-1 flex flex-col p-6 bg-[#F5F9F5] shadow-inner relative transition-all overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-4">
              {['Sales', 'Purchase'].includes(voucherType) && (
                <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
                  <label className="w-32 text-xs font-bold text-slate-600">Scan / Code</label>
                  <span className="text-slate-400">:</span>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanValue}
                    onChange={e => setScanValue(e.target.value)}
                    placeholder="Scan barcode, product code, or batch no..."
                    className="w-80 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-black outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#1D3557] text-white text-[10px] font-black uppercase border border-blue-900 hover:bg-blue-800"
                  >
                    Add
                  </button>
                  {scanMessage && (
                    <span className="text-[10px] font-bold text-slate-500 max-w-72 truncate">{scanMessage}</span>
                  )}
                </form>
              )}
              <div className="flex items-center gap-4">
                <span className="bg-red-500 text-white px-3 py-0.5 text-xs font-black shadow-sm uppercase">{voucherType}</span>
                <span className="text-xs font-bold text-slate-700">No. <span className="border-b border-dashed border-slate-400 px-4">{invoiceNo}</span></span>
                {voucherType === 'Contra' && <span className="ml-10 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 rounded border border-emerald-100">BANK / CASH TRANSFER</span>}
              </div>
              
              <div className="grid grid-cols-1 gap-3 relative z-50">
                <div className="flex items-center gap-2">
                  <label className="w-32 text-xs font-bold text-slate-600">
                    {voucherType === 'Contra' || voucherType === 'Payment' || voucherType === 'Receipt' ? 'Account (Dr/Cr)' : 'Party A/c name'}
                  </label>
                  <span className="text-slate-400">:</span>
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={partyName} 
                      onChange={e => {
                        setPartyName(e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      onFocus={() => {
                        setShowDropdown({ type: 'party' });
                        setSearchQuery(partyName);
                        setDropdownSelectedIndex(0);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(null), 150)}
                      onKeyDown={(e) => handleKeyDownOnInput(e, undefined, 'party')}
                      placeholder={voucherType === 'Contra' ? 'e.g. Petty Cash / HDFC Bank' : 'Select Account...'}
                      className="w-full bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                    />
                    {renderDropdown('party')}
                  </div>
                </div>

                {voucherType === 'Sales' && (
                   <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">Patient Name</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={patientName} 
                         onChange={e => setPatientName(e.target.value)}
                         placeholder="Enter Patient Name"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">Mobile No.</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={customerMobile} 
                         onChange={e => setCustomerMobile(e.target.value)}
                         placeholder="Enter Mobile Number"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">Patient Address</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={patientAddress} 
                         onChange={e => setPatientAddress(e.target.value)}
                         placeholder="Enter Address"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">Doctor Name</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={doctorName} 
                         onChange={e => setDoctorName(e.target.value)}
                         placeholder="Enter Doctor Name"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">ABHA No.</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={abhaNo} 
                         onChange={e => setAbhaNo(e.target.value)}
                         placeholder="Enter ABHA Number"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-32 text-xs font-bold text-slate-600">ABHA Address</label>
                       <span className="text-slate-400">:</span>
                       <input 
                         type="text" 
                         value={abhaAddress} 
                         onChange={e => setAbhaAddress(e.target.value)}
                         placeholder="Enter ABHA Address"
                         className="flex-1 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                       />
                     </div>
                   </div>
                 )}
                {['Sales', 'Purchase'].includes(voucherType) && (
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-xs font-bold text-slate-600">{voucherType === 'Sales' ? 'Sales Ledger' : 'Purchase Ledger'}</label>
                    <span className="text-slate-400">:</span>
                    <input 
                      type="text" 
                      value={salesLedger} 
                      onChange={e => setSalesLedger(e.target.value)}
                      className="w-48 bg-transparent border-b border-slate-300 outline-none text-xs font-black focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="bg-transparent border-b border-slate-300 text-xs font-black outline-none"
              />
            </div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#D4E2D4] text-[10px] font-black text-slate-700 uppercase tracking-widest border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300">
                    {['Sales', 'Purchase'].includes(voucherType) ? 'Name of Item' : 'Particulars'}
                  </th>
                  <th className="p-2 w-32 border-r border-slate-300 text-right">
                    {['Sales', 'Purchase'].includes(voucherType) ? 'Quantity' : 'Debit'}
                  </th>
                  <th className="p-2 w-32 border-r border-slate-300 text-right">
                    {['Sales', 'Purchase'].includes(voucherType) ? 'Rate' : 'Credit'}
                  </th>
                  <th className="p-2 w-40 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="group relative focus-within:z-50">
                    <td className="p-0 border-r border-slate-200 relative">
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={e => {
                          handleItemChange(idx, 'name', e.target.value);
                          setSearchQuery(e.target.value);
                        }}
                        onFocus={() => {
                          setShowDropdown({ type: 'item', index: idx });
                          setSearchQuery(item.name);
                          setDropdownSelectedIndex(0);
                        }}
                        onBlur={() => setTimeout(() => setShowDropdown(null), 150)}
                        onKeyDown={(e) => handleKeyDownOnInput(e, idx, 'item')}
                        placeholder={idx === items.length - 1 ? 'End of List' : ''}
                        className="w-full h-8 px-2 bg-transparent outline-none text-xs font-bold focus:bg-blue-50/50"
                      />
                      {renderDropdown('item', idx)}
                    </td>
                    <td className="p-0 border-r border-slate-200">
                      <div className="flex items-center">
                        <input 
                          type="text" 
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full h-8 px-2 bg-transparent outline-none text-xs font-bold text-right focus:bg-blue-50/50"
                        />
                        <span className="text-[9px] text-slate-400 pr-2">pcs</span>
                      </div>
                    </td>
                    <td className="p-0 border-r border-slate-200">
                      <input 
                        type="text" 
                        value={item.rate}
                        onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full h-8 px-2 bg-transparent outline-none text-xs font-bold text-right focus:bg-blue-50/50"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <span className="text-xs font-black text-slate-700">
                        {item.amount > 0 ? item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Empty rows to fill space */}
                {[...Array(Math.max(0, 10 - items.length))].map((_, i) => (
                  <tr key={`empty-${i}`} className="h-8 border-b border-slate-50 last:border-0">
                    <td className="border-r border-slate-200"></td>
                    <td className="border-r border-slate-200"></td>
                    <td className="border-r border-slate-200"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-black">
                <tr>
                  <td colSpan={3} className="p-2 text-right text-xs uppercase tracking-widest text-slate-500">Total</td>
                  <td className="p-2 text-right text-sm text-[#1D3557]">₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Narration Footer */}
          <div className="mt-4 flex items-start gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase mt-1">Narration:</label>
            <textarea 
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded p-2 text-xs outline-none focus:border-blue-500 h-16 resize-none shadow-inner"
              placeholder="Enter voucher narration..."
            />
          </div>

          {/* Action Ribbon */}
          <div className="mt-6 flex justify-between items-center bg-[#D4E2D4] p-3 border border-slate-400 rounded shadow-md">
             <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="px-6 py-1.5 bg-white border border-slate-400 text-slate-700 text-[11px] font-black uppercase hover:bg-red-50 hover:text-red-700 transition-all flex items-center gap-2"
                >
                  <span className="text-red-500">Q</span>: Quit
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-6 py-1.5 bg-white border border-slate-400 text-slate-700 text-[11px] font-black uppercase hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2"
                >
                  <span className="text-blue-500">D</span>: Delete
                </button>
             </div>
             
             <div className="flex gap-3">
                {['Sales', 'Purchase'].includes(voucherType) && (
                  <label className="flex items-center gap-2 bg-white border border-slate-400 px-4 py-1.5 text-[10px] font-black uppercase text-slate-600 shadow-sm">
                    <input
                      type="checkbox"
                      checked={postAccountingVoucher}
                      onChange={e => setPostAccountingVoucher(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#1D3557]"
                    />
                    Post accounting voucher
                  </label>
                )}
                <button 
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="px-8 py-1.5 bg-white border border-slate-400 text-slate-700 text-[11px] font-black uppercase hover:bg-slate-50 shadow-sm flex items-center gap-2"
                >
                  <Printer size={14} className="text-slate-400"/> Print Invoice
                </button>
                <button 
                   onClick={() => handleSave(false)}
                   disabled={loading || calculateTotal() === 0}
                   className="px-10 py-1.5 bg-[#1D3557] text-white text-[11px] font-black uppercase hover:bg-blue-800 shadow-xl flex items-center gap-2"
                >
                  {loading ? 'Processing...' : <><span className="text-emerald-400">A</span>: Accept</>}
                </button>
             </div>
          </div>

          {/* Absolute Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03] select-none">
             <h1 className="text-7xl font-black whitespace-nowrap">METAPHARSIC ERP</h1>
          </div>
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <div className="bg-[#1D3557] text-white/60 flex justify-between items-center px-4 py-0.5 text-[9px] font-bold uppercase tracking-wider">
        <div className="flex gap-4">
          <span>Server: Metapharsic-Prod-01</span>
          <span>Latency: 12ms</span>
        </div>
        <div className="flex gap-4">
          <span className="text-blue-200">Press F1 for Help</span>
          <span>Ver 4.2.0</span>
        </div>
      </div>
    </div>
  );
};

export default TallyVoucherEntry;
