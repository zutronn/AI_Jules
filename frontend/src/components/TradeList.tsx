import { useState } from 'react';
import { PieChart, List, ChevronDown } from 'lucide-react';

const SYMBOL_COLORS: Record<string, string> = {
  BTC: 'bg-orange-500', ETH: 'bg-blue-600', SOL: 'bg-purple-500',
  DULL: 'bg-blue-600', GDX: 'bg-orange-500', SIL: 'bg-green-500',
  TSLA: 'bg-red-500', NVDA: 'bg-green-600', AMD: 'bg-red-600',
  AMZN: 'bg-yellow-500', META: 'bg-blue-500', NFLX: 'bg-red-500',
};

const AGENT_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500'];

const TradeList = ({ trades, portfolio, allAgentPortfolios = [] }: { trades: any[]; portfolio: any; allAgentPortfolios?: any[] }) => {
  const [activeTab, setActiveTab] = useState<'Portfolio' | 'Orders'>('Portfolio');
  const [selectedAgentIdx, setSelectedAgentIdx] = useState<number>(-1); // -1 = All Combined
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Build the active portfolio based on selected agent
  const getActivePortfolio = () => {
    if (selectedAgentIdx === -1 || allAgentPortfolios.length === 0) {
      return portfolio;
    }
    const agentP = allAgentPortfolios[selectedAgentIdx];
    if (!agentP) return portfolio;
    const positions = (agentP.holdings || []).map((h: any) => ({
      symbol: h.symbol,
      market_value: h.current_value || 0,
      unrealized_pnl: h.pnl || 0,
    }));
    return {
      positions,
      total_assets: agentP.total_value || 0,
      total_pnl: (agentP.total_value || 0) - 100000,
      cash: agentP.cash || 0,
      return_percent: agentP.return_percent || 0,
    };
  };

  const activePortfolio = getActivePortfolio();
  const positions = activePortfolio?.positions ?? [];
  const totalAssets = activePortfolio?.total_assets ?? 0;
  const totalPnl = activePortfolio?.total_pnl ?? 0;

  const selectedLabel = selectedAgentIdx === -1
    ? 'All Combined'
    : (allAgentPortfolios[selectedAgentIdx]?.agent_name || `Agent ${selectedAgentIdx + 1}`);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('Portfolio')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'Portfolio' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Portfolio
        </button>
        <button
          onClick={() => setActiveTab('Orders')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'Orders' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Orders
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'Portfolio' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-orange-600">
                <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center text-white">
                  <PieChart className="w-3 h-3" />
                </div>
                <span className="text-xs font-black">Live Portfolio</span>
              </div>
            </div>

            {/* Agent Switcher Dropdown */}
            {allAgentPortfolios.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {selectedAgentIdx === -1 ? (
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">A</div>
                    ) : (
                      <div className={`w-6 h-6 ${AGENT_COLORS[selectedAgentIdx % AGENT_COLORS.length]} rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>
                        {(allAgentPortfolios[selectedAgentIdx]?.agent_name || 'A')[0]}
                      </div>
                    )}
                    <span>{selectedLabel}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedAgentIdx(-1); setDropdownOpen(false); }}
                      className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors ${selectedAgentIdx === -1 ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                    >
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">A</div>
                      <span>All Combined</span>
                    </button>
                    {allAgentPortfolios.map((agentP: any, idx: number) => {
                      const returnPct = agentP.return_percent || 0;
                      const isPositive = returnPct >= 0;
                      return (
                        <button
                          key={agentP.agent_id || idx}
                          onClick={() => { setSelectedAgentIdx(idx); setDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedAgentIdx === idx ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 ${AGENT_COLORS[idx % AGENT_COLORS.length]} rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>
                              {(agentP.agent_name || 'A')[0]}
                            </div>
                            <span className="font-bold">{agentP.agent_name}</span>
                          </div>
                          <span className={`text-xs font-black ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{returnPct.toFixed(1)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assets</p>
                <p className="text-sm font-black text-gray-900">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total P&L</p>
                <p className={`text-sm font-black ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Show cash balance when viewing individual agent */}
            {selectedAgentIdx !== -1 && activePortfolio?.cash !== undefined && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Cash Balance</p>
                <p className="text-sm font-black text-orange-700">${(activePortfolio.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}

            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                <PieChart className="w-8 h-8 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">No positions yet</p>
                <p className="text-[10px] text-gray-300">Trades will appear here once agents start executing</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                    <th className="pb-4">symbol</th>
                    <th className="pb-4">asset</th>
                    <th className="pb-4">asset%</th>
                    <th className="pb-4 text-right">p&l</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos: any, i: number) => {
                    const assetPct = totalAssets > 0 ? ((pos.market_value / totalAssets) * 100).toFixed(1) : '0.0';
                    const pnl = pos.unrealized_pnl;
                    const pnlStr = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const color = SYMBOL_COLORS[pos.symbol] || 'bg-gray-500';
                    return (
                      <tr key={i} className="text-xs font-bold">
                        <td className="py-2 flex items-center space-x-2">
                           <div className={`w-5 h-5 ${color} rounded flex items-center justify-center text-white text-[8px]`}>{pos.symbol[0]}</div>
                           <span>{pos.symbol}</span>
                        </td>
                        <td className="py-2 text-gray-600">${pos.market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 text-gray-400">{assetPct}%</td>
                        <td className={`py-2 text-right ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{pnlStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                  <List className="w-8 h-8 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No orders yet</p>
                </div>
            ) : (
                trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${trade.side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {trade.side[0]}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-xs">{trade.symbol}</p>
                            <p className="text-[10px] text-gray-400">{(() => { const ts = trade.timestamp || trade.created_at; if (!ts) return ''; const d = new Date(typeof ts === 'string' && !ts.includes('T') ? ts.replace(' ', 'T') + 'Z' : ts); return isNaN(d.getTime()) ? ts : d.toLocaleTimeString(); })()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-xs text-gray-900">${trade.price.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{trade.amount} shares</p>
                    </div>
                </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeList;
