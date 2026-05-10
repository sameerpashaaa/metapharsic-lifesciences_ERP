import React, { useMemo } from 'react';
import {
 BookOpen,
 Boxes,
 Users,
 Briefcase,
 Receipt,
 FileText,
 Database,
 ArrowUpRight,
 TriangleAlert,
 Wallet,
 RefreshCcw
} from 'lucide-react';
import { ERPLayout } from './UniversalLayout';
import { useAuth } from '../context/AuthContext';
import { useNotificationSystem } from '../hooks/useNotifications';
import { useDataFetch } from '../hooks/useDataFetch';

interface DashboardSummary {
 accounts: {
 totalAccounts: number;
 assetAccounts: number;
 liabilityAccounts: number;
 incomeAccounts: number;
 expenseAccounts: number;
 totalAssets: number;
 totalLiabilities: number;
 totalIncome: number;
 totalExpense: number;
 workingCapital: number;
 netProfit: number;
 };
 inventory: {
 totalProducts: number;
 totalUnits: number;
 totalStockValue: number;
 lowStockProducts: number;
 };
 pcd: {
 activePartners: number;
 totalPartners: number;
 totalTerritories: number;
 verifiedSales: number;
 verifiedTransactions: number;
 };
 crm: {
 totalLeads: number;
 newLeads: number;
 convertedLeads: number;
 highPriorityLeads: number;
 };
 sales: {
 totalInvoices: number;
 wholesaleInvoices: number;
 todaySales: number;
 monthSales: number;
 };
 dms: {
 totalDocuments: number;
 activeDocuments: number;
 expiringDocuments: number;
 draftDocuments: number;
 };
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(Number(value || 0));
const formatCurrency = (value: number) => `Rs. ${formatNumber(Math.round(Number(value || 0)))}`;

const SummaryMetric = ({ label, value, accent = 'text-slate-900' }: { label: string; value: string; accent?: string }) => (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
 <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
 </div>
);

const SummarySection = ({
 title,
 subtitle,
 icon,
 tone,
 children
}: {
 title: string;
 subtitle: string;
 icon: React.ReactNode;
 tone: string;
 children: React.ReactNode;
}) => (
 <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
 <div className={`flex items-center justify-between border-b border-slate-100 px-6 py-5 ${tone}`}>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Database Summary</p>
 <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
 <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
 </div>
 <div className="rounded-xl border border-white/70 bg-white p-3 text-slate-700 shadow-sm">
 {icon}
 </div>
 </div>
 <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
 {children}
 </div>
 </section>
);

const Dashboard: React.FC = () => {
 const { user } = useAuth();
 const notify = useNotificationSystem();
 
 // Use the standardized hook
 const { data, loading, error, refetch } = useDataFetch<DashboardSummary>('/api/reports/dashboard-summary');

 // Memoize summary to handle potential null data
 const summary = useMemo(() => data, [data]);

 const handleRefresh = async () => {
 await refetch();
 notify.success('Dashboard Refreshed', 'Dashboard data refreshed from live database', 'DASHBOARD');
 };

 return (
 <ERPLayout
 title={`Welcome back, ${user?.name || 'Admin'}`}
 description="Accounts, inventory, commercial, and document totals from the live database"
 onRefresh={handleRefresh}
 isLoading={loading}
 >
 <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
 <div className="rounded-xl border border-slate-200 bg-white border border-slate-200 !text-primary p-6 text-white shadow-none">
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Database Snapshot</p>
 <div className="mt-3 flex items-center justify-between">
 <h2 className="text-3xl font-bold">Executive Summary</h2>
 <button 
 onClick={handleRefresh}
 className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300"
 title="Refresh Data"
 >
 <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
 </button>
 </div>
 <p className="mt-2 max-w-xl text-sm text-slate-300">
 This dashboard reads live totals from Accounts, Inventory, PCD, CRM, Sales, and DMS tables.
 </p>
 <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
 <Database size={14} />
 Live values from PostgreSQL
 </div>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall Commercial</p>
 <div className="mt-4 grid grid-cols-2 gap-4">
 <SummaryMetric label="Month Sales" value={formatCurrency(summary?.sales?.monthSales || 0)} accent="text-emerald-700" />
 <SummaryMetric label="PCD Verified Sales" value={formatCurrency(summary?.pcd?.verifiedSales || 0)} accent="text-accent" />
 <SummaryMetric label="Stock Value" value={formatCurrency(summary?.inventory?.totalStockValue || 0)} accent="text-slate-900" />
 <SummaryMetric label="Net Profit" value={formatCurrency(summary?.accounts?.netProfit || 0)} accent={(summary?.accounts?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
 </div>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational Alerts</p>
 <div className="mt-4 space-y-3">
 <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
 <TriangleAlert size={18} className="mt-0.5 text-amber-600" />
 <div>
 <p className="text-sm font-bold text-amber-900">{formatNumber(summary?.inventory?.lowStockProducts || 0)} low-stock products</p>
 <p className="text-xs font-medium text-amber-800">Items currently at or below reorder level.</p>
 </div>
 </div>
 <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
 <TriangleAlert size={18} className="mt-0.5 text-rose-600" />
 <div>
 <p className="text-sm font-bold text-rose-900">{formatNumber(summary?.dms?.expiringDocuments || 0)} expiring documents</p>
 <p className="text-xs font-medium text-rose-800">Documents needing attention in the next 30 days.</p>
 </div>
 </div>
 <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
 <ArrowUpRight size={18} className="mt-0.5 text-accent" />
 <div>
 <p className="text-sm font-bold text-blue-900">{formatNumber(summary?.crm?.highPriorityLeads || 0)} high-priority CRM leads</p>
 <p className="text-xs font-medium text-blue-800">Opportunities marked High or Urgent.</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {error && (
 <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
 Failed to load dashboard summary: {error}
 </div>
 )}

 <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
 <SummarySection
 title="Accounts"
 subtitle="Live balances and ledger structure from chart of accounts and general ledger."
 icon={<BookOpen size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Total Accounts" value={formatNumber(summary?.accounts?.totalAccounts || 0)} />
 <SummaryMetric label="Working Capital" value={formatCurrency(summary?.accounts?.workingCapital || 0)} accent="text-emerald-700" />
 <SummaryMetric label="Total Assets" value={formatCurrency(summary?.accounts?.totalAssets || 0)} />
 <SummaryMetric label="Total Liabilities" value={formatCurrency(summary?.accounts?.totalLiabilities || 0)} accent="text-rose-700" />
 <SummaryMetric label="Income" value={formatCurrency(summary?.accounts?.totalIncome || 0)} accent="text-accent" />
 <SummaryMetric label="Expense" value={formatCurrency(summary?.accounts?.totalExpense || 0)} accent="text-amber-700" />
 </SummarySection>

 <SummarySection
 title="Inventory"
 subtitle="Current product counts, stock units, value, and reorder risk."
 icon={<Boxes size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Total Products" value={formatNumber(summary?.inventory?.totalProducts || 0)} />
 <SummaryMetric label="Total Units" value={formatNumber(summary?.inventory?.totalUnits || 0)} />
 <SummaryMetric label="Stock Value" value={formatCurrency(summary?.inventory?.totalStockValue || 0)} accent="text-accent" />
 <SummaryMetric label="Low Stock Products" value={formatNumber(summary?.inventory?.lowStockProducts || 0)} accent="text-rose-700" />
 </SummarySection>

 <SummarySection
 title="PCD"
 subtitle="Partner coverage and verified channel sales from the current database."
 icon={<Users size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Active Partners" value={formatNumber(summary?.pcd?.activePartners || 0)} />
 <SummaryMetric label="Total Partners" value={formatNumber(summary?.pcd?.totalPartners || 0)} />
 <SummaryMetric label="Territories" value={formatNumber(summary?.pcd?.totalTerritories || 0)} />
 <SummaryMetric label="Verified Transactions" value={formatNumber(summary?.pcd?.verifiedTransactions || 0)} />
 <SummaryMetric label="Verified Sales" value={formatCurrency(summary?.pcd?.verifiedSales || 0)} accent="text-violet-700" />
 </SummarySection>

 <SummarySection
 title="CRM"
 subtitle="Lead pipeline counts from the live leads table."
 icon={<Briefcase size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Total Leads" value={formatNumber(summary?.crm?.totalLeads || 0)} />
 <SummaryMetric label="New Leads" value={formatNumber(summary?.crm?.newLeads || 0)} accent="text-cyan-700" />
 <SummaryMetric label="Converted Leads" value={formatNumber(summary?.crm?.convertedLeads || 0)} accent="text-emerald-700" />
 <SummaryMetric label="High Priority Leads" value={formatNumber(summary?.crm?.highPriorityLeads || 0)} accent="text-rose-700" />
 </SummarySection>

 <SummarySection
 title="Sales"
 subtitle="Invoice counts and revenue totals from the live sales register."
 icon={<Receipt size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Total Invoices" value={formatNumber(summary?.sales?.totalInvoices || 0)} />
 <SummaryMetric label="Wholesale Invoices" value={formatNumber(summary?.sales?.wholesaleInvoices || 0)} />
 <SummaryMetric label="Today's Sales" value={formatCurrency(summary?.sales?.todaySales || 0)} accent="text-emerald-700" />
 <SummaryMetric label="This Month Sales" value={formatCurrency(summary?.sales?.monthSales || 0)} accent="text-amber-700" />
 </SummarySection>

 <SummarySection
 title="DMS"
 subtitle="Document control counts from the DMS repository."
 icon={<FileText size={22} />}
 tone="bg-white"
 >
 <SummaryMetric label="Total Documents" value={formatNumber(summary?.dms?.totalDocuments || 0)} />
 <SummaryMetric label="Active Documents" value={formatNumber(summary?.dms?.activeDocuments || 0)} accent="text-emerald-700" />
 <SummaryMetric label="Expiring Documents" value={formatNumber(summary?.dms?.expiringDocuments || 0)} accent="text-rose-700" />
 <SummaryMetric label="Draft Documents" value={formatNumber(summary?.dms?.draftDocuments || 0)} accent="text-amber-700" />
 </SummarySection>
 </div>

 <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
 <Wallet size={20} />
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Read</p>
 <h3 className="text-lg font-bold text-slate-900">What the database says right now</h3>
 </div>
 </div>
 <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="text-sm font-bold text-slate-700">
 Finance currently shows {formatCurrency(summary?.accounts?.workingCapital || 0)} in working capital across {formatNumber(summary?.accounts?.totalAccounts || 0)} ledger accounts.
 </p>
 </div>
 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="text-sm font-bold text-slate-700">
 Inventory holds {formatNumber(summary?.inventory?.totalUnits || 0)} units across {formatNumber(summary?.inventory?.totalProducts || 0)} active products.
 </p>
 </div>
 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <p className="text-sm font-bold text-slate-700">
 Commercial pipeline includes {formatNumber(summary?.crm?.totalLeads || 0)} CRM leads and {formatNumber(summary?.pcd?.activePartners || 0)} active PCD partners.
 </p>
 </div>
 </div>
 </div>
 </ERPLayout>
 );
};

export default Dashboard;

