/**
 * REFACTORED STRATEGIC PCD COMPONENT
 * Uses ERPLayout + useDataFetch patterns
 * Integrated with PostgreSQL backend and Deep-linking tabs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Map, Plus, Users, Shield, MapPin, Phone, Mail, FileText, Gift, 
  TrendingUp, Briefcase, X, ArrowLeft, UserPlus, Target, Calendar, 
  DollarSign, BarChart3, PieChart, Award, CheckCircle, AlertCircle, 
  Clock, Edit3, Trash2, Eye, Download, Printer, Filter, RefreshCcw, 
  Building2, CreditCard, Truck, Package, Zap, Activity, ArrowUpRight, Save
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

import { useAuth } from '../context/AuthContext';
import { useNotificationSystem } from '../hooks/useNotifications';
import { apiClient } from '../services/apiClient';

// Types for PCD
type TabID = 'DASHBOARD' | 'PARTNERS' | 'SCHEMES' | 'TARGETS' | 'REPORTS' | 'ANALYTICS';

const StrategicPCD: React.FC = () => {
  const { hasPermission } = useAuth();
  const { status: dbStatus } = useDatabaseStatus();
  const { addNotification } = useNotificationSystem();

  // Deep-linking for tabs
  const getTabFromHash = (): TabID => {
    const hash = window.location.hash.replace('#', '').toUpperCase() as TabID;
    const validTabs: TabID[] = ['DASHBOARD', 'PARTNERS', 'SCHEMES', 'TARGETS', 'REPORTS', 'ANALYTICS'];
    return validTabs.includes(hash) ? hash : 'DASHBOARD';
  };

  const [activeTab, setActiveTab] = useState<TabID>(getTabFromHash());

  useEffect(() => {
    const handleHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId: string) => {
    window.location.hash = tabId.toLowerCase();
    setActiveTab(tabId as TabID);
  };

  // --- DATA FETCHING ---
  const { data: dashboardStats, loading: loadingStats, refetch: refetchStats } = useDataFetch<any>('/api/pcd/dashboard');
  const { data: partners, loading: loadingPartners, refetch: refetchPartners } = useDataFetch<any[]>('/api/pcd/partners');
  const { data: mrs, loading: loadingMrs, refetch: refetchMrs } = useDataFetch<any[]>('/api/pcd/mrs');
  const { data: schemes, loading: loadingSchemes, refetch: refetchSchemes } = useDataFetch<any[]>('/api/pcd/schemes');
  const { data: targets, loading: loadingTargets, refetch: refetchTargets } = useDataFetch<any[]>('/api/pcd/targets');
  const { data: transactions, loading: loadingTransactions, refetch: refetchTransactions } = useDataFetch<any[]>('/api/pcd/transactions');
  
  // Phase 3 Analytics Hooks
  const { data: forecastData, loading: loadingForecast } = useDataFetch<any[]>('/api/pcd/analytics/forecast');
  const { data: roiData, loading: loadingROI } = useDataFetch<any[]>('/api/pcd/analytics/scheme-roi');

  // --- UI STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showAssignMRModal, setShowAssignMRModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- FORM STATES ---
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    territory: '',
    contact: '',
    email: '',
    drug_license_no: '',
    gstin: '',
    address: '',
    credit_limit: 0,
    payment_terms: '30 Days'
  });

  const [selectedMrIdToAssign, setSelectedMrIdToAssign] = useState('');

  const canEdit = hasPermission(['ADMIN', 'SALES_MANAGER']);

  // --- HANDLERS ---
  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(), refetchPartners(), refetchMrs(), 
      refetchSchemes(), refetchTargets(), refetchTransactions()
    ]);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.post('/pcd/partners', partnerForm);
      addNotification('Partner added successfully', 'success', 'PCD', 'Partner Created');
      setShowAddPartnerModal(false);
      refetchPartners();
      refetchStats();
    } catch (err: any) {
      addNotification(err.message || 'Failed to add partner', 'error', 'PCD', 'Partner Create Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignMR = async () => {
    if (!selectedPartner || !selectedMrIdToAssign) return;
    try {
      await apiClient.post(`/pcd/partners/${selectedPartner.id}/assign-mr`, { mr_id: selectedMrIdToAssign });
      addNotification('MR assigned successfully', 'success', 'PCD', 'MR Assignment Complete');
      setShowAssignMRModal(false);
      refetchPartners();
    } catch (err: any) {
      addNotification(err.message || 'Failed to assign MR', 'error', 'PCD', 'MR Assignment Failed');
    }
  };

  const handleTogglePartnerStatus = async (partner: any) => {
    const newStatus = partner.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiClient.put(`/pcd/partners/${partner.id}`, { ...partner, status: newStatus });
      addNotification(`Partner marked as ${newStatus}`, 'success', 'PCD', 'Partner Status Updated');
      refetchPartners();
      refetchStats();
      if (selectedPartner?.id === partner.id) {
        setSelectedPartner({ ...partner, status: newStatus });
      }
    } catch (err: any) {
      addNotification('Failed to update status', 'error', 'PCD', 'Partner Status Update Failed');
    }
  };

  // --- RENDER HELPERS ---
  const partnerColumns = [
    { key: 'name', label: 'Partner Name', width: '30%', format: (val: string, row: any) => (
      <div>
        <div className="font-bold text-slate-800">{val}</div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.territory}</div>
      </div>
    )},
    { key: 'contact', label: 'Contact Info', width: '25%', format: (val: string, row: any) => (
      <div className="text-xs text-slate-600">
        <div className="flex items-center gap-1"><Phone size={10}/> {val}</div>
        <div className="flex items-center gap-1"><Mail size={10}/> {row.email}</div>
      </div>
    )},
    { key: 'status', label: 'Status', width: '15%', format: (val: string) => (
      <Badge text={val} variant={val === 'Active' ? 'success' : 'neutral'} />
    )},
    { key: 'credit_limit', label: 'Credit Limit', width: '20%', align: 'right' as const, format: (val: number) => (
      <div className="font-black text-slate-700">₹{Number(val).toLocaleString()}</div>
    )},
    { key: 'actions', label: 'Action', width: '10%', align: 'right' as const, format: (_: any, row: any) => (
      <button onClick={() => setSelectedPartner(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
        <Eye size={16} />
      </button>
    )}
  ];

  if (!dbStatus.connected && !loadingStats) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 m-6 flex gap-4 animate-fadeIn">
        <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <p className="font-black text-rose-900 text-lg uppercase tracking-tight">System Offline</p>
          <p className="text-rose-700 font-medium mt-1">PCD Network Management requires a connection to the central database.</p>
          <button onClick={handleRefresh} className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition-all">Reconnect System</button>
        </div>
      </div>
    );
  }

  if (selectedPartner) {
    const assignedMrs = mrs?.filter(mr => selectedPartner.assigned_mr_ids?.includes(mr.id)) || [];
    return (
      <div className="space-y-6 animate-fadeIn p-4">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setSelectedPartner(null)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPartner.name}</h2>
            <p className="text-slate-500 text-sm font-medium">Strategic PCD Partner Management</p>
          </div>
          <div className="ml-auto flex gap-3">
             <button 
               onClick={() => handleTogglePartnerStatus(selectedPartner)}
               className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                 selectedPartner.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
               }`}
             >
               {selectedPartner.status === 'Active' ? <CheckCircle size={16}/> : <X size={16}/>}
               {selectedPartner.status}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">
                    <Building2 size={16}/> Partner Intelligence
                 </h3>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Territory</p>
                          <div className="flex items-center gap-2 text-slate-900 font-bold">
                             <MapPin size={16} className="text-blue-500"/> {selectedPartner.territory}
                          </div>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Hub</p>
                          <div className="space-y-1">
                             <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Phone size={14}/> {selectedPartner.contact}</div>
                             <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Mail size={14}/> {selectedPartner.email}</div>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance & License</p>
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black bg-slate-100 px-2 py-1 rounded-lg font-mono">DL: {selectedPartner.drug_license_no}</span>
                             <span className="text-xs font-black bg-slate-100 px-2 py-1 rounded-lg font-mono">GST: {selectedPartner.gstin}</span>
                          </div>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial Metrics</p>
                          <div className="flex justify-between items-end">
                             <div>
                                <p className="text-2xl font-black text-slate-900">₹{Number(selectedPartner.credit_limit).toLocaleString()}</p>
                                <p className="text-xs text-slate-400 font-bold">Credit Limit Assigned</p>
                             </div>
                             <Badge text={selectedPartner.payment_terms} variant="info" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Field Force Integration */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">
                       <Users size={16}/> Field Force Assignment
                    </h3>
                    <button onClick={() => setShowAssignMRModal(true)} className="text-xs font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5">
                       <UserPlus size={14}/> Assign MR
                    </button>
                 </div>
                 {assignedMrs.length > 0 ? (
                    <div className="space-y-3">
                       {assignedMrs.map(mr => (
                          <div key={mr.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-blue-600">
                                   {mr.name.charAt(0)}
                                </div>
                                <div>
                                   <p className="font-bold text-slate-900">{mr.name}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{mr.headquarters} • {mr.contact}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Achievement</p>
                                <Badge text={`${mr.sales_target > 0 ? Math.round(mr.total_sales / mr.sales_target * 100) : 0}%`} variant="success" />
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <Briefcase size={32} className="mx-auto text-slate-300 mb-2"/>
                       <p className="text-xs font-bold text-slate-400">No MRs assigned to this partner yet.</p>
                    </div>
                 )}
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200 relative overflow-hidden">
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Performance Radar</p>
                    <div className="mb-6">
                       <h4 className="text-4xl font-black mb-1">₹3,50,000</h4>
                       <p className="text-xs font-bold text-slate-400">Achieved in Q3 2023</p>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold">
                          <span>Target: ₹5.0L</span>
                          <span>70%</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{width: '70%'}}></div>
                       </div>
                    </div>
                 </div>
                 <Zap size={100} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">
                    <Activity size={16}/> Network Health
                 </h3>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-500">Churn Risk Index</span>
                       <Badge text="Low Risk" variant="success" />
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-500">Inventory Velocity</span>
                       <span className="text-xs font-black text-slate-900">4.2x / mo</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-500">Average Pay Days</span>
                       <span className="text-xs font-black text-slate-900">28 Days</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Assign MR Modal */}
        {showAssignMRModal && (
          <Modal isOpen={true} onClose={() => setShowAssignMRModal(false)} title="Assign Medical Representative" size="sm">
             <div className="space-y-4">
                <p className="text-xs font-medium text-slate-500">Select an MR to assign to {selectedPartner.name}.</p>
                <select 
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                   value={selectedMrIdToAssign}
                   onChange={(e) => setSelectedMrIdToAssign(e.target.value)}
                >
                   <option value="">-- Select MR --</option>
                   {mrs?.map(mr => (
                      <option key={mr.id} value={mr.id}>{mr.name} ({mr.headquarters})</option>
                   ))}
                </select>
                <button 
                   onClick={handleAssignMR}
                   disabled={!selectedMrIdToAssign}
                   className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                   <CheckCircle size={18}/> Confirm Assignment
                </button>
             </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <ERPLayout
      title="Strategic PCD Network"
      description="Partner, Territory & Performance Management"
      onRefresh={handleRefresh}
      isLoading={loadingStats || loadingPartners}
      actionButtons={[
        <button 
          key="add-partner"
          onClick={() => setShowAddPartnerModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-200 group"
        >
          <UserPlus size={18} className="group-hover:rotate-12 transition-transform" /> 
          Add New Partner
        </button>
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Active Partners" value={dashboardStats?.active_partners || 0} icon={<Users className="text-blue-600" size={24}/>} color="blue" trend="+2 New" />
        <StatCard label="Territory Coverage" value={dashboardStats?.total_territories || 0} icon={<Map className="text-amber-600" size={24}/>} color="warning" />
        <StatCard label="Total Network Sales" value={`₹${(Number(dashboardStats?.total_sales || 0) / 1000).toFixed(1)}K`} icon={<DollarSign className="text-emerald-600" size={24}/>} color="success" />
        <StatCard label="Avg Achievement" value={`${Number(dashboardStats?.avg_achievement || 0).toFixed(1)}%`} icon={<TrendingUp className="text-purple-600" size={24}/>} color="purple" />
      </div>

      <Tabs 
        tabs={[
          { id: 'DASHBOARD', label: 'Dashboard Overview' },
          { id: 'PARTNERS', label: 'Partners Network', badge: partners?.length },
          { id: 'SCHEMES', label: 'Schemes & Offers' },
          { id: 'TARGETS', label: 'Targets & Incentives' },
          { id: 'REPORTS', label: 'Reports Hub' },
          { id: 'ANALYTICS', label: 'Network Intelligence' }
        ]} 
        activeTab={activeTab} 
        onChange={handleTabChange} 
      />

      <div className="mt-8">
        {activeTab === 'DASHBOARD' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">
                   <Target size={16}/> Top Achieving Partners
                </h3>
                <div className="space-y-4">
                   {targets?.slice(0, 3).map(t => {
                      const pct = Math.round(t.achieved_amount / t.target_amount * 100);
                      return (
                         <div key={t.id} className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                               <span className="text-slate-800">{t.partner_name}</span>
                               <span className="text-blue-600">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                               <div className="bg-blue-500 h-full rounded-full" style={{width: `${Math.min(100, pct)}%`}}></div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>

             <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                      <MapPin size={20} className="text-blue-400"/> Territory Intelligence
                   </h3>
                   <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">Geospatial Awareness Active</p>
                   
                   <div className="space-y-4">
                      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                         <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-emerald-400 text-sm uppercase">Underserved: Vidarbha</h4>
                            <Badge text="Critical" variant="danger" />
                         </div>
                         <p className="text-[10px] text-slate-400 font-medium">High cardiology demand with 0 active partners in 150km radius.</p>
                      </div>
                      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                         <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-orange-400 text-sm uppercase">Overlap Risk: Pune Central</h4>
                            <Badge text="Moderate" variant="warning" />
                         </div>
                         <p className="text-[10px] text-slate-400 font-medium">3 partners competing for identical monopoly lines detected.</p>
                      </div>
                   </div>
                </div>
                <Map size={150} className="absolute -right-8 -bottom-8 text-white/5" />
             </div>
          </div>
        )}

        {activeTab === 'PARTNERS' && (
          <>
            <FilterBar 
               searchValue={searchTerm} 
               onSearchChange={setSearchTerm}
               filters={[
                 { label: 'Status', value: 'All', onChange: () => {}, options: ['All', 'Active', 'Inactive'] },
                 { label: 'Territory', value: 'All', onChange: () => {}, options: ['All', 'Pune', 'Mumbai', 'Nashik'] }
               ]}
            />
            <DataTable 
               columns={partnerColumns} 
               data={partners?.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) || []} 
               loading={loadingPartners} 
               onRowClick={(row) => setSelectedPartner(row)}
            />
          </>
        )}

        {(activeTab === 'SCHEMES' || activeTab === 'TARGETS' || activeTab === 'REPORTS') && (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <Clock size={48} className="mx-auto text-slate-300 mb-4"/>
             <h3 className="font-black text-slate-800 uppercase tracking-widest text-lg">Detailed View Pending</h3>
             <p className="text-sm text-slate-500 font-medium mt-1">Deep analytics and management for {activeTab} will be enabled in Phase 3.</p>
             <button className="mt-6 text-sm font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-xl hover:bg-blue-100 transition-all">Request Priority Enablement</button>
          </div>
        )}

        {activeTab === 'ANALYTICS' && (
          <div className="space-y-8 animate-fadeIn">
             {/* GenAI Natural Language Search */}
             <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 max-w-3xl">
                   <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                      <Zap size={24} className="text-yellow-400" /> GenAI Partner Insights
                   </h3>
                   <p className="text-blue-200 mb-6 font-medium">Ask questions about territory overlap, underperforming partners, or inventory velocity in natural language.</p>
                   
                   <div className="flex gap-2">
                      <div className="relative flex-1">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                         <input 
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:bg-white/20 focus:outline-none transition-all font-medium"
                            placeholder="e.g., Which partners in Maharashtra need a stock refill next week?"
                         />
                      </div>
                      <button className="px-8 py-4 bg-white text-blue-900 rounded-xl font-black hover:bg-blue-50 transition-all shadow-lg">
                         Ask AI
                      </button>
                   </div>
                   
                   <div className="flex gap-2 mt-4">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mt-1">Try:</span>
                      <Badge text="Show high-ROI schemes" variant="info" />
                      <Badge text="Predict Q4 churn risk" variant="info" />
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Predictive Forecasting */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-slate-100">
                      <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                         <TrendingUp size={16} className="text-emerald-500" /> Predictive Auto-Ordering (OMS)
                      </h3>
                   </div>
                   <div className="p-0">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                            <tr>
                               <th className="p-4">Partner</th>
                               <th className="p-4 text-center">Confidence</th>
                               <th className="p-4 text-right">AI Insight</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-sm font-medium">
                            {loadingForecast ? (
                               <tr><td colSpan={3} className="p-8 text-center text-slate-400">Running prediction models...</td></tr>
                            ) : forecastData?.map((f: any, idx: number) => (
                               <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-4">
                                     <div className="font-bold text-slate-800">{f.partner_name}</div>
                                     <div className="text-[10px] text-slate-400 uppercase">{f.territory}</div>
                                  </td>
                                  <td className="p-4 text-center">
                                     <Badge text={f.prediction_confidence} variant={f.prediction_confidence === 'High Confidence' ? 'success' : 'warning'} />
                                  </td>
                                  <td className="p-4 text-right">
                                     <div className="font-bold text-indigo-600">{f.ai_insight}</div>
                                     <div className="text-[10px] text-slate-400">Suggests {f.predicted_next_order_qty} units</div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Scheme ROI Analysis */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-slate-100">
                      <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                         <Award size={16} className="text-purple-500" /> Scheme ROI Intelligence
                      </h3>
                   </div>
                   <div className="p-0">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                            <tr>
                               <th className="p-4">Scheme</th>
                               <th className="p-4 text-right">Revenue Driven</th>
                               <th className="p-4 text-center">AI Verdict</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-sm font-medium">
                            {loadingROI ? (
                               <tr><td colSpan={3} className="p-8 text-center text-slate-400">Analyzing scheme effectiveness...</td></tr>
                            ) : roiData?.map((r: any, idx: number) => (
                               <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-4">
                                     <div className="font-bold text-slate-800">{r.scheme_name}</div>
                                     <div className="text-[10px] text-slate-400 uppercase">{r.scheme_type}</div>
                                  </td>
                                  <td className="p-4 text-right font-black text-slate-700">
                                     ₹{(Number(r.total_revenue_generated) / 1000).toFixed(1)}K
                                  </td>
                                  <td className="p-4 text-center">
                                     <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                        r.ai_verdict.includes('Excellent') ? 'bg-emerald-100 text-emerald-700' :
                                        r.ai_verdict.includes('Moderate') ? 'bg-blue-100 text-blue-700' :
                                        'bg-rose-100 text-rose-700'
                                     }`}>
                                        {r.ai_verdict}
                                     </span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Add Partner Modal */}
      {showAddPartnerModal && (
        <Modal isOpen={true} onClose={() => setShowAddPartnerModal(false)} title="Register Strategic PCD Partner" size="lg">
           <form onSubmit={handleAddPartner} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Identification</h4>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700">Entity Name *</label>
                       <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} placeholder="Full legal name" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700">Territory / Region *</label>
                       <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" value={partnerForm.territory} onChange={e => setPartnerForm({...partnerForm, territory: e.target.value})} placeholder="Assign monopoly area" />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Compliance</h4>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700">Drug License No *</label>
                       <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium font-mono" value={partnerForm.drug_license_no} onChange={e => setPartnerForm({...partnerForm, drug_license_no: e.target.value})} placeholder="MH-NAS-..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700">GSTIN</label>
                       <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium font-mono" value={partnerForm.gstin} onChange={e => setPartnerForm({...partnerForm, gstin: e.target.value})} placeholder="27AAAA..." />
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                 <button type="button" onClick={() => setShowAddPartnerModal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                 <button type="submit" disabled={isSaving} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2">
                    {isSaving ? <Activity size={18} className="animate-spin"/> : <Save size={18} />}
                    Commit Partner Registration
                 </button>
              </div>
           </form>
        </Modal>
      )}
    </ERPLayout>
  );
};

export default StrategicPCD;
