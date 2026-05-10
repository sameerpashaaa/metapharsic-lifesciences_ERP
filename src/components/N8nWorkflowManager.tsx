import React, { useState, useEffect } from 'react';
import { 
 Workflow, 
 Play, 
 Pause, 
 Settings, 
 Plus, 
 RefreshCw, 
 CheckCircle, 
 AlertTriangle, 
 ExternalLink,
 Zap,
 Clock,
 Activity,
 Trash2,
 Edit3,
 Copy
} from 'lucide-react';
import {
 getN8nConfig,
 saveN8nConfig,
 testN8nConnection,
 fetchWorkflows,
 executeWorkflow,
 toggleWorkflow,
 getWorkflowTemplates,
 getWorkflowLogs,
 clearWorkflowLogs,
 N8nWorkflow,
 WorkflowTemplate,
 WorkflowLog
} from '../services/n8nService';

const N8nWorkflowManager: React.FC = () => {
 const [config, setConfig] = useState(getN8nConfig());
 const [showSettings, setShowSettings] = useState(false);
 const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
 const [isTesting, setIsTesting] = useState(false);
 const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
 const [logs, setLogs] = useState<WorkflowLog[]>([]);
 const [loading, setLoading] = useState(false);
 const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'logs'>('workflows');
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 const [executing, setExecuting] = useState<string | null>(null);

 const templates = getWorkflowTemplates();
 const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

 useEffect(() => {
 if (config.enabled) {
 loadWorkflows();
 setLogs(getWorkflowLogs());
 }
 }, [config.enabled]);

 const loadWorkflows = async () => {
 setLoading(true);
 const data = await fetchWorkflows();
 setWorkflows(data);
 setLoading(false);
 };

 const handleSaveConfig = () => {
 saveN8nConfig(config);
 setShowSettings(false);
 if (config.enabled) {
 loadWorkflows();
 }
 };

 const handleTestConnection = async () => {
 setIsTesting(true);
 const result = await testN8nConnection();
 setTestStatus(result);
 setIsTesting(false);
 };

 const handleToggleWorkflow = async (workflowId: string, currentActive: boolean) => {
 const success = await toggleWorkflow(workflowId, !currentActive);
 if (success) {
 loadWorkflows();
 }
 };

 const handleExecuteWorkflow = async (workflowId: string) => {
 setExecuting(workflowId);
 await executeWorkflow(workflowId, { manual: true, timestamp: new Date().toISOString() });
 setExecuting(null);
 // Refresh logs
 setLogs(getWorkflowLogs());
 };

 const filteredTemplates = selectedCategory === 'all' 
 ? templates 
 : templates.filter(t => t.category === selectedCategory);

 const getCategoryColor = (category: string) => {
 const colors: Record<string, string> = {
 'Inventory': 'bg-blue-100 text-accent',
 'Sales': 'bg-green-100 text-green-700',
 'Accounts': 'bg-yellow-100 text-yellow-700',
 'HR': 'bg-purple-100 text-purple-700',
 'Compliance': 'bg-red-100 text-red-700',
 'Purchase': 'bg-orange-100 text-orange-700',
 'CRM': 'bg-pink-100 text-pink-700',
 'Logistics': 'bg-cyan-100 text-cyan-700'
 };
 return colors[category] || 'bg-slate-100 text-slate-700';
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
 <Workflow className="text-accent" />
 n8n Workflow Automation
 </h2>
 <p className="text-slate-500 mt-1">Automate ERP processes with no-code workflows</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setShowSettings(!showSettings)}
 className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
 >
 <Settings size={18} />
 Settings
 </button>
 {config.enabled && (
 <button
 onClick={loadWorkflows}
 disabled={loading}
 className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent text-white rounded-lg font-medium transition-colors disabled:opacity-50"
 >
 <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
 Refresh
 </button>
 )}
 </div>
 </div>

 {/* Settings Panel */}
 {showSettings && (
 <div className="bg-white rounded-xl border border-slate-200 p-6">
 <h3 className="font-bold text-slate-800 mb-4">n8n Configuration</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Base URL</label>
 <input
 type="text"
 value={config.baseUrl}
 onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="http://localhost:5678"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
 <input
 type="password"
 value={config.apiKey}
 onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="Enter n8n API Key"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Webhook Base URL</label>
 <input
 type="text"
 value={config.webhookBaseUrl}
 onChange={(e) => setConfig({ ...config, webhookBaseUrl: e.target.value })}
 className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
 placeholder="http://localhost:5678/webhook"
 />
 </div>
 </div>
 
 <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-slate-700">Enable n8n</span>
 <button
 onClick={() => setConfig({ ...config, enabled: !config.enabled })}
 className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full ${
 config.enabled ? 'bg-accent' : 'bg-slate-300'
 }`}
 >
 <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
 config.enabled ? 'translate-x-6' : 'translate-x-0'
 }`} />
 </button>
 </div>
 <div className="flex gap-2">
 {testStatus && (
 <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
 testStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
 }`}>
 {testStatus.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
 {testStatus.message}
 </div>
 )}
 <button
 onClick={handleTestConnection}
 disabled={isTesting || !config.enabled}
 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
 >
 {isTesting ? 'Testing...' : 'Test Connection'}
 </button>
 <button
 onClick={handleSaveConfig}
 className="px-4 py-2 bg-accent hover:bg-accent text-white rounded-lg text-sm font-medium transition-colors"
 >
 Save
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Navigation Tabs */}
 <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 inline-flex">
 <button
 onClick={() => setActiveTab('workflows')}
 className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
 activeTab === 'workflows' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-50'
 }`}
 >
 <Workflow size={16} />
 Workflows
 </button>
 <button
 onClick={() => setActiveTab('templates')}
 className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
 activeTab === 'templates' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-50'
 }`}
 >
 <Zap size={16} />
 Templates
 </button>
 <button
 onClick={() => setActiveTab('logs')}
 className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
 activeTab === 'logs' ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-50'
 }`}
 >
 <Activity size={16} />
 Execution Logs
 </button>
 </div>

 {/* Workflows Tab */}
 {activeTab === 'workflows' && (
 <div className="space-y-4">
 {!config.enabled ? (
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
 <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
 <h3 className="font-bold text-amber-800 mb-2">n8n Not Configured</h3>
 <p className="text-amber-700 mb-4">Enable n8n integration in settings to manage workflows</p>
 <button
 onClick={() => setShowSettings(true)}
 className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
 >
 Configure n8n
 </button>
 </div>
 ) : workflows.length === 0 ? (
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
 <Workflow className="w-16 h-16 text-slate-300 mx-auto mb-4" />
 <h3 className="font-bold text-slate-700 mb-2">No Workflows Found</h3>
 <p className="text-slate-500 mb-4">Get started by creating a workflow from templates</p>
 <button
 onClick={() => setActiveTab('templates')}
 className="px-4 py-2 bg-accent hover:bg-accent text-white rounded-lg font-medium"
 >
 Browse Templates
 </button>
 </div>
 ) : (
 <div className="grid gap-4">
 {workflows.map((workflow) => (
 <div
 key={workflow.id}
 className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-none transition-all"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
 workflow.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
 }`}>
 <Workflow size={20} />
 </div>
 <div>
 <h4 className="font-bold text-slate-800">{workflow.name}</h4>
 <p className="text-xs text-slate-500">
 ID: {workflow.id} • Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => handleToggleWorkflow(workflow.id, workflow.active)}
 className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
 workflow.active
 ? 'bg-green-100 text-green-700 hover:bg-green-200'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
 >
 {workflow.active ? <Pause size={14} /> : <Play size={14} />}
 {workflow.active ? 'Active' : 'Inactive'}
 </button>
 <button
 onClick={() => handleExecuteWorkflow(workflow.id)}
 disabled={executing === workflow.id}
 className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-accent rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
 >
 {executing === workflow.id ? (
 <RefreshCw size={14} className="animate-spin" />
 ) : (
 <Play size={14} />
 )}
 Run
 </button>
 <a
 href={`${config.baseUrl}/workflow/${workflow.id}`}
 target="_blank"
 rel="noopener noreferrer"
 className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
 >
 <ExternalLink size={16} />
 </a>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Templates Tab */}
 {activeTab === 'templates' && (
 <div className="space-y-4">
 {/* Category Filter */}
 <div className="flex flex-wrap gap-2">
 {categories.map((category) => (
 <button
 key={category}
 onClick={() => setSelectedCategory(category)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selectedCategory === category
 ? 'bg-accent text-white'
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
 }`}
 >
 {category.charAt(0).toUpperCase() + category.slice(1)}
 </button>
 ))}
 </div>

 {/* Templates Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredTemplates.map((template) => (
 <div
 key={template.id}
 className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-none transition-all group"
 >
 <div className="flex items-start justify-between mb-3">
 <div className="text-4xl">{template.icon}</div>
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(template.category)}`}>
 {template.category}
 </span>
 </div>
 <h4 className="font-bold text-slate-800 mb-2">{template.name}</h4>
 <p className="text-sm text-slate-500 mb-4">{template.description}</p>
 
 {/* Node Preview */}
 <div className="bg-slate-50 rounded-lg p-3 mb-4">
 <p className="text-xs font-medium text-slate-600 mb-2">Workflow Nodes:</p>
 <div className="flex flex-wrap gap-1">
 {template.nodes.slice(0, 4).map((node, idx) => (
 <span
 key={idx}
 className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600"
 >
 {node.name}
 </span>
 ))}
 {template.nodes.length > 4 && (
 <span className="text-[10px] px-2 py-0.5 text-slate-400">
 +{template.nodes.length - 4} more
 </span>
 )}
 </div>
 </div>

 <div className="flex gap-2">
 <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-accent hover:bg-accent text-white rounded-lg text-sm font-medium transition-colors">
 <Plus size={14} />
 Create
 </button>
 <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
 <Copy size={16} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Logs Tab */}
 {activeTab === 'logs' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <h3 className="font-bold text-slate-800">Execution History</h3>
 {logs.length > 0 && (
 <button
 onClick={() => {
 clearWorkflowLogs();
 setLogs([]);
 }}
 className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
 >
 <Trash2 size={14} />
 Clear Logs
 </button>
 )}
 </div>

 {logs.length === 0 ? (
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
 <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
 <h3 className="font-bold text-slate-700 mb-2">No Execution Logs</h3>
 <p className="text-slate-500">Workflow executions will appear here</p>
 </div>
 ) : (
 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
 <table className="w-full text-sm">
 <thead className="bg-slate-50 text-slate-600">
 <tr>
 <th className="p-3 text-left">Workflow</th>
 <th className="p-3 text-left">Status</th>
 <th className="p-3 text-left">Started</th>
 <th className="p-3 text-left">Duration</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {logs.map((log) => (
 <tr key={log.id} className="hover:bg-slate-50">
 <td className="p-3">
 <div className="font-medium text-slate-800">{log.workflowName}</div>
 <div className="text-xs text-slate-500">{log.workflowId}</div>
 </td>
 <td className="p-3">
 <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
 log.status === 'success' ? 'bg-green-100 text-green-700' :
 log.status === 'error' ? 'bg-red-100 text-red-700' :
 log.status === 'running' ? 'bg-blue-100 text-accent' :
 'bg-slate-100 text-slate-700'
 }`}>
 {log.status === 'success' && <CheckCircle size={12} />}
 {log.status === 'error' && <AlertTriangle size={12} />}
 {log.status === 'running' && <RefreshCw size={12} className="animate-spin" />}
 {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
 </span>
 </td>
 <td className="p-3 text-slate-600">
 {new Date(log.startedAt).toLocaleString()}
 </td>
 <td className="p-3 text-slate-600">
 {log.finishedAt 
 ? `${Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`
 : '-'
 }
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* Info Section */}
 <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
 <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
 <Zap size={18} />
 About n8n Integration
 </h4>
 <p className="text-sm text-accent mb-3">
 n8n is a powerful workflow automation tool that connects your ERP with 400+ external services.
 Create automated workflows without writing code.
 </p>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
 <div className="bg-white rounded-lg p-3 border border-blue-200">
 <strong className="text-blue-800">Trigger Events</strong>
 <p className="text-slate-600 mt-1">Automatically start workflows from ERP events</p>
 </div>
 <div className="bg-white rounded-lg p-3 border border-blue-200">
 <strong className="text-blue-800">Connect Services</strong>
 <p className="text-slate-600 mt-1">Integrate with Slack, Email, WhatsApp, Sheets</p>
 </div>
 <div className="bg-white rounded-lg p-3 border border-blue-200">
 <strong className="text-blue-800">Schedule Tasks</strong>
 <p className="text-slate-600 mt-1">Run workflows on schedule - daily, weekly, monthly</p>
 </div>
 </div>
 </div>
 </div>
 );
};

export default N8nWorkflowManager;

