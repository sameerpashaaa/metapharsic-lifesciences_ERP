
import fs from 'fs';

const filePath = 'components/StrategicAccounts.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The file has duplication and clutter around line 1030+.
// I'll define exactly what should be after "Selected party Choose..."

const correctEndPart = `
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <User size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a Party</p>
                <p className="text-sm">Choose a party from the list to view their ledger</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AGING ANALYSIS TAB */}
      {activeTab === 'AGING' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
            Outstanding Aging Analysis
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="p-4">Party Name</th>
                  <th className="p-4 text-right">Total Due</th>
                  <th className="p-4 text-right text-green-600">0-30 Days</th>
                  <th className="p-4 text-right text-orange-600">31-60 Days</th>
                  <th className="p-4 text-right text-red-600">61-90 Days</th>
                  <th className="p-4 text-right text-purple-600">90+ Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAging ? (
                  <tr><td colSpan={6} className="p-8 text-center">Loading aging analysis...</td></tr>
                ) : agingData.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No outstanding balances found.</td></tr>
                ) : agingData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{item.name}</td>
                    <td className="p-4 text-right font-bold">₹{parseFloat(item.currentBalance).toLocaleString()}</td>
                    <td className="p-4 text-right text-green-600">₹{parseFloat(item.bucket030).toLocaleString()}</td>
                    <td className="p-4 text-right text-orange-600">₹{parseFloat(item.bucket3160).toLocaleString()}</td>
                    <td className="p-4 text-right text-red-600">₹{parseFloat(item.bucket6190).toLocaleString()}</td>
                    <td className="p-4 text-right text-purple-600 font-bold">₹{parseFloat(item.bucket90Plus).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'GST' && (`;

// Find where the transition happens
const searchPattern = /<User size={48} className="mb-4 opacity-20" \/>[\\s\\S]*?{activeTab === 'GST' && \(/;

content = content.replace(searchPattern, correctEndPart);

fs.writeFileSync(filePath, content);
console.log('Final restoration complete.');
