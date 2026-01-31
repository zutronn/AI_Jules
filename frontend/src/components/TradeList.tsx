import React from 'react';

const TradeList = ({ trades }: { trades: any[] }) => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-900">Trade History</h2>
      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
              <th className="pb-4 font-medium">Symbol</th>
              <th className="pb-4 font-medium">Side</th>
              <th className="pb-4 font-medium">Price</th>
              <th className="pb-4 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trades.length === 0 ? (
                <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No trades yet</td>
                </tr>
            ) : (
                trades.map((trade) => (
                <tr key={trade.id} className="text-sm">
                    <td className="py-4 font-bold text-gray-900">{trade.symbol}</td>
                    <td className="py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${trade.side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {trade.side}
                        </span>
                    </td>
                    <td className="py-4 text-gray-600">${trade.price.toLocaleString()}</td>
                    <td className="py-4 text-gray-400 text-right text-xs">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeList;
