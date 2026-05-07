const fs = require('fs');
const path = require('path');

// __dirname is scratch, so we go up one directory
const ROOT = path.join(__dirname, '..');

function removeAIFromDashboard() {
    const file = path.join(ROOT, 'components', 'Dashboard.tsx');
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove import
    content = content.replace(/import \{ generateSmartInsights \} from '\.\.\/services\/geminiService';\n?/, '');
    
    // Remove state and handleAskAI
    content = content.replace(/\/\/ --- 2\. AI ASSISTANT STATE ---\s*const \[insightQuery.*?setLoadingInsight\(false\);\n\s*};\n/s, '');
    
    // Remove AI widget
    // We'll replace the widget entirely with a placeholder or just remove the HTML
    content = content.replace(/\{\/\* 2\. AI INTELLIGENCE WIDGET \*\/\}.*?\{\/\* 3\. RECENT ACTIVITY WIDGET \*\/\}/s, '{/* 3. RECENT ACTIVITY WIDGET */}');
    
    // Change col-span for Recent activity since we removed the left widget
    content = content.replace(/<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">/g, '<div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">');
    
    fs.writeFileSync(file, content);
    console.log('Cleaned Dashboard.tsx');
}

function removeAITabFromApp() {
    const file = path.join(ROOT, 'App.tsx');
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    content = content.replace(/import \{ GenAISidebar \} from '\.\/components\/GenAISidebar';\n?/, '');
    content = content.replace(/<GenAISidebar \/>\n?/, '');
    
    fs.writeFileSync(file, content);
    console.log('Cleaned App.tsx');
}

function removeAIFromAccounts(filename) {
    const p = path.join(ROOT, filename);
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf-8');
    content = content.replace(/import \{ AIReports \} from '\.\/AIReports';\n?/, '');
    content = content.replace(/case 'AI_REPORTS': return <AIReports \/>;\n?/, '');
    fs.writeFileSync(p, content);
    console.log('Cleaned', filename);
}

function removeAIFromAnalytics() {
    const file = path.join(ROOT, 'server', 'routes', 'analytics.js');
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    
    content = content.replace(/\/\/ AI Chat Integration[\s\S]*?\}\);\n/s, '');
    
    fs.writeFileSync(file, content);
    console.log('Cleaned analytics.js');
}

removeAIFromDashboard();
removeAITabFromApp();
removeAIFromAccounts('components/Accounts.tsx');
removeAIFromAccounts('components/StrategicAccounts.tsx');
removeAIFromAnalytics();
