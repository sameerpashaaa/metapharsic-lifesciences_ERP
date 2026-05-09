import React, { useState } from 'react';
import { Search, FileText, Download, ChevronRight, Calculator, Printer } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { printReport, exportGSTReport } from '../utils/accountingExport';

export const GstReports: React.FC = () => {
  const [reportType, setReportType] = useState<'GSTR-1' | 'GSTR-2' | 'GSTR-3B'>('GSTR-3B');
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const { company } = useCompany();

  // Mock GSTR-3B Summary Data
  const gstr3bRows = [
    { id: '3.1.a', desc: 'Outward taxable supplies (other than zero rated, nil rated and exempted)', igst: 14500, cgst: 12500, sgst: 12500, cess: 0 },
    { id: '3.1.b', desc: 'Outward taxable supplies (zero rated)', igst: 0, cgst: 0, sgst: 0, cess: 0 },
    { id: '3.1.c', desc: 'Other outward supplies (Nil rated, exempted)', igst: 0, cgst: 0, sgst: 0, cess: 0 },
    { id: '3.1.d', desc: 'Inward supplies (liable to reverse charge)', igst: 1200, cgst: 0, sgst: 0, cess: 0 },
    { id: '4.A.5', desc: 'All other ITC (Input Tax Credit)', igst: 5000, cgst: 4200, sgst: 4200, cess: 0 },
  ];

  // Mock Drill Down Data (Vouchers for 3.1.a)
  const vouchers = [
    { no: 'SAL-001', date: '01-Apr-2025', party: 'Apollo Hospitals', gstin: '07AAAAA0000A1Z5', val: 50000, igst: 0, cgst: 4500, sgst: 4500 },
    { no: 'SAL-002', date: '05-Apr-2025', party: 'Max Pharma', gstin: '27BBBBB0000B1Z5', val: 80555, igst: 14500, cgst: 0, sgst: 0 },
    { no: 'SAL-003', date: '10-Apr-2025', party: 'Local Chemist', gstin: '07CCCCC0000C1Z5', val: 88888, igst: 0, cgst: 8000, sgst: 8000 },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden">
       {/* Header */}
       <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">GST Compliance Reports</h3>
            <p className="text-xs text-slate-500 font-medium">Auto-generated GSTR-1, GSTR-2A/2B Recon, and GSTR-3B</p>
          </div>
          <div className="flex gap-2">
            <select className="border border-slate-300 rounded px-3 py-1.5 text-sm font-bold bg-white text-slate-700 outline-none shadow-sm mr-2">
                <option>April 2025</option>
                <option>March 2025</option>
            </select>
            <button 
              onClick={() => {
                const rows = gstr3bRows.map(r => `<tr><td>${r.id}</td><td>${r.desc}</td><td class="text-right">${r.igst}</td><td class="text-right">${r.cgst}</td><td class="text-right">${r.sgst}</td></tr>`).join('');
                printReport(`GST Report - ${reportType}`, `<table><thead><tr><th>Sec</th><th>Description</th><th class="text-right">IGST</th><th class="text-right">CGST</th><th class="text-right">SGST</th></tr></thead><tbody>${rows}</tbody></table>`, company);
              }}
              className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-sm font-bold shadow-sm"
            >
              <Printer size={16} /> Print
            </button>
            <button 
              onClick={() => {
                const data = vouchers.map(v => ({ partyGstin: v.gstin, partyName: v.party, invoiceNo: v.no, invoiceDate: v.date, taxableValue: v.val, igst: v.igst, cgst: v.cgst, sgst: v.sgst, totalTax: v.igst+v.cgst+v.sgst }));
                exportGSTReport(reportType === 'GSTR-1' ? 'GSTR1' : 'GSTR3B', data, 'April 2025', company);
              }}
              className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-[#1D3557] px-3 py-1.5 rounded text-sm font-bold shadow-sm transition-colors"
            >
              <Download size={16} /> Excel Export
            </button>
          </div>
       </div>

       {/* Toolbar */}
       <div className="flex bg-[#1D3557] text-white shrink-0">
          <button onClick={() => { setReportType('GSTR-1'); setDrillDown(null); }} className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider ${reportType === 'GSTR-1' ? 'bg-white text-[#1D3557]' : 'hover:bg-white/10'}`}>GSTR-1 (Outward)</button>
          <button onClick={() => { setReportType('GSTR-2'); setDrillDown(null); }} className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider ${reportType === 'GSTR-2' ? 'bg-white text-[#1D3557]' : 'hover:bg-white/10'}`}>GSTR-2A/2B (Recon)</button>
          <button onClick={() => { setReportType('GSTR-3B'); setDrillDown(null); }} className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider ${reportType === 'GSTR-3B' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>GSTR-3B (Summary)</button>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 overflow-auto bg-slate-100 p-4">
          
          {/* Main Return Form (GSTR-3B style) */}
          {!drillDown && (
              <div className="bg-white border border-slate-200 shadow-sm max-w-5xl mx-auto">
                 <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h4 className="font-black text-[#1D3557] flex items-center gap-2"><FileText size={18}/> Form {reportType}</h4>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border">Tax Period: April 2025</span>
                 </div>
                 
                 <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-[#E4ECEF] border-b text-xs text-slate-700">
                        <tr>
                           <th className="p-3 font-black border-r border-slate-300">Nature of Supplies / Details</th>
                           <th className="p-3 font-black border-r border-slate-300 text-right w-32">Integrated Tax (₹)</th>
                           <th className="p-3 font-black border-r border-slate-300 text-right w-32">Central Tax (₹)</th>
                           <th className="p-3 font-black border-r border-slate-300 text-right w-32">State/UT Tax (₹)</th>
                           <th className="p-3 font-black text-right w-32">Cess (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {gstr3bRows.map(r => (
                           <tr key={r.id} className="hover:bg-blue-50/50 cursor-pointer group" onClick={() => setDrillDown(r.id)}>
                              <td className="p-3 border-r border-slate-200">
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 w-10">{r.id}</span>
                                    <span className="font-semibold text-[#1D3557] group-hover:underline">{r.desc}</span>
                                 </div>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-right font-black text-slate-700">{r.igst > 0 ? r.igst.toLocaleString() : '-'}</td>
                              <td className="p-3 border-r border-slate-200 text-right font-black text-slate-700">{r.cgst > 0 ? r.cgst.toLocaleString() : '-'}</td>
                              <td className="p-3 border-r border-slate-200 text-right font-black text-slate-700">{r.sgst > 0 ? r.sgst.toLocaleString() : '-'}</td>
                              <td className="p-3 text-right font-black text-slate-700">{r.cess > 0 ? r.cess.toLocaleString() : '-'}</td>
                           </tr>
                        ))}
                    </tbody>
                 </table>

                 <div className="bg-green-50 p-4 border-t flex justify-between items-center text-green-800">
                    <div className="flex items-center gap-2 text-sm font-bold"><Calculator size={16}/> Auto-calculated from vouchers</div>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm">Mark as Return Ready</button>
                 </div>
              </div>
          )}

          {/* Drill Down View (Voucher Level) */}
          {drillDown && (
              <div className="bg-white border text-sm border-slate-200 shadow-sm flex flex-col h-full">
                 <div className="p-3 border-b border-slate-200 bg-[#E4ECEF] flex items-center gap-2 text-[#1D3557]">
                    <button onClick={() => setDrillDown(null)} className="font-bold hover:underline cursor-pointer">{reportType}</button>
                    <ChevronRight size={16}/>
                    <span className="font-black">Details for row {drillDown}</span>
                 </div>
                 
                 <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse text-sm">
                       <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm text-xs text-slate-600 uppercase">
                           <tr>
                              <th className="p-3 font-black border-r border-slate-200">Date</th>
                              <th className="p-3 font-black border-r border-slate-200">Voucher No</th>
                              <th className="p-3 font-black border-r border-slate-200">Party / GSTIN</th>
                              <th className="p-3 font-black border-r border-slate-200 text-right">Taxable Val</th>
                              <th className="p-3 font-black border-r border-slate-200 text-right">IGST</th>
                              <th className="p-3 font-black border-r border-slate-200 text-right">CGST</th>
                              <th className="p-3 font-black text-right">SGST</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {vouchers.map(v => (
                              <tr key={v.no} className="hover:bg-blue-50/50 cursor-pointer">
                                 <td className="p-3 border-r border-slate-100">{v.date}</td>
                                 <td className="p-3 border-r border-slate-100 font-bold text-red-600 underline">{v.no}</td>
                                 <td className="p-3 border-r border-slate-100">
                                    <div className="font-bold text-[#1D3557]">{v.party}</div>
                                    <div className="text-[10px] text-slate-500">{v.gstin}</div>
                                 </td>
                                 <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-800">₹ {v.val.toLocaleString()}</td>
                                 <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-800">{v.igst > 0 ? v.igst.toLocaleString() : '-'}</td>
                                 <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-800">{v.cgst > 0 ? v.cgst.toLocaleString() : '-'}</td>
                                 <td className="p-3 text-right font-bold text-slate-800">{v.sgst > 0 ? v.sgst.toLocaleString() : '-'}</td>
                              </tr>
                           ))}
                       </tbody>
                    </table>
                 </div>
              </div>
          )}

       </div>
    </div>
  );
};
