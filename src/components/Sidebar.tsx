
import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Truck, FileBarChart, Users, Settings, 
  ShieldCheck, CreditCard, LogOut, Map, Factory, Briefcase, 
  UserPlus, ClipboardCheck, Activity, FileText, Database, Layers, TrendingUp, Globe, Plus, Sparkles
} from 'lucide-react';
import { Tab } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_ACCESS } from '../constants';
import { useAppStore } from '../store/useAppStore';

interface SidebarProps {
  activeTab?: Tab;
  setActiveTab?: (tab: Tab) => void;
  isOpen?: boolean;
}
// ... (SECTION_HEADERS and MENU_STRUCTURE remain same)
const SECTION_HEADERS = {
  CORE: 'Core Operations',
  GROWTH: 'PCD & Sales',
  PRODUCTION: 'Mfg & Quality',
  OPS: 'Logistics & Ops',
  ADMIN: 'Administration'
};

const MENU_STRUCTURE = [
  {
    section: SECTION_HEADERS.CORE,
    items: [
      { id: Tab.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { id: Tab.POS, label: 'POS / Billing', icon: <ShoppingCart size={18} /> },
      { id: Tab.INVENTORY, label: 'Inventory', icon: <Package size={18} /> },
      { id: Tab.PURCHASE, label: 'Purchase', icon: <Truck size={18} /> },
      { id: Tab.INVENTORY_ANALYTICS, label: 'Inventory Intelligence', icon: <TrendingUp size={18} /> },
      { id: Tab.INTELLIGENCE_DASHBOARD, label: 'Intelligence Center', icon: <Sparkles size={18} className="text-indigo-500" /> },
      { id: Tab.ACCOUNTS, label: 'Accounts', icon: <CreditCard size={18} /> },
      { id: Tab.LEDGER_CREATION, label: 'Ledger Creation', icon: <Plus size={18} /> },
    ]
  },
  {
    section: SECTION_HEADERS.GROWTH,
    items: [
      { id: Tab.PCD, label: 'PCD Network', icon: <Map size={18} /> },
      { id: Tab.CRM, label: 'CRM (Leads)', icon: <UserPlus size={18} /> },
      { id: Tab.OMS, label: 'Order Mgmt (OMS)', icon: <Globe size={18} /> },
      { id: Tab.SALES, label: 'Sales (Wholesale)', icon: <TrendingUp size={18} /> },
    ]
  },
  {
    section: SECTION_HEADERS.PRODUCTION,
    items: [
      { id: Tab.MANUFACTURING, label: 'Manufacturing', icon: <Factory size={18} /> },
      { id: Tab.QC, label: 'Quality Control', icon: <ClipboardCheck size={18} /> },
      { id: Tab.R_AND_D, label: 'R&D / R&D', icon: <Activity size={18} /> },
    ]
  },
  {
    section: SECTION_HEADERS.OPS,
    items: [
      { id: Tab.MULTI_BRANCH, label: 'Enterprise Hub', icon: <Globe size={18} /> },
      { id: Tab.LOGISTICS, label: 'Logistics', icon: <Truck size={18} /> },
      { id: Tab.ASSETS, label: 'Assets & Maint.', icon: <Database size={18} /> },
      { id: Tab.DOCUMENTS, label: 'Documents (DMS)', icon: <FileText size={18} /> },
    ]
  },
  {
    section: SECTION_HEADERS.ADMIN,
    items: [
      { id: Tab.EMPLOYEES, label: 'HR & Payroll', icon: <Briefcase size={18} /> },
      { id: Tab.REPORTS, label: 'Reports', icon: <FileBarChart size={18} /> },
      { id: Tab.COMPLIANCE, label: 'Compliance', icon: <ShieldCheck size={18} /> },
      { id: Tab.AUDIT, label: 'Audit Logs', icon: <Layers size={18} /> },
      { id: Tab.SETTINGS, label: 'Settings', icon: <Settings size={18} /> },
    ]
  }
];

// ... (MetapharsicLogo remains same)
const MetapharsicLogo = ({ isOpen }: { isOpen: boolean }) => (
  <div className={`flex items-center gap-3 ${isOpen ? 'px-2' : 'justify-center'}`}>
    <div className="relative w-12 h-12 flex-shrink-0 group cursor-pointer">
      {/* Dynamic HD Ring Effect */}
      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md group-hover:bg-blue-400/30 transition-all duration-700"></div>
      <div className="relative h-full w-full bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(30,58,138,0.1)] border-2 border-slate-100 z-10 overflow-hidden group-hover:border-blue-200 transition-all duration-500">
         <img src="/logo.png" alt="Metapharsic Logo" className="w-10 h-10 object-contain p-0.5" />
      </div>
    </div>
    {isOpen && (
      <div className="flex flex-col animate-fadeIn">
        <span className="text-xl font-black text-white tracking-tighter leading-none">
          METAPHARSIC
        </span>
        <span className="text-[8px] text-blue-300 font-black tracking-[0.25em] uppercase mt-0.5 opacity-80">
          LIFESCIENCES
        </span>
      </div>
    )}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab: propActiveTab, 
  setActiveTab: propSetActiveTab, 
  isOpen: propIsOpen 
}) => {
  const { user, logout } = useAuth();
  
  // Connect to Zustand store
  const { 
    sidebarOpen: storeIsOpen, 
    activeTab: storeActiveTab, 
    setActiveTab: storeSetActiveTab 
  } = useAppStore();

  // Use props if provided, otherwise fallback to store
  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const activeTab = propActiveTab !== undefined ? propActiveTab : (storeActiveTab as Tab);
  const setActiveTab = (tab: Tab) => {
    if (propSetActiveTab) propSetActiveTab(tab);
    storeSetActiveTab(tab);
  };

  return (
    <div className={`
      ${isOpen ? 'w-52' : 'w-16'}
      bg-slate-50 h-full transition-all duration-300 flex flex-col shadow-inner z-20 sticky top-0 border-r border-[#A8DADC]
    `}>
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <div className="relative w-8 h-8 flex-shrink-0 group">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm group-hover:bg-blue-400/30 transition-all duration-700"></div>
              <div className="relative h-full w-full bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 z-10 overflow-hidden">
                 <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
           </div>
           {isOpen && (
             <div className="flex flex-col">
               <span className="text-xs font-black text-slate-800 tracking-widest uppercase leading-none mb-0.5">Metapharsic</span>
               <span className="text-[8px] text-blue-600 font-bold uppercase tracking-tighter leading-none">Enterprise Hub</span>
             </div>
           )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-0 custom-scrollbar">
        <div className="space-y-1">
          {MENU_STRUCTURE.map((section, idx) => {
            // Filter items based on user permission
            const allowedItems = section.items.filter(item => {
               if(!user) return false;
               return ROLE_ACCESS[item.id]?.includes(user.role);
            });

            if (allowedItems.length === 0) return null;

            return (
              <div key={idx} className="mb-2">
                {isOpen && (
                  <h4 className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 first:border-0 first:mt-0">
                    {section.section}
                  </h4>
                )}
                <ul className="space-y-0.5">
                  {allowedItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={`
                            w-full flex items-center p-2 px-4 transition-all duration-200 relative group text-[11px] font-bold
                            ${isActive
                              ? 'bg-[#E1EAF2] text-[#1D3557] border-l-4 border-[#1D3557] shadow-sm'
                              : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-l-4 border-transparent'}
                          `}
                          title={!isOpen ? item.label : ''}
                        >
                          <span className={`flex-shrink-0 ${isActive ? 'text-[#1D3557]' : 'text-slate-400 group-hover:text-blue-600'}`}>
                            {React.cloneElement(item.icon as React.ReactElement, { size: 14 })}
                          </span>
                          
                          {isOpen && (
                            <span className="ml-3 whitespace-nowrap transition-all">
                              {item.label}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer User Profile */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center min-w-0 gap-2">
            <div className="w-7 h-7 flex-shrink-0 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
              {user?.name.charAt(0)}
            </div>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-800 truncate leading-none mb-1">{user?.name}</p>
                <p className="text-[8px] text-blue-600 font-bold uppercase tracking-tighter leading-none">{user?.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          
          {isOpen && (
            <button 
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};



export default Sidebar;
