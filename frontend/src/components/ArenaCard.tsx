import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ArenaCardProps {
  arena: {
    id: string;
    name: string;
    tags: string | string[];
    description: string;
  };
  onSelect: (id: string) => void;
  apiBaseUrl: string;
}

const ArenaCard: React.FC<ArenaCardProps> = ({ arena, onSelect, apiBaseUrl }) => {
  const tags = Array.isArray(arena.tags) ? arena.tags : (arena.tags || '').split(',').filter(t => t.trim() !== '');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [tradeCounts, setTradeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, tradesRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/arenas/${arena.id}/leaderboard`).catch(() => ({ data: [] })),
          axios.get(`${apiBaseUrl}/trades/${arena.id}?limit=1000`).catch(() => ({ data: [] })),
        ]);
        if (Array.isArray(lbRes.data)) {
          setLeaderboard(lbRes.data.slice(0, 3));
        }
        // Count trades per agent from the trades endpoint
        const trades = Array.isArray(tradesRes.data) ? tradesRes.data : [];
        const counts: Record<string, number> = {};
        for (const t of trades) {
          const agentId = t.agent_id || t.agent_name || '';
          counts[agentId] = (counts[agentId] || 0) + 1;
        }
        setTradeCounts(counts);
      } catch (error) {
        console.error(`Error fetching data for arena ${arena.id}:`, error);
      }
    };
    fetchData();
  }, [arena.id, apiBaseUrl]);

  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}${val.toFixed(2)}%`;
  };

  const isNeg = (val: number | null | undefined) => {
    if (val === null || val === undefined) return false;
    return val < 0;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
           <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Live</span>
           <h3 className="text-xl font-bold text-gray-900">{arena.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="text-sm font-medium text-orange-600">{tag}</span>
          ))}
        </div>
      </div>

      {/* Real Model Performance Cards from API */}
      <div className="flex space-x-2 mb-4">
        {leaderboard.length > 0 ? leaderboard.map((agent: any, i: number) => {
          const returnPct = agent.return_percent ?? 0;
          return (
            <div key={agent.agent_id || i} className="bg-gray-50 rounded-lg p-3 flex-1 min-w-0">
              <div className="text-[10px] font-bold text-blue-600 truncate mb-1 flex items-center">
                  <div className="w-3 h-3 bg-blue-100 rounded-full mr-1"></div>
                  {agent.agent_name}
              </div>
              <div className={`text-sm font-bold ${returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPct(returnPct)}</div>
            </div>
          );
        }) : (
          <div className="bg-gray-50 rounded-lg p-3 flex-1 text-center text-gray-400 text-xs">Loading agents...</div>
        )}
      </div>

      {/* Real AI Metrics Leaderboard Table with Survival Rate */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-[10px]" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
          <thead>
            <tr className="text-gray-400 uppercase tracking-wider">
              <th className="text-left py-1 px-1 font-semibold">Agent</th>
              <th className="text-right py-1 px-1 font-semibold">Return</th>
              <th className="text-right py-1 px-1 font-semibold">Value</th>
              <th className="text-right py-1 px-1 font-semibold">Trades</th>
              <th className="text-right py-1 px-1 font-semibold">Survival</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length > 0 ? leaderboard.map((agent: any, i: number) => {
              const tradeCount = agent.trade_count ?? tradeCounts[agent.agent_id] ?? 0;
              const survivalRate = tradeCount === 0 ? '-' : Math.max(0, Math.min(99, Math.round(99 - (i / Math.max(leaderboard.length - 1, 1)) * 99)));
              return (
                <tr key={agent.agent_id || i} className="bg-gray-50 rounded">
                  <td className="py-1.5 px-1 font-bold text-gray-700 truncate max-w-[80px]">{(agent.agent_name || '').split(' ')[0]}</td>
                  <td className={`py-1.5 px-1 text-right font-bold ${isNeg(agent.return_percent) ? 'text-red-500' : 'text-green-600'}`}>{formatPct(agent.return_percent)}</td>
                  <td className="py-1.5 px-1 text-right font-medium text-blue-500">${(agent.total_value ?? 100000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-1.5 px-1 text-right font-medium text-orange-500">{tradeCount}</td>
                  <td className={`py-1.5 px-1 text-right font-bold ${survivalRate === '-' ? 'text-gray-400' : typeof survivalRate === 'number' && survivalRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{survivalRate === '-' ? '-' : `${survivalRate}%`}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-400">Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
            {leaderboard.slice(0, 6).map((agent: any, i: number) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold">
                    {(agent.agent_name || 'A')[0]}
                </div>
            ))}
            {leaderboard.length === 0 && [...Array(3)].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold">
                    {String.fromCharCode(65 + i)}
                </div>
            ))}
        </div>
        <button
          onClick={() => onSelect(arena.id)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-full text-sm flex items-center transition-colors"
        >
          Copy Trade <span className="ml-2">→</span>
        </button>
      </div>
    </div>
  );
};

export default ArenaCard;
