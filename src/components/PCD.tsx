import React, { useState } from 'react';
import { Search, Map, Plus, Users, Shield, MapPin, Phone, Mail, FileText, Gift, TrendingUp, Briefcase, X, ArrowLeft, UserPlus, Target } from 'lucide-react';
import { MOCK_PCD_PARTNERS, MOCK_MRS, MOCK_PCD_SCHEMES, MOCK_PCD_TARGETS } from '../constants';
import { PCDPartner, MedicalRepresentative } from '../types';

const PCD: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PARTNERS' | 'SCHEMES' | 'TARGETS'>('PARTNERS');
  
  // Data State
  const [partners, setPartners] = useState<PCDPartner[]>(MOCK_PCD_PARTNERS);
  const [mrs] = useState<MedicalRepresentative[]>(MOCK_MRS);
  const [selectedPartner, setSelectedPartner] = useState<PCDPartner | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showAssignMRModal, setShowAssignMRModal] = useState(false);
  
  // Form States
  const [newPartner, setNewPartner] = useState({
      name: '',
      territory: '',
      contact: '',
      email: '',
      drugLicenseNo: ''
  });

  const [selectedMrIdToAssign, setSelectedMrIdToAssign] = useState('');

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.territory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    const partner: PCDPartner = {
        id: `PCD-${Date.now()}`,
        ...newPartner,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0]
    };
    setPartners([...partners, partner]);
    setShowAddPartnerModal(false);
    setNewPartner({ name: '', territory: '', contact: '', email: '', drugLicenseNo: '' });
  };

  const handleAssignMR = () => {
    if(!selectedPartner || !selectedMrIdToAssign) return;

    const updatedPartners = partners.map(p => {
      if(p.id === selectedPartner.id) {
        const currentAssigned = p.assignedMrIds || [];
        // prevent duplicate assignment
        if(currentAssigned.includes(selectedMrIdToAssign)) return p;
        return { ...p, assignedMrIds: [...currentAssigned, selectedMrIdToAssign] };
      }
      return p;
    });

    setPartners(updatedPartners);
    setSelectedPartner(updatedPartners.find(p => p.id === selectedPartner.id) || null);
    setShowAssignMRModal(false);
    setSelectedMrIdToAssign('');
  };

  if (selectedPartner) {
    const assignedMrs = mrs.filter(mr => selectedPartner.assignedMrIds?.includes(mr.id));

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => setSelectedPartner(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedPartner.name}</h2>
                <p className="text-slate-500 text-sm">PCD Partner Details & Field Force</p>
            </div>
            <div className="ml-auto flex gap-2">
               <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-bold border border-yellow-200 flex items-center gap-2">
                   MONOPOLY RIGHTS
               </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold border flex items-center gap-2 ${selectedPartner.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    <Shield size={16} /> {selectedPartner.status}
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users size={20} className="text-primary"/> Partner Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Territory</p>
                                <p className="font-medium text-slate-800 flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> {selectedPartner.territory}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Drug License</p>
                                <p className="font-mono text-slate-800 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200">{selectedPartner.drugLicenseNo}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Partnership Since</p>
                                <p className="font-medium text-slate-800">{selectedPartner.joinDate}</p>
                            </div>
                        </div>
                         <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Contact Person</p>
                                <p className="font-medium text-slate-800">{selectedPartner.contact}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Email Address</p>
                                <p className="font-medium text-slate-800">{selectedPartner.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <Briefcase size={20} className="text-primary"/> Assigned Field Force (MR)
                       </h3>
                       <button 
                        onClick={() => setShowAssignMRModal(true)}
                        className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm"
                       >
                           <UserPlus size={16} /> Link New MR
                       </button>
                   </div>
                   
                   {assignedMrs.length > 0 ? (
                       <div className="grid grid-cols-1 gap-4">
                           {assignedMrs.map(mr => (
                               <div key={mr.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-primary text-sm shadow-sm">
                                           {mr.name.charAt(0)}
                                       </div>
                                       <div>
                                           <p className="font-bold text-slate-800">{mr.name}</p>
                                           <p className="text-xs text-slate-500">{mr.headquarters} • {mr.contact}</p>
                                       </div>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-xs text-slate-500 mb-1">Target Achievement</p>
                                       <span className={`px-2 py-0.5 rounded text-xs font-bold ${mr.targetAchievement >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                           {mr.targetAchievement}%
                                       </span>
                                   </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                           <Users size={32} className="mx-auto text-slate-300 mb-2"/>
                           <p className="text-slate-500">No Medical Representatives assigned to this partner yet.</p>
                           <button onClick={() => setShowAssignMRModal(true)} className="text-primary text-sm font-medium mt-2 hover:underline">Assign Now</button>
                       </div>
                   )}
                </div>
            </div>

            <div className="space-y-6">
                 {/* Quick Actions / Status */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                     <div className="space-y-2">
                         <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                             <FileText size={16} /> Generate Sales Statement
                         </button>
                         <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                             <Gift size={16} /> Assign Promotional Scheme
                         </button>
                         <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                             <Target size={16} /> Update Sales Target
                         </button>
                     </div>
                 </div>

                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl shadow-lg text-white">
                     <p className="text-slate-400 text-xs font-bold uppercase mb-2">Current Quarter Target</p>
                     <h3 className="text-3xl font-bold mb-1">₹5,00,000</h3>
                     <div className="flex justify-between text-xs text-slate-400 mb-4">
                         <span>Achieved: ₹3,50,000</span>
                         <span>70%</span>
                     </div>
                     <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                         <div className="bg-primary h-full rounded-full" style={{width: '70%'}}></div>
                     </div>
                 </div>
            </div>
        </div>

        {/* Assign MR Modal */}
        {showAssignMRModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><UserPlus size={18}/> Link Medical Representative</h3>
                        <button onClick={() => setShowAssignMRModal(false)} className="hover:bg-slate-700 p-1 rounded"><X size={18} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600">Select an MR to assign to <strong>{selectedPartner.name}</strong>. This allows tracking of sales and visits for this territory.</p>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary bg-white"
                                value={selectedMrIdToAssign}
                                onChange={(e) => setSelectedMrIdToAssign(e.target.value)}
                            >
                                <option value="">-- Choose MR --</option>
                                {mrs.filter(mr => !selectedPartner.assignedMrIds?.includes(mr.id)).map(mr => (
                                    <option key={mr.id} value={mr.id}>
                                        {mr.name} ({mr.headquarters})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button onClick={() => setShowAssignMRModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button 
                                onClick={handleAssignMR} 
                                disabled={!selectedMrIdToAssign}
                                className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">PCD Business Management</h2>
            <p className="text-slate-500 text-sm">Monopoly Rights, Schemes & Partner Tracking</p>
        </div>
        {activeTab === 'PARTNERS' && (
            <button 
                onClick={() => setShowAddPartnerModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-sky-600 transition-colors shadow-sm"
            >
                <Plus size={18} /> Add PCD Partner
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
            <button 
                onClick={() => setActiveTab('PARTNERS')}
                className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PARTNERS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Users size={18} /> Partners (Network)
            </button>
            <button 
                onClick={() => setActiveTab('SCHEMES')}
                className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'SCHEMES' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Gift size={18} /> Schemes & Offers
            </button>
            <button 
                onClick={() => setActiveTab('TARGETS')}
                className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'TARGETS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <TrendingUp size={18} /> Targets & Incentives
            </button>
        </div>
      </div>

      {/* PARTNERS TAB */}
      {activeTab === 'PARTNERS' && (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Active Partners</p>
                        <h3 className="text-2xl font-bold text-slate-800">{partners.filter(p => p.status === 'Active').length}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Monopoly Areas</p>
                        <h3 className="text-2xl font-bold text-slate-800">{new Set(partners.map(p => p.territory)).size}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Map size={24} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Pending Renewals</p>
                        <h3 className="text-2xl font-bold text-orange-600">0</h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Shield size={24} /></div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Partner Name or Territory..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-50/50">
                    {filteredPartners.map(partner => (
                        <div key={partner.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                MONOPOLY RIGHTS
                            </div>
                            <div className="flex justify-between items-start mb-3 mt-2">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                    {partner.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${partner.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {partner.status}
                                </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{partner.name}</h3>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                                <MapPin size={14} className="text-primary" /> {partner.territory}
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone size={14} className="text-slate-400" /> {partner.contact}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail size={14} className="text-slate-400" /> {partner.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <FileText size={14} className="text-slate-400" /> License: <span className="font-mono text-xs bg-slate-100 px-1 rounded">{partner.drugLicenseNo}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                <span>Joined: {partner.joinDate}</span>
                                <button onClick={() => setSelectedPartner(partner)} className="text-primary font-medium hover:underline">View Details</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
      )}

      {/* SCHEMES TAB */}
      {activeTab === 'SCHEMES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PCD_SCHEMES.map(scheme => (
                <div key={scheme.id} className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Gift size={80} className="text-primary" />
                    </div>
                    <div className="relative z-10">
                         <span className="text-xs font-bold text-primary uppercase tracking-widest border border-primary/20 px-2 py-1 rounded">{scheme.type} Scheme</span>
                         <h3 className="text-xl font-bold text-slate-800 mt-3 mb-2">{scheme.name}</h3>
                         <p className="text-slate-600 text-sm mb-4 leading-relaxed">{scheme.description}</p>
                         <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/50 p-2 rounded-lg inline-block border border-slate-100">
                             <span>Valid Until:</span>
                             <span className="text-slate-800">{scheme.validUntil}</span>
                         </div>
                    </div>
                </div>
            ))}
             <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-6 text-slate-400 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer min-h-[200px]">
                <Plus size={32} className="mb-2" />
                <p className="font-medium">Create New Scheme</p>
            </div>
        </div>
      )}

      {/* TARGETS TAB */}
      {activeTab === 'TARGETS' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Quarterly Sales Targets</h3>
                  <button className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-medium transition-colors">Set New Targets</button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                          <tr>
                              <th className="p-4">Partner</th>
                              <th className="p-4">Period</th>
                              <th className="p-4 text-right">Target</th>
                              <th className="p-4 text-right">Achieved</th>
                              <th className="p-4 w-48">Progress</th>
                              <th className="p-4 text-center">Incentive</th>
                              <th className="p-4 text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {MOCK_PCD_TARGETS.map(target => {
                              const percentage = Math.min(100, (target.achievedAmount / target.targetAmount) * 100);
                              return (
                                  <tr key={target.id} className="hover:bg-slate-50">
                                      <td className="p-4 font-medium text-slate-800">{target.partnerName}</td>
                                      <td className="p-4 text-sm text-slate-600">{target.period}</td>
                                      <td className="p-4 text-right text-sm text-slate-600">₹{target.targetAmount.toLocaleString()}</td>
                                      <td className="p-4 text-right text-sm font-bold text-slate-800">₹{target.achievedAmount.toLocaleString()}</td>
                                      <td className="p-4">
                                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${percentage >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
                                                style={{width: `${percentage}%`}}
                                              ></div>
                                          </div>
                                          <p className="text-xs text-right mt-1 text-slate-500">{percentage.toFixed(1)}%</p>
                                      </td>
                                      <td className="p-4 text-center text-sm font-bold text-green-600">
                                          {target.incentivePercentage}%
                                      </td>
                                      <td className="p-4 text-center">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                              target.status === 'Achieved' ? 'bg-green-100 text-green-700' : 
                                              target.status === 'Failed' ? 'bg-red-100 text-red-700' : 
                                              'bg-orange-100 text-orange-700'
                                          }`}>
                                              {target.status}
                                          </span>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Add Partner Modal */}
      {showAddPartnerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
                  <div className="bg-slate-900 text-white p-4">
                      <h3 className="font-bold">Register New PCD Partner</h3>
                  </div>
                  <form onSubmit={handleAddPartner} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Partner / Agency Name</label>
                          <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Territory (Monopoly Area)</label>
                          <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Pune District" value={newPartner.territory} onChange={e => setNewPartner({...newPartner, territory: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Contact No</label>
                              <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" value={newPartner.contact} onChange={e => setNewPartner({...newPartner, contact: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                              <input required type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Drug License No</label>
                          <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" value={newPartner.drugLicenseNo} onChange={e => setNewPartner({...newPartner, drugLicenseNo: e.target.value})} />
                      </div>
                      
                      <div className="pt-4 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowAddPartnerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-sky-600">Register Partner</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default PCD;