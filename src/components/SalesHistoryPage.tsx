import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Printer, Download, Eye, Edit3, Trash2, RefreshCcw, 
  X, AlertCircle, FileSpreadsheet, Check
} from 'lucide-react';
import { getAllInvoices, getInvoiceById, deleteInvoice } from '../services/databaseService';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { printPOSInvoice, exportPOSInvoiceToExcel } from '../utils/accountingExport';
import { useAppStore } from '../store/useAppStore';
import { Tab, SalesInvoice } from '../types';

const SalesHistoryPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { setActiveTab } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<SalesInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const invoicesData = await getAllInvoices();
      setSavedInvoices(invoicesData || []);
    } catch (err: any) {
      console.error('SalesHistoryPage: Failed to load data', err);
      addNotification({
        type: 'error',
        title: 'Error Loading Invoices',
        message: err.message || 'Check your connection to the server.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const invoice = await getInvoiceById(invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setShowInvoicePreview(true);
      } else {
        addNotification({
          type: 'error',
          title: 'Invoice Not Found',
          message: 'The invoice details could not be retrieved.',
          priority: 'medium'
        });
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Error Loading Invoice',
        message: err.message || 'Check your connection.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action is irreversible.',
      onConfirm: async () => {
        const success = await deleteInvoice(invoiceId);
        if (success) {
          addNotification({
            type: 'success',
            title: 'Invoice Deleted',
            message: 'Invoice has been removed from the database.',
            priority: 'medium'
          });
          loadData();
        }
      }
    });
  };

  const handlePrint = () => {
    if (selectedInvoice) {
      printPOSInvoice(selectedInvoice, null);
    }
  };

  const handleExport = () => {
    if (selectedInvoice) {
      exportPOSInvoiceToExcel(selectedInvoice);
    }
  };

  const filteredInvoices = savedInvoices.filter(inv => 
    !searchTerm || 
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Complete Sales Register</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Master record of all POS & Billing transactions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-blue-600" title="Download Excel">
            <Download size={16} />
          </button>
          <button className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-indigo-600" title="Print Register">
            <Printer size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Invoice No or Customer..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <input type="date" className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500" />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10">
            <tr>
              <th className="p-4 border-b">Invoice No</th>
              <th className="p-4 border-b">Customer</th>
              <th className="p-4 border-b">Date</th>
              <th className="p-4 border-b text-right">Subtotal</th>
              <th className="p-4 border-b text-right">GST</th>
              <th className="p-4 border-b text-right">Net Amount</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Invoices...</p>
                  </div>
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <p className="text-sm font-bold text-slate-400 italic">No invoices found matching your search.</p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr 
                  key={inv.id} 
                  onClick={() => handleViewInvoice(inv.id)}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <td className="p-4 font-mono text-xs font-bold text-blue-700 group-hover:underline">{inv.invoiceNumber || inv.invoice_number}</td>
                  <td className="p-4 text-xs font-bold text-slate-700">{inv.customerName || inv.customer_name}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {formatDate(inv.date || inv.invoice_date)}
                  </td>
                  <td className="p-4 text-xs font-bold text-right">{formatCurrency(inv.taxableValue || inv.sub_total)}</td>
                  <td className="p-4 text-xs font-bold text-right">{formatCurrency(inv.totalGst || inv.total_gst)}</td>
                  <td className="p-4 text-xs font-black text-right">{formatCurrency(inv.netAmount || inv.net_amount)}</td>
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-1.5">
                      <button 
                        onClick={() => handleViewInvoice(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setActiveTab(Tab.POS);
                          // We would need to pass editing state to POS. 
                          // Currently StrategicPOS handles this via its own state.
                          // To maintain connection, we might need to use the store or navigate with state.
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="Edit Invoice"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setActiveTab(Tab.POS);
                        }}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-all"
                        title="Sales Return (Credit Note)"
                      >
                        <RefreshCcw size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showInvoicePreview && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><FileText size={20} /></div>
                <div>
                  <h3 className="font-black text-lg">Invoice Preview</h3>
                  <p className="text-xs text-blue-200 font-bold tracking-widest uppercase">{selectedInvoice.invoiceNumber || selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInvoicePreview(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-slate-50">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#1D3557] rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
                      <div>
                        <h2 className="text-xl font-black text-[#1D3557]">Metapharsic Enterprise Hub</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Pharma Distribution & Accounting</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-bold space-y-1">
                      <p>H-12, Industrial Area, Phase II</p>
                      <p>New Delhi, India - 110020</p>
                      <p>GSTIN: 07AAMCM4321A1Z9</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <h1 className="text-4xl font-black text-slate-200 uppercase tracking-tighter">Tax Invoice</h1>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 inline-block text-left">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Inv No:</span>
                        <span className="text-xs font-black text-blue-700">{selectedInvoice.invoiceNumber || selectedInvoice.invoice_number}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Date:</span>
                        <span className="text-xs font-black text-slate-800">{formatDate(selectedInvoice.date || selectedInvoice.invoice_date)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">{selectedInvoice.status || 'Completed'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-50 pb-1">Bill To</h4>
                    <h3 className="font-black text-slate-800">{selectedInvoice.customerName || selectedInvoice.customer_name}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">N/A Location</p>
                    <p className="text-xs text-slate-400 font-bold mt-1 italic">GSTIN: {selectedInvoice.customerGstin || 'Unregistered'}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">Delivery</h4>
                    <p className="text-xs text-slate-500 font-bold">Counter Delivery</p>
                    <p className="text-xs text-slate-500 font-bold">Self-Pickup</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#1D3557] text-white text-[10px] font-black uppercase tracking-widest border-b border-[#1D3557]">
                      <tr>
                        <th className="p-3">Description of Goods</th>
                        <th className="p-3 w-32 border-l border-white/10 text-center">Batch</th>
                        <th className="p-3 w-20 border-l border-white/10 text-center">Qty</th>
                        <th className="p-3 w-24 border-l border-white/10 text-right">Rate</th>
                        <th className="p-3 w-32 border-l border-white/10 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <p className="text-xs font-black text-slate-800">{item.product_name || item.productName || 'Unknown Product'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item.product_code || 'SKU-N/A'}</p>
                          </td>
                          <td className="p-3 text-center border-l border-slate-100">
                            <span className="font-mono text-xs font-bold text-blue-600">{item.batch_number || item.batchNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-center text-xs font-black text-slate-800 border-l border-slate-100">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-right text-xs font-bold border-l border-slate-100">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="p-3 text-right text-xs font-black border-l border-slate-100 text-[#1D3557]">
                            {formatCurrency(item.total_amount || item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-6">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                      <span>Gross Amount</span>
                      <span>{formatCurrency(selectedInvoice.taxableValue || selectedInvoice.sub_total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                      <span>Total Tax (GST)</span>
                      <span className="text-blue-600">+ {formatCurrency(selectedInvoice.totalGst || selectedInvoice.total_gst)}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-[#1D3557] uppercase tracking-widest">Net Payable</span>
                      <span className="text-xl font-black text-[#1D3557]">{formatCurrency(selectedInvoice.netAmount || selectedInvoice.net_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                <button 
                  onClick={() => {
                    setActiveTab(Tab.POS);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 rounded shadow-sm flex items-center gap-2"
                >
                  <Edit3 size={16} /> Edit Invoice
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-6 py-2 bg-white border border-slate-400 text-slate-700 text-xs font-black uppercase hover:bg-slate-50 rounded shadow-sm flex items-center gap-2"
                >
                  <Printer size={16} /> Print Document
                </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-[#1D3557] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wider">Confirm Action</h3>
              </div>
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}><X size={18} /></button>
            </div>
            <div className="p-6 bg-slate-50">
              <p className="text-xs font-bold text-slate-600">{confirmDialog.message}</p>
            </div>
            <div className="bg-slate-100 p-4 flex justify-end gap-3">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="px-5 py-2 text-xs font-black uppercase">Cancel</button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-6 py-2 bg-red-600 text-white text-xs font-black uppercase rounded shadow-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistoryPage;
