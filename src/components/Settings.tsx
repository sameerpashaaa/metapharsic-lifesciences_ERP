import React, { useState, useEffect } from 'react';
import { Save, Upload, Database, Shield, Server, FileJson, AlertTriangle, Download, RefreshCw, MessageCircle, CheckCircle, Workflow } from 'lucide-react';
import { MOCK_PRODUCTS, MOCK_MRS, MOCK_PCD_PARTNERS, MOCK_SALES_DATA, MOCK_INVOICES, MOCK_SUPPLIERS, MOCK_PURCHASES } from '../constants';
import CompanyForm from './CompanyForm';
import { getWhatsAppConfig, saveWhatsAppConfig, testWhatsAppConfig } from '../services/whatsappService';
import N8nWorkflowManager from './N8nWorkflowManager';

const Settings: React.FC = () => {
  // WhatsApp Configuration State
  const [whatsappConfig, setWhatsappConfig] = useState({
    phoneNumber: '',
    apiKey: '',
    businessAccountId: '',
    enabled: false
  });
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Load WhatsApp config on mount
  useEffect(() => {
    const config = getWhatsAppConfig();
    setWhatsappConfig({
      phoneNumber: config.phoneNumber || '',
      apiKey: config.apiKey || '',
      businessAccountId: config.businessAccountId || '',
      enabled: config.enabled
    });
  }, []);

  const handleSaveWhatsAppConfig = () => {
    saveWhatsAppConfig({
      phoneNumber: whatsappConfig.phoneNumber,
      apiKey: whatsappConfig.apiKey || undefined,
      businessAccountId: whatsappConfig.businessAccountId || undefined,
      enabled: whatsappConfig.enabled
    });
    alert('WhatsApp configuration saved!');
  };

  const handleTestWhatsApp = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const result = await testWhatsAppConfig();
    setTestStatus(result);
    setIsTesting(false);
  };
  
  const handleBackup = () => {
    // 1. Gather all data from the application
    const fullBackup = {
      metadata: {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        appName: "Metapharsic Lifesciences ERP"
      },
      data: {
        products: MOCK_PRODUCTS,
        employees: MOCK_MRS,
        partners: MOCK_PCD_PARTNERS,
        sales: MOCK_SALES_DATA,
        invoices: MOCK_INVOICES,
        suppliers: MOCK_SUPPLIERS,
        purchases: MOCK_PURCHASES
      }
    };

    // 2. Convert to JSON string
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));

    // 3. Create a download link and trigger it
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `metapharsic_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestore = () => {
    alert("Restore functionality requires a backend server integration.\n\nIn a live environment, this would upload the JSON file and replace the SQL/MongoDB database records.");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
            <p className="text-slate-500 text-sm">Manage system configurations, backups, and security.</p>
        </div>
      </div>

      <div className="space-y-6">
        <CompanyForm />
        
        {/* n8n Workflow Automation */}
        <N8nWorkflowManager />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp Integration Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <MessageCircle className="text-green-600" size={20} />
                  <h3 className="font-bold text-slate-800">WhatsApp Notifications</h3>
              </div>
              <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                      <h4 className="font-bold text-green-800 text-sm flex items-center gap-2">
                          <MessageCircle size={16} />
                          WhatsApp Business Integration
                      </h4>
                      <p className="text-xs text-green-700 mt-1">
                          Receive critical ERP notifications directly on WhatsApp. 
                          Configure your phone number to get instant alerts for inventory, compliance, and high-priority events.
                      </p>
                  </div>

                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Your WhatsApp Number *</label>
                          <input
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={whatsappConfig.phoneNumber}
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumber: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Include country code (e.g., +91 for India)</p>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp Business API Key (Optional)</label>
                          <input
                              type="password"
                              placeholder="Enter API key for automated sending"
                              value={whatsappConfig.apiKey}
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Business Account ID (Optional)</label>
                          <input
                              type="text"
                              placeholder="Enter Business Account ID"
                              value={whatsappConfig.businessAccountId}
                              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          />
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
                          <span className="text-sm font-medium text-slate-700">Enable WhatsApp Notifications</span>
                          <button
                              onClick={() => setWhatsappConfig({ ...whatsappConfig, enabled: !whatsappConfig.enabled })}
                              className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer ${
                                  whatsappConfig.enabled ? 'bg-green-500' : 'bg-slate-300'
                              }`}
                          >
                              <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                                  whatsappConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                              }`}></span>
                          </button>
                      </div>

                      {testStatus && (
                          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                              testStatus.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                              {testStatus.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                              {testStatus.message}
                          </div>
                      )}

                      <div className="flex gap-2 pt-2">
                          <button
                              onClick={handleTestWhatsApp}
                              disabled={isTesting || !whatsappConfig.phoneNumber}
                              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                              {isTesting ? (
                                  <>
                                      <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                      Testing...
                                  </>
                              ) : (
                                  <>
                                      <RefreshCw size={16} />
                                      Test Connection
                                  </>
                              )}
                          </button>
                          <button
                              onClick={handleSaveWhatsAppConfig}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                              <Save size={16} />
                              Save Config
                          </button>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
                          <h5 className="text-xs font-bold text-blue-800 mb-1">Auto-Notifications Enabled For:</h5>
                          <ul className="text-[10px] text-blue-700 space-y-1">
                              <li>• Critical inventory alerts (stock below minimum)</li>
                              <li>• Compliance deadlines (license renewals, GST filing)</li>
                              <li>• High-priority accounts notifications</li>
                              <li>• Employee performance alerts</li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>

          {/* Data Management Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Database className="text-primary" size={20} />
                  <h3 className="font-bold text-slate-800">Data Backup & Restore</h3>
              </div>
              <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                      <FileJson className="text-blue-600 shrink-0" size={24} />
                      <div>
                          <h4 className="font-bold text-blue-800 text-sm">JSON Data Export</h4>
                          <p className="text-xs text-blue-700 mt-1">
                              Download a complete snapshot of your inventory, sales, employees, and partners. 
                              Use this file to migrate data or restore previous states.
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <button 
                          onClick={handleBackup}
                          className="flex flex-col items-center justify-center p-4 border-2 border-slate-100 rounded-xl hover:border-primary hover:bg-slate-50 transition-all group"
                      >
                          <Download size={32} className="text-slate-400 group-hover:text-primary mb-2 transition-colors" />
                          <span className="font-bold text-slate-700">Download Backup</span>
                          <span className="text-xs text-slate-400 mt-1">.json format</span>
                      </button>

                      <button 
                          onClick={handleRestore}
                          className="flex flex-col items-center justify-center p-4 border-2 border-slate-100 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                      >
                          <Upload size={32} className="text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                          <span className="font-bold text-slate-700">Restore Data</span>
                          <span className="text-xs text-slate-400 mt-1">Select File</span>
                      </button>
                  </div>
              </div>
          </div>

          {/* System Configuration */}
          <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <Server className="text-slate-600" size={20} />
                      <h3 className="font-bold text-slate-800">Application Parameters</h3>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                        <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                            <option>2023 - 2024</option>
                            <option>2024 - 2025</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-slate-700">Tax Mode (GST)</span>
                          <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-green-500 cursor-pointer">
                              <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-6"></span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <Shield className="text-slate-600" size={20} />
                      <h3 className="font-bold text-slate-800">Dangerous Zone</h3>
                  </div>
                  <div className="p-6">
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg">
                          <div className="flex items-center gap-3">
                              <AlertTriangle className="text-red-600" size={24} />
                              <div>
                                  <h4 className="font-bold text-red-800 text-sm">Factory Reset</h4>
                                  <p className="text-xs text-red-700">Clear all local storage and reset to demo data.</p>
                              </div>
                          </div>
                          <button className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded hover:bg-red-600 hover:text-white transition-colors">
                              Reset System
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
