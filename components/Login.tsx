
import React, { useState } from 'react';
import { Lock, User, ArrowRight, Hexagon, Play, X, LayoutDashboard, ShoppingCart, Package, Truck, CreditCard, Map, UserPlus, Globe, Factory, ClipboardCheck, Activity, Database, FileText, Briefcase, BarChart3, ShieldCheck, Layers, Settings, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Tab } from '../types';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState(0);
  const { login, verify2FA, twoFactorRequired, twoFactorUserId } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');

  // Auto-launch demo mode
  const launchDemo = async () => {
    setUsername('admin');
    setPassword('admin');
    setIsLoading(true);
    setError('');
    
    // Give UI time to update then login
    setTimeout(async () => {
      try {
        const result = await login('admin', 'admin');
        if (!result.success && result.error) {
          setError(result.error);
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'Demo launch failed');
        setIsLoading(false);
      }
    }, 500);
  };

  // ERP Modules for Demo
  const demoModules = [
    {
      category: 'Core Operations',
      items: [
        { id: Tab.DASHBOARD, name: 'Dashboard', icon: LayoutDashboard, desc: 'Executive overview with KPIs, analytics, and real-time business intelligence', color: 'blue' },
        { id: Tab.POS, name: 'POS / Billing', icon: ShoppingCart, desc: 'Point of Sale with GST compliance, multi-payment modes, and invoice generation', color: 'green' },
        { id: Tab.INVENTORY, name: 'Inventory', icon: Package, desc: 'Stock management with expiry tracking, batch control, and reorder alerts', color: 'purple' },
        { id: Tab.PURCHASE, name: 'Purchase', icon: Truck, desc: 'Purchase orders, supplier management, and GRN processing', color: 'orange' },
        { id: Tab.ACCOUNTS, name: 'Accounts', icon: CreditCard, desc: 'Financial accounting, ledgers, and payment tracking', color: 'cyan' },
      ]
    },
    {
      category: 'Sales & Distribution',
      items: [
        { id: Tab.PCD, name: 'PCD Network', icon: Map, desc: 'Pharma franchise management with territory tracking and partner analytics', color: 'indigo' },
        { id: Tab.CRM, name: 'CRM (Leads)', icon: UserPlus, desc: 'Customer relationship management with lead scoring and opportunity pipeline', color: 'pink' },
        { id: Tab.OMS, name: 'Order Management', icon: Globe, desc: 'Order processing, dispatch tracking, and delivery management', color: 'teal' },
      ]
    },
    {
      category: 'Production & Quality',
      items: [
        { id: Tab.MANUFACTURING, name: 'Manufacturing', icon: Factory, desc: 'Production planning, batch processing, and BOM management', color: 'amber' },
        { id: Tab.QC, name: 'Quality Control', icon: ClipboardCheck, desc: 'Quality testing, batch approval, and compliance tracking', color: 'emerald' },
        { id: Tab.R_AND_D, name: 'R&D', icon: Activity, desc: 'Research management, formulation development, and trials', color: 'violet' },
      ]
    },
    {
      category: 'Operations & Assets',
      items: [
        { id: Tab.LOGISTICS, name: 'Logistics', icon: Truck, desc: 'Transport management, route optimization, and e-Way bills', color: 'rose' },
        { id: Tab.ASSETS, name: 'Assets & Maint.', icon: Database, desc: 'Asset tracking, maintenance schedules, and depreciation', color: 'slate' },
        { id: Tab.DOCUMENTS, name: 'Documents (DMS)', icon: FileText, desc: 'Document management with version control and workflows', color: 'zinc' },
      ]
    },
    {
      category: 'Administration',
      items: [
        { id: Tab.EMPLOYEES, name: 'HR & Payroll', icon: Briefcase, desc: 'Employee management, attendance, and payroll processing', color: 'sky' },
        { id: Tab.REPORTS, name: 'Reports', icon: BarChart3, desc: 'Advanced analytics, custom reports, and Power BI integration', color: 'lime' },
        { id: Tab.COMPLIANCE, name: 'Compliance', icon: ShieldCheck, desc: 'Regulatory compliance, GST filing, and audit trails', color: 'fuchsia' },
        { id: Tab.AUDIT, name: 'Audit Logs', icon: Layers, desc: 'System activity tracking and security monitoring', color: 'stone' },
        { id: Tab.SETTINGS, name: 'Settings', icon: Settings, desc: 'System configuration, user management, and preferences', color: 'neutral' },
      ]
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
        setError("Please enter both username and password");
        return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        setError('');
      } else if (result.requiresTwoFactor) {
        // Clear error to make space for 2FA UI
        setError('');
      } else {
        setError(result.error || 'Invalid credentials. Try "admin" / "admin".');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Ensure backend is running on port 5005');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !twoFactorUserId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await verify2FA(verificationCode, twoFactorUserId);
      if (!result.success) {
        setError(result.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || '2FA verification error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-metallic-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Glass Card */}
      <div className="glass-dark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative border border-white/10 z-10 animate-fadeIn">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
        
        <div className="p-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white shadow-[0_0_40px_rgba(59,130,246,0.2)] mb-8 border-2 border-white/30 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-cyan-400/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
             <img src="/logo.png" alt="Metapharsic Logo" className="w-20 h-20 object-contain relative z-10 drop-shadow-sm" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            METAPHARSIC
          </h1>
          <p className="text-blue-300 font-black text-[10px] tracking-[0.4em] uppercase mt-2 opacity-90">
            METAPHARSIC ENTERPRISE HUB
          </p>
        </div>

        <div className="p-8 pt-2">
          {!twoFactorRequired ? (
            <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg text-center backdrop-blur-sm animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all shadow-inner"
                  placeholder="Enter your ID"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                  <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                  </span>
              ) : (
                  <span className="flex items-center gap-2">
                      Sign In to System <ArrowRight size={18} />
                  </span>
              )}
            </button>
          </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-2">Enter the verification code sent to your email.</p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg text-center backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Verification Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full px-3 py-4 border border-slate-600 rounded-xl leading-5 bg-slate-800/50 text-white text-center text-2xl font-bold tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                  placeholder="000000"
                  autoFocus
                />
                <p className="text-[10px] text-center text-slate-500 mt-2 italic font-medium">Enter the OTP generated by the backend for this user.</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isLoading || verificationCode.length < 6}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <button 
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel and Sign Out
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
             <p className="text-xs text-slate-400 mb-3">Quick Login (Demo)</p>
             <div className="flex gap-2 justify-center flex-wrap">
                <button className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors" onClick={() => { setUsername('admin'); setPassword('admin'); }}>Admin</button>
                <button className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors" onClick={() => { setUsername('pharmacist'); setPassword('user'); }}>Pharmacist</button>
                <button className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors" onClick={() => { setUsername('cashier'); setPassword('user'); }}>Cashier</button>
             </div>
          </div>

          {/* Demo Section */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-slate-400 mb-3">Try Metapharsic ERP Demo</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setShowDemo(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-sm font-medium transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-900/20"
              >
                <LayoutDashboard size={16} />
                Explore Modules
              </button>
              <button 
                onClick={launchDemo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-900/20"
              >
                <Play size={16} fill="currentColor" />
                Launch Demo
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Experience all 20+ modules instantly</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-slate-500 text-[10px] font-medium tracking-wide">
        SECURE ENTERPRISE GATEWAY v2.5
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Demo Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-white">Metapharsic ERP Demo</h2>
                <p className="text-slate-400 text-sm mt-1">Explore all 20+ modules and features</p>
              </div>
              <button 
                onClick={() => setShowDemo(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Demo Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Category Tabs */}
              <div className="w-64 bg-slate-800/50 border-r border-slate-700 overflow-y-auto">
                {demoModules.map((module, index) => (
                  <button
                    key={module.category}
                    onClick={() => setActiveDemoTab(index)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                      activeDemoTab === index 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500' 
                        : 'text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                  >
                    {module.category}
                  </button>
                ))}
              </div>

              {/* Module Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{demoModules[activeDemoTab].category}</h3>
                  <p className="text-slate-400 text-sm">
                    {demoModules[activeDemoTab].items.length} modules available
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demoModules[activeDemoTab].items.map((item) => {
                    const IconComponent = item.icon;
                    const colorClasses: Record<string, string> = {
                      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      green: 'bg-green-500/20 text-green-400 border-green-500/30',
                      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
                      pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
                      teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
                      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                      violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                      rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                      slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                      zinc: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
                      sky: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
                      lime: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
                      fuchsia: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
                      stone: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
                      neutral: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
                    };
                    
                    return (
                      <div 
                        key={item.id}
                        className={`p-4 rounded-xl border ${colorClasses[item.color]} hover:scale-[1.02] transition-transform cursor-pointer group`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-slate-900/50`}>
                            <IconComponent size={24} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Demo Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/30 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>20+ Fully Functional Modules</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDemo(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setShowDemo(false);
                    launchDemo();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                  <Play size={16} fill="currentColor" />
                  Launch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
