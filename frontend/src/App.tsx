import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Info, Target, FileText, Send, Share2, Globe } from 'lucide-react';
import TradeList from './components/TradeList';
import AILogs from './components/AILogs';
import ArenaCard from './components/ArenaCard';
import Hero from './components/Hero';
import ArenaForm from './components/ArenaForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function App() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<number | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [view, setView] = useState<'home' | 'detail'>('home');

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

  const fetchData = async () => {
    if (selectedArenaId === null) return;
    try {
      const [tradesRes, aiLogsRes, portfolioRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/trades?arena_id=${selectedArenaId}`),
        axios.get(`${API_BASE_URL}/ai-responses?arena_id=${selectedArenaId}`),
        axios.get(`${API_BASE_URL}/portfolio?arena_id=${selectedArenaId}`)
      ]);
      setTrades(Array.isArray(tradesRes.data) ? tradesRes.data : []);
      setAiLogs(Array.isArray(aiLogsRes.data) ? aiLogsRes.data : []);
      setPortfolio(portfolioRes.data || null);
    } catch (error) {
      console.error('Error fetching trades/logs:', error);
    }
  };

  useEffect(() => {
    fetchArenas();
  }, []);

  useEffect(() => {
    if (selectedArenaId !== null) {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedArenaId]);

  const handleSelectArena = (id: number) => {
    setSelectedArenaId(id);
    setView('detail');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedArenaId(null);
  };

  const selectedArena = Array.isArray(arenas) ? arenas.find(a => a.id === selectedArenaId) : undefined;

  const mockModels = [
    { name: "DeepSeek V3.1", roi: "+6.50%", color: "bg-blue-500" },
    { name: "Grok 4", roi: "+4.55%", color: "bg-black" },
    { name: "MiniMax M2", roi: "+2.18%", color: "bg-red-500" },
    { name: "Gemini 3", roi: "-0.68%", color: "bg-yellow-500" },
  ];

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
        </div>
      </nav>

      {view === 'home' ? (
        <main className="max-w-7xl mx-auto px-8 py-12">
          <Hero />

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
              <ArenaCard key={arena.id} arena={arena} onSelect={handleSelectArena} />
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
                      <p className="text-sm font-bold text-gray-700">{selectedArena.tickers}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">Rule <Info className="w-3 h-3 ml-1" /></p>
                      <p className="text-sm font-bold text-gray-700">{selectedArena.rule || "Live Trading Cup"}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Send className="w-5 h-5 text-orange-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">Prompt <Info className="w-3 h-3 ml-1" /></p>
                      <p className="text-sm font-bold text-gray-700 line-clamp-3">{selectedArena.prompt_text || "Autonomous strategies based on market momentum."}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Top Row: AI Models List and Model Chats */}
              <div className="grid grid-cols-12 gap-8">
                {/* AI Models Performance */}
                <div className="col-span-12 lg:col-span-6 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <div className="space-y-4">
                    {mockModels.map((model, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${model.color} rounded-full flex items-center justify-center text-white font-bold`}>
                            {model.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-blue-600 text-sm">{model.name}</p>
                            <p className={`text-xs font-black ${model.roi.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{model.roi}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-xs font-bold border border-orange-100 flex items-center">
                            Vote Win <span className="ml-1">🏆</span>
                          </button>
                          <button className="bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-orange-100">
                            Copy Trading →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Chats */}
                <div className="col-span-12 lg:col-span-6 h-[400px]">
                  <AILogs logs={aiLogs} />
                </div>
              </div>

              {/* Bottom Row: Chart and More Arenas */}
              <div className="grid grid-cols-12 gap-8">
                {/* Chart Section */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm min-h-[400px]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest flex items-center">
                      <span className="w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
                      Total Account Value
                    </h3>
                    <div className="text-xs font-bold text-orange-600">Status: US Market Closed</div>
                  </div>

                  {/* Mock Chart */}
                  <div className="relative h-64 w-full flex items-end space-x-1">
                    {[40, 45, 42, 48, 55, 52, 58, 65, 62, 70, 68, 75, 80, 78, 85, 90, 88, 95, 100, 98, 105, 110, 108, 115].map((h, i) => (
                      <div key={i} className="flex-1 bg-orange-100 rounded-t-sm transition-all hover:bg-orange-300" style={{ height: `${h}%` }}></div>
                    ))}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[12000, 11000, 10000, 9000, 8000].map(val => (
                        <div key={val} className="w-full border-t border-gray-50 text-[10px] text-gray-300 pt-1">{val}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-bold uppercase">
                    <span>01/29 10:50</span>
                    <span>01/29 16:50</span>
                    <span>01/29 22:50</span>
                    <span>01/30 12:50</span>
                    <span>01/30 18:50</span>
                    <span>01/31 00:50</span>
                  </div>
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
                        {(arena.tags || '').split(',').slice(0, 2).map((tag: string, i: number) => (
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
