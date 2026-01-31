import React from 'react';

const TradeList = ({ trades }: { trades: any[] }) => {
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Trade History</h2>
      <div className="overflow-y-auto max-h-60">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2">Symbol</th>
              <th className="py-2">Side</th>
              <th className="py-2">Price</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-gray-700 text-sm">
                <td className="py-2">{trade.symbol}</td>
                <td className={`py-2 font-bold ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.side}
                </td>
                <td className="py-2">${trade.price}</td>
                <td className="py-2">{trade.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeList;
