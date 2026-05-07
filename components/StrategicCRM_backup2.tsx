import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Users, BarChart3, Building2, Target, Activity, Settings, PieChart, TrendingUp, X, Check, Phone, Mail, MapPin, DollarSign, UserCheck, Edit3, Filter, Plus, Clock, MessageSquare, Download, Printer, RefreshCcw } from 'lucide-react';

// Define TypeScript interfaces
interface Lead {
  id: string;
  name: string;
  companyName: string;
  contact: string;
  email: string;
  location: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  leadScore: number;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  type: string;
  customerType: string;
  loyaltyTier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  totalPurchases: number;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  probability: number;
  expectedCloseDate: string;
}

// Enhanced CRM Component
const StrategicCRM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LEADS' | 'CUSTOMERS' | 'OPPORTUNITIES' | 'ACTIVITIES' | 'REPORTS' | 'SETTINGS'>('DASHBOARD');
  
  // State for data
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 'L1',
      name: 'Amit Kumar',
      companyName: 'Health First Pharma',
      contact: '9876543210',
      email: 'amit@healthfirst.com',
      location: 'Mumbai',
      status: 'Qualified',
      priority: 'High',
      source: 'Website',
      leadScore: 85,
      createdAt: '2023-10-15'
    },
    {
      id: 'L2',
      name: 'Sneha Gupta',
      companyName: 'Gupta Medicals',
      contact: '9988776655',
      email: 'sneha@guptamedicals.com',
      location: 'Delhi',
      status: 'Contacted',
      priority: 'Medium',
      source: 'Referral',
      leadScore: 70,
      createdAt: '2023-10-18'
    },
    {
      id: 'L3',
      name: 'Rajesh Sharma',
      companyName: 'MediPlus Chain',
      contact: '9876501234',
      email: 'rajesh@mediplus.com',
      location: 'Bangalore',
      status: 'New',
      priority: 'High',
      source: 'Trade Show',
      leadScore: 90,
      createdAt: '2023-10-20'
    }
  ]);
  
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'C1',
      name: 'Health Plus Distributors',
      mobile: '9876543210',
      type: 'Debtor',
      customerType: 'Distributor',
      loyaltyTier: 'Gold',
      totalPurchases: 2500000
    },
    {
      id: 'C2',
      name: 'City Care Pharmacies',
      mobile: '9988776655',
      type: 'Debtor',
      customerType: 'Retailer',
      loyaltyTier: 'Silver',
      totalPurchases: 800000
    },
    {
      id: 'C3',
      name: 'Apollo Pharmacy Chain',
      mobile: '9876501234',
      type: 'Debtor',
      customerType: 'Chain',
      loyaltyTier: 'Platinum',
      totalPurchases: 5200000
    }
  ]);
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([
    {
      id: 'O1',
      title: 'PCD Partnership for Cardiac Range',
      value: 5000000,
      stage: 'Negotiation',
      probability: 75,
      expectedCloseDate: '2023-12-15'
    },
    {
      id: 'O2',
      title: 'Expansion to Generic Portfolio',
      value: 1200000,
      stage: 'Proposal',
      probability: 60,
      expectedCloseDate: '2023-11-30'
    },
    {
      id: 'O3',
      title: 'National Chain Onboarding',
      value: 8000000,
      stage: 'Qualification',
      probability: 40,
      expectedCloseDate: '2024-03-15'
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // Calculate stats
  const stats = {
    totalLeads: leads.length,
    newThisMonth: leads.filter(l => l.createdAt >= '2023-10-01').length,
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.loyaltyTier !== 'Bronze').length,
    totalOpportunities: opportunities.length,
    openOpportunities: opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').length,
    totalValue: opportunities.reduce((sum, o) => sum + o.value, 0),
    conversionRate: leads.length > 0 ? Math.round((customers.length / leads.length) * 100) : 0,
    avgDealSize: opportunities.filter(o => o.stage === 'Closed Won').length > 0 
      ? Math.round(opportunities.filter(o => o.stage === 'Closed Won').reduce((sum, o) => sum + o.value, 0) / opportunities.filter(o => o.stage === 'Closed Won').length)
      : 0
  };
  
  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
                         lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact.includes(searchTerm) ||
                         (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.location && lead.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || lead.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  // Get status color classes
  const getLeadStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Qualified': return 'bg-purple-100 text-purple-700';
      case 'Converted': return 'bg-green-100 text-green-700';
      case 'Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getLoyaltyTierColor = (tier: string) => {
    switch(tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-700';
      case 'Gold': return 'bg-yellow-100 text-yellow-700';
      case 'Silver': return 'bg-gray-100 text-gray-700';
      case 'Bronze': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Strategic CRM Suite</h2>
          <p className="text-slate-500 text-sm">Comprehensive Customer Relationship Management</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-sky-600 transition-colors shadow-sm"
          >
            <UserPlus size={18} /> Add Lead
          </button>
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-6">
          <button 
            onClick={() => setActiveTab('DASHBOARD')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'DASHBOARD' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('LEADS')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'LEADS' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} /> Leads ({stats.totalLeads})
          </button>
          <button 
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'CUSTOMERS' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={18} /> Customers ({stats.totalCustomers})
          </button>
          <button 
            onClick={() => setActiveTab('OPPORTUNITIES')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'OPPORTUNITIES' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Target size={18} /> Opportunities ({stats.totalOpportunities})
          </button>
          <button 
            onClick={() => setActiveTab('ACTIVITIES')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ACTIVITIES' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity size={18} /> Activities
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'REPORTS' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={18} /> Reports
          </button>
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'SETTINGS' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Leads</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.totalLeads}</h3>
                <p className="text-xs text-blue-600 mt-1">{stats.newThisMonth} new this month</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Active Customers</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.activeCustomers}</h3>
                <p className="text-xs text-green-600 mt-1">{stats.totalCustomers} total</p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Building2 size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Open Opportunities</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.openOpportunities}</h3>
                <p className="text-xs text-purple-600 mt-1">₹{stats.totalValue.toLocaleString()} Value</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Target size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Conversion Rate</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</h3>
                <p className="text-xs text-orange-600 mt-1">Avg Deal: ₹{stats.avgDealSize.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={24} /></div>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart size={20} className="text-primary"/> Lead Status Distribution
              </h3>
              <div className="space-y-3">
                {[
                  { status: 'New', count: leads.filter(l => l.status === 'New').length, color: 'bg-blue-500' },
                  { status: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length, color: 'bg-yellow-500' },
                  { status: 'Qualified', count: leads.filter(l => l.status === 'Qualified').length, color: 'bg-purple-500' },
                  { status: 'Converted', count: leads.filter(l => l.status === 'Converted').length, color: 'bg-green-500' },
                  { status: 'Lost', count: leads.filter(l => l.status === 'Lost').length, color: 'bg-red-500' }
                ].filter(item => item.count > 0).map((item, index) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-sm font-medium text-slate-700">{item.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{item.count}</p>
                      <p className="text-xs text-slate-500">
                        {Math.round((item.count / stats.totalLeads) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary"/> Opportunity Pipeline
              </h3>
              <div className="space-y-3">
                {[
                  { stage: 'Prospecting', count: opportunities.filter(o => o.stage === 'Prospecting').length, value: opportunities.filter(o => o.stage === 'Prospecting').reduce((sum, o) => sum + o.value, 0) },
                  { stage: 'Qualification', count: opportunities.filter(o => o.stage === 'Qualification').length, value: opportunities.filter(o => o.stage === 'Qualification').reduce((sum, o) => sum + o.value, 0) },
                  { stage: 'Proposal', count: opportunities.filter(o => o.stage === 'Proposal').length, value: opportunities.filter(o => o.stage === 'Proposal').reduce((sum, o) => sum + o.value, 0) },
                  { stage: 'Negotiation', count: opportunities.filter(o => o.stage === 'Negotiation').length, value: opportunities.filter(o => o.stage === 'Negotiation').reduce((sum, o) => sum + o.value, 0) },
                  { stage: 'Closed Won', count: opportunities.filter(o => o.stage === 'Closed Won').length, value: opportunities.filter(o => o.stage === 'Closed Won').reduce((sum, o) => sum + o.value, 0) }
                ].filter(item => item.count > 0).map((item, index) => (
                  <div key={item.stage} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">{item.stage}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{item.count} deals</p>
                      <p className="text-xs text-slate-500">₹{item.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-primary"/> Recent Activities
            </h3>
            <div className="space-y-3">
              {leads.slice(0, 5).map((lead, index) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <UserPlus size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{lead.name} added as new lead</p>
                    <p className="text-sm text-slate-600">{lead.companyName} • {lead.createdAt}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLeadStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === 'LEADS' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'GRID' | 'LIST')}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="GRID">Grid View</option>
                  <option value="LIST">List View</option>
                </select>
              </div>
            </div>
          </div>

          {/* Leads Content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {viewMode === 'GRID' && (
              <div className="p-4">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No leads found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {searchTerm ? 'No leads match your search criteria.' : 'Get started by adding a new lead.'}
                    </p>
                    {searchTerm && (
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('All');
                          setPriorityFilter('All');
                        }}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeads.map(lead => (
                      <div key={lead.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800">{lead.name}</h4>
                            <p className="text-sm text-slate-600">{lead.companyName}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLeadStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} />
                            <span>{lead.contact}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail size={14} />
                            <span>{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={14} />
                            <span>{lead.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <DollarSign size={14} />
                            <span>Score: {lead.leadScore}/100</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                            Edit
                          </button>
                          <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                            Convert
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {viewMode === 'LIST' && (
              <div className="overflow-x-auto">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No leads found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {searchTerm ? 'No leads match your search criteria.' : 'Get started by adding a new lead.'}
                    </p>
                    {searchTerm && (
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('All');
                          setPriorityFilter('All');
                        }}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Name</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Company</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Contact</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Location</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Status</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Score</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{lead.name}</td>
                          <td className="p-3 text-slate-600">{lead.companyName}</td>
                          <td className="p-3 text-slate-600">{lead.contact}</td>
                          <td className="p-3 text-slate-600">{lead.location}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLeadStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${lead.leadScore}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-600">{lead.leadScore}/100</span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                <Edit3 size={14} />
                              </button>
                              <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <UserCheck size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Contact</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Customer Type</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Loyalty Tier</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Total Purchases</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => (
                    <tr key={customer.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{customer.name}</td>
                      <td className="p-3 text-slate-600">{customer.mobile}</td>
                      <td className="p-3 text-slate-600">{customer.customerType}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLoyaltyTierColor(customer.loyaltyTier)}`}>
                          {customer.loyaltyTier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">₹{customer.totalPurchases.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OPPORTUNITIES TAB */}
      {activeTab === 'OPPORTUNITIES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Opportunities</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Title</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Value</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Stage</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Probability</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Expected Close</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map(opp => (
                    <tr key={opp.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{opp.title}</td>
                      <td className="p-3 text-slate-600">₹{opp.value.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          {opp.stage}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{opp.probability}%</td>
                      <td className="p-3 text-slate-600">{opp.expectedCloseDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would follow the same pattern */}
      {activeTab === 'ACTIVITIES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Activities</h3>
            <p className="text-slate-600">Activity management interface coming soon...</p>
          </div>
        </div>
      )}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Reports</h3>
            <p className="text-slate-600">CRM reports interface coming soon...</p>
          </div>
        </div>
      )}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Settings</h3>
            <p className="text-slate-600">CRM settings interface coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicCRM;