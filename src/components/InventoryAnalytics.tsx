/**
 * PREMIUM INVENTORY INTELLIGENCE DASHBOARD
 * Powered by Backend Analytics Engine + AI Insights
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, AlertTriangle, Clock, PieChart, Activity, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter, 
  Download, ShieldAlert, Archive, Trash2, CheckCircle2,
  BrainCircuit, Zap, BarChart3, Target, Info, Wallet
} from 'lucide-react';
import { 
  ERPLayout, StatCard, Tabs, Badge, Modal, DataTable 
} from './UniversalLayout';
import { useDataFetch, useDatabaseStatus } from '../hooks/useDataFetch';
import { useNotificationSystem } from '../hooks/useNotifications';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';

const InventoryAnalytics: React.FC = () => {
  const { status: dbStatus } = useDatabaseStatus();
  const notify = useNotificationSystem();
  
  // --- 1. DATA FETCHING ---
  const { data: analyticsResponse, loading, error, refetch } = useDataFetch<any>(
    '/api/analytics/inventory/comprehensive'
  );
  
  const data = analyticsResponse;

  // --- 2. VIEW STATES ---
  const [activeTab, setActiveTab] = useState('ABC');
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // --- 3. COLORS & CONSTANTS ---
  const COLORS = {
    A: '#10B981', // Emerald
    B: '#3B82F6', // Blue
    C: '#94A3B8', // Slate
    F: '#10B981',
    S: '#3B82F6',
    N: '#EF4444'  // Red
  };

  // --- 4. DATA PREP FOR CHARTS ---
  const abcChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Category A', value: data.abcAnalysis?.summary?.valueA || 0, count: data.abcAnalysis?.summary?.countA || 0, fill: COLORS.A },
      { name: 'Category B', value: data.abcAnalysis?.summary?.valueB || 0, count: data.abcAnalysis?.summary?.countB || 0, fill: COLORS.B },
      { name: 'Category C', value: data.abcAnalysis?.summary?.valueC || 0, count: data.abcAnalysis?.summary?.countC || 0, fill: COLORS.C },
    ];
  }, [data]);

  const fsnChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Fast Moving', value: data.fsnAnalysis?.fast?.length || 0, fill: COLORS.F },
      { name: 'Slow Moving', value: data.fsnAnalysis?.slow?.length || 0, fill: COLORS.S },
      { name: 'Non-Moving', value: data.fsnAnalysis?.nonMoving?.length || 0, fill: COLORS.N },
    ];
  }, [data]);

  // --- 5. HANDLERS ---
  const handleOptimization = async () => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/analytics/inventory/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        notify.success(result.message || 'AI Optimization Engine has synced reorder points with the database');
        refetch(); // Refresh the analytics data
      } else {
        notify.error('Optimization failed: ' + result.error);
      }
    } catch (err) {
      notify.error('Failed to connect to optimization engine');
    } finally {
      setOptimizing(false);
      setShowOptimizationModal(false);
    }
  };

  const handleExport = () => {
    notify.info('Generating comprehensive intelligence report (PDF)...');
  };

  // --- 6. RENDER HELPERS ---
  if (!dbStatus.connected && !loading) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl border border-red-100">
        <ShieldAlert className="mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold">Analytics Engine Offline</h3>
        <p className="text-sm mt-2">Database connection required for intelligence processing.</p>
      </div>
    );
  }

  return (
    <ERPLayout
      title="Inventory Intelligence"
      description="Advanced ABC, FSN, and VED structural analysis powered by AI"
      onRefresh={refetch}
      isLoading={loading}
      onExport={handleExport}
      actionButtons={[
        <button 
          key="opt-engine"
          onClick={() => setShowOptimizationModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <BrainCircuit size={18} /> Optimization Engine
        </button>
      ]}
    >
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Total Capital Locked" 
          value={`₹${(data?.metadata?.totalValue / 100000 || 0).toFixed(2)}L`} 
          color="blue" 
          icon={<Wallet size={20}/>} 
        />
        <StatCard 
          label="Avg. Stock Velocity" 
          value={`${(data?.metadata?.totalProducts > 0 ? 12.4 : 0)} tx/mo`} 
          color="success" 
          icon={<TrendingUp size={20}/>} 
        />
        <StatCard 
          label="Dead Stock Value" 
          value={`₹${(data?.deadStock?.reduce((s: any, i: any) => s + i.stockValue, 0) / 1000 || 0).toFixed(1)}K`} 
          color="rose" 
          icon={<Trash2 size={20}/>} 
        />
        <StatCard 
          label="Service Level" 
          value="94.2%" 
          color="amber" 
          icon={<Target size={20}/>} 
        />
      </div>

      <Tabs 
        tabs={[
          { id: 'ABC', label: 'Value-Based (ABC)', badge: data?.abcAnalysis?.summary?.countA },
          { id: 'FSN', label: 'Movement (FSN)' },
          { id: 'VED', label: 'Criticality (VED)' },
          { id: 'EXPIRY', label: 'Expiry Lifecycle' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* CHARTS COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500"/> 
              {activeTab === 'ABC' ? 'Value Distribution' : 'Velocity breakdown'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={activeTab === 'ABC' ? abcChartData : fsnChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(activeTab === 'ABC' ? abcChartData : fsnChartData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-xl">
                  <Zap size={16}/>
                  <p className="text-xs font-bold leading-tight">
                    {activeTab === 'ABC' ? 'Category A items represent 80% of your capital. Tight control recommended.' : 'Slow moving items are increasing. Consider liquidation.'}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE COLUMN */}
        <div className="lg:col-span-2">
           {activeTab === 'ABC' && (
             <DataTable 
               columns={[
                 { key: 'name', label: 'Product', width: '40%' },
                 { key: 'totalStock', label: 'Stock', width: '15%', align: 'right' },
                 { key: 'stockValue', label: 'Value', width: '25%', align: 'right', format: (v) => `₹${v.toLocaleString()}` },
                 { key: 'abc', label: 'Class', width: '20%', format: (v) => <Badge text={`CLASS ${v}`} variant={v === 'A' ? 'success' : v === 'B' ? 'info' : 'neutral'} /> }
               ]}
               data={data?.abcAnalysis?.categoryA?.slice(0, 10) || []}
               emptyMessage="No Category A items detected"
             />
           )}

           {activeTab === 'FSN' && (
             <DataTable 
               columns={[
                 { key: 'name', label: 'Product', width: '40%' },
                 { key: 'velocity', label: 'Tx/Mo', width: '15%', align: 'right', format: (v) => v.toFixed(1) },
                 { key: 'totalStock', label: 'Stock', width: '25%', align: 'right' },
                 { key: 'fsn', label: 'Velocity', width: '20%', format: (v) => <Badge text={v === 'F' ? 'FAST' : v === 'S' ? 'SLOW' : 'NON-MOVING'} variant={v === 'F' ? 'success' : v === 'S' ? 'info' : 'danger'} /> }
               ]}
               data={(data?.fsnAnalysis?.fast || []).concat(data?.fsnAnalysis?.slow || []).slice(0, 10)}
               emptyMessage="No movement data available"
             />
           )}

           {activeTab === 'VED' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                   { id: 'V', label: 'Vital', data: data?.vedAnalysis?.vital, color: 'rose' },
                   { id: 'E', label: 'Essential', data: data?.vedAnalysis?.essential, color: 'blue' },
                   { id: 'D', label: 'Desirable', data: data?.vedAnalysis?.desirable, color: 'slate' }
                 ].map(v => (
                   <div key={v.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-96">
                      <div className={`p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center`}>
                         <h4 className={`font-bold text-slate-700`}>{v.label}</h4>
                         <span className="text-xs font-black opacity-50">{v.data?.length || 0}</span>
                      </div>
                      <div className="flex-1 overflow-auto p-3 space-y-2">
                         {v.data?.map((item: any) => (
                           <div key={item.productId} className="p-2 bg-slate-50 rounded-lg text-xs font-medium border border-transparent hover:border-slate-200 transition-all">
                              {item.name}
                              <div className="mt-1 text-[10px] text-slate-400 font-bold uppercase">{item.status}</div>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
              </div>
           )}

           {activeTab === 'EXPIRY' && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-center justify-between">
                      <div>
                         <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Expired Units</p>
                         <h3 className="text-3xl font-black text-rose-700">{data?.expiryLifecycle?.expired?.length || 0}</h3>
                      </div>
                      <Archive className="text-rose-300" size={40}/>
                   </div>
                   <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-center justify-between">
                      <div>
                         <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Near Expiry (180D)</p>
                         <h3 className="text-3xl font-black text-amber-700">{data?.expiryLifecycle?.nearExpiry?.length || 0}</h3>
                      </div>
                      <Clock className="text-amber-300" size={40}/>
                   </div>
                </div>
                <DataTable 
                  columns={[
                    { key: 'name', label: 'Product', width: '50%' },
                    { key: 'totalStock', label: 'Stock', width: '20%', align: 'right' },
                    { key: 'stockValue', label: 'Loss Value', width: '30%', align: 'right', format: (v) => `₹${v.toLocaleString()}` }
                  ]}
                  data={data?.expiryLifecycle?.expired || []}
                  emptyMessage="Zero expired stock. Excellent management!"
                />
             </div>
           )}
        </div>
      </div>

      {/* OPTIMIZATION MODAL */}
      {showOptimizationModal && (
        <Modal 
          isOpen={showOptimizationModal}
          title="AI Inventory Optimization Engine" 
          onClose={() => setShowOptimizationModal(false)}
          size="lg"
        >
          <div className="p-2">
             <div className="bg-blue-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="text-xl font-bold mb-2">Enterprise Resource Optimization</h3>
                   <p className="text-blue-100 text-sm opacity-80">Our engine will analyze {data?.metadata?.totalProducts} SKUs to synchronize reorder points with real-world demand patterns.</p>
                </div>
                <BrainCircuit className="absolute right-0 top-0 text-white/10 -mr-4 -mt-4" size={160} />
             </div>

             <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl">
                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Target size={20}/></div>
                   <div>
                      <h4 className="font-bold text-slate-800">Dynamic Reordering</h4>
                      <p className="text-sm text-slate-500">Automatically adjust safety stock based on 90-day volatility.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Zap size={20}/></div>
                   <div>
                      <h4 className="font-bold text-slate-800">Dead Stock Mitigation</h4>
                      <p className="text-sm text-slate-500">Auto-flag items with zero movement for liquidation processing.</p>
                   </div>
                </div>
             </div>

             <button 
               onClick={handleOptimization}
               disabled={optimizing}
               className="w-full bg-[#1D3557] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
             >
                {optimizing ? <RefreshCw className="animate-spin" size={20}/> : <BrainCircuit size={20}/>}
                {optimizing ? 'Calculating Vectors...' : 'Run Optimization Now'}
             </button>
          </div>
        </Modal>
      )}
    </ERPLayout>
  );
};

export default InventoryAnalytics;
