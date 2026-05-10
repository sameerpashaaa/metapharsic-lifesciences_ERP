/**
 * REFACTORED CRM COMPONENT
 * Uses ERPLayout + useDataFetch patterns
 * Standardized for Metapharsic ERP Unified Design System
 */

import React, { useState, useMemo } from 'react';
import { 
 UserPlus, Search, Phone, Mail, Calendar, CheckCircle, 
 XCircle, Clock, MessageSquare, Filter, MoreHorizontal, 
 FileText, Video, MapPin, Send, Package, DollarSign, 
 TrendingUp, Users, Target, Zap, Eye, Plus, AlertCircle,
 Activity, ArrowUpRight, Save, Trash2, Edit3, Briefcase
} from 'lucide-react';

import {
 ERPLayout,
 FilterBar,
 DataTable,
 StatCard,
 Tabs,
 Badge,
 Modal,
} from './UniversalLayout';

import {
 useDataFetch,
 useDatabaseStatus,
 useSearch,
 usePagination,
} from '../hooks/useDataFetch';

import { useNotificationSystem } from '../hooks/useNotifications';
import { apiClient } from '../services/apiClient';
import { formatDate, formatCurrency } from '../utils/formatters';

const CRM: React.FC = () => {
 const { status: dbStatus } = useDatabaseStatus();
 const { addNotification } = useNotificationSystem();

 // Data Fetching
 const { data: leads, loading, error, refetch } = useDataFetch('/api/crm/leads');
 const { data: stats, loading: loadingStats, refetch: refetchStats } = useDataFetch('/api/crm/stats');

 // UI States
 const [activeTab, setActiveTab] = useState('BOARD');
 const [filters, setFilters] = useState({
 search: '',
 status: 'All',
 priority: 'All',
 });
 
 const [selectedLead, setSelectedLead] = useState<any | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);
 const [showAddModal, setShowAddModal] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // Form State
 const [formData, setFormData] = useState({
 name: '',
 companyName: '',
 email: '',
 contact: '',
 location: '',
 status: 'New',
 priority: 'Medium',
 source: 'Website',
 nextFollowUp: '',
 estimatedValue: 0,
 notes: '',
 });

 // Search & Pagination
 const { results } = useSearch(leads || [], ['name', 'company_name', 'email', 'contact']);
 
 const filteredResults = useMemo(() => {
 return results.filter((item: any) => {
 const statusMatch = filters.status === 'All' || item.status === filters.status;
 const priorityMatch = filters.priority === 'All' || item.priority === filters.priority;
 return statusMatch && priorityMatch;
 });
 }, [results, filters.status, filters.priority]);

 const pagination = usePagination(filteredResults, 10);

 // Handlers
 const handleRefresh = async () => {
 await Promise.all([refetch(), refetchStats()]);
 };

 const handleSearchChange = (value: string) => {
 setFilters(prev => ({ ...prev, search: value }));
 pagination.goToPage(1);
 };

 const handleFilterChange = (key: string, value: string) => {
 setFilters(prev => ({ ...prev, [key]: value }));
 pagination.goToPage(1);
 };

 const handleOpenAdd = () => {
 setFormData({
 name: '',
 companyName: '',
 email: '',
 contact: '',
 location: '',
 status: 'New',
 priority: 'Medium',
 source: 'Website',
 nextFollowUp: '',
 estimatedValue: 0,
 notes: '',
 });
 setShowAddModal(true);
 };

 const handleViewDetail = (lead: any) => {
 setSelectedLead(lead);
 setShowDetailModal(true);
 };

 const handleSaveLead = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 try {
 if (selectedLead && !showAddModal) {
 // Update
 await apiClient.put(`/crm/leads/${selectedLead.id}`, formData);
 addNotification('Lead updated successfully', 'success', 'CRM', 'Lead Updated');
 } else {
 // Create
 await apiClient.post('/crm/leads', formData);
 addNotification('New lead added successfully', 'success', 'CRM', 'Lead Created');
 }
 setShowAddModal(false);
 setShowDetailModal(false);
 handleRefresh();
 } catch (err: any) {
 addNotification(err.message || 'Failed to save lead', 'error', 'CRM', 'Lead Save Failed');
 } finally {
 setIsSaving(false);
 }
 };

 const handleDeleteLead = async (id: string) => {
 if (!window.confirm('Are you sure you want to delete this lead?')) return;
 try {
 await apiClient.delete(`/crm/leads/${id}`);
 addNotification('Lead deleted successfully', 'success', 'CRM', 'Lead Deleted');
 setShowDetailModal(false);
 handleRefresh();
 } catch (err: any) {
 addNotification(err.message || 'Failed to delete lead', 'error', 'CRM', 'Lead Delete Failed');
 }
 };

 const getStatusVariant = (status: string) => {
 switch(status) {
 case 'New': return 'info';
 case 'Contacted': return 'warning';
 case 'Qualified': return 'info';
 case 'Proposal': return 'warning';
 case 'Converted': return 'success';
 case 'Lost': return 'danger';
 case 'On Hold': return 'neutral';
 default: return 'neutral';
 }
 };

 const columns = [
 { key: 'name', label: 'Lead Name', width: '20%', format: (val: string, row: any) => (
 <div>
 <div className="font-bold text-slate-800">{val}</div>
 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.company_name || 'Individual'}</div>
 </div>
 )},
 { key: 'contact', label: 'Contact', width: '20%', format: (val: string, row: any) => (
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-slate-600"><Phone size={12} className="text-accent"/> {val}</div>
 <div className="flex items-center gap-2 text-slate-600"><Mail size={12} className="text-accent"/> {row.email}</div>
 </div>
 )},
 { key: 'status', label: 'Status', width: '15%', format: (val: string) => <Badge text={val} variant={getStatusVariant(val)} />},
 { key: 'priority', label: 'Priority', width: '10%', format: (val: string) => (
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${val === 'Urgent' ? 'bg-rose-500 animate-pulse' : val === 'High' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
 <span className="font-bold text-xs uppercase tracking-tight">{val}</span>
 </div>
 )},
 { key: 'estimated_value', label: 'Pipeline Value', width: '15%', align: 'right' as const, format: (val: number) => (
 <div className="font-bold text-slate-900">₹{Number(val).toLocaleString()}</div>
 )},
 {
 key: 'actions',
 label: 'Actions',
 width: '10%',
 align: 'right' as const,
 format: (_: any, row: any) => (
 <div className="flex justify-end gap-2">
 <button 
 onClick={(e) => { e.stopPropagation(); handleViewDetail(row); }} 
 className="p-2 text-accent hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
 >
 <Eye size={16} />
 </button>
 </div>
 )
 }
 ];

 if (!dbStatus.connected && !loading) {
 return (
 <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 m-6 flex gap-4 animate-fadeIn">
 <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
 <AlertCircle size={24} />
 </div>
 <div>
 <p className="font-bold text-rose-900 text-lg uppercase tracking-tight">System Offline</p>
 <p className="text-rose-700 font-medium mt-1">The CRM module requires a connection to the central database. {dbStatus.error}</p>
 <button onClick={handleRefresh} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition-all">Reconnect System</button>
 </div>
 </div>
 );
 }

 return (
 <ERPLayout
 title="Growth & CRM"
 description="Lead Management & Sales Intelligence Hub"
 onRefresh={handleRefresh}
 isLoading={loading || loadingStats}
 actionButtons={[
 <button 
 key="add-lead"
 onClick={handleOpenAdd}
 className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-accent transition-all shadow-none hover:shadow-none group"
 >
 <UserPlus size={18} className="group-hover:rotate-12 transition-transform" /> 
 Register New Lead
 </button>
 ]}
 >
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard label="Pipeline Leads" value={stats?.total_leads || 0} icon={<Users className="text-accent" size={24}/>} color="blue" trend="+12% New" />
 <StatCard label="Qualified Opportunities" value={stats?.new_leads || 0} icon={<Target className="text-amber-600" size={24}/>} color="warning" />
 <StatCard label="Conversion Rate" value={`${stats?.conversion_rate || 0}%`} icon={<Zap className="text-emerald-600" size={24}/>} color="success" trend="Industry Top" />
 <StatCard label="Pipeline Value" value={`₹${(Number(stats?.total_pipeline_value || 0) / 100000).toFixed(1)}L`} icon={<DollarSign className="text-purple-600" size={24}/>} color="purple" />
 </div>

 <Tabs 
 tabs={[
 { id: 'BOARD', label: 'Leads Board', badge: filteredResults.length },
 { id: 'ANALYTICS', label: 'Sales Intelligence' },
 { id: 'TASKS', label: 'Follow-up Queue' }
 ]} 
 activeTab={activeTab} 
 onChange={setActiveTab} 
 />

 {activeTab === 'BOARD' && (
 <>
 <FilterBar
 searchValue={filters.search}
 onSearchChange={handleSearchChange}
 filters={[
 {
 label: 'Status',
 value: filters.status,
 onChange: (v) => handleFilterChange('status', v),
 options: [
 'All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost', 'On Hold'
 ]
 },
 {
 label: 'Priority',
 value: filters.priority,
 onChange: (v) => handleFilterChange('priority', v),
 options: ['All', 'Low', 'Medium', 'High', 'Urgent']
 }
 ]}
 />

 <DataTable
 columns={columns}
 data={pagination.paginatedData}
 loading={loading}
 onRowClick={handleViewDetail}
 />
 </>
 )}

 {/* Add/Edit Modal */}
 {(showAddModal || (showDetailModal && isSaving)) && (
 <Modal 
 isOpen={true} 
 onClose={() => { setShowAddModal(false); setIsSaving(false); }}
 title={selectedLead && !showAddModal ? "Edit Lead Details" : "Register New Lead Opportunity"}
 size="lg"
 >
 <form onSubmit={handleSaveLead} className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-4">
 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Primary Contact</h4>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Lead Person Name *</label>
 <input 
 required
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 placeholder="Enter full name"
 />
 </div>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Company / Hospital Name</label>
 <input 
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.companyName}
 onChange={(e) => setFormData({...formData, companyName: e.target.value})}
 placeholder="Entity name"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Contact Number *</label>
 <input 
 required
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.contact}
 onChange={(e) => setFormData({...formData, contact: e.target.value})}
 placeholder="Phone"
 />
 </div>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Email Address</label>
 <input 
 type="email"
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.email}
 onChange={(e) => setFormData({...formData, email: e.target.value})}
 placeholder="mail@example.com"
 />
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Qualification Details</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Lead Status</label>
 <select 
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.status}
 onChange={(e) => setFormData({...formData, status: e.target.value})}
 >
 {['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Priority</label>
 <select 
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.priority}
 onChange={(e) => setFormData({...formData, priority: e.target.value})}
 >
 {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 </div>
 </div>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Estimated Deal Value (₹)</label>
 <input 
 type="number"
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-accent focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.estimatedValue}
 onChange={(e) => setFormData({...formData, estimatedValue: Number(e.target.value)})}
 />
 </div>
 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Next Follow-up Date</label>
 <input 
 type="date"
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all"
 value={formData.nextFollowUp}
 onChange={(e) => setFormData({...formData, nextFollowUp: e.target.value})}
 />
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-xs font-bold text-slate-700">Strategy Notes & Intelligence</label>
 <textarea 
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-accent transition-all min-h-[100px]"
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 placeholder="Key requirements, competitor info, or discussion summary..."
 />
 </div>

 <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
 <button 
 type="button"
 onClick={() => { setShowAddModal(false); setIsSaving(false); }}
 className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
 >
 Cancel
 </button>
 <button 
 type="submit"
 disabled={isSaving}
 className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-accent transition-all shadow-none flex items-center gap-2"
 >
 {isSaving ? <Activity size={18} className="animate-spin"/> : <Save size={18} />}
 {selectedLead && !showAddModal ? "Commit Changes" : "Create Opportunity"}
 </button>
 </div>
 </form>
 </Modal>
 )}

 {/* View Detail Modal */}
 {showDetailModal && !isSaving && selectedLead && (
 <Modal 
 isOpen={true} 
 onClose={() => setShowDetailModal(false)}
 title="Lead Intelligence Center"
 size="lg"
 >
 <div className="space-y-8">
 <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-100">
 <div className="flex items-center gap-5">
 <div className="w-20 h-20 bg-accent rounded-xl flex items-center justify-center text-white shadow-none shadow-none rotate-3 hover:rotate-0 transition-transform cursor-pointer">
 <Briefcase size={36} />
 </div>
 <div>
 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedLead.name}</h3>
 <div className="flex flex-wrap items-center gap-3 mt-2">
 <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><ArrowUpRight size={14} className="text-accent"/> {selectedLead.company_name || 'Individual'}</span>
 <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
 <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><MapPin size={14} className="text-rose-500"/> {selectedLead.location || 'Location Pending'}</span>
 </div>
 </div>
 </div>
 <div className="flex flex-col items-end gap-3">
 <Badge text={selectedLead.status} variant={getStatusVariant(selectedLead.status)} />
 <div className="text-right">
 <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pipeline Value</p>
 <p className="text-2xl font-bold text-slate-900">₹{Number(selectedLead.estimated_value).toLocaleString()}</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Communication Hub</p>
 <div className="space-y-3">
 <div className="flex items-center justify-between group cursor-pointer">
 <span className="text-xs font-bold text-slate-500">Mobile</span>
 <span className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{selectedLead.contact}</span>
 </div>
 <div className="flex items-center justify-between group cursor-pointer">
 <span className="text-xs font-bold text-slate-500">Email</span>
 <span className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{selectedLead.email}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">Source</span>
 <span className="text-[10px] font-bold bg-blue-100 text-accent px-2 py-0.5 rounded-md uppercase">{selectedLead.source}</span>
 </div>
 </div>
 </div>
 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Planning Metrics</p>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">Priority</span>
 <span className={`text-xs font-bold ${selectedLead.priority === 'Urgent' ? 'text-rose-600' : 'text-amber-600'}`}>{selectedLead.priority}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">Follow-up</span>
 <span className="text-xs font-bold text-slate-900">{formatDate(selectedLead.next_follow_up)}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">Created On</span>
 <span className="text-xs font-bold text-slate-400">{formatDate(selectedLead.created_at)}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 <MessageSquare size={18} className="text-accent"/>
 Strategic Notes
 </h4>
 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-inner text-sm text-slate-600 leading-relaxed italic min-h-[120px]">
 {selectedLead.notes || "No internal strategy notes have been recorded for this opportunity yet."}
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
 <Clock size={18} className="text-accent"/>
 Timeline
 </h4>
 <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
 <div className="flex gap-4 relative">
 <div className="w-6 h-6 rounded-full bg-emerald-100 border-4 border-white flex items-center justify-center z-10 shadow-sm ring-1 ring-emerald-500/20">
 <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
 </div>
 <div>
 <p className="text-xs font-bold text-slate-800">Lead Created</p>
 <p className="text-[10px] font-bold text-slate-400 mt-0.5">{formatDate(selectedLead.created_at)}</p>
 </div>
 </div>
 {/* More activities would go here */}
 <div className="pt-4 mt-4 border-t border-slate-50">
 <button className="w-full py-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-xs font-bold text-slate-400 hover:text-accent hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-center gap-2">
 <Plus size={14}/> Add Timeline Event
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-slate-100">
 <button 
 onClick={() => handleDeleteLead(selectedLead.id)}
 className="flex items-center gap-2 text-rose-500 hover:text-rose-700 font-bold text-sm px-4 py-2 hover:bg-rose-50 rounded-lg transition-all"
 >
 <Trash2 size={16} /> Archive Opportunity
 </button>
 <div className="flex gap-3">
 <button 
 onClick={() => {
 setFormData({
 name: selectedLead.name,
 companyName: selectedLead.company_name || '',
 email: selectedLead.email || '',
 contact: selectedLead.contact,
 location: selectedLead.location || '',
 status: selectedLead.status,
 priority: selectedLead.priority,
 source: selectedLead.source,
 nextFollowUp: selectedLead.next_follow_up ? selectedLead.next_follow_up.split('T')[0] : '',
 estimatedValue: Number(selectedLead.estimated_value),
 notes: selectedLead.notes || '',
 });
 setIsSaving(true);
 }}
 className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
 >
 <Edit3 size={18} /> Modify Intelligence
 </button>
 <button className="px-8 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent transition-all shadow-none shadow-blue-100 flex items-center gap-2">
 <TrendingUp size={18} /> Convert to Customer
 </button>
 </div>
 </div>
 </div>
 </Modal>
 )}
 </ERPLayout>
 );
};

export default CRM;


