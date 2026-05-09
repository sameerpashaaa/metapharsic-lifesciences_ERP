/**
 * Universal ERP Component Layout Template (Premium v2.0)
 * Provides consistent, high-end professional structure for all modules
 * 
 * Key Features:
 * - Glassmorphism effects
 * - Sophisticated color palette (Slate & Blue)
 * - Micro-interactions & animations
 * - Professional typography & spacing
 */

import React, { ReactNode } from 'react';
import { RefreshCw, Download, Printer, Search, Filter, X, ChevronRight, MoreHorizontal, ArrowUpRight } from 'lucide-react';

// ============================================
// 1. PREMIUM LAYOUT COMPONENT
// ============================================

interface ActionButtonConfig {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ERPLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  isLoading?: boolean;
  actionButtons?: (ReactNode | ActionButtonConfig)[];
  icon?: ReactNode;
}

export const ERPLayout: React.FC<ERPLayoutProps> = ({
  title,
  description,
  children,
  onRefresh,
  onExport,
  onPrint,
  isLoading = false,
  actionButtons = [],
  icon
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden animate-fadeIn h-full flex flex-col">
      {/* Premium Header */}
      <div className="border-b border-slate-100 p-8 bg-gradient-to-r from-white to-slate-50/50 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30"></div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{description}</p>
              </div>
            </div>
          </div>
          
          {/* Action Hub */}
          <div className="flex flex-wrap gap-3">
            {actionButtons.map((btn, idx) => {
              if (React.isValidElement(btn)) {
                return <div key={idx}>{btn}</div>;
              }
              
              const config = btn as ActionButtonConfig;
              return (
                <button
                  key={idx}
                  onClick={config.onClick}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                    config.variant === 'danger' 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  {config.icon}
                  {config.label}
                </button>
              );
            })}
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  title="Refresh Data"
                  className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all disabled:opacity-50"
                >
                  <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              
              {onExport && (
                <button
                  onClick={onExport}
                  title="Export Excel"
                  className="p-2.5 text-slate-600 hover:text-green-600 hover:bg-white rounded-lg transition-all"
                >
                  <Download size={20} />
                </button>
              )}
              
              {onPrint && (
                <button
                  onClick={onPrint}
                  title="Print Report"
                  className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                >
                  <Printer size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="p-8 bg-white/40 flex-1 overflow-y-auto scroll-smooth">
        {children}
      </div>
    </div>
  );
};

// ============================================
// 2. PREMIUM FILTER HUB
// ============================================

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onRefine?: () => void;
  filters?: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options?: string[] | FilterOption[];
    type?: 'select' | 'date' | 'text';
    placeholder?: string;
  }>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = "Search records...",
  searchValue = '',
  onSearchChange,
  onRefine,
  filters = []
}) => {
  return (
    <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-200/50 flex flex-col lg:flex-row gap-6 items-end">
      {/* Search Wing */}
      <div className="flex-1 w-full relative group">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Universal Search</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm"
          />
        </div>
      </div>

      {/* Filter Slots */}
      <div className="flex flex-wrap gap-4 w-full lg:w-auto">
        {filters.map((filter, idx) => (
          <div key={idx} className="min-w-[160px] flex-1 lg:flex-none">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">{filter.label}</label>
            <div className="relative group">
              {filter.type === 'date' ? (
                <input
                  type="date"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold text-slate-700 shadow-sm appearance-none"
                />
              ) : filter.type === 'text' ? (
                <input
                  type="text"
                  value={filter.value}
                  placeholder={filter.placeholder}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold text-slate-700 shadow-sm"
                />
              ) : (
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold text-slate-700 shadow-sm appearance-none cursor-pointer pr-10"
                >
                  {(filter.options || []).map((opt) => (
                    <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                      {typeof opt === 'string' ? opt : opt.label}
                    </option>
                  ))}
                </select>
              )}
              {filter.type !== 'date' && filter.type !== 'text' && (
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
              )}
            </div>
          </div>
        ))}
        
        <button 
          onClick={() => onRefine?.()}
          className="h-[52px] px-6 bg-[#1D3557] text-white rounded-xl font-bold text-sm hover:bg-[#2A4B7C] active:scale-95 transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 group"
        >
          <Filter size={18} className="group-hover:rotate-12 transition-transform" />
          Refine
        </button>
      </div>
    </div>
  );
};

// ============================================
// 3. PREMIUM DATA TABLE
// ============================================

interface Column<T> {
  key: string;
  label: string;
  width?: string;
  format?: (value: any, row: T) => ReactNode;
  render?: (value: any, row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export const DataTable: React.FC<DataTableProps<any>> = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found in the database',
  onRowClick
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.15em] ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm font-bold text-slate-400 tracking-widest uppercase">Fetching Data...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-32 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="text-slate-200" size={40} />
                    </div>
                    <p className="text-lg font-bold text-slate-300">{emptyMessage}</p>
                    <button className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 underline decoration-2 underline-offset-4">Reset Search Filters</button>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-all ${onRowClick ? 'cursor-pointer hover:bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-5 text-sm font-medium ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.key === 'id' || col.key.includes('no') ? 'font-mono text-blue-600 text-xs' : 'text-slate-700'}`}
                    >
                      {col.render ? col.render(row[col.key], row) : (col.format ? col.format(row[col.key], row) : row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// 4. PREMIUM STATS CARD
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'warning' | 'danger' | 'success';
  trend?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, trend, onClick }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/10',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 ring-purple-500/10',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10',
    warning: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10',
    danger: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 ring-cyan-500/10',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl border ${colorMap[color]} ring-4 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer flex items-center gap-5 group animate-fadeIn`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow-sm border border-inherit transition-transform group-hover:rotate-12`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-slate-900">{value}</h3>
          {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">{trend}</span>}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 5. PREMIUM BADGE
// ============================================

interface BadgeProps {
  value: string;
  className?: string;
  text?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ value, className, text, variant }) => {
  const base = "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm border";
  
  // Support legacy and new variants
  const variantMap = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
    info: 'bg-blue-50 text-blue-700 border-blue-100',
    neutral: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  const finalClass = variant ? `${base} ${variantMap[variant]}` : `${base} ${className}`;

  return (
    <span className={finalClass}>
      {text || value}
    </span>
  );
};

// ============================================
// 6. PREMIUM TABS
// ============================================

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 mb-8 w-fit overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// ============================================
// 7. PREMIUM MODAL
// ============================================

interface ModalProps {
  isOpen?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen = true, title, onClose, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className={`bg-white rounded-[2rem] shadow-2xl ${sizeClasses[size]} w-full overflow-hidden border border-white/20 scale-up`}>
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 8. ENTERPRISE (STRATEGIC) LAYOUT
// ============================================

interface EnterpriseLayoutProps {
  title: string;
  subtitle?: string;
  sidebarItems: {
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    isActive: boolean;
    group?: string;
  }[];
  tabs: {
    id: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
  }[];
  topActions?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    className?: string;
  }[];
  children: ReactNode;
  footer?: ReactNode;
}

export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({
  title,
  subtitle,
  sidebarItems,
  tabs,
  topActions = [],
  children,
  footer
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Group sidebar items
  const groups = Array.from(new Set(sidebarItems.map(item => item.group || 'General')));

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#E8ECEF]' : 'h-full w-full bg-[#E8ECEF]'}`}>
      
      {/* TOP COMMAND RIBBON (Windows Desktop Style) */}
      <div className="bg-[#1D3557] text-white flex justify-between items-center px-4 py-2 shadow-md z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 pr-6 border-r border-white/20">
            <div className="w-8 h-8 flex-shrink-0">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black tracking-widest text-xs text-[#F1FAEE] uppercase">{title}</span>
          </div>
          <div className="flex text-[10px] font-bold tracking-wider gap-1">
            {topActions.map((action, idx) => (
              <button 
                key={idx}
                onClick={action.onClick} 
                className={`px-3 py-1.5 hover:bg-white/10 rounded transition-colors uppercase flex items-center gap-2 ${action.className || ''}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[9px] text-blue-200 hidden md:flex items-center gap-2 uppercase tracking-tighter">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Online • v4.2.0
          </div>
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/20 rounded text-slate-300 transition-colors">
             {isFullscreen ? <ChevronRight size={16} className="rotate-180"/> : <ChevronRight size={16} className="rotate-0"/>}
          </button>
        </div>
      </div>

      {/* MAIN DESKTOP WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* DENSE LEFT NAVIGATION TREE */}
        <div className="w-52 bg-slate-50 border-r border-[#A8DADC] shadow-inner shrink-0 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="p-3 border-b border-slate-200 bg-white sticky top-0 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Navigator
          </div>
          
          <div className="py-2 text-[11px] font-bold flex flex-col">
            {groups.map(group => (
              <React.Fragment key={group}>
                <div className="px-4 py-2 text-[9px] text-slate-400 uppercase tracking-widest mt-2 mb-1 border-t border-slate-100 first:border-0 first:mt-0">{group}</div>
                {sidebarItems.filter(item => (item.group || 'General') === group).map(item => (
                  <button 
                    key={item.id}
                    onClick={item.onClick} 
                    className={`text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-3 ${item.isActive ? 'bg-[#E1EAF2] text-[#1D3557] border-l-4 border-[#1D3557] shadow-sm' : 'text-slate-600 border-l-4 border-transparent'}`}
                  >
                    <span className={`${item.isActive ? 'text-[#1D3557]' : 'text-slate-400'}`}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* MAIN TAB AREA */}
        <div className="flex-1 flex flex-col bg-[#F8F9FA] overflow-hidden">
          <div className="flex bg-[#E4ECEF] border-b border-[#A8DADC] shadow-sm hide-scrollbar overflow-x-auto shrink-0 pt-1 px-1 gap-1">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={tab.onClick}
                className={`group flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] border border-b-0 cursor-pointer rounded-t-md transition-all text-[11px] font-black uppercase tracking-wider ${
                  tab.isActive 
                  ? 'bg-white border-[#A8DADC] text-slate-800 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] z-10' 
                  : 'bg-[#F1FAEE]/50 border-transparent text-slate-500 hover:bg-[#F1FAEE] hover:text-slate-700'
                }`}
              >
                <span className="truncate flex-1">{tab.label}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); tab.onClose(); }}
                  className={`p-1 rounded-sm hover:bg-red-100 hover:text-red-600 transition-colors ${tab.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X size={10}/>
                </button>
              </div>
            ))}
            {tabs.length === 0 && (
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 italic uppercase tracking-widest">Workspace Empty</div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6 relative bg-white">
            {children}
          </div>
          
          {footer && (
            <div className="bg-slate-50 border-t border-slate-200 p-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

