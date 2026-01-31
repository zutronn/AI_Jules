import { useState, useEffect } from 'react';
import axios from 'axios';
import TradeList from './components/TradeList';
import AILogs from './components/AILogs';
import ArenaCard from './components/ArenaCard';
import Hero from './components/Hero';
import ArenaForm from './components/ArenaForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<number | null>(null);
  const [trades, setTrades] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [view, setView] = useState<'home' | 'detail'>('home');

  const fetchArenas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/arenas`);
      setArenas(res.data);
    } catch (error) {
      console.error('Error fetching arenas:', error);
    }
  };

  const fetchData = async () => {
    if (selectedArenaId === null) return;
    try {
      const [tradesRes, aiLogsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/trades?arena_id=${selectedArenaId}`),
        axios.get(`${API_BASE_URL}/ai-responses?arena_id=${selectedArenaId}`)
      ]);
      setTrades(tradesRes.data);
      setAiLogs(aiLogsRes.data);
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

  const selectedArena = arenas.find(a => a.id === selectedArenaId);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleBackToHome}>
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
          <span className="text-xl font-bold tracking-tight text-purple-900">ROCKFLOW <span className="text-purple-600">RockAlpha</span></span>
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium text-gray-500">
          <span>EN ▾</span>
          <span>About ROCKFLOW ↗</span>
          <span>About RockAlpha ↗</span>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">Share ↗</button>
        </div>
      </nav>

      {view === 'home' ? (
        <main className="max-w-7xl mx-auto px-8 py-12">
          <Hero />

          <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-5xl font-black text-purple-700 mb-4">All Arenas</h2>
                <p className="text-xl text-gray-600">Browse live AI tradings by theme & strategy. Jump in and copy-trade whoever's winning.</p>
            </div>
            <div className="flex flex-col items-end">
                 <div className="border border-purple-300 text-purple-600 px-4 py-1 rounded-full text-xs font-bold mb-4">
                    ● 44h til Market Open
                </div>
                <ArenaForm onCreated={fetchArenas} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {arenas.map(arena => (
              <ArenaCard key={arena.id} arena={arena} onSelect={handleSelectArena} />
            ))}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-8 py-12">
          <button
            onClick={handleBackToHome}
            className="mb-8 text-purple-600 font-bold flex items-center hover:underline"
          >
            ← Back to All Arenas
          </button>

          {selectedArena && (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2">{selectedArena.name}</h1>
                    <div className="flex gap-2">
                        {selectedArena.tags.split(',').map((tag: string, i: number) => (
                            <span key={i} className="text-purple-600 font-bold">{tag}</span>
                        ))}
                    </div>
                </div>
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold border border-green-200">
                    Live Trading Active
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <TradeList trades={trades} />
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h3 className="font-bold mb-4">Arena Info</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Tickers</span> <span className="font-mono">{selectedArena.tickers}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Cycle Time</span> <span>{selectedArena.cycle_time}s</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Status</span> <span className="text-green-600 font-bold">Online</span></div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <AILogs logs={aiLogs} />
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
