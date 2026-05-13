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
 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full animate-fadeIn">
 {/* Premium Header */}
 <div className="border-b border-slate-100 p-8 bg-white shrink-0">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="w-1.5 h-10 bg-accent rounded-full"></div>
 <div>
 <h1 className="text-3xl font-bold text-primary tracking-tight">{title}</h1>
 <div className="flex items-center gap-2 mt-1.5">
 <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
 <p className="text-sm font-medium text-slate-500 tracking-wide">{description}</p>
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
 className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
 config.variant === 'danger' 
 ? 'bg-red-600 text-white hover:bg-red-700' 
 : 'bg-primary text-white hover:bg-neutral-800'
 }`}
 >
 {config.icon}
 {config.label}
 </button>
 );
 })}
 
 <div className="flex bg-slate-50 p-1 rounded-full border border-slate-200">
 {onRefresh && (
 <button
 onClick={onRefresh}
 disabled={isLoading}
 title="Refresh Data"
 className="p-2.5 text-slate-600 hover:text-accent hover:bg-white rounded-full transition-all disabled:opacity-50"
 >
 <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
 </button>
 )}
 
 {onExport && (
 <button
 onClick={onExport}
 title="Export Excel"
 className="p-2.5 text-slate-600 hover:text-accent hover:bg-white rounded-full transition-all"
 >
 <Download size={20} />
 </button>
 )}
 
 {onPrint && (
 <button
 onClick={onPrint}
 title="Print Report"
 className="p-2.5 text-slate-600 hover:text-accent hover:bg-white rounded-full transition-all"
 >
 <Printer size={20} />
 </button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Main Viewport */}
 <div className="p-8 bg-slate-50 flex-1 overflow-y-auto scroll-smooth">
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
 <div className="bg-white rounded-xl p-6 mb-8 border border-slate-200 flex flex-col lg:flex-row gap-6 items-end">
 {/* Search Wing */}
 <div className="flex-1 w-full relative group">
 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Search</label>
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={20} />
 <input
 type="text"
 value={searchValue}
 onChange={(e) => onSearchChange?.(e.target.value)}
 placeholder={searchPlaceholder}
 className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium"
 />
 </div>
 </div>

 {/* Filter Slots */}
 <div className="flex flex-wrap gap-4 w-full lg:w-auto">
 {filters.map((filter, idx) => (
 <div key={idx} className="min-w-[160px] flex-1 lg:flex-none">
 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{filter.label}</label>
 <div className="relative group">
 {filter.type === 'date' ? (
 <input
 type="date"
 value={filter.value}
 onChange={(e) => filter.onChange(e.target.value)}
 className="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium text-slate-700 appearance-none"
 />
 ) : filter.type === 'text' ? (
 <input
 type="text"
 value={filter.value}
 placeholder={filter.placeholder}
 onChange={(e) => filter.onChange(e.target.value)}
 className="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium text-slate-700"
 />
 ) : (
 <select
 value={filter.value}
 onChange={(e) => filter.onChange(e.target.value)}
 className="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer pr-10"
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
 className="h-[46px] px-6 bg-primary text-white rounded-full font-bold text-sm hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 group"
 >
 <Filter size={18} className="transition-transform" />
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
 renderSubRow?: (row: T) => ReactNode;
}

export const DataTable: React.FC<DataTableProps<any>> = ({
 columns = [],
 data = [],
 loading = false,
 emptyMessage = 'No records found in the database',
 onRowClick,
 renderSubRow
}) => {
 return (
 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100">
 {columns.map((col) => (
 <th
 key={col.key}
 className={`px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest ${
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
 <div className="w-12 h-12 border-2 border-border border-t-accent rounded-full animate-spin"></div>
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
 <button className="mt-4 text-sm font-bold text-accent hover:text-accent underline decoration-2 underline-offset-4">Reset Search Filters</button>
 </div>
 </td>
 </tr>
 ) : (
 data.map((row, idx) => (
 <React.Fragment key={idx}>
 <tr
 onClick={() => onRowClick?.(row)}
 className={`group transition-all border-b border-slate-50 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/30'}`}
 >
 {columns.map((col) => (
 <td
 key={col.key}
 className={`px-6 py-5 text-sm font-medium ${
 col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
 } ${col.key === 'id' || col.key.includes('no') ? 'font-mono text-accent text-xs' : 'text-slate-700'}`}
 >
 {col.render ? col.render(row[col.key], row) : (col.format ? col.format(row[col.key], row) : row[col.key])}
 </td>
 ))}
 </tr>
 {renderSubRow && renderSubRow(row)}
 </React.Fragment>
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
 return (
 <div 
 onClick={onClick}
 className="p-6 rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 cursor-pointer flex items-center gap-5 animate-fadeIn"
 >
 <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-primary border border-slate-100">
 {icon}
 </div>
 <div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
 <div className="flex items-baseline gap-2">
 <h3 className="text-2xl font-bold text-primary">{value}</h3>
 {trend && <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">{trend}</span>}
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
 const base = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border";
 
 // Support legacy and new variants
 const variantMap = {
 success: 'bg-green-50 text-green-700 border-green-100',
 warning: 'bg-amber-50 text-amber-700 border-amber-100',
 danger: 'bg-red-50 text-red-700 border-red-100',
 info: 'bg-slate-100 text-slate-700 border-slate-200',
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
 <div className="flex gap-2 p-1 bg-slate-100 rounded-full border border-slate-200 mb-8 w-fit overflow-x-auto">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => onChange(tab.id)}
 className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
 activeTab === tab.id
 ? 'bg-white text-accent border border-slate-200'
 : 'text-slate-500 hover:text-primary hover:bg-white/50'
 }`}
 >
 {tab.label}
 {tab.badge !== undefined && (
 <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-accent text-white' : 'bg-slate-200 text-slate-600'}`}>
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
 <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
 <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${sizeClasses[size]} w-full`}>
 <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
 <div className="flex items-center gap-3">
 <div className="w-1 h-6 bg-accent rounded-full"></div>
 <h2 className="text-xl font-bold text-primary tracking-tight">{title}</h2>
 </div>
 <button 
 onClick={onClose} 
 className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all"
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
 showSidebar?: boolean;
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
 showSidebar = true,
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
 <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full w-full bg-background'}`}>
 
 {/* TOP COMMAND RIBBON */}
 <div className="bg-white text-primary flex justify-between items-center px-4 py-2 border-b border-slate-200 z-20 shrink-0">
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
 <div className="w-8 h-8 flex-shrink-0">
 <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
 </div>
 <span className="font-bold tracking-widest text-xs uppercase">{title}</span>
 </div>
 <div className="flex text-[10px] font-bold tracking-wider gap-1">
 {topActions.map((action, idx) => (
 <button 
 key={idx}
 onClick={action.onClick} 
 className={`px-3 py-1.5 hover:bg-slate-50 text-slate-600 hover:text-primary rounded transition-colors uppercase flex items-center gap-2 ${action.className || ''}`}
 >
 {action.icon}
 {action.label}
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-[9px] text-slate-400 hidden md:flex items-center gap-2 uppercase tracking-tighter">
 <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
 System Online
 </div>
 <button onClick={toggleFullscreen} className="p-1.5 hover:bg-slate-50 rounded text-slate-400 transition-colors">
 {isFullscreen ? <ChevronRight size={16} className="rotate-180"/> : <ChevronRight size={16} className="rotate-0"/>}
 </button>
 </div>
 </div>

 {/* MAIN DESKTOP WORKSPACE */}
 <div className="flex flex-1 overflow-hidden">
 
 {/* DENSE LEFT NAVIGATION TREE */}
 {showSidebar && (
 <div className="w-52 bg-slate-50 border-r border-slate-200 shrink-0 flex flex-col overflow-y-auto overflow-x-hidden">
 <div className="p-3 border-b border-slate-200 bg-white sticky top-0 font-bold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
 className={`text-left px-4 py-2 hover:bg-white transition-all flex items-center gap-3 ${item.isActive ? 'bg-white text-accent font-bold border-r-2 border-accent' : 'text-slate-600'}`}
 >
 <span className={`${item.isActive ? 'text-accent' : 'text-slate-400'}`}>{item.icon}</span>
 {item.label}
 </button>
 ))}
 </React.Fragment>
 ))}
 </div>
 </div>
 )}

 {/* MAIN TAB AREA */}
 <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
 <div className="flex bg-slate-100 border-b border-slate-200 hide-scrollbar overflow-x-auto shrink-0 pt-1 px-1 gap-1">
 {tabs.map(tab => (
 <div 
 key={tab.id}
 onClick={tab.onClick}
 className={`group flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] border border-b-0 cursor-pointer rounded-t-md transition-all text-[11px] font-bold uppercase tracking-wider ${
 tab.isActive 
 ? 'bg-white border-slate-200 text-accent border-t-2 border-t-accent z-10' 
 : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
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
 
 <div className="flex-1 overflow-auto p-6 relative bg-slate-50">
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


