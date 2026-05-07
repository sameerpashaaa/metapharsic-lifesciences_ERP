// n8n Workflow Automation Service for ERP
// Enables no-code automation and integration with external services

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: N8nNode[];
  connections: N8nConnection[];
  settings?: {
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
    timezone?: string;
  };
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface N8nConnection {
  from: string;
  to: string;
  fromOutput?: number;
  toInput?: number;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  error?: string;
}

// n8n Configuration
export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
  webhookBaseUrl: string;
  enabled: boolean;
}

let n8nConfig: N8nConfig = {
  baseUrl: localStorage.getItem('n8n_base_url') || 'http://localhost:5678',
  apiKey: localStorage.getItem('n8n_api_key') || '',
  webhookBaseUrl: localStorage.getItem('n8n_webhook_url') || 'http://localhost:5678/webhook',
  enabled: localStorage.getItem('n8n_enabled') === 'true'
};

// Save configuration
export const saveN8nConfig = (config: Partial<N8nConfig>) => {
  n8nConfig = { ...n8nConfig, ...config };
  localStorage.setItem('n8n_base_url', n8nConfig.baseUrl);
  localStorage.setItem('n8n_api_key', n8nConfig.apiKey);
  localStorage.setItem('n8n_webhook_url', n8nConfig.webhookBaseUrl);
  localStorage.setItem('n8n_enabled', n8nConfig.enabled.toString());
};

// Get configuration
export const getN8nConfig = (): N8nConfig => ({ ...n8nConfig });

// Test n8n connection
export const testN8nConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!n8nConfig.enabled) {
    return { success: false, message: 'n8n integration is disabled' };
  }

  try {
    const response = await fetch(`${n8nConfig.baseUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: 'Successfully connected to n8n' };
    } else {
      return { success: false, message: `Connection failed: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Fetch all workflows
export const fetchWorkflows = async (): Promise<N8nWorkflow[]> => {
  if (!n8nConfig.enabled) return [];

  try {
    const response = await fetch(`${n8nConfig.baseUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    return [];
  }
};

// Execute a workflow
export const executeWorkflow = async (workflowId: string, data?: any): Promise<N8nExecution | null> => {
  if (!n8nConfig.enabled) return null;

  try {
    const response = await fetch(`${n8nConfig.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': n8nConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data || {})
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    return null;
  }
};

// Toggle workflow active state
export const toggleWorkflow = async (workflowId: string, active: boolean): Promise<boolean> => {
  if (!n8nConfig.enabled) return false;

  try {
    const response = await fetch(`${n8nConfig.baseUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: {
        'X-N8N-API-KEY': n8nConfig.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to toggle workflow:', error);
    return false;
  }
};

// Trigger webhook
export const triggerWebhook = async (webhookPath: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`${n8nConfig.webhookBaseUrl}/${webhookPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Failed to trigger webhook:', error);
    return null;
  }
};

// ==================== ERP WORKFLOW TEMPLATES ====================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes: Partial<N8nNode>[];
  webhookPath?: string;
}

// Pre-built ERP workflow templates
export const getWorkflowTemplates = (): WorkflowTemplate[] => {
  return [
    {
      id: 'inventory-alert',
      name: 'Low Stock Alert',
      description: 'Automatically notify when inventory falls below reorder level',
      category: 'Inventory',
      icon: '📦',
      webhookPath: 'inventory-low-stock',
      nodes: [
        { type: 'n8n-nodes-base.webhook', name: 'Webhook Trigger' },
        { type: 'n8n-nodes-base.if', name: 'Check Stock Level' },
        { type: 'n8n-nodes-base.slack', name: 'Send Slack Alert' },
        { type: 'n8n-nodes-base.email', name: 'Send Email' },
        { type: 'n8n-nodes-base.whatsapp', name: 'WhatsApp Notification' }
      ]
    },
    {
      id: 'sales-report',
      name: 'Daily Sales Report',
      description: 'Generate and email daily sales summary',
      category: 'Sales',
      icon: '📊',
      webhookPath: 'daily-sales-report',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Daily Schedule' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Fetch Sales Data' },
        { type: 'n8n-nodes-base.spreadsheetFile', name: 'Create Excel' },
        { type: 'n8n-nodes-base.email', name: 'Email Report' }
      ]
    },
    {
      id: 'invoice-followup',
      name: 'Invoice Payment Follow-up',
      description: 'Automated reminders for overdue invoices',
      category: 'Accounts',
      icon: '💰',
      webhookPath: 'invoice-followup',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Weekly Schedule' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Get Overdue Invoices' },
        { type: 'n8n-nodes-base.email', name: 'Send Reminder Email' },
        { type: 'n8n-nodes-base.whatsapp', name: 'WhatsApp Reminder' }
      ]
    },
    {
      id: 'expiry-alert',
      name: 'Product Expiry Alert',
      description: 'Notify before products reach expiry date',
      category: 'Inventory',
      icon: '⚠️',
      webhookPath: 'expiry-alert',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Daily Check' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Fetch Expiring Products' },
        { type: 'n8n-nodes-base.if', name: 'Check Expiry Date' },
        { type: 'n8n-nodes-base.email', name: 'Alert Email' },
        { type: 'n8n-nodes-base.slack', name: 'Slack Notification' }
      ]
    },
    {
      id: 'employee-onboarding',
      name: 'Employee Onboarding',
      description: 'Automated workflow for new employee setup',
      category: 'HR',
      icon: '👥',
      webhookPath: 'employee-onboarding',
      nodes: [
        { type: 'n8n-nodes-base.webhook', name: 'New Employee Trigger' },
        { type: 'n8n-nodes-base.email', name: 'Welcome Email' },
        { type: 'n8n-nodes-base.googleSheets', name: 'Update HR Sheet' },
        { type: 'n8n-nodes-base.slack', name: 'Notify Team' },
        { type: 'n8n-nodes-base.todoist', name: 'Create Tasks' }
      ]
    },
    {
      id: 'compliance-check',
      name: 'Compliance Status Check',
      description: 'Monitor and report compliance status',
      category: 'Compliance',
      icon: '✅',
      webhookPath: 'compliance-check',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Weekly Schedule' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Get Compliance Data' },
        { type: 'n8n-nodes-base.if', name: 'Check Status' },
        { type: 'n8n-nodes-base.email', name: 'Compliance Report' },
        { type: 'n8n-nodes-base.googleSheets', name: 'Log Status' }
      ]
    },
    {
      id: 'purchase-approval',
      name: 'Purchase Order Approval',
      description: 'Route purchase orders for approval',
      category: 'Purchase',
      icon: '📋',
      webhookPath: 'purchase-approval',
      nodes: [
        { type: 'n8n-nodes-base.webhook', name: 'PO Created Trigger' },
        { type: 'n8n-nodes-base.email', name: 'Approval Request' },
        { type: 'n8n-nodes-base.wait', name: 'Wait for Approval' },
        { type: 'n8n-nodes-base.if', name: 'Check Decision' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Update PO Status' }
      ]
    },
    {
      id: 'customer-birthday',
      name: 'Customer Birthday Wishes',
      description: 'Send automated birthday greetings to customers',
      category: 'CRM',
      icon: '🎂',
      webhookPath: 'customer-birthday',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Daily Check' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Get Birthdays' },
        { type: 'n8n-nodes-base.email', name: 'Birthday Email' },
        { type: 'n8n-nodes-base.whatsapp', name: 'WhatsApp Message' }
      ]
    },
    {
      id: 'dispatch-notification',
      name: 'Dispatch Status Updates',
      description: 'Notify customers about shipment status',
      category: 'Logistics',
      icon: '🚚',
      webhookPath: 'dispatch-update',
      nodes: [
        { type: 'n8n-nodes-base.webhook', name: 'Status Change Trigger' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Get Customer Details' },
        { type: 'n8n-nodes-base.email', name: 'Status Email' },
        { type: 'n8n-nodes-base.whatsapp', name: 'SMS/WhatsApp' }
      ]
    },
    {
      id: 'performance-report',
      name: 'Monthly Performance Report',
      description: 'Generate employee performance reports',
      category: 'HR',
      icon: '📈',
      webhookPath: 'performance-report',
      nodes: [
        { type: 'n8n-nodes-base.scheduleTrigger', name: 'Monthly Schedule' },
        { type: 'n8n-nodes-base.httpRequest', name: 'Fetch Performance Data' },
        { type: 'n8n-nodes-base.spreadsheetFile', name: 'Create Report' },
        { type: 'n8n-nodes-base.email', name: 'Distribute Report' }
      ]
    }
  ];
};

// ==================== ERP AUTOMATION TRIGGERS ====================

// Trigger n8n workflow from ERP events
export const triggerERPWorkflow = async (
  eventType: string,
  data: any
): Promise<void> => {
  if (!n8nConfig.enabled) return;

  const webhookMap: Record<string, string> = {
    'inventory.lowStock': 'inventory-low-stock',
    'inventory.expiry': 'expiry-alert',
    'sales.newInvoice': 'daily-sales-report',
    'accounts.overdue': 'invoice-followup',
    'hr.newEmployee': 'employee-onboarding',
    'purchase.newPO': 'purchase-approval',
    'logistics.dispatch': 'dispatch-update',
    'compliance.check': 'compliance-check',
    'crm.birthday': 'customer-birthday',
    'hr.performance': 'performance-report'
  };

  const webhookPath = webhookMap[eventType];
  if (webhookPath) {
    await triggerWebhook(webhookPath, {
      event: eventType,
      timestamp: new Date().toISOString(),
      data
    });
  }
};

// ==================== WORKFLOW EXECUTION LOG ====================

export interface WorkflowLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  finishedAt?: string;
  error?: string;
  data?: any;
}

const WORKFLOW_LOG_KEY = 'n8n_workflow_logs';

export const logWorkflowExecution = (log: WorkflowLog): void => {
  const logs = getWorkflowLogs();
  logs.unshift(log);
  // Keep only last 100 logs
  if (logs.length > 100) logs.pop();
  localStorage.setItem(WORKFLOW_LOG_KEY, JSON.stringify(logs));
};

export const getWorkflowLogs = (): WorkflowLog[] => {
  const logs = localStorage.getItem(WORKFLOW_LOG_KEY);
  return logs ? JSON.parse(logs) : [];
};

export const clearWorkflowLogs = (): void => {
  localStorage.removeItem(WORKFLOW_LOG_KEY);
};

export default {
  saveN8nConfig,
  getN8nConfig,
  testN8nConnection,
  fetchWorkflows,
  executeWorkflow,
  toggleWorkflow,
  triggerWebhook,
  getWorkflowTemplates,
  triggerERPWorkflow,
  logWorkflowExecution,
  getWorkflowLogs,
  clearWorkflowLogs
};
