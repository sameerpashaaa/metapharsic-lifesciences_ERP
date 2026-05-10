/**
 * REFACTORED ORDER MANAGEMENT SYSTEM (OMS) COMPONENT
 * Uses ERPLayout + useDataFetch patterns
 */

import React, { useState, useMemo } from 'react';
import { 
 ShoppingCart, Package, CheckCircle, Clock, Truck, 
 XCircle, Search, Filter, AlertTriangle, ChevronRight, 
 Eye, MoreHorizontal, Plus, ArrowRight, Box, 
 CreditCard, Send, CheckSquare, Tag, FileText, ClipboardList, RefreshCcw
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

const OMS: React.FC = () => {
 const { status: dbStatus } = useDatabaseStatus();

 // Data Fetching
 const { data: orders, loading, error, refetch } = useDataFetch('/api/oms');
 const { data: dropdownData } = useDataFetch('/api/oms/dropdown');
 const { data: products } = useDataFetch('/api/products');

 // UI States
 const [activeTab, setActiveTab] = useState('LIST');
 const [filters, setFilters] = useState({
 searchTerm: '',
 status: 'ALL',
 });
 const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);
 const [showCreateModal, setShowCreateModal] = useState(false);

 // Detail Fetching
 const { data: selectedOrder, loading: loadingDetail } = useDataFetch(
 selectedOrderId ? `/api/oms/${selectedOrderId}` : null
 );

 // Search & Pagination
 const { results } = useSearch(orders || [], ['id', 'distributorName']);
 const filteredResults = useMemo(() => {
 if (filters.status === 'ALL') return results;
 return results.filter((item: any) => item.status === filters.status);
 }, [results, filters.status]);

 const pagination = usePagination(filteredResults, 10);

 // Create Order State
 const [selectedDistributor, setSelectedDistributor] = useState<any>(null);
 const [cart, setCart] = useState<any[]>([]);
 const [packingSpecs, setPackingSpecs] = useState('');
 const [labelingSpecs, setLabelingSpecs] = useState('');

 // Handlers
 const handleRefresh = async () => {
 await refetch();
 };

 const handleFilterChange = (key: string, value: string) => {
 setFilters(prev => ({ ...prev, [key]: value }));
 pagination.goToPage(1);
 };

 const handleViewDetail = (order: any) => {
 setSelectedOrderId(order.id);
 setShowDetailModal(true);
 };

 const addToCart = (product: any) => {
 const existing = cart.find(item => item.productId === product.id);
 if (existing) {
 setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
 } else {
 setCart([...cart, { 
 productId: product.id, 
 productName: product.name, 
 quantity: 1, 
 rate: product.selling_rate || product.mrp * 0.7,
 amount: product.selling_rate || product.mrp * 0.7
 }]);
 }
 };

 const handlePlaceOrder = async () => {
 if (!selectedDistributor || cart.length === 0) return;

 try {
 const response = await fetch('/api/oms', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 distributorId: selectedDistributor.value,
 distributorName: selectedDistributor.label,
 items: cart,
 packingSpecs,
 labelingSpecs,
 priority: 'Normal'
 }),
 });

 if (response.ok) {
 setShowCreateModal(false);
 setCart([]);
 setPackingSpecs('');
 setLabelingSpecs('');
 refetch();
 }
 } catch (err) {
 console.error('Failed to place order:', err);
 }
 };

 const getStatusVariant = (status: string) => {
 switch(status) {
 case 'Pending Approval': return 'warning';
 case 'Approved': return 'info';
 case 'Processing': return 'warning';
 case 'Shipped': return 'info';
 case 'Delivered': return 'success';
 case 'Rejected': return 'danger';
 default: return 'neutral';
 }
 };

 const columns = [
 { 
 key: 'id', 
 label: 'Order ID', 
 width: '15%',
 render: (val: string) => <span className="font-mono text-xs font-bold text-slate-500">{val.substring(0, 8)}...</span>
 },
 { key: 'distributorName', label: 'Distributor', width: '25%' },
 { 
 key: 'date', 
 label: 'Date', 
 width: '12%',
 render: (val: string) => new Date(val).toLocaleDateString()
 },
 { 
 key: 'totalAmount', 
 label: 'Amount', 
 width: '12%',
 render: (val: number) => `₹${Number(val).toLocaleString()}`
 },
 { 
 key: 'status', 
 label: 'Status', 
 width: '15%',
 render: (val: string) => <Badge text={val} variant={getStatusVariant(val)} />
 },
 {
 key: 'actions',
 label: 'Actions',
 width: '10%',
 render: (_: any, row: any) => (
 <button onClick={() => handleViewDetail(row)} className="p-2 text-accent hover:bg-blue-50 rounded-lg transition-colors">
 <Eye size={18} />
 </button>
 )
 }
 ];

 if (!dbStatus.connected && !loading) {
 return (
 <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6 flex gap-3">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <div>
 <p className="font-semibold text-red-900">Database Connection Failed</p>
 <p className="text-red-700 text-sm mt-1">{dbStatus.error}</p>
 </div>
 </div>
 );
 }

 return (
 <ERPLayout
 title="Order Management System (OMS)"
 description="B2B Order Processing & Fulfillment Hub"
 onRefresh={handleRefresh}
 isLoading={loading}
 actionButtons={[
 <button 
 key="new-order"
 onClick={() => setShowCreateModal(true)}
 className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm"
 >
 <ShoppingCart size={18} /> New Order
 </button>
 ]}
 >
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <StatCard label="Total Orders" value={orders?.length || 0} color="blue" />
 <StatCard label="Pending" value={orders?.filter((o: any) => o.status === 'Pending Approval').length || 0} color="warning" />
 <StatCard label="Shipped Today" value={orders?.filter((o: any) => o.status === 'Shipped').length || 0} color="info" />
 <StatCard label="Total Value" value={`₹${(orders?.reduce((acc: number, o: any) => acc + Number(o.totalAmount), 0) || 0).toLocaleString()}`} color="success" />
 </div>

 <FilterBar
 filters={[
 {
 id: 'searchTerm',
 label: 'Search',
 type: 'text',
 value: filters.searchTerm,
 onChange: (v) => handleFilterChange('searchTerm', v),
 },
 {
 id: 'status',
 label: 'Status',
 type: 'select',
 value: filters.status,
 onChange: (v) => handleFilterChange('status', v),
 options: dropdownData?.statuses || [
 { value: 'ALL', label: 'All Statuses' },
 { value: 'Pending Approval', label: 'Pending Approval' },
 { value: 'Approved', label: 'Approved' },
 { value: 'Shipped', label: 'Shipped' },
 ]
 }
 ]}
 />

 <DataTable
 columns={columns}
 data={pagination.paginatedData}
 loading={loading}
 />

 {/* Detail Modal */}
 {showDetailModal && (
 <Modal 
 isOpen={showDetailModal} 
 onClose={() => setShowDetailModal(false)}
 title="Order Details"
 size="lg"
 >
 {loadingDetail ? (
 <div className="py-20 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-400" /></div>
 ) : selectedOrder ? (
 <div className="space-y-6">
 <div className="flex justify-between border-b border-slate-100 pb-4">
 <div>
 <h3 className="text-xl font-bold text-slate-800">Order #{selectedOrder.id.substring(0, 8)}</h3>
 <p className="text-slate-500 text-sm">{selectedOrder.distributor_name} • {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
 </div>
 <Badge text={selectedOrder.status} variant={getStatusVariant(selectedOrder.status)} />
 </div>

 <div className="overflow-hidden border border-slate-100 rounded-lg">
 <table className="w-full text-left text-sm">
 <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
 <tr>
 <th className="p-3">Product</th>
 <th className="p-3 text-center">Qty</th>
 <th className="p-3 text-right">Rate</th>
 <th className="p-3 text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {selectedOrder.items?.map((item: any, idx: number) => (
 <tr key={idx}>
 <td className="p-3 font-medium text-slate-800">{item.product_name}</td>
 <td className="p-3 text-center">{item.quantity}</td>
 <td className="p-3 text-right">₹{item.rate}</td>
 <td className="p-3 text-right font-bold">₹{item.amount.toLocaleString()}</td>
 </tr>
 ))}
 </tbody>
 <tfoot className="bg-slate-50 font-bold">
 <tr>
 <td colSpan={3} className="p-3 text-right uppercase text-[10px] tracking-wider text-slate-500">Total Amount</td>
 <td className="p-3 text-right text-lg text-slate-900">₹{Number(selectedOrder.total_amount).toLocaleString()}</td>
 </tr>
 </tfoot>
 </table>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Packing Instructions</p>
 <p className="text-sm text-slate-700 italic">{selectedOrder.packing_specs || 'Standard packing'}</p>
 </div>
 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Labeling Specs</p>
 <p className="text-sm text-slate-700 italic">{selectedOrder.labeling_specs || 'Standard labeling'}</p>
 </div>
 </div>
 </div>
 ) : null}
 </Modal>
 )}

 {/* Create Order Modal */}
 {showCreateModal && (
 <Modal
 isOpen={showCreateModal}
 onClose={() => setShowCreateModal(false)}
 title="Create New B2B Order"
 size="xl"
 >
 <div className="grid grid-cols-3 gap-6">
 <div className="col-span-2 space-y-4">
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase">Select Distributor</label>
 <select 
 className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
 onChange={(e) => {
 const opt = dropdownData?.distributors.find((d: any) => d.value === e.target.value);
 setSelectedDistributor(opt);
 }}
 >
 <option value="">Choose a partner...</option>
 {dropdownData?.distributors?.map((d: any) => (
 <option key={d.value} value={d.value}>{d.label}</option>
 ))}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase">Product Catalog</label>
 <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
 {products?.map((p: any) => (
 <div key={p.id} className="p-3 border border-slate-100 rounded-lg hover:border-accent cursor-pointer transition-colors flex justify-between items-center group" onClick={() => addToCart(p)}>
 <div>
 <p className="font-bold text-sm text-slate-800">{p.name}</p>
 <p className="text-xs text-slate-500">₹{p.selling_rate || p.mrp * 0.7}</p>
 </div>
 <Plus size={16} className="text-slate-300 group-hover:text-accent" />
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
 <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={18}/> Cart</h4>
 <div className="flex-1 space-y-2 overflow-y-auto mb-4">
 {cart.map((item, idx) => (
 <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-sm flex justify-between items-center">
 <span className="font-medium truncate max-w-[120px]">{item.productName}</span>
 <span className="font-bold">x{item.quantity}</span>
 </div>
 ))}
 </div>
 <div className="border-t border-slate-200 pt-4 space-y-4">
 <div className="flex justify-between font-bold text-lg">
 <span>Total</span>
 <span>₹{cart.reduce((sum, i) => sum + (i.quantity * i.rate), 0).toLocaleString()}</span>
 </div>
 <button 
 onClick={handlePlaceOrder}
 disabled={!selectedDistributor || cart.length === 0}
 className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent disabled:opacity-50 transition-colors shadow-none shadow-none"
 >
 Place Order
 </button>
 </div>
 </div>
 </div>
 </Modal>
 )}
 </ERPLayout>
 );
};

export default OMS;


