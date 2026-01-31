import React from 'react';

const StockDisplay = ({ data }: { data: any }) => {
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Real-time Stock: {data.symbol}</h2>
      <div className="text-3xl font-mono">${data.price}</div>
      <div className={data.price_change >= 0 ? 'text-green-400' : 'text-red-400'}>
        {data.price_change >= 0 ? '+' : ''}{data.price_change} ({((data.price_change / data.price) * 100).toFixed(2)}%)
      </div>
      <div className="mt-2 text-sm text-gray-400">
        Volume: {data.volume} | RSI: {data.rsi}
      </div>
    </div>
  );
};

export default StockDisplay;
