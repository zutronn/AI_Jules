import { ChevronLeft, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';

function formatLogTimestamp(ts: string | undefined): string {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function extractDecision(text: string): { action: string; symbol: string; tag: string; color: string; bgColor: string; icon: 'up' | 'down' | 'hold' } | null {
  const match = text.match(/^\[(BUY|SELL|HOLD)\s*([A-Z]*)\]/i);
  if (!match) return null;
  const action = match[1].toUpperCase();
  const symbol = match[2] || '';
  if (action === 'BUY') return { action, symbol, tag: symbol ? `BUY ${symbol}` : 'BUY', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: 'up' };
  if (action === 'SELL') return { action, symbol, tag: symbol ? `SELL ${symbol}` : 'SELL', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: 'down' };
  return { action, symbol, tag: 'HOLD', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200', icon: 'hold' };
}

/** Try to extract quantity from log text like "x{qty}" or "shares" patterns */
function extractQuantity(text: string): string | null {
  // Match patterns like "buy 200 shares", "sell 1550.37 shares", "purchasing 2400 shares"
  const qtyMatch = text.match(/(?:buy|sell|purchase|bought|sold|buying|selling|purchasing|adding)\s+(\d+(?:\.\d+)?)\s+(?:shares|more shares)/i);
  if (qtyMatch) return qtyMatch[1];
  // Match "x{qty}" pattern from trade logs
  const xMatch = text.match(/x(\d+(?:\.\d+)?)/);
  if (xMatch) return xMatch[1];
  return null;
}

interface FullLogsPageProps {
  logs: any[];
  arenaName: string;
  onBack: () => void;
}

const FullLogsPage = ({ logs, arenaName, onBack }: FullLogsPageProps) => {
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  const agents = useMemo(() => {
    const names = new Set<string>();
    logs.forEach(log => { if (log.agent_name) names.add(log.agent_name); });
    return Array.from(names).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const text = log.response || log.message || '';
      const decision = extractDecision(text);
      if (filterAgent !== 'all' && log.agent_name !== filterAgent) return false;
      if (filterAction !== 'all') {
        if (!decision) return false;
        if (decision.action !== filterAction) return false;
      }
      return true;
    });
  }, [logs, filterAgent, filterAction]);

  // Stats
  const stats = useMemo(() => {
    let buys = 0, sells = 0, holds = 0;
    logs.forEach(log => {
      const text = log.response || log.message || '';
      const decision = extractDecision(text);
      if (decision?.action === 'BUY') buys++;
      else if (decision?.action === 'SELL') sells++;
      else if (decision?.action === 'HOLD') holds++;
    });
    return { buys, sells, holds, total: logs.length };
  }, [logs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={onBack} className="flex items-center text-sm text-orange-600 hover:text-orange-800 font-bold mb-3 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to {arenaName}
          </button>
          <h1 className="text-2xl font-black text-gray-900">AI Agent Decision Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Full trading decisions and reasoning for <span className="text-orange-600 font-bold">{arenaName}</span></p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Logs</p>
            <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-2xl border border-green-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Buy Decisions</p>
            <p className="text-2xl font-black text-green-700">{stats.buys}</p>
          </div>
          <div className="bg-red-50 rounded-2xl border border-red-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Sell Decisions</p>
            <p className="text-2xl font-black text-red-700">{stats.sells}</p>
          </div>
          <div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Hold Decisions</p>
            <p className="text-2xl font-black text-yellow-700">{stats.holds}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6 flex items-center space-x-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Agent:</label>
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200">
              <option value="all">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Decision:</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200">
              <option value="all">All</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
              <option value="HOLD">Hold</option>
            </select>
          </div>
          <span className="text-xs text-gray-400 font-bold ml-auto">{filteredLogs.length} results</span>
        </div>

        {/* Log Entries */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <p className="text-gray-400 font-bold text-sm">No logs match your filters</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const text = log.response || log.message || '';
              const decision = extractDecision(text);
              const quantity = extractQuantity(text);
              const DecisionIcon = decision?.icon === 'up' ? TrendingUp : decision?.icon === 'down' ? TrendingDown : Minus;

              return (
                <div key={log.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${decision ? decision.bgColor : 'border-gray-100'}`}>
                  {/* Log Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                        {log.agent_name?.[0] || '?'}
                      </div>
                      <span className="font-black text-sm text-gray-900">{log.agent_name}</span>
                      {decision && (
                        <div className="flex items-center space-x-1.5">
                          <DecisionIcon className={`w-4 h-4 ${decision.color}`} />
                          <span className={`text-xs font-black ${decision.color} uppercase`}>{decision.tag}</span>
                          {quantity && (
                            <span className="text-xs font-bold text-gray-500">x{quantity} shares</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {formatLogTimestamp(log.timestamp || log.created_at)}
                    </span>
                  </div>
                  {/* Log Body */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">{text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FullLogsPage;
