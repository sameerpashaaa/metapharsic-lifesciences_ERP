
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StrategicPOS from './components/StrategicPOS';
import Inventory from './components/Inventory';
import Manufacturing from './components/Manufacturing';
import PurchaseEnhanced from './components/PurchaseEnhanced';
import Reports from './components/Reports';
import Accounts from './components/Accounts';
import PCD from './components/PCD';
import StrategicPCD from './components/StrategicPCD';
import HR from './components/HR';
import Settings from './components/Settings';
import Login from './components/Login';
import Compliance from './components/Compliance';
import CRM from './components/CRM';
import QualityControl from './components/QualityControl';
import Logistics from './components/Logistics';
import Sales from './components/Sales';
import AuditLog from './components/AuditLog';
import Documents from './components/Documents';
import Assets from './components/Assets';
import RnD from './components/RnD';
import OMS from './components/OMS'; // Imported OMS component
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import MenuOptions from './components/MenuOptions';
import { ItemMaster } from './components/ItemMaster';
import { InventoryVouchers } from './components/InventoryVouchers';
import MultiBranchDashboard from './components/MultiBranchDashboard';
import InventoryAnalytics from './components/InventoryAnalytics';
import LedgerCreation from './components/LedgerCreation';

import POSTerminalModal from './components/POSTerminalModal';

import { Tab } from './types';
import { ROLE_ACCESS } from './constants';
import { Menu, Bell, Search, Info, ShieldAlert, RefreshCw, HelpCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { KeyboardShortcutProvider, useKeyboardShortcuts } from './context/KeyboardShortcutContext';
import { NotificationProvider, NotificationBell } from './context/NotificationContext';
import { ERP_SHORTCUTS, GLOBAL_SHORTCUTS } from './constants/shortcuts';
import { useRegisterKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Placeholder components for future tabs
const PlaceholderComponent = ({ title, description }: { title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-slate-400 bg-white/50 rounded-2xl border border-slate-200 shadow-sm p-10 backdrop-blur-sm animate-fadeIn">
    <div className="bg-slate-100 p-6 rounded-full mb-6 shadow-inner">
      <Info size={64} className="opacity-20 text-slate-600" />
    </div>
    <h2 className="text-3xl font-bold text-slate-600 mb-4">{title}</h2>
    <p className="max-w-md text-center text-lg">{description}</p>
    <div className="mt-8 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-medium">
      Module Under Development
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fadeIn">
    <div className="bg-red-50 p-6 rounded-full mb-4">
      <ShieldAlert size={64} className="text-red-500" />
    </div>
    <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
    <p className="mt-2 text-slate-600">You do not have permission to view this module.</p>
    <p className="text-xs mt-1 text-slate-400">Contact your system administrator.</p>
  </div>
);

import { IntelligenceDashboard } from './components/IntelligenceDashboard';
import { useAppStore } from './store/useAppStore';

const AppContent: React.FC = () => {
  console.log('AppContent: Rendering...');
  const { user, loading } = useAuth();

  // Use Zustand store (Moved hooks to top to prevent violation)
  const {
    activeTab,
    setActiveTab,
    sidebarOpen: isSidebarOpen,
    setSidebarOpen: setIsSidebarOpen,
    toggleSidebar,
    posTerminalOpen,
    setPosTerminalOpen,
    posState,
    setPosState
  } = useAppStore();

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showMenuOptions, setShowMenuOptions] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsSidebarOpen]);

  // Reset tab on login
  useEffect(() => { 
    if (user) { 
      setActiveTab(Tab.DASHBOARD); 
    } 
  }, [user?.id, setActiveTab]);

  const internalToggleSidebar = () => {
    toggleSidebar();
  };

  useRegisterKeyboardShortcuts({
    activeTab: activeTab as Tab,
    setActiveTab: (tab) => setActiveTab(tab),
    toggleSidebar: internalToggleSidebar,
    setShowHelpModal: setShowShortcutsHelp
  });

  // Add global refresh shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        // Trigger refresh
        const currentTab = activeTab;
        setActiveTab(Tab.DASHBOARD);
        setTimeout(() => setActiveTab(currentTab), 10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, setActiveTab]);

  // Conditional Returns placed AFTER all static and lifecycle hooks
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-border border-t-accent rounded-full animate-spin"></div>
          <div className="text-accent font-bold uppercase tracking-[0.3em] text-[11px]">Initializing Enterprise Hub...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Menu options handlers
  const handleCreateNewCompany = () => {
    alert('Create New Company functionality would be implemented here');
  };

  const handleRestoreDefaultDemo = () => {
    if (window.confirm('Are you sure you want to restore the default demonstration data? This will replace your current data.')) {
      alert('Restoring default demonstration data...');
      // In a real implementation, this would restore demo data
    }
  };

  const handleRestoreMyDemo = () => {
    if (window.confirm('Are you sure you want to restore from your saved demonstration data?')) {
      alert('Restoring from your saved demonstration data...');
      // In a real implementation, this would restore user's demo data
    }
  };

  const handleDeleteSavedPassword = () => {
    if (window.confirm('Are you sure you want to delete saved password?')) {
      alert('Deleting saved password...');
      // In a real implementation, this would clear saved credentials
    }
  };

  const handleChangeOperatorPowers = () => {
    alert('Change Operator Powers functionality would be implemented here');
  };

  const handleChangeERPVersion = () => {
    alert('Change ERP Version functionality would be implemented here');
  };

  // Billing handlers
  const handleBillRetail = () => {
    setPosTerminalOpen(true);
  };

  const handleBillWholesale = () => {
    setPosTerminalOpen(true);
  };

  // Returns & Expiry handlers
  const handleSalesReturnExpiry = () => {
    setActiveTab(Tab.INVENTORY_VOUCHERS);
  };

  const handlePurchaseReturnExpiry = () => {
    setActiveTab(Tab.INVENTORY_VOUCHERS);
  };

  // Accounting handlers
  const handleReceiptPayment = () => {
    setActiveTab(Tab.TALLY_VOUCHER_ENTRY);
  };

  const handleCashBankBook = () => {
    setActiveTab(Tab.FINANCIAL_STATEMENTS);
  };

  const handleLedgerAccount = () => {
    setActiveTab(Tab.GENERAL_LEDGER);
  };

  const handleOutstanding = () => {
    setActiveTab(Tab.STRATEGIC_ACCOUNTS);
  };

  // Inventory handlers
  const handleStockStatus = () => {
    setActiveTab(Tab.STOCK_SUMMARY);
  };

  const handleStockSalesAnalysis = () => {
    setActiveTab(Tab.INVENTORY_ANALYTICS);
  };

  const handleReorder = () => {
    setActiveTab(Tab.INVENTORY);
  };

  // Sales handlers
  const handleSalesBook = () => {
    setActiveTab(Tab.POS);
  };

  const handleDispatchSummary = () => {
    alert('Dispatch Summary functionality would be implemented here');
  };

  const handleBillTagging = () => {
    alert('Bill Tagging functionality would be implemented here');
  };

  // Analytics handlers
  const handleDailyAnalysis = () => {
    alert('Daily Analysis (MIS) functionality would be implemented here');
  };

  const handleTodaysGrossProfit = () => {
    alert('Today\'s Gross Profit functionality would be implemented here');
  };

  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId);
    alert(`Selected module: ${moduleId}`);
    // In a real implementation, this would navigate to the selected module
  };


  const renderContent = () => {
    // Security Check
    if (!ROLE_ACCESS[activeTab]?.includes(user.role)) {
      return <AccessDenied />;
    }

    switch (activeTab) {
      // Core
      case Tab.DASHBOARD: return <Dashboard onNavigate={setActiveTab} />;
      case Tab.POS: return <StrategicPOS />;
      case Tab.INVENTORY: return <ItemMaster />;
      case Tab.INVENTORY_ANALYTICS: return <InventoryAnalytics />;
      case Tab.INVENTORY_VOUCHERS: return <InventoryVouchers />;
      case Tab.TALLY_VOUCHER_ENTRY: return <Accounts />;
      case Tab.FINANCIAL_STATEMENTS: return <Reports />;
      case Tab.GENERAL_LEDGER: return <Accounts />;
      case Tab.STRATEGIC_ACCOUNTS: return <Accounts />;
      case Tab.STOCK_SUMMARY: return <Inventory />;
      case Tab.PURCHASE: return <PurchaseEnhanced />;
      case Tab.ACCOUNTS: return <Accounts />;

      // Growth
      case Tab.PCD: return <StrategicPCD />;
      case Tab.CRM: return <CRM />;
      case Tab.OMS: return <OMS />; // Updated component
      case Tab.SALES: return <Sales />;

      // Production & QC
      case Tab.MANUFACTURING: return <Manufacturing />;
      case Tab.QC: return <QualityControl />;
      case Tab.R_AND_D: return <RnD />;

      // Operations
      case Tab.LOGISTICS: return <Logistics />;
      case Tab.ASSETS: return <Assets />;
      case Tab.DOCUMENTS: return <Documents />;

      // Admin
      case Tab.EMPLOYEES: return <HR />;
      case Tab.REPORTS: return <Reports />;
      case Tab.COMPLIANCE: return <Compliance />;
      case Tab.AUDIT: return <AuditLog />;
      case Tab.SETTINGS:
        return <Settings />;
      case Tab.MULTI_BRANCH:
        return <MultiBranchDashboard />;
      case Tab.INTELLIGENCE_DASHBOARD:
        return <IntelligenceDashboard />;
      case Tab.LEDGER_CREATION:
        return <LedgerCreation />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  const getPageTitle = (tab: Tab) => {
    const map: Record<string, string> = {
      [Tab.DASHBOARD]: 'Executive Overview',
      [Tab.POS]: 'Billing Terminal',
      [Tab.CRM]: 'CRM & Leads',
      [Tab.QC]: 'Quality Control Lab',
      [Tab.PCD]: 'PCD Network',
      [Tab.INVENTORY]: 'Inventory Master',
      [Tab.MANUFACTURING]: 'Production Floor',
      [Tab.EMPLOYEES]: 'HR & Field Force',
      [Tab.DOCUMENTS]: 'Document Management',
      [Tab.ASSETS]: 'Asset Management',
      [Tab.R_AND_D]: 'Research & Development',
      [Tab.OMS]: 'Order Management',
      [Tab.INVENTORY_ANALYTICS]: 'Inventory Intelligence',
      [Tab.INTELLIGENCE_DASHBOARD]: 'Intelligence Dashboard (v3)',
      [Tab.LEDGER_CREATION]: 'Ledger Creation (Tally ERP)',
    };
    return map[tab] || tab.charAt(0) + tab.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  const getShortcutKeyForTab = (tab: Tab): string => {
    const shortcuts: Record<Tab, string> = {
      [Tab.DASHBOARD]: 'D',
      [Tab.POS]: 'P',
      [Tab.INVENTORY]: 'I',
      [Tab.PURCHASE]: 'U',
      [Tab.ACCOUNTS]: 'A',
      [Tab.INVENTORY_VOUCHERS]: 'V',
      [Tab.TALLY_VOUCHER_ENTRY]: 'Y',
      [Tab.FINANCIAL_STATEMENTS]: 'F',
      [Tab.GENERAL_LEDGER]: 'Z',
      [Tab.STRATEGIC_ACCOUNTS]: 'X',
      [Tab.STOCK_SUMMARY]: 'W',
      [Tab.PCD]: 'C',
      [Tab.CRM]: 'R',
      [Tab.OMS]: 'O',
      [Tab.SALES]: 'S',
      [Tab.MANUFACTURING]: 'M',
      [Tab.QC]: 'Q',
      [Tab.R_AND_D]: 'N',
      [Tab.LOGISTICS]: 'L',
      [Tab.ASSETS]: 'S',
      [Tab.DOCUMENTS]: 'F',
      [Tab.EMPLOYEES]: 'E',
      [Tab.REPORTS]: 'T',
      [Tab.COMPLIANCE]: 'K',
      [Tab.AUDIT]: 'H',
      [Tab.BUDGET]: 'B',
      [Tab.SETTINGS]: ',',
      [Tab.MULTI_BRANCH]: 'J',
      [Tab.INVENTORY_ANALYTICS]: 'G',
      [Tab.INTELLIGENCE_DASHBOARD]: 'D',
      [Tab.LEDGER_CREATION]: 'L'
    };
    return shortcuts[tab] || '?';
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden relative">
      {/* Main Application Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="flex h-full min-h-0">
          {/* Sidebar - remains as a separate column */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (posState === 'full') setPosState('side');
            }}
            isOpen={isSidebarOpen}
          />

          {/* Dynamic Grid Layout for Main Content & POS Panel */}
          <div 
            className="flex-1 flex overflow-hidden bg-page relative transition-all duration-300 ease-in-out"
            style={{ 
              display: 'grid',
              gridTemplateColumns: posState === 'full' ? '0fr 1fr' : posState === 'side' ? '1fr 420px' : '1fr 0fr',
              gap: 0
            }}
          >
            {/* LEFT: Standard ERP Page Content */}
            <div className="flex flex-col h-full overflow-hidden relative min-w-0" style={{ opacity: posState === 'full' ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: posState === 'full' ? 'none' : 'auto' }}>
              {/* TOP COMMAND RIBBON (Enterprise Style) */}
              <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-30">
                <div className="flex items-center gap-8">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-3 rounded-2xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all shadow-sm border border-slate-100 hover:border-slate-200"
                  >
                  <Menu size={26} />
                </button>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Metapharsic ERP</span>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    {getPageTitle(activeTab)}
                  </h1>
                </div>
              </div>

              <div className="flex text-[13px] font-bold tracking-tight gap-1 overflow-hidden items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
                <button 
                  onClick={() => {
                    setActiveTab(Tab.POS);
                    setPosTerminalOpen(true);
                  }} 
                  className={`px-6 py-2.5 rounded-xl transition-all uppercase ${activeTab === Tab.POS ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                >
                  POS
                </button>
                <button onClick={() => setActiveTab(Tab.INVENTORY)} className={`px-6 py-2.5 rounded-xl transition-all uppercase ${activeTab === Tab.INVENTORY ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>Inventory</button>
                <button onClick={() => setActiveTab(Tab.ACCOUNTS)} className={`px-6 py-2.5 rounded-xl transition-all uppercase ${activeTab === Tab.ACCOUNTS ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>Accounts</button>
                <button onClick={() => setActiveTab(Tab.REPORTS)} className={`px-6 py-2.5 rounded-xl transition-all uppercase ${activeTab === Tab.REPORTS ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>Reports</button>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden xl:flex flex-col items-end mr-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    Terminal Active
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">Node v20.11.0 • ERP v4.2.0</div>
                </div>

                <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const currentTab = activeTab;
                      setActiveTab(Tab.DASHBOARD);
                      setTimeout(() => setActiveTab(currentTab), 10);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                    title="Refresh Page"
                  >
                    <RefreshCw size={20} />
                  </button>

                  <button
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                    title="Keyboard Shortcuts"
                  >
                    <HelpCircle size={20} />
                  </button>

                  <NotificationBell />

                  <MenuOptions
                    onCreateNewCompany={handleCreateNewCompany}
                    onRestoreDefaultDemo={handleRestoreDefaultDemo}
                    onRestoreMyDemo={handleRestoreMyDemo}
                    onDeleteSavedPassword={handleDeleteSavedPassword}
                    onChangeOperatorPowers={handleChangeOperatorPowers}
                    onChangeERPVersion={handleChangeERPVersion}
                    onBillRetail={handleBillRetail}
                    onBillWholesale={handleBillWholesale}
                    onSalesReturnExpiry={handleSalesReturnExpiry}
                    onPurchaseReturnExpiry={handlePurchaseReturnExpiry}
                    onReceiptPayment={handleReceiptPayment}
                    onCashBankBook={handleCashBankBook}
                    onLedgerAccount={handleLedgerAccount}
                    onOutstanding={handleOutstanding}
                    onStockStatus={handleStockStatus}
                    onStockSalesAnalysis={handleStockSalesAnalysis}
                    onReorder={handleReorder}
                    onSalesBook={handleSalesBook}
                    onDispatchSummary={handleDispatchSummary}
                    onBillTagging={handleBillTagging}
                    onDailyAnalysis={handleDailyAnalysis}
                    onTodaysGrossProfit={handleTodaysGrossProfit}
                  />
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className={`flex-1 min-h-0 relative bg-slate-50/50 transition-all duration-300 ${activeTab === Tab.POS ? 'p-0' : 'p-3'}`}>
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent -z-10 pointer-events-none"></div>

              <div className={`mx-auto flex flex-col h-full ${activeTab === Tab.POS ? 'max-w-none' : 'max-w-[1700px]'}`}>
                {renderContent()}
              </div>
            </main>
          </div>
          
          {/* RIGHT: POS Panel Content Container - Persistent to prevent state loss on mode switch */}
          <div className="flex flex-col h-full bg-page relative z-20">
            <POSTerminalModal 
              isOpen={posState !== 'closed'} 
              onClose={() => setPosState('closed')} 
              initialItems={[]}
            />
          </div>
        </div>
      </div>
    </div>

    <KeyboardShortcutsHelp
      isOpen={showShortcutsHelp}
      onClose={() => setShowShortcutsHelp(false)}
    />
  </div>
);
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <KeyboardShortcutProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </KeyboardShortcutProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;
