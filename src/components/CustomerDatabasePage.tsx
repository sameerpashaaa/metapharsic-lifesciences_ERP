import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Edit3, Trash2, X, Save, AlertCircle, Phone, Mail, MapPin, User
} from 'lucide-react';
import { getAllParties, saveParty } from '../services/databaseService';
import { useNotifications } from '../context/NotificationContext';
import { Party } from '../types';

const CustomerDatabasePage: React.FC = () => {
  const { addNotification } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [isEditingParty, setIsEditingParty] = useState(false);
  const [partyForm, setPartyForm] = useState<Partial<Party>>({
    name: '',
    type: 'Debtor',
    gstin: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    currentBalance: 0,
    category: 'Regular'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const partiesData = await getAllParties();
      setAvailableParties(partiesData || []);
    } catch (err: any) {
      console.error('CustomerDatabasePage: Failed to load data', err);
      addNotification({
        type: 'error',
        title: 'Error Loading Customers',
        message: err.message || 'Check your connection.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveParty = async () => {
    if (!partyForm.name || !partyForm.mobile) return;
    
    const newParty: Party = {
      id: partyForm.id || `C-${Date.now()}`,
      name: partyForm.name!,
      type: 'Debtor',
      gstin: partyForm.gstin,
      mobile: partyForm.mobile!,
      email: partyForm.email,
      address: partyForm.address,
      city: partyForm.city || 'N/A',
      currentBalance: partyForm.currentBalance || 0,
      category: (partyForm.category as any) || 'Regular',
      ledger: []
    };

    const success = await saveParty(newParty);
    if (success) {
      addNotification({
        type: 'success',
        title: isEditingParty ? 'Customer Updated' : 'Customer Created',
        message: `Customer "${newParty.name}" has been saved to the database.`,
        priority: 'medium'
      });
      setShowPartyModal(false);
      loadData();
    }
  };

  const filteredParties = availableParties.filter(party => 
    !partySearch || 
    party.name?.toLowerCase().includes(partySearch.toLowerCase()) || 
    party.mobile?.includes(partySearch)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Customer Database</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage your customer profiles and credit limits</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsEditingParty(false);
            setPartyForm({
              name: '',
              type: 'Debtor',
              gstin: '',
              mobile: '',
              email: '',
              address: '',
              city: '',
              currentBalance: 0,
              category: 'Regular'
            });
            setShowPartyModal(true);
          }}
          className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            value={partySearch}
            onChange={e => setPartySearch(e.target.value)}
            placeholder="Search by Name or Mobile..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Customers...</p>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-sm font-bold text-slate-400 italic">No customers found.</p>
            </div>
          ) : (
            filteredParties.map(party => (
              <div key={party.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <User size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setPartyForm(party);
                        setIsEditingParty(true);
                        setShowPartyModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-lg">{party.name}</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">{party.category || 'Regular Customer'}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                    <Phone size={14} className="text-slate-400" /> {party.mobile}
                  </div>
                  {party.email && (
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                      <Mail size={14} className="text-slate-400" /> {party.email}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                    <MapPin size={14} className="text-slate-400" /> {party.city || 'N/A Location'}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Balance</p>
                    <p className={`text-sm font-black ${party.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{Math.abs(party.currentBalance).toLocaleString()} {party.currentBalance > 0 ? 'Dr' : 'Cr'}
                    </p>
                  </div>
                  <button className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">View Ledger</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showPartyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-emerald-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><User size={20} /></div>
                <div>
                  <h3 className="font-black text-base">{isEditingParty ? 'Edit Customer' : 'Add New Customer'}</h3>
                  <p className="text-[10px] text-emerald-100 font-bold tracking-widest uppercase">Party Ledger Definition</p>
                </div>
              </div>
              <button onClick={() => setShowPartyModal(false)}><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">Customer Name *</label>
                  <input 
                    type="text" 
                    value={partyForm.name} 
                    onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">Mobile No *</label>
                    <input 
                      type="text" 
                      value={partyForm.mobile} 
                      onChange={e => setPartyForm({ ...partyForm, mobile: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">Category</label>
                    <select 
                      value={partyForm.category}
                      onChange={e => setPartyForm({ ...partyForm, category: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                    >
                      <option value="Regular">Regular Customer</option>
                      <option value="Premium">Premium (VIP)</option>
                      <option value="Corporate">Corporate / Institution</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">Address</label>
                  <input 
                    type="text" 
                    value={partyForm.address} 
                    onChange={e => setPartyForm({ ...partyForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      value={partyForm.gstin} 
                      onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold px-1">Opening Balance (₹)</label>
                    <input 
                      type="number" 
                      value={partyForm.currentBalance} 
                      onChange={e => setPartyForm({ ...partyForm, currentBalance: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-100 p-4 flex justify-end gap-3 border-t border-slate-200">
              <button 
                onClick={() => setShowPartyModal(false)}
                className="px-6 py-2 text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveParty}
                disabled={!partyForm.name || !partyForm.mobile}
                className="px-8 py-2 bg-emerald-600 text-white text-xs font-black uppercase rounded shadow-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {isEditingParty ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDatabasePage;
