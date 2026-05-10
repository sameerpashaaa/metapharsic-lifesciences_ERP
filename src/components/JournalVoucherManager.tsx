import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { JournalVoucherService, ChartOfAccountsService } from '../services/accountingService';
import { Plus, BookOpen, Save, X, AlertCircle, Search, Filter, RotateCcw, Eye, ChevronDown, ChevronRight, Printer, Download } from 'lucide-react';
import { DenseGrid } from './common/DenseGrid';
import { useCompany } from '../context/CompanyContext';
import { printJournalVoucher, exportJournalVouchers } from '../utils/accountingExport';

type VoucherEntry = { accountId: string; type: 'Debit' | 'Credit'; amount: number; costCenter?: string; narration?: string };
type ViewMode = 'LIST' | 'FORM' | 'VIEW';

const COST_CENTERS = ['Main HQ', 'Marketing', 'Operations', 'R&D', 'Sales'];

const STATUS_COLORS: Record<string, string> = {
 Posted: 'bg-green-100 text-green-700 border-green-200',
 Draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
 Reversed: 'bg-red-100 text-red-700 border-red-200',
};

export const JournalVoucherManager: React.FC = () => {
 const [view, setView] = useState<ViewMode>('LIST');
 const [vouchers, setVouchers] = useState<any[]>([]);
 const [accounts, setAccounts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
 const { company } = useCompany();

 // Form State
 const [voucherNo, setVoucherNo] = useState('');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [narration, setNarration] = useState('');
 const [reference, setReference] = useState('');
 const [entries, setEntries] = useState<VoucherEntry[]>([
 { accountId: '', type: 'Debit', amount: 0, costCenter: '', narration: '' },
 { accountId: '', type: 'Credit', amount: 0, costCenter: '', narration: '' }
 ]);
 const [error, setError] = useState('');
 const [successMsg, setSuccessMsg] = useState('');

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('All');
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');

 const loadVouchers = useCallback(async () => {
 setLoading(true);
 try {
 const filters: any = {};
 if (dateFrom) filters.dateFrom = dateFrom;
 if (dateTo) filters.dateTo = dateTo;
 if (statusFilter !== 'All') filters.status = statusFilter;
 const data = await JournalVoucherService.getAllJournalVouchers(filters);
 setVouchers(Array.isArray(data) ? data : []);
 } catch (err) {
 console.error('Error loading vouchers:', err);
 setVouchers([]);
 } finally {
 setLoading(false);
 }
 }, [dateFrom, dateTo, statusFilter]);

 useEffect(() => {
 if (view === 'LIST') loadVouchers();
 }, [view, loadVouchers]);

 useEffect(() => {
 if (view === 'FORM') {
 ChartOfAccountsService.getAllAccounts().then(setAccounts).catch(() => setAccounts([]));
 // Auto-generate voucher number
 const auto = `JV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
 setVoucherNo(auto);
 }
 }, [view]);

 const totalDebit = useMemo(() => entries.filter(e => e.type === 'Debit').reduce((a, b) => a + Number(b.amount || 0), 0), [entries]);
 const totalCredit = useMemo(() => entries.filter(e => e.type === 'Credit').reduce((a, b) => a + Number(b.amount || 0), 0), [entries]);
 const difference = Math.abs(totalDebit - totalCredit);
 const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

 const filteredVouchers = useMemo(() => {
 return vouchers.filter(v => {
 const term = searchTerm.toLowerCase();
 return !term || (v.voucherNo?.toLowerCase().includes(term)) || (v.narration?.toLowerCase().includes(term));
 });
 }, [vouchers, searchTerm]);

 const handleSubmit = async (saveAsDraft = false) => {
 if (!saveAsDraft && !isBalanced) {
 setError('Total Debit must equal Total Credit to Post.');
 return;
 }
 if (entries.some(e => !e.accountId)) {
 setError('All rows must have an account selected.');
 return;
 }
 setError('');
 setSaving(true);
 try {
 const created = await JournalVoucherService.createJournalVoucher({
 voucherNo,
 date,
 status: 'Draft', // initial creation is always draft
 narration,
 reference,
 totalDebit,
 totalCredit,
 createdBy: 'Admin',
 entries: entries.map((e, idx) => ({
 id: `line-${idx}`,
 accountId: e.accountId,
 accountCode: e.accountId,
 accountName: accounts.find(a => (a.id || a.accountCode) === e.accountId)?.accountName || e.accountId,
 debit: e.type === 'Debit' ? Number(e.amount) : 0,
 credit: e.type === 'Credit' ? Number(e.amount) : 0,
 costCenter: e.costCenter,
 narration: e.narration || narration
 }))
 });
 
 if (!saveAsDraft && created && created.id) {
 await JournalVoucherService.postJournalVoucher(created.id);
 }

 setSuccessMsg(`Voucher ${voucherNo} ${saveAsDraft ? 'saved as Draft' : 'Posted'} successfully!`);
 setTimeout(() => { setSuccessMsg(''); setView('LIST'); }, 1500);
 resetForm();
 } catch (err: any) {
 setError(err.message || 'Failed to save Journal Voucher');
 } finally {
 setSaving(false);
 }
 };

 const handleReverse = async (v: any) => {
 if (!window.confirm(`Reverse voucher ${v.voucherNo}?`)) return;
 try {
 await JournalVoucherService.reverseJournalVoucher(v.id, 'User requested reversal');
 loadVouchers();
 } catch (err: any) {
 alert('Failed to reverse: ' + err.message);
 }
 };

 const resetForm = () => {
 setVoucherNo('');
 setDate(new Date().toISOString().split('T')[0]);
 setNarration('');
 setReference('');
 setEntries([
 { accountId: '', type: 'Debit', amount: 0, costCenter: '', narration: '' },
 { accountId: '', type: 'Credit', amount: 0, costCenter: '', narration: '' }
 ]);
 setError('');
 };

 const viewVoucher = (v: any) => { setSelectedVoucher(v); setView('VIEW'); };

 // ===================== VIEW MODE =====================
 if (view === 'VIEW' && selectedVoucher) {
 return (
 <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden">
 <div className="bg-[#1D3557] text-white px-4 py-2 flex justify-between items-center shrink-0">
 <h3 className="font-bold tracking-wider text-sm flex items-center gap-2">
 <Eye size={16}/> Voucher Report — {selectedVoucher.voucherNo}
 </h3>
 <div className="flex gap-2">
 <button 
 onClick={() => printJournalVoucher(selectedVoucher, company)}
 className="border border-white/30 hover:bg-white/10 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
 >
 <Printer size={14}/> Print
 </button>
 <button onClick={() => setView('LIST')} className="text-white/70 hover:text-white uppercase text-xs font-bold px-2">← Back</button>
 </div>
 </div>
 <div className="flex-1 overflow-auto p-6 bg-slate-50">
 <div className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-sm p-6 rounded">
 <div className="grid grid-cols-3 gap-4 mb-6 border-b pb-4">
 <div><div className="text-[10px] text-slate-500 uppercase font-bold">Voucher No</div><div className="font-bold text-[#1D3557] text-lg">{selectedVoucher.voucherNo}</div></div>
 <div><div className="text-[10px] text-slate-500 uppercase font-bold">Date</div><div className="font-bold">{new Date(selectedVoucher.date).toLocaleDateString('en-IN')}</div></div>
 <div><div className="text-[10px] text-slate-500 uppercase font-bold">Status</div><span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[selectedVoucher.status] || ''}`}>{selectedVoucher.status}</span></div>
 <div className="col-span-3"><div className="text-[10px] text-slate-500 uppercase font-bold">Narration</div><div className="font-medium italic text-slate-700">{selectedVoucher.narration}</div></div>
 </div>
 <table className="w-full text-sm border-collapse">
 <thead className="bg-[#E4ECEF] text-slate-700 text-xs uppercase font-bold">
 <tr>
 <th className="p-2 text-left border-r border-slate-300">Account Ledger</th>
 <th className="p-2 text-left w-24 border-r border-slate-300">Dr/Cr</th>
 <th className="p-2 text-right w-32 border-r border-slate-300">Debit (₹)</th>
 <th className="p-2 text-right w-32">Credit (₹)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(selectedVoucher.entries || []).map((e: any, i: number) => (
 <tr key={i} className="hover:bg-blue-50/30">
 <td className="p-2 font-semibold text-slate-800 border-r border-slate-100">{e.accountName}</td>
 <td className="p-2 text-xs font-bold border-r border-slate-100"><span className={e.debit > 0 ? 'text-accent' : 'text-red-600'}>{e.debit > 0 ? 'Dr' : 'Cr'}</span></td>
 <td className="p-2 text-right font-bold border-r border-slate-100">{e.debit > 0 ? `₹${e.debit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : ''}</td>
 <td className="p-2 text-right font-bold">{e.credit > 0 ? `₹${e.credit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : ''}</td>
 </tr>
 ))}
 </tbody>
 <tfoot className="bg-[#1D3557] text-white font-bold text-sm">
 <tr>
 <td className="p-2 border-r border-slate-500">Total</td>
 <td className="p-2 border-r border-slate-500"></td>
 <td className="p-2 text-right border-r border-slate-500">₹{(selectedVoucher.totalDebit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
 <td className="p-2 text-right">₹{(selectedVoucher.totalCredit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>
 </div>
 );
 }

 // ===================== FORM MODE =====================
 if (view === 'FORM') {
 const columns = [
 { key: 'accountId', header: 'Account Ledger', type: 'select' as const, options: accounts.map(a => ({ value: a.id || a.accountCode, label: a.accountName || a.accountCode })) },
 { key: 'type', header: 'Dr/Cr', type: 'select' as const, width: '100px', options: [{ value: 'Debit', label: 'Dr' }, { value: 'Credit', label: 'Cr' }] },
 { key: 'amount', header: 'Amount (₹)', type: 'number' as const, width: '150px', align: 'right' as const },
 { key: 'costCenter', header: 'Cost Center', type: 'select' as const, width: '140px', options: COST_CENTERS.map(c => ({ value: c, label: c })) },
 { key: 'narration', header: 'Line Narration', type: 'text' as const }
 ];

 return (
 <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden">
 <div className="bg-[#1D3557] text-white px-4 py-2 flex justify-between items-center shrink-0">
 <h3 className="font-bold tracking-wider text-sm">Journal Voucher Entry</h3>
 <button onClick={() => { resetForm(); setView('LIST'); }} className="text-slate-300 hover:text-white text-xs font-bold">Cancel (Esc)</button>
 </div>

 {error && <div className="mx-4 mt-3 bg-red-50 text-red-700 border border-red-200 rounded p-2 text-xs flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
 {successMsg && <div className="mx-4 mt-3 bg-green-50 text-green-700 border border-green-200 rounded p-2 text-xs font-bold">{successMsg}</div>}

 <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
 <div className="grid grid-cols-12 gap-3 items-end">
 <div className="col-span-2">
 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Voucher No.</label>
 <input value={voucherNo} onChange={e => setVoucherNo(e.target.value)} className="w-full text-sm font-bold border-b border-slate-300 p-1 bg-yellow-50 outline-none text-red-700 focus:border-accent"/>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Voucher Date</label>
 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm font-bold border-b border-slate-300 p-1 outline-none focus:border-accent"/>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reference No.</label>
 <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref / Cheque No." className="w-full text-sm border-b border-slate-300 p-1 outline-none focus:border-accent"/>
 </div>
 <div className="col-span-6">
 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Narration (Common)</label>
 <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Being amount paid/received for..." className="w-full text-sm italic border-b border-slate-300 p-1 outline-none focus:border-accent text-slate-600"/>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-hidden flex flex-col p-4 gap-0">
 <DenseGrid
 columns={columns}
 data={entries}
 onChange={(rIdx, col, val) => {
 const newE = [...entries];
 (newE[rIdx] as any)[col] = val;
 if (col === 'type' && newE.length > rIdx + 1 && val === 'Debit') newE[rIdx + 1].type = 'Credit';
 if (col === 'type' && newE.length > rIdx + 1 && val === 'Credit') newE[rIdx + 1].type = 'Debit';
 setEntries(newE);
 }}
 onAddRow={() => setEntries([...entries, { accountId: '', type: totalDebit > totalCredit ? 'Credit' : 'Debit', amount: difference, costCenter: '', narration: '' }])}
 onRemoveRow={rIdx => { const newE = [...entries]; newE.splice(rIdx, 1); setEntries(newE); }}
 />
 <div className="flex bg-[#1D3557] text-white text-sm font-bold border-t border-slate-500 shrink-0">
 <div className="p-2 px-3 flex-1 text-right border-r border-slate-500 text-xs uppercase tracking-wider flex items-center justify-end">Totals (Dr / Cr)</div>
 <div className={`p-2 px-3 w-[150px] text-right border-r border-slate-500 ${!isBalanced && totalDebit > 0 ? 'text-red-400' : 'text-[#A8DADC]'}`}>₹{totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
 <div className={`p-2 px-3 w-[150px] text-right border-r border-slate-500 ${!isBalanced && totalCredit > 0 ? 'text-red-400' : 'text-[#A8DADC]'}`}>₹{totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
 <div className="p-2 px-3 flex items-center gap-2 text-xs w-48">
 {isBalanced ? <span className="text-green-400 font-bold">✓ Balanced</span> : <span className="text-red-400">Diff: ₹{difference.toFixed(2)}</span>}
 </div>
 <div className="p-2 w-6"></div>
 </div>
 </div>

 <div className="bg-slate-100 p-3 border-t border-slate-300 flex justify-between items-center shrink-0">
 <div className="text-xs text-slate-500">
 <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-600">Alt+S</kbd> Quick Save &nbsp;
 <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-600">Esc</kbd> Cancel
 </div>
 <div className="flex gap-2">
 <button onClick={() => handleSubmit(true)} disabled={saving} className="px-4 py-1.5 text-sm font-bold text-slate-600 border border-slate-400 rounded bg-white hover:bg-slate-50 disabled:opacity-50">Save as Draft</button>
 <button onClick={() => handleSubmit(false)} disabled={saving || !isBalanced} className="px-6 py-1.5 text-sm font-bold text-white bg-[#1D3557] rounded flex items-center gap-2 hover:bg-[#2A4B7C] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
 <Save size={14}/> {saving ? 'Posting...' : 'Post Voucher (Alt+S)'}
 </button>
 </div>
 </div>
 </div>
 );
 }

 // ===================== LIST MODE =====================
 const totalDr = filteredVouchers.reduce((s, v) => s + (v.totalDebit || 0), 0);
 const totalCr = filteredVouchers.reduce((s, v) => s + (v.totalCredit || 0), 0);

 return (
 <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden">
 {/* Header */}
 <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
 <div className="flex justify-between items-center mb-3">
 <div>
 <h3 className="text-lg font-bold text-slate-800 tracking-tight">Journal Vouchers</h3>
 <p className="text-xs text-slate-500">Non-cash adjusting entries, provisions, and opening balances</p>
 </div>
 <div className="flex gap-2">
 <button 
 onClick={() => exportJournalVouchers(filteredVouchers, company)}
 className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-sm font-bold shadow-sm"
 >
 <Download size={14}/> Export
 </button>
 <button onClick={() => { resetForm(); setView('FORM'); }} className="flex items-center gap-1 bg-[#1D3557] hover:bg-[#2A4B7C] text-white px-3 py-1.5 rounded text-sm font-bold shadow-sm">
 <Plus size={16}/> New Voucher (F2)
 </button>
 </div>
 </div>
 {/* Filters */}
 <div className="flex gap-3 items-end flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search voucher no, narration..." className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm w-full outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"/>
 </div>
 <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm font-bold bg-white outline-none w-32">
 <option value="All">All Status</option>
 <option value="Posted">Posted</option>
 <option value="Draft">Draft</option>
 <option value="Reversed">Reversed</option>
 </select>
 <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none"/>
 <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none"/>
 <button onClick={loadVouchers} className="px-3 py-1.5 border border-slate-300 rounded text-sm font-bold bg-white hover:bg-slate-50 flex items-center gap-1"><Filter size={14}/> Apply</button>
 </div>
 </div>

 {/* Table */}
 <div className="flex-1 overflow-auto">
 {loading ? (
 <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2"><div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full"/><span>Loading vouchers...</span></div>
 ) : filteredVouchers.length === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400 p-8">
 <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-inner"><BookOpen size={32} className="opacity-20"/></div>
 <p className="text-lg font-bold text-slate-600">No Journal Vouchers Found</p>
 <p className="text-sm text-center mt-1">Use the filters above or create your first voucher.</p>
 </div>
 ) : (
 <table className="w-full text-left border-collapse text-sm">
 <thead className="bg-[#E4ECEF] sticky top-0 border-b border-slate-300 shadow-sm text-xs text-slate-600 uppercase tracking-wider z-10">
 <tr>
 <th className="p-2 font-bold border-r border-slate-300 w-32">Date</th>
 <th className="p-2 font-bold border-r border-slate-300 w-36">Voucher No</th>
 <th className="p-2 font-bold border-r border-slate-300">Narration</th>
 <th className="p-2 font-bold border-r border-slate-300 text-right w-36">Debit (₹)</th>
 <th className="p-2 font-bold border-r border-slate-300 text-right w-36">Credit (₹)</th>
 <th className="p-2 font-bold border-r border-slate-300 text-center w-24">Status</th>
 <th className="p-2 font-bold text-center w-28">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredVouchers.map((v, i) => (
 <tr key={i} className="hover:bg-blue-50/40 group">
 <td className="p-2 border-r border-slate-100 font-medium text-slate-600">{new Date(v.date || new Date()).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</td>
 <td className="p-2 border-r border-slate-100 font-bold text-[#1D3557] cursor-pointer hover:underline" onClick={() => viewVoucher(v)}>{v.voucherNo}</td>
 <td className="p-2 border-r border-slate-100 italic text-slate-600 truncate max-w-[220px]">{v.narration}</td>
 <td className="p-2 border-r border-slate-100 text-right font-bold text-slate-800">₹{(v.totalDebit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
 <td className="p-2 border-r border-slate-100 text-right font-bold text-slate-800">₹{(v.totalCredit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
 <td className="p-2 border-r border-slate-100 text-center">
 <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{v.status}</span>
 </td>
 <td className="p-2 text-center">
 <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => viewVoucher(v)} title="View" className="p-1 text-accent hover:bg-blue-50 rounded"><Eye size={14}/></button>
 {v.status === 'Posted' && (
 <button onClick={() => handleReverse(v)} title="Reverse" className="p-1 text-red-500 hover:bg-red-50 rounded"><RotateCcw size={14}/></button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {/* Footer Totals */}
 {!loading && filteredVouchers.length > 0 && (
 <div className="bg-[#1D3557] text-white flex text-sm font-bold shrink-0">
 <div className="flex-1 p-2 px-3 text-right border-r border-slate-500 text-xs uppercase tracking-wider flex items-center justify-end">{filteredVouchers.length} Vouchers — Grand Total:</div>
 <div className="w-36 p-2 px-3 text-right border-r border-slate-500">₹{totalDr.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
 <div className="w-36 p-2 px-3 text-right border-r border-slate-500">₹{totalCr.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
 <div className="w-24 p-2 text-center text-xs text-slate-300">Status</div>
 <div className="w-28"></div>
 </div>
 )}
 </div>
 );
};

