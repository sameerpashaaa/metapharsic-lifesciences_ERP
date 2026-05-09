/**
 * REFACTORED HR COMPONENT
 * Uses ERPLayout + useDataFetch patterns
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, TrendingUp, Award, AlertCircle, Phone, Mail, 
  MapPin, Target, Calendar, DollarSign, Briefcase, Plus 
} from 'lucide-react';
import { 
  ERPLayout, FilterBar, DataTable, StatCard, Tabs, Badge, Modal 
} from './UniversalLayout';
import { 
  useDataFetch, useDatabaseStatus, useSearch, usePagination 
} from '../hooks/useDataFetch';
import { useAuth } from '../context/AuthContext';
import { useNotificationSystem } from '../hooks/useNotifications';
import { MedicalRepresentative } from '../types';

const HR: React.FC = () => {
  const { status: dbStatus } = useDatabaseStatus();
  const { hasPermission } = useAuth();
  const notify = useNotificationSystem();
  const canManageHR = hasPermission(['ADMIN', 'HR_MANAGER']);


  // --- 1. DATA FETCHING ---
  const { data: employees, loading: loadingEmployees, refetch: refetchEmployees } = useDataFetch<MedicalRepresentative[]>(
    '/api/hr/employees'
  );
  const { data: statsData, loading: loadingStats } = useDataFetch<any>(
    '/api/hr/performance-stats'
  );

  // --- 2. VIEW STATES ---
  const [activeTab, setActiveTab] = useState('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');

  // --- 3. MODAL STATES ---
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<MedicalRepresentative | null>(null);

  // --- 4. EVENT HANDLERS ---
  const handleRefresh = async () => {
    await refetchEmployees();
    notify.success('HR data refreshed');
  };

  // --- 5. RENDER HELPERS ---
  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch(status) {
      case 'Active': return 'success';
      case 'On Leave': return 'warning';
      case 'Terminated': return 'danger';
      default: return 'info';
    }
  };

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

  return (
    <ERPLayout
      title="Human Resources"
      description="Manage Employee Directory, Performance, and Payroll"
      onRefresh={handleRefresh}
      isLoading={loadingEmployees || loadingStats}
      actionButtons={
        canManageHR && [
          { label: '➕ New Employee', onClick: () => setShowEmployeeModal(true), icon: <Plus size={16}/> }
        ]
      }
    >
      {/* STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Employees" 
          value={statsData?.totalEmployees || 0} 
          color="blue" 
          icon={<Users size={20}/>} 
        />
        <StatCard 
          title="Active Now" 
          value={statsData?.activeEmployees || 0} 
          color="success" 
          icon={<Briefcase size={20}/>} 
        />
        <StatCard 
          title="Star Performers" 
          value={statsData?.starPerformers || 0} 
          color="warning" 
          icon={<Award size={20}/>} 
        />
        <StatCard 
          title="Avg. Achievement" 
          value={`${Math.round(statsData?.averageAchievement || 0)}%`} 
          color="info" 
          icon={<TrendingUp size={20}/>} 
        />
      </div>

      {/* TABS */}
      <Tabs
        tabs={[
          { id: 'DIRECTORY', label: 'Employee Directory', badge: employees?.length },
          { id: 'PERFORMANCE', label: 'Performance Tracking' },
          { id: 'PAYROLL', label: 'Payroll Management' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* CONTENT: DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Name', width: '25%' },
            { key: 'assignedArea', label: 'Region/Area', width: '20%' },
            { key: 'contact', label: 'Contact', width: '15%' },
            { 
              key: 'status', 
              label: 'Status', 
              width: '15%', 
              render: (v) => <Badge text={v} variant={getStatusVariant(v)} /> 
            },
            { 
              key: 'targetAchievement', 
              label: 'Target', 
              width: '15%', 
              align: 'right',
              render: (v) => (
                <div className="flex items-center justify-end gap-2">
                  <span className={`font-bold ${v >= 100 ? 'text-green-600' : 'text-slate-700'}`}>{v}%</span>
                  <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${v >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(v, 100)}%` }}
                    />
                  </div>
                </div>
              )
            },
            { 
              key: 'actions', 
              label: 'Actions', 
              width: '10%', 
              render: (_, row) => (
                <button 
                  onClick={() => { setSelectedEmployee(row); setShowEmployeeModal(true); }}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  View
                </button>
              )
            }
          ]}
          data={employees || []}
          loading={loadingEmployees}
          emptyMessage="No employee records found"
        />
      )}

      {/* CONTENT: PERFORMANCE (Placeholder) */}
      {activeTab === 'PERFORMANCE' && (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
           <TrendingUp className="mx-auto mb-4 text-blue-500 opacity-20" size={48}/>
           <h3 className="text-xl font-bold text-slate-800">Performance Analytics Dashboard</h3>
           <p className="text-slate-500 mt-2">Connecting real-time sales targets vs actuals in Phase 3 Expansion</p>
        </div>
      )}

      {/* CONTENT: PAYROLL (Placeholder) */}
      {activeTab === 'PAYROLL' && (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
           <DollarSign className="mx-auto mb-4 text-green-500 opacity-20" size={48}/>
           <h3 className="text-xl font-bold text-slate-800">Payroll & Disbursement</h3>
           <p className="text-slate-500 mt-2">Automated salary generation and slip processing in Phase 3</p>
        </div>
      )}

      {/* EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <Modal
          title={selectedEmployee ? `Employee Profile: ${selectedEmployee.name}` : 'New Employee Entry'}
          onClose={() => { setShowEmployeeModal(false); setSelectedEmployee(null); }}
          size="lg"
        >
          {selectedEmployee ? (
            <div className="space-y-6">
               <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                     <Users size={32}/>
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h3>
                     <p className="text-slate-500">{selectedEmployee.assignedArea} HQ</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 rounded-xl">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Details</p>
                     <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                           <Phone size={14} className="text-slate-400"/> {selectedEmployee.contact}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                           <Mail size={14} className="text-slate-400"/> {selectedEmployee.email}
                        </div>
                     </div>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-xl">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Employment</p>
                     <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                           <Calendar size={14} className="text-slate-400"/> Joined: {selectedEmployee.joinDate}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                           <Target size={14} className="text-slate-400"/> Target: ₹{selectedEmployee.salesTarget.toLocaleString()}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
               <UserPlus className="mx-auto mb-4 opacity-20" size={48}/>
               <p className="font-bold text-slate-700">Employee Intake Form</p>
               <p className="text-sm mt-2">Adding new employees will be enabled in Phase 3</p>
            </div>
          )}
        </Modal>
      )}
    </ERPLayout>
  );
};

export default HR;
