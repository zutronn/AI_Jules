import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Info, Target, FileText, Send, Share2, Globe, Settings } from 'lucide-react';
import TradeList from './components/TradeList';
import AILogs from './components/AILogs';
import ArenaCard from './components/ArenaCard';
import Hero from './components/Hero';
import ArenaForm from './components/ArenaForm';
import AdminPage from './components/AdminPage';
import ManualTradePage from './components/ManualTradePage';
import RegisterPage from './components/RegisterPage';
import FullLogsPage from './components/FullLogsPage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function App() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<string | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [view, setView] = useState<'home' | 'detail' | 'admin' | 'manual-trade' | 'register' | 'full-logs'>('home');
  const [aiStatus, setAiStatus] = useState<any>(null);

  const fetchArenas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/arenas`);
      if (Array.isArray(res.data)) {
        setArenas(res.data);
      } else {
        console.warn('Arenas response is not an array:', typeof res.data);
        setArenas([]);
      }
    } catch (error) {
      console.error('Error fetching arenas:', error);
      setArenas([]);
    }
  };

  const fetchAiStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/ai/status`);
      if (res.data) setAiStatus(res.data);
    } catch (error) {
      console.error('Error fetching AI status:', error);
    }
  };

  const fetchDetailData = async () => {
    if (selectedArenaId === null) return;
    try {
      const [tradesRes, logsRes, leaderboardRes, historyRes, portfolioAllRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/trades/${selectedArenaId}?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/agents/logs/${selectedArenaId}?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/arenas/${selectedArenaId}/leaderboard`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/portfolio/history/${selectedArenaId}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/portfolio/all/${selectedArenaId}`).catch(() => ({ data: [] })),
      ]);
      setTrades(Array.isArray(tradesRes.data) ? tradesRes.data : []);
      setAiLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
      setPortfolioHistory(Array.isArray(historyRes.data) ? historyRes.data : []);

      // Aggregate portfolio data from all agents for the TradeList sidebar
      const allPortfolios = Array.isArray(portfolioAllRes.data) ? portfolioAllRes.data : [];
      if (allPortfolios.length > 0) {
        const allPositions: any[] = [];
        let totalAssets = 0;
        let totalPnl = 0;
        for (const agentPortfolio of allPortfolios) {
          totalAssets += agentPortfolio.total_value || 0;
          totalPnl += (agentPortfolio.total_value || 0) - 100000; // return vs initial $100k
          for (const h of (agentPortfolio.holdings || [])) {
            const existing = allPositions.find(p => p.symbol === h.symbol);
            if (existing) {
              existing.market_value += h.current_value || 0;
              existing.unrealized_pnl += h.pnl || 0;
            } else {
              allPositions.push({
                symbol: h.symbol,
                market_value: h.current_value || 0,
                unrealized_pnl: h.pnl || 0,
              });
            }
          }
        }
        setPortfolio({ positions: allPositions, total_assets: totalAssets, total_pnl: totalPnl });
      } else {
        setPortfolio(null);
      }
    } catch (error) {
      console.error('Error fetching detail data:', error);
    }
  };

  useEffect(() => {
    fetchArenas();
    fetchAiStatus();
    const interval = setInterval(fetchAiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedArenaId !== null) {
      fetchDetailData();
      const interval = setInterval(fetchDetailData, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedArenaId]);

  const handleSelectArena = (id: string) => {
    setSelectedArenaId(id);
    setView('detail');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedArenaId(null);
    setTrades([]);
    setAiLogs([]);
    setLeaderboard([]);
    setPortfolioHistory([]);
    setPortfolio(null);
  };

  const handleOpenAdmin = () => {
    setView('admin');
  };

  const handleOpenManualTrade = () => {
    setView('manual-trade');
  };

  const handleOpenRegister = () => {
    setView('register');
  };

  const handleOpenFullLogs = () => {
    setView('full-logs');
  };

  const handleBackToDetail = () => {
    setView('detail');
  };

  const selectedArena = Array.isArray(arenas) ? arenas.find(a => a.id === selectedArenaId) : undefined;

  const agents = aiStatus?.agents || [];
  const totalAgents = aiStatus?.total_agents || 0;
  const connectedCount = aiStatus?.connected_count || 0;

  const getLastLogDate = (agent: any) => {
    if (!agent.last_response_time) return null;
    return new Date(agent.last_response_time);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const dateFormatted = d.toISOString().split('T')[0];
    return isToday(d) ? `${dateFormatted} today` : dateFormatted;
  };

  const getAgentHealth = (agent: any) => {
    if (!agent.connected) return 'DOWN';
    const lastLog = getLastLogDate(agent);
    if (lastLog && isToday(lastLog)) return 'HEALTHY';
    return 'DEGRADED';
  };

  const loggingTodayCount = agents.filter((a: any) => {
    const lastLog = getLastLogDate(a);
    return lastLog && isToday(lastLog);
  }).length;

  const tradingTodayCount = agents.filter((a: any) => {
    return a.connected && getLastLogDate(a) && isToday(getLastLogDate(a));
  }).length;

  const alertsCount = agents.filter((a: any) => getAgentHealth(a) === 'DOWN').length;

  const agentProfileLinks: Record<string, string> = {
    chatgpt: '/agents/chatgpt/index.html',
    perplexity: '/agents/perplexity/index.html',
    grok: '/agents/grok/index.html',
    deepseek: '/agents/deepseek/index.html',
    minimax: '/agents/minimax/index.html',
  };

  const agentModels: Record<string, string> = {
    chatgpt: 'GPT-4o',
    perplexity: 'Sonar Pro',
    grok: 'Grok 3',
    deepseek: 'DeepSeek V3',
    minimax: 'MiniMax M2',
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleBackToHome}>
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="text-xl font-bold tracking-tight text-orange-900">Lawliet <span className="text-orange-600 font-normal ml-2">Studios</span></span>
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium text-gray-500">
          <span className="flex items-center cursor-pointer"> <Globe className="w-4 h-4 mr-1" /> EN ▾</span>
          <span className="cursor-pointer hover:text-orange-600">About Lawliet ↗</span>
          <span className="cursor-pointer hover:text-orange-600">About Studios ↗</span>
          <button className="bg-orange-600 text-white px-6 py-2 rounded-full font-bold flex items-center shadow-lg shadow-orange-100 transition-all hover:bg-orange-700">
            Share <Share2 className="w-4 h-4 ml-2" />
          </button>
          <a href="/tokens/index.html" className="flex items-center cursor-pointer hover:text-orange-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1" fill="none"/><text x="10" y="14" textAnchor="middle" fontSize="10" fill="currentColor">$</text></svg>
            AI Tokens
          </a>
          <span onClick={handleOpenAdmin} className="flex items-center cursor-pointer hover:text-orange-600">
            <Settings className="w-4 h-4 mr-1" />
            Admin
          </span>
          <a href="/polymarket/index.html" className="flex items-center cursor-pointer hover:text-orange-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1" fill="none"/><text x="10" y="14" textAnchor="middle" fontSize="10" fill="currentColor">P</text></svg>
            Polymarket
          </a>
        </div>
      </nav>

      {view === 'admin' ? (
        <AdminPage onBack={handleBackToHome} />
      ) : view === 'manual-trade' && selectedArenaId ? (
        <ManualTradePage arenaId={selectedArenaId} arenaName={selectedArena?.name || 'Arena'} onBack={() => setView('detail')} />
      ) : view === 'register' ? (
        <RegisterPage arenaId={selectedArenaId || undefined} arenaName={selectedArena?.name} onBack={() => selectedArenaId ? setView('detail') : setView('home')} />
      ) : view === 'full-logs' ? (
        <FullLogsPage logs={aiLogs} arenaName={selectedArena?.name || 'Arena'} onBack={handleBackToDetail} />
      ) : view === 'home' ? (
        <main className="max-w-7xl mx-auto px-8 py-12">
          <Hero />

          {/* AI Agent Health Monitor - Real data from /api/ai/status */}
          <div className="bg-gray-900 rounded-2xl p-8 mb-12 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  AI Agent Health Monitor
                </h3>
                <p className="text-gray-400 text-sm mt-1">A working AI = Connected + Daily Analysis Logs + Daily Trades</p>
              </div>
              <div className="text-gray-400 text-sm">
                Last check: {new Date().toISOString().split('T')[0]} &middot; Auto-refresh 30s
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">{totalAgents}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Agents</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">{connectedCount}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Connected</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">{loggingTodayCount}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Logging Today</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-400">{tradingTodayCount}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Trading Today</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{alertsCount}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Alerts</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-2">Agent</th>
                  <th className="text-center py-2">Connected</th>
                  <th className="text-center py-2">Analysis Log</th>
                  <th className="text-center py-2">Last Log</th>
                  <th className="text-center py-2">Trading</th>
                  <th className="text-center py-2">Last Trade</th>
                  <th className="text-center py-2">Overall Health</th>
                </tr>
              </thead>
              <tbody>
                {agents.length > 0 ? agents.map((agent: any) => {
                  const health = getAgentHealth(agent);
                  const profileLink = agentProfileLinks[agent.agent_id];
                  const model = agentModels[agent.agent_id] || 'AI Model';
                  return (
                    <tr key={agent.agent_id} className="border-t border-gray-800">
                      <td className="py-3">
                        {profileLink ? (
                          <a href={profileLink} className="hover:text-orange-400">
                            <div className="font-bold">{agent.agent_name} <span className="text-orange-500 text-xs">↗ Profile</span></div>
                            <div className="text-gray-400 text-xs">{model} &middot; Stock Trading</div>
                          </a>
                        ) : (
                          <div>
                            <div className="font-bold">{agent.agent_name}</div>
                            <div className="text-gray-400 text-xs">{model} &middot; Stock Trading</div>
                          </div>
                        )}
                      </td>
                      <td className="text-center py-3">{agent.connected ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                      <td className="text-center py-3">{agent.last_response_time ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                      <td className="text-center py-3 text-teal-400 text-xs">{formatDate(agent.last_response_time)}</td>
                      <td className="text-center py-3">{agent.connected ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                      <td className="text-center py-3 text-teal-400 text-xs">{formatDate(agent.last_response_time)}</td>
                      <td className="text-center py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          health === 'HEALTHY' ? 'bg-green-900/50 text-green-400' :
                          health === 'DEGRADED' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {health === 'HEALTHY' ? '● HEALTHY' : health === 'DEGRADED' ? '● DEGRADED' : '● DOWN'}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">Loading AI agent status...</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center space-x-6 mt-4 text-xs text-gray-500">
              <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Healthy</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span> Degraded (logging but not trading)</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span> Down (disconnected)</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">Expected: Connected + Log daily + Trade daily</p>
          </div>

          <div className="flex items-center justify-between mb-12">
            <div>
                <h2 className="text-6xl font-black text-orange-700 mb-4">All Arenas</h2>
                <p className="text-xl text-gray-500 font-medium">Browse live AI tradings by theme & strategy. Jump in and copy-trade whoever's winning.</p>
            </div>
            <div className="flex flex-col items-end">
                 <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-xs font-bold mb-4 flex items-center border border-orange-100">
                    <span className="w-2 h-2 bg-orange-600 rounded-full mr-2 animate-pulse"></span>
                    44h til Market Open
                </div>
                <ArenaForm onCreated={fetchArenas} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {Array.isArray(arenas) && arenas.length > 0 ? arenas.map(arena => (
              <ArenaCard key={arena.id} arena={arena} onSelect={handleSelectArena} apiBaseUrl={API_BASE_URL} />
            )) : (
              <div className="col-span-2 text-center py-20 text-gray-400">
                <p className="text-lg font-bold">Connecting to trading backend...</p>
                <p className="text-sm mt-2">Arenas will appear once the backend is available.</p>
              </div>
            )}
          </div>
        </main>
      ) : (
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Sidebar */}
          <aside className="w-64 border-r border-gray-100 p-6 flex flex-col space-y-8 overflow-y-auto">
            <button
              onClick={handleBackToHome}
              className="text-gray-500 font-bold flex items-center text-sm hover:text-orange-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Trading Hub
            </button>

            {selectedArena && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-black text-orange-700 leading-tight mb-2">{selectedArena.name}</h1>
                  <Info className="w-4 h-4 text-gray-300 cursor-pointer" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Target className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">Tickers <Info className="w-3 h-3 ml-1" /></p>
                      <p className="text-sm font-bold text-gray-700">{Array.isArray(selectedArena.tickers) ? selectedArena.tickers.join(', ') : selectedArena.tickers}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">Rule <Info className="w-3 h-3 ml-1" /></p>
                      <p className="text-sm font-bold text-gray-700">{selectedArena.rules || "Live Trading Cup"}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Send className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">Prompt <Info className="w-3 h-3 ml-1" /></p>
                      <p className="text-sm font-bold text-gray-700 line-clamp-3">{selectedArena.prompt || "Autonomous strategies based on market momentum."}</p>
                    </div>
                  </div>
                </div>

                {/* Manual Trade & Register Buttons */}
                <div className="space-y-2 mt-6">
                  <button
                    onClick={handleOpenManualTrade}
                    className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
                  >
                    Manual Trade
                  </button>
                  <button
                    onClick={handleOpenRegister}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                  >
                    Copy Trading →
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Top Row: AI Models Leaderboard and Model Chats */}
              <div className="grid grid-cols-12 gap-8">
                {/* Real Agent Leaderboard */}
                <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-4">Agent Leaderboard</h3>
                  <div className="space-y-4">
                    {leaderboard.length > 0 ? leaderboard.map((agent: any, i: number) => {
                      const returnPct = agent.return_percent ?? 0;
                      const isPositive = returnPct >= 0;
                      const tradeCount = agent.trade_count ?? 0;
                      const survivalRate = tradeCount === 0 ? '-' : Math.max(0, Math.min(99, Math.round(99 - (i / Math.max(leaderboard.length - 1, 1)) * 99)));
                      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-pink-500'];
                      return (
                        <div key={agent.agent_id || i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${colors[i % colors.length]} rounded-full flex items-center justify-center text-white font-bold`}>
                              {(agent.agent_name || 'A')[0]}
                            </div>
                            <div>
                              <p className="font-bold text-blue-600 text-sm">{agent.agent_name}</p>
                              <p className={`text-xs font-black ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                              </p>
                              <p className="text-[10px] text-gray-400">
                                ${(agent.total_value ?? 100000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="ml-2">Survival: <span className={`font-bold ${survivalRate === '-' ? 'text-gray-400' : typeof survivalRate === 'number' && survivalRate >= 50 ? 'text-green-500' : 'text-red-400'}`}>{survivalRate === '-' ? '-' : `${survivalRate}%`}</span></span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                            <button onClick={handleOpenRegister} className="bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-orange-100">
                              Copy Trading →
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm font-bold">Loading leaderboard...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Chats (AI Reasoning Logs) */}
                <div className="col-span-12 lg:col-span-6 h-[400px]">
                  <AILogs logs={aiLogs} onViewFullLogs={handleOpenFullLogs} />
                </div>
              </div>

              {/* Bottom Row: Portfolio History and More Arenas */}
              <div className="grid grid-cols-12 gap-8">
                {/* Portfolio History Chart */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm min-h-[400px]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest flex items-center">
                      <span className="w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
                      Portfolio History
                    </h3>
                    <div className="text-xs font-bold text-orange-600">Status: US Market Closed</div>
                  </div>

                  {portfolioHistory.length > 0 ? (
                    <div className="relative h-64 w-full flex items-end space-x-1">
                      {(() => {
                        const values = portfolioHistory.map((h: any) => h.total_value || 0);
                        const maxVal = Math.max(...values, 1);
                        const minVal = Math.min(...values);
                        const range = maxVal - minVal || 1;
                        return values.slice(-30).map((val: number, i: number) => {
                          const height = ((val - minVal) / range) * 90 + 10;
                          return (
                            <div key={i} className="flex-1 bg-orange-100 rounded-t-sm transition-all hover:bg-orange-300" style={{ height: `${height}%` }} title={`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}></div>
                          );
                        });
                      })()}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {(() => {
                          const values = portfolioHistory.map((h: any) => h.total_value || 0);
                          const maxVal = Math.max(...values, 1);
                          const minVal = Math.min(...values);
                          const step = (maxVal - minVal) / 4 || 1000;
                          return [maxVal, maxVal - step, maxVal - step * 2, maxVal - step * 3, minVal].map((val, i) => (
                            <div key={i} className="w-full border-t border-gray-50 text-[10px] text-gray-300 pt-1">${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          ));
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      <p className="text-sm font-bold">No portfolio history data yet</p>
                    </div>
                  )}

                  {portfolioHistory.length > 0 && (
                    <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-bold uppercase">
                      {portfolioHistory.slice(-5).map((h: any, i: number) => (
                        <span key={i}>{h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ''}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* More Arenas Like This */}
                <div className="col-span-12 lg:col-span-4 flex flex-col space-y-4">
                  <h3 className="font-black text-orange-700 text-sm">More Arenas Like This...</h3>
                  {arenas.filter(a => a.id !== selectedArenaId).slice(0, 2).map(arena => (
                    <div key={arena.id} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 cursor-pointer transition-all shadow-sm" onClick={() => handleSelectArena(arena.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-900">{arena.name}</span>
                        <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180" />
                      </div>
                      <div className="flex gap-2">
                        {(Array.isArray(arena.tags) ? arena.tags : (arena.tags || '').split(',')).slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">{tag.replace('#', '')}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Portfolio & Orders */}
          <aside className="w-80 border-l border-gray-100 flex flex-col h-full bg-white">
            <TradeList trades={trades} portfolio={portfolio} />
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
