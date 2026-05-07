import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Search, Plus, Archive, Calculator, TrendingUp, Download, Printer, RefreshCw, AlertCircle, Edit3, Globe, Info } from 'lucide-react';
import { ERPLayout, FilterBar, DataTable, StatCard, Badge, Tabs } from './UniversalLayout';
import { useDataFetch, useDatabaseStatus, useSearch, usePagination } from '../hooks/useDataFetch';
import { useCompany } from '../context/CompanyContext';
import { utils, writeFile } from 'xlsx';
import { printReport } from '../utils/accountingExport';
import { apiClient } from '../services/apiClient';

const SaveIcon = Save;

const STOCK_GROUPS = ['Primary', 'Medicines', 'Surgicals', 'Medical Devices', 'FMCG', 'Raw Materials', 'Finished Goods', 'Packaging'];
const STOCK_CATEGORIES = ['General', 'General - Fast Moving', 'Life Saving', 'Schedule H', 'Schedule H1', 'Narcotics', 'Cold Chain', 'Costly Items'];
const UOM_LIST = ['Nos', 'Strip', 'Box', 'Kg', 'Litre', 'Sheet', 'Dozen', 'Carton'];
const GST_RATES = [0, 5, 12, 18, 28];

export const ItemMaster: React.FC = () => {
  const { company } = useCompany();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');

  // ============================================================
  // DATABASE STATUS CHECK (Top Priority)
  // ============================================================
  const { status: dbStatus } = useDatabaseStatus();

  // ============================================================
  // FETCH DATA FROM DATABASE (Unified Design System)
  // ============================================================
  const { data: fetchResult, loading, error, refetch } = useDataFetch<any>(
    '/api/inventory'
  );

  const inventoryItems = useMemo(() => {
    if (fetchResult && fetchResult.data && Array.isArray(fetchResult.data)) {
      return fetchResult.data;
    }
    return Array.isArray(fetchResult) ? fetchResult : [];
  }, [fetchResult]);

  const valuation = useMemo(() => {
    if (fetchResult && fetchResult.valuation) {
      return fetchResult.valuation;
    }
    // Fallback calculation for legacy data or if API doesn't provide it
    return {
      totalAssetValue: (inventoryItems || []).reduce((acc: number, curr: any) => acc + ((curr?.currentStock || 0) * (curr?.purchaseRate || 0)), 0),
      totalMarketValue: (inventoryItems || []).reduce((acc: number, curr: any) => acc + ((curr?.currentStock || 0) * (curr?.mrp || 0)), 0),
      totalSkus: inventoryItems.length
    };
  }, [fetchResult, inventoryItems]);

  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'ALL', 
    group: 'ALL'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PRICING' | 'STATUTORY' | 'INVENTORY' | 'SCHEMES' | 'BRANCH_STOCK'>('GENERAL');
  const [listTab, setListTab] = useState('LIST');

  const defaultForm = {
    itemCode: '', itemName: '', genericName: '', manufacturer: '', stockGroup: 'Medicines', stockCategory: 'General',
    baseUom: 'Strip', altUom: 'Box', conversionFactor: 10,
    maintainBatches: true, trackExpiry: true,
    hsnCode: '', taxRate: 12, taxType: 'Taxable',
    openingStock: 0, openingValue: 0,
    reorderLevel: 0, minStockLevel: 0,
    isActive: true,
    scheme: '',
    mrp: 0, purchaseRate: 0, ptr: 0, pts: 0, sellingRate: 0, landingCost: 0, marginPercent: 0,
    branchDistribution: [
      { id: 'BR-001', name: 'Delhi Headquarters', type: 'HQ/Main', stock: 0, status: 'Healthy', last: '-' },
      { id: 'BR-002', name: 'Mumbai Logistics Hub', type: 'Distribution', stock: 0, status: 'Normal', last: '-' },
      { id: 'BR-003', name: 'Lucknow Retail', type: 'Retail Outlet', stock: 0, status: 'Critical', last: '-' }
    ]
  };
  const [form, setForm] = useState(defaultForm);

  // Compute Total Opening Stock from Branch Distribution
  useEffect(() => {
    if (activeTab === 'BRANCH_STOCK') {
       const totalStock = form.branchDistribution.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
       if (totalStock !== Number(form.openingStock)) {
          setForm(prev => ({...prev, openingStock: totalStock}));
       }
    }
  }, [form.branchDistribution, activeTab]);

  useEffect(() => {
    const pRate = Number(form.purchaseRate) || 0;
    const sRate = Number(form.sellingRate) || 0;
    const tRate = Number(form.taxRate) || 12;

    const tax = (pRate * tRate) / 100;
    const landing = Number((pRate + tax).toFixed(2));
    
    let margin = 0;
    if (landing > 0 && sRate > landing) {
      margin = Number((((sRate - landing) / landing) * 100).toFixed(1));
    }
    
    setForm(prev => ({ ...prev, landingCost: landing, marginPercent: margin }));
  }, [form.purchaseRate, form.taxRate, form.sellingRate]);

  const searchFields = useMemo(() => ['name', 'genericName', 'code'], []);
  const { query, setQuery, results: searchResults } = useSearch(
    inventoryItems,
    searchFields
  );

  const filteredData = useMemo(() => {
    if (!searchResults) return [];
    return searchResults.filter((item) => {
      if (listTab === 'LOW_STOCK') return item.currentStock <= (item.reorderLevel || 10);
      if (listTab === 'EXPIRY') return item.expiryStatus === 'EXPIRING_SOON' || item.expiryStatus === 'EXPIRED';
      
      if (filters.status === 'LOW_STOCK') return item.currentStock <= (item.reorderLevel || 10);
      if (filters.status === 'EXPIRING') return item.expiryStatus === 'EXPIRING_SOON';
      if (filters.status === 'EXPIRED') return item.expiryStatus === 'EXPIRED';
      return true;
    });
  }, [searchResults, filters.status, listTab]);

  const pagination = usePagination(filteredData, 50);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'FORM') {
        if (e.key === 'F8') {
          e.preventDefault();
          handleSave();
        }
        if (e.key === 'Escape') {
          setView('LIST');
          setEditingId(null);
          setForm(defaultForm);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, form, editingId]);

  const handleRefresh = async () => {
    await refetch();
    setSuccessMsg('Master Ledger synchronized with Database');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!form.itemCode?.trim() || !form.itemName?.trim() || !form.genericName?.trim() || !form.manufacturer?.trim()) {
      alert("Item Code, Product Name, Generic Name and Manufacturer are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.itemName,
        genericName: form.genericName,
        code: form.itemCode,
        manufacturer: form.manufacturer,
        category: form.stockGroup,
        reorderLevel: Number(form.reorderLevel) || 0,
        reorderQty: 100,
        mrp: Number(form.mrp) || 0,
        ptr: Number(form.ptr) || 0,
        pts: Number(form.pts) || 0,
        purchaseRate: Number(form.purchaseRate) || 0,
        sellingRate: Number(form.sellingRate) || 0,
        hsnCode: form.hsnCode,
        taxRate: Number(form.taxRate) || 0,
        openingStock: Number(form.openingStock) || 0,
        scheme: form.scheme,
        uom: form.baseUom,
        minStockLevel: Number(form.minStockLevel) || 0,
        maintainBatches: form.maintainBatches,
        trackExpiry: form.trackExpiry,
        isActive: form.isActive,
        branchDistribution: form.branchDistribution
      };

      console.log("SENDING PAYLOAD TO BACKEND:", JSON.stringify(payload, null, 2));

      if (editingId) {
        await apiClient.put(`/api/inventory/${editingId}`, payload);
      } else {
        await apiClient.post('/api/inventory', payload);
      }
      
      setSuccessMsg(editingId ? 'SKU Updated Successfully' : 'SKU Created Successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      setView('LIST');
      setEditingId(null);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Save failed: Database connection error or duplicate code.');
    } finally { setSaving(false); }
  };

  const handleExport = () => {
    const rows = filteredData.map(i => ({ 'Code': i.code, 'Name': i.name, 'Stock': i.currentStock, 'Value': i.totalValue }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Items');
    writeFile(wb, 'ItemMaster.xlsx');
  };

  const handlePrint = () => {
    printReport('Item Master', 'Inventory Items', company);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ 
      ...defaultForm, 
      itemCode: item.code || '',
      itemName: item.name || '',
      genericName: item.genericName || '',
      manufacturer: item.manufacturer || '',
      stockGroup: item.category || 'Medicines',
      openingStock: parseFloat(item.openingStock || item.currentStock || 0),
      reorderLevel: parseFloat(item.reorderLevel || 0),
      minStockLevel: parseFloat(item.minStockLevel || 0),
      purchaseRate: parseFloat(item.purchaseRate || 0),
      sellingRate: parseFloat(item.sellingRate || 0),
      mrp: parseFloat(item.mrp || 0),
      ptr: parseFloat(item.ptr || 0),
      pts: parseFloat(item.pts || 0),
      hsnCode: item.hsnCode || '',
      taxRate: parseFloat(item.taxRate || 12),
      scheme: item.scheme || '',
      baseUom: item.uom || 'Nos',
      maintainBatches: item.maintainBatches !== undefined ? item.maintainBatches : true,
      trackExpiry: item.trackExpiry !== undefined ? item.trackExpiry : true,
      isActive: item.isActive !== undefined ? item.isActive : true,
      branchDistribution: item.branchDistribution ? (typeof item.branchDistribution === 'string' ? JSON.parse(item.branchDistribution) : item.branchDistribution) : defaultForm.branchDistribution
    });
    setView('FORM');
  };

  // ============================================================
  // DATABASE CONNECTION CHECK 
  // ============================================================
  if (!dbStatus.connected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto mt-8">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">⚠️ Database Connection Failed</h3>
            <p className="text-red-700 text-sm mt-1">{dbStatus.error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: FORM VIEW (The extensive Item Master Create/Edit)
  // ============================================================
  if (view === 'FORM') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden">
        <div className="bg-[#1D3557] text-white px-4 py-2 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-blue-300"/>
            <h3 className="font-bold tracking-wider text-sm uppercase">{editingId ? 'Edit' : 'Create'} Item Master</h3>
          </div>
          <button onClick={() => { setView('LIST'); setEditingId(null); setForm(defaultForm); }} className="text-slate-300 hover:text-white uppercase text-[10px] font-black tracking-widest bg-white/10 px-3 py-1 rounded transition-colors">Close (Esc)</button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200 flex flex-wrap px-4 gap-6 shrink-0 shadow-sm z-10 w-full overflow-x-auto custom-scrollbar">
            {[
              { id: 'GENERAL', label: 'General Info' },
              { id: 'PRICING', label: 'Pricing Matrix' },
              { id: 'STATUTORY', label: 'GST / HSN' },
              { id: 'INVENTORY', label: 'Stock / Reorder' },
              { id: 'SCHEMES', label: 'Offers / Schemes' },
              { id: 'BRANCH_STOCK', label: 'Enterprise Distribution' }
            ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 text-[10px] font-black uppercase border-b-2 transition-all tracking-widest whitespace-nowrap ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 scroll-smooth">
            <div className="max-w-5xl mx-auto space-y-6">
              {activeTab === 'GENERAL' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Item Code *</label>
                      <input value={form.itemCode} onChange={e => setForm({...form, itemCode: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="e.g. ITM-765"/>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Product Name *</label>
                      <input value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="Brand Name"/>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Generic Name (Salt) *</label>
                      <input value={form.genericName} onChange={e => setForm({...form, genericName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="Generic salt composition"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Manufacturer / Company *</label>
                      <input value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="Manufacturing company"/>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Stock Group</label>
                      <select value={form.stockGroup} onChange={e => setForm({...form, stockGroup: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                        {STOCK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Category</label>
                      <select value={form.stockCategory} onChange={e => setForm({...form, stockCategory: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                        {STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Unit of Measure</label>
                      <select value={form.baseUom} onChange={e => setForm({...form, baseUom: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                        {UOM_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Is Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'PRICING' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Purchase Rate</label>
                        <TrendingUp size={16} className="text-blue-500"/>
                      </div>
                      <div className="relative">
                         <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                         <input type="number" 
                            step="0.01"
                            value={form.purchaseRate} 
                            onChange={e => setForm({...form, purchaseRate: e.target.value === '' ? '' : e.target.value})} 
                            className="w-full text-3xl font-black pl-5 pr-2 py-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none transition-all placeholder-slate-200" 
                            placeholder="0.00"
                         />
                      </div>
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Estimated Landing Cost:</span>
                        <span className="text-slate-700">₹{form.landingCost}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Selling Rate</label>
                        <TrendingUp size={16} className="text-emerald-500 rotate-45"/>
                      </div>
                      <div className="relative">
                         <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                         <input type="number" 
                            step="0.01"
                            value={form.sellingRate} 
                            onChange={e => setForm({...form, sellingRate: e.target.value === '' ? '' : e.target.value})} 
                            className="w-full text-3xl font-black pl-5 pr-2 py-2 border-b-2 border-slate-100 focus:border-blue-500 outline-none transition-all placeholder-slate-200"
                            placeholder="0.00"
                         />
                      </div>
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Potential Margin:</span>
                        <span className={`${form.marginPercent > 20 ? 'text-green-600' : 'text-amber-600'}`}>{form.marginPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">MRP (Max Retail)</label>
                        <input type="number" step="0.01" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value === '' ? '' : e.target.value})} className="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold outline-none" placeholder="0.00"/>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">PTR (Retailer Rate)</label>
                        <input type="number" step="0.01" value={form.ptr} onChange={e => setForm({...form, ptr: e.target.value === '' ? '' : e.target.value})} className="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold outline-none" placeholder="0.00"/>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">PTS (Stockist Rate)</label>
                        <input type="number" step="0.01" value={form.pts} onChange={e => setForm({...form, pts: e.target.value === '' ? '' : e.target.value})} className="w-full p-2 bg-slate-50 border rounded-lg text-sm font-bold outline-none" placeholder="0.00"/>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'STATUTORY' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">HSN / SAC Code</label>
                         <input value={form.hsnCode} onChange={e => setForm({...form, hsnCode: e.target.value})} className="w-full p-3 border rounded-xl text-lg font-black tracking-widest outline-none blur-none transition-all" placeholder="3004xxxx"/>
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">GST Rate (%)</label>
                         <div className="flex gap-2">
                            {GST_RATES.map(rate => (
                              <button key={rate} onClick={() => setForm({...form, taxRate: rate})} className={`flex-1 py-3 rounded-xl border font-black text-sm transition-all ${form.taxRate === rate ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                {rate}%
                              </button>
                            ))}
                         </div>
                      </div>
                   </div>
                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-xs font-medium flex gap-3 items-center">
                      <AlertCircle size={18} className="text-blue-500 shrink-0"/>
                      Standard HSN codes for pharmaceuticals are typically 3004 (Medicines) or 9018 (Devices).
                   </div>
                </div>
              )}

               {activeTab === 'INVENTORY' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Opening Enterprise Stock</label>
                         <div className="flex items-center gap-4">
                            <input type="number" 
                               value={form.openingStock || ''} 
                               onChange={e => setForm({...form, openingStock: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
                               className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black outline-none focus:border-blue-500 transition-all" 
                               placeholder="0"
                            />
                            <div className="text-slate-400 font-bold">{form.baseUom}</div>
                         </div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Opening Value: <span className="text-slate-700">₹{form.openingValue}</span></div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Maintain Batch Integrity</span>
                            <input type="checkbox" checked={form.maintainBatches} onChange={e => setForm({...form, maintainBatches: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Track Expiry Lifecycle</span>
                            <input type="checkbox" checked={form.trackExpiry} onChange={e => setForm({...form, trackExpiry: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                      <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Reorder Level</label>
                         <input type="number" 
                            value={form.reorderLevel || ''} 
                            onChange={e => setForm({...form, reorderLevel: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
                            className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold outline-none" 
                            placeholder="50"
                         />
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Min Stock Limit</label>
                         <input type="number" 
                            value={form.minStockLevel || ''} 
                            onChange={e => setForm({...form, minStockLevel: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
                            className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold outline-none" 
                            placeholder="10"
                         />
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'SCHEMES' && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                   <div className="flex items-center gap-4 text-blue-600 mb-2">
                       <Calculator size={24}/>
                       <h4 className="font-black text-lg uppercase tracking-tight">Promotional configuration</h4>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Standard Offer / Scheme</label>
                      <input value={form.scheme} onChange={e => setForm({...form, scheme: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black placeholder-slate-300 outline-none" placeholder="e.g. 10+1 or 5% DISCOUNT"/>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium italic">This scheme will be automatically suggested in Sales and Purchase vouchers.</p>
                   </div>
                </div>
              )}

              {activeTab === 'BRANCH_STOCK' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
                  <div className="bg-[#1D3557] px-6 py-4 flex justify-between items-center text-white">
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight">Enterprise Inventory distribution</h4>
                      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Real-time cross-branch visibility</p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-all shadow-lg"><RefreshCw size={14}/></button>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Branch / Location</th>
                          <th className="px-6 py-4 text-right">In-Stock Quantity</th>
                          <th className="px-6 py-4 text-center">Current Status</th>
                          <th className="px-6 py-4 text-right">Last Movement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {form.branchDistribution.map((branch, idx) => (
                          <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-black text-slate-800">{branch.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{branch.type} • {branch.id}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <input 
                                   type="number" 
                                   className="w-24 p-2 text-right border rounded-lg font-black text-blue-700 outline-none focus:border-blue-500 bg-white"
                                   value={branch.stock || ''}
                                   placeholder="0"
                                   onChange={e => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      const newDist = [...form.branchDistribution];
                                      newDist[idx].stock = val;
                                      setForm({...form, branchDistribution: newDist});
                                   }}
                                />
                                <span className="text-[10px] text-slate-400 font-bold">{form.baseUom}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                branch.stock > 100 ? 'bg-green-100 text-green-700' : 
                                branch.stock > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {branch.stock > 100 ? 'Healthy' : branch.stock > 0 ? 'Normal' : 'Critical'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">{branch.last}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-slate-50 p-4 border-t border-slate-100 text-[10px] text-slate-500 font-medium italic">
                    Note: To initiate stock movement between branches, please use the <strong>Stock Transfer</strong> voucher from the Inventory menu.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 border-t border-slate-200 flex flex-wrap justify-between items-center shadow-lg z-20 shrink-0 gap-4">
          <div className="flex gap-4">
             <div className="text-center px-4 border-r">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Landing Cost</div>
                <div className="text-xs font-black text-slate-800">₹{form.landingCost}</div>
             </div>
             <div className="text-center px-4">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Profit Margin</div>
                <div className={`text-xs font-black ${form.marginPercent > 0 ? 'text-green-600' : 'text-slate-400'}`}>{form.marginPercent}%</div>
             </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setView('LIST'); setEditingId(null); setForm(defaultForm); }} className="px-8 py-2 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all border border-slate-200">Discard Changes</button>
            <button onClick={handleSave} disabled={saving} className="px-8 py-2 text-xs font-black text-white uppercase tracking-widest bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl hover:shadow-lg hover:shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 group disabled:opacity-50">
              <SaveIcon size={14} className="group-hover:translate-y-[-1px] transition-transform"/> {saving ? 'COMMITING...' : 'SAVE TO MASTER (F8)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: LIST VIEW (Unified Design System standard)
  // ============================================================
  return (
    <ERPLayout
      title="Stock Items / Products"
      description={`Enterprise Inventory Intelligence • ${inventoryItems?.length || 0} ACTIVE SKU`}
      onRefresh={handleRefresh}
      onExport={handleExport}
      onPrint={handlePrint}
      icon={<Archive size={20} className="text-[#1D3557]"/>}
      isLoading={loading}
      actionButtons={[
        { label: '➕ New SKU (F2)', onClick: () => { setEditingId(null); setForm(defaultForm); setView('FORM'); } },
      ]}
    >
      {/* Persistence Notifications */}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load Item Master</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <FilterBar
        searchPlaceholder="Universal search for Brand, Generic, or Code..."
        searchValue={filters.searchTerm}
        onSearchChange={(v) => {
          setFilters((prev) => ({ ...prev, searchTerm: v }));
          setQuery(v);
        }}
        onRefine={() => refetch()}
        filters={[
          {
            id: 'status',
            label: 'Quick Filter',
            type: 'select',
            value: filters.status,
            onChange: (v) => setFilters(prev => ({ ...prev, status: v })),
            options: [
              { value: 'ALL', label: 'All Items' },
              { value: 'LOW_STOCK', label: 'Low Stock' },
              { value: 'EXPIRING', label: 'Expiring Soon' },
              { value: 'EXPIRED', label: 'Expired' },
            ],
          }
        ]}
      />

      <div className="mt-6 mb-6">
        <Tabs
          tabs={[
            { id: 'LIST', label: 'Inventory Master', badge: (inventoryItems || []).length },
            { id: 'LOW_STOCK', label: 'Low Stock Alerts', badge: (inventoryItems || []).filter(i => i && i.currentStock <= (i.reorderLevel || 100)).length },
            { id: 'EXPIRY', label: 'Expiry Tracker', badge: (inventoryItems || []).filter(i => i && i.expiryStatus !== 'OK').length },
            { id: 'VALUATION', label: 'Valuation Hub' }
          ]}
          activeTab={listTab}
          onChange={setListTab}
        />
      </div>

      {listTab === 'VALUATION' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-[#1D3557] uppercase tracking-tight">Enterprise Asset Valuation</h3>
              <button 
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-200 shadow-sm"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> SYNC WITH DB
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Global Asset Value</span>
                <span className="text-2xl font-black text-blue-700">₹{(valuation.totalAssetValue / 100000).toFixed(2)}L</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Market Value (MRP)</span>
                <span className="text-2xl font-black text-emerald-700">₹{(valuation.totalMarketValue / 100000).toFixed(2)}L</span>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl flex gap-3">
                <Info size={16} className="shrink-0 text-blue-500"/>
                <div className="space-y-1">
                  <p className="text-xs text-slate-600 font-bold">Consolidated Valuation Logic</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Automatically reconciled against {valuation.totalSkus || inventoryItems.length} SKUs across all branches.
                    Last Database Sync: <span className="text-slate-600 font-black">{new Date().toLocaleTimeString()}</span>
                  </p>
                </div>
              </div>            </div>
          </div>
          <div className="bg-[#1D3557] p-8 rounded-2xl text-white relative overflow-hidden flex flex-col justify-center">
             <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Capital Investment Analysis</h3>
                <p className="text-blue-200 text-sm mb-6">Real-time synchronization with the General Ledger ensures your stock value accurately reflects in Balance Sheets.</p>
                <div className="flex gap-4">
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-black uppercase tracking-widest border border-white/20">Sync Active</div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-black uppercase tracking-widest border border-white/20">Audit Ready</div>
                </div>
             </div>
             <Globe size={160} className="absolute -right-16 -bottom-16 opacity-10" />
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            { 
              key: 'identity', 
              label: 'Identity & Source', 
              width: '25%', 
              render: (v, row) => (
               <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                   <Archive size={16}/>
                 </div>
                 <div className="min-w-0">
                   <div className="font-black text-[#1D3557] truncate leading-tight uppercase text-xs">{row.name}</div>
                   <div className="text-[9px] text-blue-600 font-bold italic truncate">{row.genericName || 'No Generic'}</div>
                   <div className="flex items-center gap-1.5 mt-1">
                     <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-sm tracking-tighter uppercase">{row.code}</span>
                     <span className="text-[8px] text-slate-400 font-bold uppercase truncate">{row.manufacturer || 'N/A'}</span>
                   </div>
                 </div>
               </div>
              ) 
            },
            { 
              key: 'financials', 
              label: 'Financial Intelligence', 
              width: '18%', 
              align: 'right',
              render: (v, row) => {
                const margin = row.purchaseRate > 0 ? (((row.mrp - row.purchaseRate) / row.purchaseRate) * 100).toFixed(1) : '0';
                return (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">MRP:</span>
                      <span className="font-black text-slate-800 text-xs">₹{(row.mrp || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">PTR:</span>
                      <span className="font-bold text-slate-600 text-[10px]">₹{(row.ptr || 0).toLocaleString()}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${Number(margin) > 20 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {margin}% Margin
                    </div>
                  </div>
                );
              }
            },
            { 
              key: 'stock_health', 
              label: 'Stock Health', 
              width: '18%', 
              align: 'center',
              render: (v, row) => {
                const stock = row.currentStock || 0;
                const reorder = row.reorderLevel || 100;
                const health = (stock / (reorder * 2)) * 100;
                const status = stock <= reorder ? 'CRITICAL' : stock <= reorder * 1.5 ? 'LOW' : 'HEALTHY';
                
                return (
                  <div className="w-full max-w-[120px] mx-auto space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                      <span className={status === 'CRITICAL' ? 'text-red-600' : 'text-slate-500'}>{stock} {row.baseUom}</span>
                      <span className="text-slate-400">Target: {reorder}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${status === 'CRITICAL' ? 'bg-red-500' : status === 'LOW' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(health, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-center">
                       <span className={`text-[7px] font-black tracking-widest px-1.5 py-0.5 rounded ${status === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                         {status}
                       </span>
                    </div>
                  </div>
                );
              }
            },
            { 
              key: 'compliance', 
              label: 'Statutory & Tax', 
              width: '12%', 
              align: 'center',
              render: (v, row) => (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">HSN:</span>
                    <span className="text-[10px] font-black text-slate-700">{row.hsnCode || '---'}</span>
                  </div>
                  <Badge 
                    text={`${row.taxRate || 0}% GST`} 
                    variant={(row.taxRate || 0) > 12 ? 'danger' : 'success'} 
                  />
                </div>
              )
            },
            { 
              key: 'traceability', 
              label: 'Traceability', 
              width: '10%', 
              align: 'center', 
              render: (v, row) => (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className={`p-1.5 rounded-lg border shadow-sm transition-all ${row.maintainBatches ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`} title="Batch Tracking">
                       <Archive size={12}/>
                    </div>
                    <div className={`p-1.5 rounded-lg border shadow-sm transition-all ${row.trackExpiry ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`} title="Expiry Tracking">
                       <RefreshCw size={12}/>
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                    {row.batchCount || 0} Batches
                  </span>
                </div>
              ) 
            },
            { key: 'actions', label: 'Actions', width: '8%', align: 'center', render: (v, row) => (
               <div className="flex gap-1 justify-center">
                 <button onClick={() => handleEdit(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-90" title="Edit Master Record">
                   <Edit3 size={16}/>
                 </button>
                 <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="View Detailed Analytics">
                    <TrendingUp size={16}/>
                 </button>
               </div>
            ) }
          ]}
          data={pagination.paginatedData || []}
          loading={loading}
          emptyMessage="📭 No data found for the selected category or filters."
          onRowClick={(row) => handleEdit(row)}
        />
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-slate-500 font-medium">
            Showing <span className="font-black text-slate-800">{pagination.paginatedData.length}</span> of <span className="font-black text-slate-800">{filteredData.length}</span> records
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.goToPage(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-5 py-2.5 border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 font-bold transition-all"
            >
              PREVIOUS
            </button>
            <div className="px-6 py-2.5 bg-slate-100 text-[#1D3557] font-black rounded-xl">
              PAGE {pagination.currentPage} / {pagination.totalPages}
            </div>
            <button
              onClick={() => pagination.goToPage(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-5 py-2.5 border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 font-bold transition-all"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </ERPLayout>
  );
};

export default ItemMaster;
