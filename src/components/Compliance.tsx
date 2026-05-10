import React, { useState, useMemo } from 'react';
import { 
 ShieldCheck, AlertTriangle, FileText, Thermometer, CheckSquare, 
 Calendar, Download, Search, AlertCircle, CheckCircle, Clock, 
 Plus, Edit, Trash2, X, Save, RefreshCw, Grid3X3, List
} from 'lucide-react';
import { 
 ERPLayout, 
 FilterBar, 
 DataTable, 
 StatCard, 
 Badge, 
 Tabs,
 Modal
} from '../components/UniversalLayout';
import { 
 useDataFetch, 
 useDatabaseStatus, 
 useSearch, 
 usePagination 
} from '../hooks/useDataFetch';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { useNotificationSystem } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatters';

type ComplianceTab = 'LICENSES' | 'H1_REGISTER' | 'COLD_CHAIN' | 'AUDITS';
type LicenseViewMode = 'grid' | 'list';

const Compliance: React.FC = () => {
 const { status: dbStatus } = useDatabaseStatus();
 const { user } = useAuth();
 const notify = useNotificationSystem();
 
 // ============================================================
 // DATA FETCHING
 // ============================================================
 const { data: licensesData, loading: loadingLicenses, refetch: refetchLicenses } = useDataFetch<any[]>('/api/compliance/licenses', { skipCache: true });
 const { data: h1Data, loading: loadingH1, refetch: refetchH1 } = useDataFetch<any[]>('/api/compliance/h1', { skipCache: true });
 const { data: tempData, loading: loadingTemp, refetch: refetchTemp } = useDataFetch<any[]>('/api/compliance/temp-logs', { skipCache: true });
 const { data: auditsData, loading: loadingAudits, refetch: refetchAudits } = useDataFetch<any[]>('/api/compliance/audits', { skipCache: true });

 // ============================================================
 // VIEW STATES
 // ============================================================
 const [activeTab, setActiveTab] = useState<ComplianceTab>('LICENSES');
 const [licenseViewMode, setLicenseViewMode] = useState<LicenseViewMode>('grid');
 const [showRecordModal, setShowRecordModal] = useState(false);
 const [saving, setSaving] = useState(false);
 const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
 const [licenseForm, setLicenseForm] = useState({
 name: '',
 license_number: '',
 expiry_date: '',
 category: 'Retail',
 status: 'Valid'
 });
 const [h1Form, setH1Form] = useState({
 entry_date: new Date().toISOString().slice(0, 10),
 invoice_no: '',
 patient_name: '',
 doctor_name: '',
 drug_name: '',
 batch_number: '',
 quantity: '1'
 });
 const [tempForm, setTempForm] = useState({
 temperature: '',
 equipment_name: 'Main Refrigerator',
 checked_by: user?.name || user?.username || '',
 remarks: ''
 });
 const [auditForm, setAuditForm] = useState({
 audit_date: new Date().toISOString().slice(0, 10),
 auditor_name: user?.name || user?.username || '',
 score_percentage: '',
 status: 'Draft',
 notes: ''
 });
 
 // ============================================================
 // EVENT HANDLERS
 // ============================================================
 const handleRefresh = () => {
 refetchLicenses();
 refetchH1();
 refetchTemp();
 refetchAudits();
 };

 const handleNewRecord = () => {
 setEditingLicenseId(null);
 if (activeTab === 'LICENSES') {
 setLicenseForm({
 name: '',
 license_number: '',
 expiry_date: '',
 category: 'Retail',
 status: 'Valid'
 });
 }
 setShowRecordModal(true);
 };

 const closeRecordModal = () => {
 if (!saving) setShowRecordModal(false);
 };

 const handleSaveRecord = async (event: React.FormEvent) => {
 event.preventDefault();
 setSaving(true);

 try {
 if (activeTab === 'LICENSES') {
 if (editingLicenseId) {
 await apiClient.put(`/api/compliance/licenses/${editingLicenseId}`, licenseForm);
 } else {
 await apiClient.post('/api/compliance/licenses', licenseForm);
 }
 refetchLicenses();
 } else if (activeTab === 'H1_REGISTER') {
 await apiClient.post('/api/compliance/h1', {
 ...h1Form,
 quantity: Number(h1Form.quantity)
 });
 refetchH1();
 } else if (activeTab === 'COLD_CHAIN') {
 await apiClient.post('/api/compliance/temp-logs', {
 ...tempForm,
 temperature: Number(tempForm.temperature)
 });
 refetchTemp();
 } else {
 await apiClient.post('/api/compliance/audits', {
 ...auditForm,
 score_percentage: auditForm.score_percentage ? Number(auditForm.score_percentage) : null
 });
 refetchAudits();
 }

 notify.success(editingLicenseId ? 'Compliance record updated' : 'Compliance record saved');
 setEditingLicenseId(null);
 setShowRecordModal(false);
 } catch (error: any) {
 notify.error(error.message || 'Failed to save compliance record');
 } finally {
 setSaving(false);
 }
 };

 const handleEditLicense = (license: any) => {
 setEditingLicenseId(license.id);
 setLicenseForm({
 name: license.name || '',
 license_number: license.license_number || '',
 expiry_date: license.expiry_date ? new Date(license.expiry_date).toISOString().slice(0, 10) : '',
 category: license.category || 'Retail',
 status: license.status || 'Valid'
 });
 setShowRecordModal(true);
 };

 const handleDeleteLicense = async (license: any) => {
 const confirmed = window.confirm(`Delete license "${license.name}" (${license.license_number})? This cannot be undone.`);
 if (!confirmed) return;

 try {
 await apiClient.delete(`/api/compliance/licenses/${license.id}`);
 refetchLicenses();
 notify.warning(`Deleted license ${license.license_number}`);
 } catch (error: any) {
 notify.error(error.message || 'Failed to delete license');
 }
 };

 const getStatusVariant = (status: string) => {
 switch (status) {
 case 'Valid':
 case 'OK': return 'success';
 case 'Expiring Soon':
 case 'Warning': return 'warning';
 case 'Expired':
 case 'Critical': return 'danger';
 default: return 'neutral';
 }
 };

 if (!dbStatus.connected) {
 return (
 <div className="p-12 text-center">
 <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
 <h2 className="text-2xl font-bold text-slate-800">Compliance Database Offline</h2>
 <p className="text-slate-500 max-w-md mx-auto mt-2">Active connection required for regulatory reporting and real-time logs.</p>
 <button onClick={handleRefresh} className="mt-6 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent">
 Retry Connection
 </button>
 </div>
 );
 }

 return (
 <ERPLayout
 title="Regulatory Compliance"
 description="Drug Licenses • Schedule H1 Register • Cold Chain Logs"
 actionButtons={[
 { label: 'Refresh', onClick: handleRefresh, icon: <RefreshCw size={16}/> },
 { label: 'New Record', onClick: handleNewRecord, variant: 'primary', icon: <Plus size={16}/> }
 ]}
 >
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <StatCard 
 title="Active Licenses" 
 value={licensesData?.filter(l => l.status === 'Valid').length || 0} 
 icon={<ShieldCheck size={20}/>} 
 color="blue" 
 />
 <StatCard 
 title="H1 Entries (Month)" 
 value={h1Data?.length || 0} 
 icon={<FileText size={20}/>} 
 color="purple" 
 />
 <StatCard 
 title="Current Fridge Temp" 
 value={tempData?.[0] ? `${tempData[0].temperature}°C` : '--'} 
 icon={<Thermometer size={20}/>} 
 color={tempData?.[0]?.status === 'OK' ? 'success' : 'danger'} 
 />
 </div>

 <Tabs 
 activeTab={activeTab} 
 onChange={setActiveTab}
 tabs={[
 { id: 'LICENSES', label: 'Licenses', badge: licensesData?.length },
 { id: 'H1_REGISTER', label: 'H1 Register', badge: h1Data?.length },
 { id: 'COLD_CHAIN', label: 'Cold Chain', badge: tempData?.length },
 { id: 'AUDITS', label: 'Inspections', badge: auditsData?.length }
 ]}
 />

 <div className="mt-6">
 {activeTab === 'LICENSES' && (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">License Register</h3>
 <p className="text-xs text-slate-500">Review, edit, renew, or remove regulatory license records.</p>
 </div>
 <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
 <button
 type="button"
 title="Grid view"
 onClick={() => setLicenseViewMode('grid')}
 className={`p-2 rounded-lg transition-all ${licenseViewMode === 'grid' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
 >
 <Grid3X3 size={18} />
 </button>
 <button
 type="button"
 title="List view"
 onClick={() => setLicenseViewMode('list')}
 className={`p-2 rounded-lg transition-all ${licenseViewMode === 'list' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
 >
 <List size={18} />
 </button>
 </div>
 </div>

 {licenseViewMode === 'grid' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {licensesData?.map(license => (
 <div key={license.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-none transition-shadow">
 <div className="absolute top-0 right-0 p-3 opacity-5">
 <ShieldCheck size={80} className="text-slate-800" />
 </div>
 <div className="relative z-10">
 <div className="flex justify-between items-start mb-4">
 <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
 <Badge text={license.category} variant="neutral" />
 </div>
 <Badge text={license.status} variant={getStatusVariant(license.status)} />
 </div>
 <h3 className="text-lg font-bold text-slate-800 mb-1">{license.name}</h3>
 <p className="text-sm font-mono text-slate-500 mb-4">{license.license_number}</p>
 
 <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-100">
 <span className="text-slate-500">Expires On</span>
 <span className="font-bold text-slate-800">
 {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : '--'}
 </span>
 </div>
 <div className="flex items-center gap-2 mt-5">
 <button onClick={() => handleEditLicense(license)} className="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-accent text-xs font-bold uppercase tracking-wider hover:bg-blue-100 flex items-center justify-center gap-2">
 <Edit size={14} /> Edit
 </button>
 <button onClick={() => handleDeleteLicense(license)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider hover:bg-red-100" title="Delete license">
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <DataTable
 columns={[
 { key: 'name', label: 'License', width: '24%', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
 { key: 'license_number', label: 'Number', width: '20%', render: (v) => <span className="font-mono text-xs">{v}</span> },
 { key: 'category', label: 'Category', width: '14%', render: (v) => <Badge text={v || '--'} variant="neutral" /> },
 { key: 'status', label: 'Status', width: '14%', render: (v) => <Badge text={v || '--'} variant={getStatusVariant(v)} /> },
 { key: 'expiry_date', label: 'Expires', width: '14%', render: (v) => v ? formatDate(v) : '--' },
 {
 key: 'actions',
 label: 'Actions',
 width: '14%',
 render: (_v, row) => (
 <div className="flex items-center gap-2">
 <button onClick={() => handleEditLicense(row)} className="p-2 rounded-lg text-accent hover:bg-blue-50" title="Edit license">
 <Edit size={16} />
 </button>
 <button onClick={() => handleDeleteLicense(row)} className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Delete license">
 <Trash2 size={16} />
 </button>
 </div>
 )
 }
 ]}
 data={licensesData || []}
 loading={loadingLicenses}
 />
 )}
 </div>
 )}

 {activeTab === 'H1_REGISTER' && (
 <DataTable 
 columns={[
 { key: 'entry_date', label: 'Date', width: '15%', render: (v) => formatDate(v) },
 { key: 'drug_name', label: 'Drug Name', width: '20%', render: (v) => <span className="font-bold text-red-700">{v}</span> },
 { key: 'batch_number', label: 'Batch', width: '15%', render: (v) => <span className="font-mono text-xs">{v}</span> },
 { key: 'quantity', label: 'Qty', width: '10%' },
 { key: 'patient_name', label: 'Patient', width: '20%' },
 { key: 'doctor_name', label: 'Doctor', width: '20%' }
 ]}
 data={h1Data || []}
 loading={loadingH1}
 />
 )}

 {activeTab === 'COLD_CHAIN' && (
 <DataTable 
 columns={[
 { key: 'log_date', label: 'Date', width: '20%', render: (v) => formatDate(v) },
 { key: 'log_time', label: 'Time', width: '20%' },
 { key: 'temperature', label: 'Reading', width: '20%', render: (v) => <span className="font-bold">{v}°C</span> },
 { key: 'checked_by', label: 'Checked By', width: '20%' },
 { key: 'status', label: 'Status', width: '20%', render: (v) => <Badge text={v} variant={getStatusVariant(v)} /> }
 ]}
 data={tempData || []}
 loading={loadingTemp}
 />
 )}

 {activeTab === 'AUDITS' && (
 <DataTable 
 columns={[
 { key: 'audit_date', label: 'Date', width: '18%', render: (v) => formatDate(v) },
 { key: 'auditor_name', label: 'Auditor', width: '22%' },
 { key: 'score_percentage', label: 'Score', width: '15%', render: (v) => v !== null && v !== undefined ? `${v}%` : '--' },
 { key: 'status', label: 'Status', width: '15%', render: (v) => <Badge text={v || 'Draft'} variant={getStatusVariant(v)} /> },
 { key: 'notes', label: 'Notes', width: '30%' }
 ]}
 data={auditsData || []}
 loading={loadingAudits}
 />
 )}
 </div>

 {showRecordModal && (
 <Modal
 isOpen={showRecordModal}
 title={`${editingLicenseId ? 'Edit' : 'New'} ${activeTab === 'H1_REGISTER' ? 'H1 Register' : activeTab === 'COLD_CHAIN' ? 'Cold Chain' : activeTab === 'AUDITS' ? 'Inspection' : 'License'} Record`}
 onClose={closeRecordModal}
 size="lg"
 >
 <form onSubmit={handleSaveRecord} className="space-y-5">
 {activeTab === 'LICENSES' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Input label="License Name" value={licenseForm.name} required onChange={(value) => setLicenseForm({ ...licenseForm, name: value })} />
 <Input label="License Number" value={licenseForm.license_number} required onChange={(value) => setLicenseForm({ ...licenseForm, license_number: value })} />
 <Input label="Expiry Date" type="date" value={licenseForm.expiry_date} onChange={(value) => setLicenseForm({ ...licenseForm, expiry_date: value })} />
 <Select label="Category" value={licenseForm.category} options={['Retail', 'Wholesale', 'Manufacturing', 'Food Safety', 'Tax']} onChange={(value) => setLicenseForm({ ...licenseForm, category: value })} />
 <Select label="Status" value={licenseForm.status} options={['Valid', 'Expiring Soon', 'Expired', 'Suspended']} onChange={(value) => setLicenseForm({ ...licenseForm, status: value })} />
 </div>
 )}

 {activeTab === 'H1_REGISTER' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Input label="Entry Date" type="date" value={h1Form.entry_date} onChange={(value) => setH1Form({ ...h1Form, entry_date: value })} />
 <Input label="Invoice No" value={h1Form.invoice_no} onChange={(value) => setH1Form({ ...h1Form, invoice_no: value })} />
 <Input label="Drug Name" value={h1Form.drug_name} required onChange={(value) => setH1Form({ ...h1Form, drug_name: value })} />
 <Input label="Batch Number" value={h1Form.batch_number} onChange={(value) => setH1Form({ ...h1Form, batch_number: value })} />
 <Input label="Quantity" type="number" value={h1Form.quantity} required onChange={(value) => setH1Form({ ...h1Form, quantity: value })} />
 <Input label="Patient Name" value={h1Form.patient_name} required onChange={(value) => setH1Form({ ...h1Form, patient_name: value })} />
 <Input label="Doctor Name" value={h1Form.doctor_name} required onChange={(value) => setH1Form({ ...h1Form, doctor_name: value })} />
 </div>
 )}

 {activeTab === 'COLD_CHAIN' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Input label="Temperature" type="number" value={tempForm.temperature} required onChange={(value) => setTempForm({ ...tempForm, temperature: value })} />
 <Input label="Equipment" value={tempForm.equipment_name} required onChange={(value) => setTempForm({ ...tempForm, equipment_name: value })} />
 <Input label="Checked By" value={tempForm.checked_by} onChange={(value) => setTempForm({ ...tempForm, checked_by: value })} />
 <Input label="Remarks" value={tempForm.remarks} onChange={(value) => setTempForm({ ...tempForm, remarks: value })} />
 </div>
 )}

 {activeTab === 'AUDITS' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Input label="Inspection Date" type="date" value={auditForm.audit_date} onChange={(value) => setAuditForm({ ...auditForm, audit_date: value })} />
 <Input label="Auditor" value={auditForm.auditor_name} onChange={(value) => setAuditForm({ ...auditForm, auditor_name: value })} />
 <Input label="Score Percentage" type="number" value={auditForm.score_percentage} onChange={(value) => setAuditForm({ ...auditForm, score_percentage: value })} />
 <Select label="Status" value={auditForm.status} options={['Draft', 'Submitted', 'Reviewed']} onChange={(value) => setAuditForm({ ...auditForm, status: value })} />
 <div className="md:col-span-2">
 <Input label="Notes" value={auditForm.notes} onChange={(value) => setAuditForm({ ...auditForm, notes: value })} />
 </div>
 </div>
 )}

 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
 <button type="button" onClick={closeRecordModal} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
 Cancel
 </button>
 <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent disabled:opacity-60 flex items-center gap-2">
 <Save size={16} /> {saving ? 'Saving...' : editingLicenseId ? 'Update Record' : 'Save Record'}
 </button>
 </div>
 </form>
 </Modal>
 )}
 </ERPLayout>
 );
};

const fieldClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-accent";

const Input = ({
 label,
 value,
 onChange,
 type = 'text',
 required = false
}: {
 label: string;
 value: string;
 onChange: (value: string) => void;
 type?: string;
 required?: boolean;
}) => (
 <label className="block">
 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
 <input
 type={type}
 value={value}
 required={required}
 onChange={(event) => onChange(event.target.value)}
 className={fieldClass}
 />
 </label>
);

const Select = ({
 label,
 value,
 options,
 onChange
}: {
 label: string;
 value: string;
 options: string[];
 onChange: (value: string) => void;
}) => (
 <label className="block">
 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
 <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
 {options.map((option) => (
 <option key={option} value={option}>{option}</option>
 ))}
 </select>
 </label>
);

export default Compliance;

