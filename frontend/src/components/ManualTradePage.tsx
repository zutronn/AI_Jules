import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ManualTradePageProps {
  arenaId: string;
  arenaName: string;
  onBack: () => void;
}

const ManualTradePage = ({ arenaId, arenaName, onBack }: ManualTradePageProps) => {
  const [tickers, setTickers] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    const fetchArenaData = async () => {
      try {
        const [arenaRes, portfolioRes, tradesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/arenas`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/portfolio/all/${arenaId}`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/trades/${arenaId}?agent_id=human`).catch(() => ({ data: [] })),
        ]);

        const arenas = Array.isArray(arenaRes.data) ? arenaRes.data : [];
        const arena = arenas.find((a: any) => String(a.id) === String(arenaId));
        if (arena) {
          const tickerList = Array.isArray(arena.tickers) ? arena.tickers : (arena.tickers || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          setTickers(tickerList);
          if (tickerList.length > 0 && !selectedTicker) setSelectedTicker(tickerList[0]);
        }

        const allPortfolios = Array.isArray(portfolioRes.data) ? portfolioRes.data : [];
        const humanPortfolio = allPortfolios.find((p: any) => p.agent_id === 'human');
        if (humanPortfolio) setPortfolio(humanPortfolio);

        const trades = Array.isArray(tradesRes.data) ? tradesRes.data : [];
        setRecentTrades(trades.slice(0, 10));
      } catch (error) {
        console.error('Error fetching arena data:', error);
      }
    };
    fetchArenaData();
    const interval = setInterval(fetchArenaData, 10000);
    return () => clearInterval(interval);
  }, [arenaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker || !quantity || Number(quantity) <= 0) {
      setSubmitResult({ success: false, message: 'Please fill in all fields with valid values.' });
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      await axios.post(`${API_BASE_URL}/trades/manual`, {
        arena_id: arenaId,
        agent_id: 'human',
        action,
        symbol: selectedTicker,
        quantity: Number(quantity),
        reasoning: reasoning || `Manual ${action} order`,
      });
      setSubmitResult({ success: true, message: `${action.toUpperCase()} ${quantity} ${selectedTicker} submitted successfully!` });
      setQuantity('');
      setReasoning('');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to submit trade. Please try again.';
      setSubmitResult({ success: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="text-gray-500 font-bold flex items-center text-sm hover:text-orange-600 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to {arenaName}
        </button>

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Manual Trading</h1>
            <p className="text-sm text-gray-500">Compete with AI agents in <span className="font-bold text-orange-600">{arenaName}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-4">Place Order</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Action Toggle */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setAction('buy')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
                    action === 'buy'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>BUY</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('sell')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
                    action === 'sell'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>SELL</span>
                </button>
              </div>

              {/* Ticker Select */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Ticker</label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {tickers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Quantity (shares)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  min="1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Reasoning */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Reasoning (optional)</label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Why are you making this trade?"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                />
              </div>

              {submitResult && (
                <div className={`p-3 rounded-xl text-sm font-bold ${submitResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {submitResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${
                  action === 'buy'
                    ? 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'
                    : 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Submitting...' : `${action.toUpperCase()} ${selectedTicker}`}
              </button>
            </form>
          </div>

          {/* Portfolio Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-4 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" /> Your Portfolio
              </h3>
              {portfolio ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Cash</span>
                    <span className="text-sm font-bold text-gray-900">${(portfolio.cash ?? 100000).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Total Value</span>
                    <span className="text-sm font-bold text-gray-900">${(portfolio.total_value ?? 100000).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Return</span>
                    <span className={`text-sm font-bold ${(portfolio.total_value ?? 100000) >= 100000 ? 'text-green-600' : 'text-red-600'}`}>
                      {((((portfolio.total_value ?? 100000) - 100000) / 100000) * 100).toFixed(2)}%
                    </span>
                  </div>
                  {portfolio.holdings && portfolio.holdings.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Holdings</p>
                      {portfolio.holdings.map((h: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs py-1">
                          <span className="font-bold text-gray-700">{h.symbol}</span>
                          <span className="text-gray-500">{h.quantity} shares</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-xs">
                  <p className="font-bold">$100,000 starting capital</p>
                  <p className="mt-1">Place your first trade to start competing!</p>
                </div>
              )}
            </div>

            {/* Recent Trades */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest mb-4">Your Recent Trades</h3>
              {recentTrades.length > 0 ? (
                <div className="space-y-2">
                  {recentTrades.map((trade: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className={`font-bold ${trade.action === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                          {(trade.action || '').toUpperCase()}
                        </span>
                        <span className="text-gray-700 font-bold ml-1">{trade.symbol}</span>
                        <span className="text-gray-400 ml-1">x{trade.quantity}</span>
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        {trade.created_at || trade.timestamp ? new Date(
                          (trade.created_at || trade.timestamp).includes('T')
                            ? (trade.created_at || trade.timestamp)
                            : (trade.created_at || trade.timestamp).replace(' ', 'T') + 'Z'
                        ).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-xs py-4">No trades yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualTradePage;
