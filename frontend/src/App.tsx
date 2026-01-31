import { useState, useEffect } from 'react';
import axios from 'axios';
import StockDisplay from './components/StockDisplay';
import TradeList from './components/TradeList';
import AILogs from './components/AILogs';
import ArenaSelector from './components/ArenaSelector';
import ArenaForm from './components/ArenaForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<number | null>(null);
  const [trades, setTrades] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);

  const fetchArenas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/arenas`);
      setArenas(res.data);
      if (res.data.length > 0 && selectedArenaId === null) {
        setSelectedArenaId(res.data[0].id);
      }
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
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [selectedArenaId]);

  const selectedArena = arenas.find(a => a.id === selectedArenaId);

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-4xl font-extrabold tracking-tighter">
          ROCK<span className="text-blue-500">ALPHA</span>
          <span className="ml-4 text-sm font-normal text-gray-500 uppercase tracking-widest">AI Trading Orchestrator</span>
        </h1>
        <ArenaForm onCreated={fetchArenas} />
      </header>

      <ArenaSelector
        arenas={arenas}
        selectedArenaId={selectedArenaId}
        onSelect={setSelectedArenaId}
      />

      {selectedArena ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Arena Settings: {selectedArena.name}</h2>
              <div className="text-sm text-gray-400 space-y-2">
                <div>Tickers: <span className="text-white">{selectedArena.tickers}</span></div>
                <div>Cycle Time: <span className="text-white">{selectedArena.cycle_time}s</span></div>
              </div>
            </div>
            <TradeList trades={trades} />
          </div>
          <div className="lg:col-span-2 space-y-8">
            <AILogs logs={aiLogs} />
            <div className="p-4 bg-gray-800 rounded-lg">
              <h2 className="text-xl font-bold mb-4">System Status</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Backend: Online</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Arena {selectedArena.id}: Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          No arenas found. Create one to start trading.
        </div>
      )}
    </div>
  );
}

export default App;
