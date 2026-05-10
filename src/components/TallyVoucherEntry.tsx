
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
 Plus, Printer, Save, X, Search, ChevronRight, 
 ArrowRight, Calculator, Clock, HelpCircle, AlertCircle, Trash2 
} from 'lucide-react';
import { useDataFetch } from '../hooks/useDataFetch';
import { useCompany } from '../context/CompanyContext';
import { apiClient } from '../services/apiClient';
import { saveInvoice, savePurchase } from '../services/databaseService';
import { printPOSInvoice } from '../utils/accountingExport';
import { numberToWords } from '../utils/numberToWords';
import type { Purchase, SalesInvoice, SalesInvoiceItem } from '../types';
import { 
 Activity, Dna, Heart, Stethoscope, User, MapPin, 
 Phone, Hash, Pill, Beaker, FileText, Settings
} from 'lucide-react';

interface VoucherEntryProps {
 initialType?: 'Sales' | 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Purchase' | 'Return';
 onClose: () => void;
 onSuccess?: () => void;
 initialItems?: any[];
 editingInvoice?: any;
}

const TallyVoucherEntry: React.FC<VoucherEntryProps> = ({ initialType = 'Sales', onClose, onSuccess, initialItems, editingInvoice }) => {
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

 useEffect(() => {
 if (editingInvoice) {
 setVoucherType(initialType === 'Return' ? 'Return' : 'Sales');
 setInvoiceNo(editingInvoice.invoiceNumber || editingInvoice.invoice_number || '1');
 setDate(editingInvoice.date ? new Date(editingInvoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
 setPartyName(editingInvoice.customerName || editingInvoice.customer_name || 'Counter Customer');
 setPatientName(editingInvoice.patientName || editingInvoice.patient_name || '');
 setCustomerMobile(editingInvoice.customerMobile || editingInvoice.customer_mobile || '');
 setDoctorName(editingInvoice.doctorName || editingInvoice.doctor_name || '');
 
 const invItems = editingInvoice.items || [];
 if (invItems.length > 0) {
 setItems(
 invItems.map((item: any) => ({
 name: item.productName || item.product_name || '',
 quantity: String(item.quantity || ''),
 rate: String(item.rate || item.selling_rate || ''),
 amount: (item.quantity || 0) * (item.rate || item.selling_rate || 0),
 product_id: item.productId || item.product_id,
 batch_id: item.batchId || item.batch_id,
 batchNumber: item.batchNumber || item.batch_number,
 expiryDate: item.expiryDate || item.expiry_date,
 mrp: item.mrp || item.rate || item.selling_rate,
 gstPercent: item.gstPercent || item.gst_percent || 0
 })).concat({ name: '', quantity: '', rate: '', amount: 0 })
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
 const { data: productsData } = useDataFetch('/api/pos/products');
 const { data: partiesData } = useDataFetch('/api/pos/parties');
 const { data: accountsData } = useDataFetch('/api/accounting/chart-of-accounts');
 const { data: dbVoucherTypes } = useDataFetch('/api/pos/voucher-types');

 // Dynamic voucher type mapping
 const activeVoucherTypes = useMemo(() => {
 const defaults = [
 { key: 'F4', label: 'Contra', type: 'Contra', color: 'bg-emerald-700' },
 { key: 'F5', label: 'Payment', type: 'Payment', color: 'bg-accent' },
 { key: 'F6', label: 'Receipt', type: 'Receipt', color: 'bg-indigo-700' },
 { key: 'F7', label: 'Journal', type: 'Journal', color: 'bg-purple-700' },
 { key: 'F8', label: 'Sales', type: 'Sales', color: 'bg-red-600' },
 { key: 'F9', label: 'Purchase', type: 'Purchase', color: 'bg-amber-700' },
 { key: 'F10', label: 'Returns', type: 'Return', color: 'bg-teal-700' },
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
 if (['F2', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(e.key)) {
 e.preventDefault();
 if (e.key === 'F2') {
 // Focus date input
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

 const addItem = () => {
 setItems(prev => [...prev, { name: '', quantity: '', rate: '', amount: 0 }]);
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
 
 const isSalesOrPurchase = voucherType === 'Sales' || voucherType === 'Purchase' || voucherType === 'Return';
 
 let response;
 if (isSalesOrPurchase) {
 // POS/Trade Invoice Flow
 const generatedInvoiceNo = editingInvoice ? invoiceNo : (invoiceNo.includes('-') ? invoiceNo : `${voucherType.substring(0,3).toUpperCase()}-${invoiceNo}-${Date.now().toString().slice(-4)}`);
 if (voucherType === 'Purchase') {
 const purchase = buildPurchase(generatedInvoiceNo, total);
 const savedPurchase = await savePurchase(purchase);
 response = { success: savedPurchase, data: { invoice_number: generatedInvoiceNo } };
 } else {
        const payload = {
          invoice_number: generatedInvoiceNo,
          invoice_no: generatedInvoiceNo,
          date: date,
          invoice_date: date,
          customer_name: partyName || patientName || 'Counter Customer',
          party_name: partyName || 'Counter Customer',
          patient_name: patientName,
          doctor_name: doctorName,
          payment_mode: 'Cash',
          sub_total: total,
          items: filledItems.map(i => ({
            product_id: i.product_id || 'manual',
            product_name: i.name,
            batch_id: i.batch_id,
            batch_number: i.batchNumber,
            expiry_date: i.expiryDate,
            quantity: parseFloat(i.quantity),
            rate: parseFloat(i.rate),
            selling_rate: parseFloat(i.rate),
            mrp: i.mrp || parseFloat(i.rate),
            discount_percent: 0,
            discount_amount: 0,
            taxable_value: parseFloat(i.amount || 0),
            total_amount: parseFloat(i.amount || 0),
            totalAmount: parseFloat(i.amount || 0),
            hsn: i.hsn,
            rack: i.rack,
            manufacturer: i.manufacturer,
            scheduleType: i.scheduleType,
            gst_percent: i.gstPercent || 0,
            gstPercent: i.gstPercent || 0
          })),
          net_amount: total,
          net_payable: total,
          party_id: partiesData?.data?.find((p:any) => p.name === partyName)?.id || partiesData?.find((p:any) => p.name === partyName)?.id,
          taxable_value: filledItems.reduce((acc, i) => {
            const gst = parseFloat(i.gstPercent || 0);
            const amount = parseFloat(i.amount || 0);
            return acc + (amount / (1 + gst / 100));
          }, 0),
          total_taxable: filledItems.reduce((acc, i) => {
            const gst = parseFloat(i.gstPercent || 0);
            const amount = parseFloat(i.amount || 0);
            return acc + (amount / (1 + gst / 100));
          }, 0),
          total_gst: total - filledItems.reduce((acc, i) => {
            const gst = parseFloat(i.gstPercent || 0);
            const amount = parseFloat(i.amount || 0);
            return acc + (amount / (1 + gst / 100));
          }, 0),
          status: voucherType === 'Return' ? 'Returned' : 'Completed'
        };
 try {
 if (voucherType === 'Return') {
 response = await apiClient.post('/api/pos/returns', payload);
 } else if (editingInvoice) {
 response = await apiClient.put(`/api/pos/invoices/${editingInvoice.id}`, payload);
 } else {
 response = await apiClient.post('/api/pos/invoices', payload);
 }
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

 // Accounting for POS is now handled automatically by the backend to ensure integrity.
 // The manual 'postAccountingVoucher' is only for Non-POS vouchers if needed.
 } else {
 response = await apiClient.post('/api/accounting/journal-vouchers', buildAccountingVoucherPayload(total, invoiceNo));
 }
 
 if (response && (response.success || response.id)) {
 if (onSuccess) onSuccess();
 onClose();
 }
 } catch (err) {
 console.error('Failed to save voucher:', err);
 setAlertDialog({
 isOpen: true,
 title: 'Save Failed',
 message: `Error saving ${voucherType === 'Sales' || voucherType === 'Purchase' ? 'invoice' : 'voucher'}. Check console for details.`
 });
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
 message: 'Deletion successful (Simulated for New Vouchers). In a real edit scenario, this would call the DELETE endpoint.'
 });
 setTimeout(() => onClose(), 1500);
 }
 });
 };

 const renderDropdown = (type: 'party' | 'item', index?: number) => {
 if (!showDropdown || showDropdown.type !== type) return null;
 if (type === 'item' && showDropdown.index !== index) return null;

 return (
 <div className="absolute left-0 top-full mt-0.5 w-[450px] bg-[#D4E2D4] border border-slate-400 flex flex-col shadow-2xl z-50 max-h-64 animate-in fade-in zoom-in-95 duration-100 rounded-sm overflow-hidden">
 <div className="bg-[#1D3557] text-white p-1.5 px-3 flex justify-between items-center shrink-0">
 <span className="text-[10px] font-bold uppercase tracking-widest italic">
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
 <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No matching records found.</p>
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
 ${isSelected ? 'bg-accent text-white' : 'hover:bg-blue-50 text-slate-800'}
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
 ${isSelected ? 'bg-[#1D3557] text-white shadow-none' : 'hover:bg-blue-50 text-slate-800'}
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
 ${isSelected ? 'bg-accent text-white' : 'hover:bg-blue-50 text-slate-800'}
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
 <div className="flex flex-col h-full bg-slate-50 select-none font-sans">
 {/* Top Banner */}
 <div className="bg-[#1D3557] text-white flex justify-between items-center px-6 py-2 text-[11px] font-bold uppercase tracking-wider border-b border-white/10 shadow-none z-50">
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 <div className="p-1 bg-emerald-500 rounded-lg animate-pulse">
 <Activity size={12} className="text-white" />
 </div>
 <span className="text-emerald-400">POS Terminal Active</span>
 </div>
 <span className="opacity-50 text-[10px]">|</span>
 <span className="text-slate-300 tracking-widest">{company?.name || 'Metapharsic Lifesciences'}</span>
 </div>
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2 opacity-70">
 <Clock size={12} />
 <span>{new Date().toLocaleTimeString()}</span>
 </div>
 <button 
 onClick={onClose}
 className="p-1.5 hover:bg-red-500/20 rounded-full transition-all group"
 >
 <X className="group-hover:text-red-400" size={16} />
 </button>
 </div>
 </div>

 <div className="flex-1 flex overflow-hidden">
 {/* Left Sidebar - Navigation & Voucher Types */}
 <div className="w-64 bg-white border-r border-slate-200 flex flex-col p-3 gap-2 shadow-none z-40">
 <div className="px-2 pb-2 border-b border-slate-100 mb-2">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Mode</p>
 </div>
 
 {activeVoucherTypes.map((v) => (
 <button
 key={v.key}
 onClick={() => setVoucherType(v.type as any)}
 className={`flex justify-between items-center px-4 py-3 rounded-xl text-xs font-bold transition-all group
 ${voucherType === v.type 
 ? `${v.color} text-white shadow-none ring-4 ring-slate-100 translate-x-1` 
 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'}
 `}
 >
 <div className="flex flex-col items-start">
 <span className={`text-[9px] uppercase tracking-tighter mb-0.5 ${voucherType === v.type ? 'text-white/60' : 'text-slate-400'}`}>{v.key} Shortcut</span>
 <span>{v.label}</span>
 </div>
 <ChevronRight size={14} className={`transition-transform ${voucherType === v.type ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
 </button>
 ))}
 
 <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
 <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
 <div className="flex items-center gap-2">
 <Settings size={14} /> <span>Settings</span>
 </div>
 <span className="text-[9px] opacity-50">F11</span>
 </button>
 <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
 <div className="flex items-center gap-2">
 <HelpCircle size={14} /> <span>Help Desk</span>
 </div>
 <span className="text-[9px] opacity-50">F12</span>
 </button>
 </div>
 </div>

 {/* Main Entry Area */}
 <div className="flex-1 flex flex-col p-8 bg-slate-50 relative transition-all overflow-y-auto">
 {/* Status Indicators */}
 <div className="flex justify-between items-center mb-8">
 <div className="flex items-center gap-4">
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{voucherType}</h2>
 <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-widest shadow-sm">Ready to Bill</span>
 </div>
 <p className="text-[11px] font-bold text-slate-400 mt-0.5">Voucher Reference: <span className="text-slate-600">#{invoiceNo}</span></p>
 </div>
 </div>
 
 <div className="flex gap-3">
 <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 min-w-[200px]">
 <div className="p-2 bg-blue-50 text-accent rounded-xl">
 <Clock size={20} />
 </div>
 <div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Date</p>
 <input 
 type="date" 
 value={date} 
 onChange={e => setDate(e.target.value)}
 className="text-xs font-bold text-slate-700 bg-transparent outline-none border-none p-0 cursor-pointer"
 />
 </div>
 </div>
 <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 min-w-[150px]">
 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
 <Calculator size={20} />
 </div>
 <div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Payable</p>
 <p className="text-xs font-bold text-emerald-600 tracking-tight">₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
 </div>
 </div>
 </div>
 </div>
 {/* Top Section: Scan & Party Info */}
 <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {/* Scan Section */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
 <Activity size={12} className="text-accent" /> Fast Product Scan
 </label>
 <div className="relative">
 <input
 ref={scanInputRef}
 type="text"
 value={scanValue}
 onChange={e => setScanValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') handleScanSubmit(e as any);
 }}
 placeholder="Scan barcode or batch code..."
 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-accent transition-all shadow-inner"
 />
 <div className="absolute right-3 top-2.5 flex gap-2">
 <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm">ENTER</span>
 </div>
 </div>
 {scanMessage && (
 <p className="text-[9px] font-bold text-accent flex items-center gap-1">
 <Activity size={10} /> {scanMessage}
 </p>
 )}
 </div>

 {/* Party Section */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
 <User size={12} className="text-emerald-500" /> {voucherType === 'Contra' || voucherType === 'Payment' || voucherType === 'Receipt' ? 'Account Holder' : 'Party / Customer'}
 </label>
 <div className="relative">
 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-inner focus-within:ring-4 focus-within:ring-emerald-100 focus-within:border-emerald-500 transition-all">
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
 placeholder="Search ledger..."
 className="w-full bg-transparent outline-none text-xs font-bold"
 />
 <Search size={14} className="text-slate-400" />
 </div>
 {renderDropdown('party')}
 </div>
 </div>

 {/* Patient Section Toggle (Only for Sales/Purchase) */}
 {['Sales', 'Purchase'].includes(voucherType) && (
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
 <FileText size={12} className="text-indigo-500" /> Document Reference
 </label>
 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-inner focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500 transition-all">
 <input 
 type="text" 
 value={salesLedger} 
 onChange={e => setSalesLedger(e.target.value)}
 placeholder={voucherType === 'Sales' ? 'Sales Ledger' : 'Purchase Ledger'}
 className="w-full bg-transparent outline-none text-xs font-bold"
 />
 <Settings size={14} className="text-slate-400" />
 </div>
 </div>
 )}
 </div>

 {/* Patient/Pharma Detailed Info (Expandable Section) */}
 {voucherType === 'Sales' && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
 <div className="space-y-1.5">
 <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Patient Details</label>
 <div className="relative">
 <input 
 type="text" 
 value={patientName} 
 onChange={e => setPatientName(e.target.value)}
 placeholder="Patient Name"
 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-accent transition-all"
 />
 <Stethoscope size={12} className="absolute right-3 top-2.5 text-slate-300" />
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact Number</label>
 <div className="relative">
 <input 
 type="text" 
 value={customerMobile} 
 onChange={e => setCustomerMobile(e.target.value)}
 placeholder="Phone / Mobile"
 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-accent transition-all"
 />
 <Phone size={12} className="absolute right-3 top-2.5 text-slate-300" />
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Doctor / Prescription</label>
 <div className="relative">
 <input 
 type="text" 
 value={doctorName} 
 onChange={e => setDoctorName(e.target.value)}
 placeholder="Doctor Name"
 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-accent transition-all"
 />
 <Heart size={12} className="absolute right-3 top-2.5 text-slate-300" />
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Health (ABHA)</label>
 <div className="relative">
 <input 
 type="text" 
 value={abhaNo} 
 onChange={e => setAbhaNo(e.target.value)}
 placeholder="ABHA ID Number"
 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-accent transition-all"
 />
 <Hash size={12} className="absolute right-3 top-2.5 text-slate-300" />
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="text-right">
 <input 
 type="date" 
 value={date} 
 onChange={e => setDate(e.target.value)}
 className="bg-transparent border-b border-slate-300 text-xs font-bold outline-none"
 />
 </div>

 {/* Product Entry Grid */}
 <div className="shrink-0 h-[340px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col z-10">
 <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
 <div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Product Entry</p>
 <h3 className="mt-1 text-xs font-bold text-[#1D3557] uppercase tracking-tight">Type product name, batch, quantity and rate</h3>
 </div>
 <button
 type="button"
 onClick={addItem}
 className="px-4 py-2 bg-blue-50 text-accent text-[10px] font-bold uppercase rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-2"
 >
 <Plus size={14} /> Add Row
 </button>
 </div>
 <div className="flex-1 overflow-auto">
 <table className="w-full min-w-full table-fixed text-left border-collapse">
 <thead className="sticky top-0 z-20 bg-[#1D3557] text-white">
 <tr>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[5%] text-center">#</th>
 <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[42%]">
 {['Sales', 'Purchase'].includes(voucherType) ? 'Item Description (Batch / Exp / HSN)' : 'Particulars'}
 </th>
 {['Sales', 'Purchase'].includes(voucherType) && (
 <>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[12%] text-center">Batch</th>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[9%] text-center">Expiry</th>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[8%] text-center">HSN</th>
 </>
 )}
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[7%] text-center">Qty</th>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest border-r border-white/10 w-[8%] text-right">Rate</th>
 <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest w-[9%] text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {items.map((item, idx) => (
 <tr key={idx} className="group hover:bg-blue-50/30 transition-colors">
 <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-300 border-r border-slate-100">{idx + 1}</td>
 <td className="p-0 border-r border-slate-100 relative">
 <div className="flex items-center px-4 h-10">
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
 placeholder="Type product name..."
 className="w-full bg-transparent outline-none text-xs font-bold focus:placeholder-transparent"
 />
 </div>
 {renderDropdown('item', idx)}
 {/* Inline Batch Info for Pharmacy */}
 {item.product_id && (
 <div className="absolute bottom-1 left-4 flex gap-2">
 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1 rounded">{item.manufacturer || 'METAPHARSIC'}</span>
 {item.rack && <span className="text-[8px] font-bold text-accent uppercase tracking-tighter bg-blue-50 px-1 rounded">Rack: {item.rack}</span>}
 {item.gstPercent > 0 && <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter bg-emerald-50 px-1 rounded">GST: {item.gstPercent}%</span>}
 </div>
 )}
 </td>
 {['Sales', 'Purchase'].includes(voucherType) && (
 <>
 <td className="p-0 border-r border-slate-100">
 <input 
 type="text" 
 value={item.batchNumber || ''}
 readOnly
 className="w-full h-10 px-2 bg-transparent outline-none text-[10px] font-bold text-center text-slate-500"
 />
 </td>
 <td className="p-0 border-r border-slate-100">
 <input 
 type="text" 
 value={item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : ''}
 readOnly
 className="w-full h-10 px-2 bg-transparent outline-none text-[10px] font-bold text-center text-slate-500"
 />
 </td>
 <td className="p-0 border-r border-slate-100">
 <input 
 type="text" 
 value={item.hsn || ''}
 readOnly
 className="w-full h-10 px-2 bg-transparent outline-none text-[10px] font-bold text-center text-slate-500"
 />
 </td>
 </>
 )}
 <td className="p-0 border-r border-slate-100">
 <div className="flex items-center px-2 h-10">
 <input 
 type="text" 
 value={item.quantity}
 onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
 className="w-full bg-transparent outline-none text-xs font-bold text-center focus:bg-blue-50 rounded-lg py-1 transition-all"
 />
 </div>
 </td>
 <td className="p-0 border-r border-slate-100">
 <div className="flex items-center px-3 h-10">
 <span className="text-[10px] text-slate-300 mr-1">₹</span>
 <input 
 type="text" 
 value={item.rate}
 onChange={e => handleItemChange(idx, 'rate', e.target.value)}
 className="w-full bg-transparent outline-none text-xs font-bold text-right focus:bg-blue-50 rounded-lg py-1 transition-all"
 />
 </div>
 </td>
 <td className="px-3 py-2 text-right">
 <span className="text-xs font-bold text-slate-800 tracking-tight">
 {item.amount > 0 ? `₹${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
 </span>
 </td>
 </tr>
 ))}
 {/* Fill empty space */}
 {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
 <tr key={`empty-${i}`} className="h-10">
 <td className="border-r border-slate-100"></td>
 <td className="border-r border-slate-100"></td>
 {['Sales', 'Purchase'].includes(voucherType) && (
 <>
 <td className="border-r border-slate-100"></td>
 <td className="border-r border-slate-100"></td>
 <td className="border-r border-slate-100"></td>
 </>
 )}
 <td className="border-r border-slate-100"></td>
 <td className="border-r border-slate-100"></td>
 <td></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 
 {/* Table Footer / Summary */}
 <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center z-20">
 <div className="space-y-1 max-w-[60%]">
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount in Words</p>
 <p className="text-[11px] font-bold text-slate-700 italic">
 Rupees {numberToWords(calculateTotal())} Only
 </p>
 </div>
 <div className="text-right">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Payable</p>
 <h3 className="text-2xl font-bold text-[#1D3557] tracking-tighter">
 ₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </h3>
 </div>
 </div>
 </div>

 {/* Narration Footer */}
 <div className="mt-4 flex items-start gap-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase mt-1">Narration:</label>
 <textarea 
 value={narration}
 onChange={e => setNarration(e.target.value)}
 className="flex-1 bg-white border border-slate-300 rounded p-2 text-xs outline-none focus:border-accent h-16 resize-none shadow-inner"
 placeholder="Enter voucher narration..."
 />
 </div>

 {/* Enhanced Action Ribbon */}
 <div className="mt-8 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-none z-30">
 <div className="flex gap-3">
 <button 
 onClick={onClose}
 className="px-6 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-xl hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 border border-transparent hover:border-red-100"
 >
 <X size={14} /> Close Terminal
 </button>
 <button 
 onClick={handleDelete}
 className="px-6 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-xl hover:bg-blue-50 hover:text-accent transition-all flex items-center gap-2 border border-transparent hover:border-blue-100"
 >
 <Trash2 size={14} /> Clear All
 </button>
 </div>
 
 <div className="flex gap-4">
 {!['Sales', 'Purchase', 'Return'].includes(voucherType) && (
 <label className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-xl border border-slate-100 text-[10px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-white transition-all shadow-inner">
 <input
 type="checkbox"
 checked={postAccountingVoucher}
 onChange={e => setPostAccountingVoucher(e.target.checked)}
 className="h-4 w-4 rounded-full border-slate-300 text-accent focus:ring-blue-500 transition-all"
 />
 Accounting Sync
 </label>
 )}
 <button 
 onClick={() => handleSave(true)}
 disabled={loading}
 className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-xl hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
 >
 <Printer size={14} className="text-accent"/> Print Receipt
 </button>
 <button 
 onClick={() => handleSave(false)}
 disabled={loading || calculateTotal() === 0}
 className="px-10 py-2 bg-[#1D3557] text-white text-[10px] font-bold uppercase rounded-xl hover:bg-blue-800 shadow-2xl transition-all flex items-center gap-2"
 >
 {loading ? 'Processing...' : <><Save size={14} className="text-emerald-400"/> Save Transaction</>}
 </button>
 </div>
 </div>

 {/* Absolute Watermark */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03] select-none">
 <h1 className="text-7xl font-bold whitespace-nowrap">METAPHARSIC ERP</h1>
 </div>
 </div>
 </div>
 
 {/* Bottom Status Bar */}
 <div className="bg-[#1D3557] text-white/60 flex justify-between items-center px-4 py-1 text-[9px] font-bold uppercase tracking-wider">
 <div className="flex gap-4">
 <span className="flex items-center gap-1"><span className="text-blue-300 bg-blue-900/50 px-1 rounded">F2</span> Change Date</span>
 <span className="flex items-center gap-1"><span className="text-blue-300 bg-blue-900/50 px-1 rounded">F8</span> Sales</span>
 <span className="flex items-center gap-1"><span className="text-blue-300 bg-blue-900/50 px-1 rounded">F9</span> Purchase</span>
 <span className="flex items-center gap-1"><span className="text-blue-300 bg-blue-900/50 px-1 rounded">F10</span> Return</span>
 <span>Server: Metapharsic-Prod-01</span>
 </div>
 <div className="flex gap-4">
 <span className="text-blue-200">Press F1 for Help</span>
 <span>Ver 4.2.1</span>
 </div>
 </div>
 {confirmDialog.isOpen && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
 <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
 <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
 <div className="flex items-center gap-2">
 <AlertCircle size={18} className="text-amber-400" />
 <h3 className="font-bold text-sm uppercase tracking-wider">{confirmDialog.title}</h3>
 </div>
 <button 
 onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
 className="text-white hover:text-slate-200 transition-colors"
 >
 <X size={18} />
 </button>
 </div>
 <div className="p-6 bg-slate-50 space-y-4 font-sans">
 <p className="text-xs font-bold text-slate-600 leading-relaxed">{confirmDialog.message}</p>
 </div>
 <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3 font-sans">
 <button 
 onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
 className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded shadow-sm hover:bg-slate-50 transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={() => {
 confirmDialog.onConfirm();
 setConfirmDialog({ ...confirmDialog, isOpen: false });
 }}
 className="px-6 py-2 bg-red-600 text-white text-xs font-bold uppercase rounded shadow-none hover:bg-red-700 transition-all"
 >
 Confirm Delete
 </button>
 </div>
 </div>
 </div>
 )}
 {alertDialog.isOpen && (
 <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
 <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
 <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
 <div className="flex items-center gap-2">
 <AlertCircle size={18} className="text-blue-400" />
 <h3 className="font-bold text-sm uppercase tracking-wider">{alertDialog.title}</h3>
 </div>
 <button 
 onClick={() => setAlertDialog({ ...alertDialog, isOpen: false })}
 className="text-white hover:text-slate-200 transition-colors"
 >
 <X size={18} />
 </button>
 </div>
 <div className="p-6 bg-slate-50 space-y-4 font-sans">
 <p className="text-xs font-bold text-slate-600 leading-relaxed">{alertDialog.message}</p>
 </div>
 <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end font-sans">
 <button 
 onClick={() => setAlertDialog({ ...alertDialog, isOpen: false })}
 className="px-6 py-2 bg-[#1D3557] text-white text-xs font-bold uppercase rounded shadow-none hover:bg-blue-800 transition-all"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default TallyVoucherEntry;


