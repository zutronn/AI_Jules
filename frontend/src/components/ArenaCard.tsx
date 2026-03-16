import React from 'react';

interface ModelData {
  name: string;
  perf: string;
  color: string;
  cumReturn: string;
  d7: string;
  d30: string;
  d90: string;
  volatility: string;
  maxDrawdown: string;
  winRate: string;
  avgHold: string;
}

interface ArenaCardProps {
  arena: {
    id: number;
    name: string;
    tags: string;
    description: string;
  };
  onSelect: (id: number) => void;
}

const ArenaCard: React.FC<ArenaCardProps> = ({ arena, onSelect }) => {
  const tags = arena.tags.split(',').filter(t => t.trim() !== '');

  // Mock model performance with full metrics for the card view
  const models: ModelData[] = [
    { name: "DeepSeek V3.1", perf: "+6.50%", color: "text-green-600", cumReturn: "+6.50%", d7: "+1.2%", d30: "+3.8%", d90: "+6.50%", volatility: "16.5%", maxDrawdown: "-7.1%", winRate: "67.2%", avgHold: "5.5h" },
    { name: "Grok 4", perf: "+4.55%", color: "text-green-600", cumReturn: "+4.55%", d7: "+0.9%", d30: "+2.1%", d90: "+4.55%", volatility: "22.1%", maxDrawdown: "-12.4%", winRate: "55.8%", avgHold: "3.8h" },
    { name: "MiniMax M2", perf: "+2.18%", color: "text-green-600", cumReturn: "+2.18%", d7: "-0.3%", d30: "+1.0%", d90: "+2.18%", volatility: "25.6%", maxDrawdown: "-15.3%", winRate: "52.1%", avgHold: "2.9h" }
  ];

  if (arena.name === "Classic") {
    models[0] = { name: "DeepSeek V3.1", perf: "+14.81%", color: "text-green-600", cumReturn: "+14.81%", d7: "+2.8%", d30: "+7.2%", d90: "+14.81%", volatility: "15.2%", maxDrawdown: "-6.3%", winRate: "68.4%", avgHold: "5.1h" };
    models[1] = { name: "Claude Sonnet 3.5", perf: "+6.06%", color: "text-green-600", cumReturn: "+6.06%", d7: "+1.4%", d30: "+3.1%", d90: "+6.06%", volatility: "12.8%", maxDrawdown: "-4.9%", winRate: "63.1%", avgHold: "6.8h" };
    models[2] = { name: "GPT-5", perf: "-2.13%", color: "text-red-600", cumReturn: "-2.13%", d7: "-0.8%", d30: "-1.5%", d90: "-2.13%", volatility: "19.4%", maxDrawdown: "-9.7%", winRate: "48.2%", avgHold: "4.5h" };
  } else if (arena.name === "Gemini 3 PK") {
    models[0] = { name: "Gemini 3", perf: "-7.31%", color: "text-red-600", cumReturn: "-7.31%", d7: "-2.1%", d30: "-4.8%", d90: "-7.31%", volatility: "28.3%", maxDrawdown: "-18.2%", winRate: "44.6%", avgHold: "2.1h" };
    models[1] = { name: "GPT 5.1", perf: "-8.35%", color: "text-red-600", cumReturn: "-8.35%", d7: "-1.9%", d30: "-5.2%", d90: "-8.35%", volatility: "24.7%", maxDrawdown: "-16.8%", winRate: "42.3%", avgHold: "3.2h" };
    models[2] = { name: "DeepSeek V3.1", perf: "-21.05%", color: "text-red-600", cumReturn: "-21.05%", d7: "-5.4%", d30: "-12.3%", d90: "-21.05%", volatility: "35.1%", maxDrawdown: "-24.6%", winRate: "38.1%", avgHold: "1.8h" };
  } else if (arena.name === "AI Stock") {
    models[0] = { name: "Grok 4", perf: "+145.23%", color: "text-green-600", cumReturn: "+145.23%", d7: "+18.4%", d30: "+52.1%", d90: "+145.23%", volatility: "42.8%", maxDrawdown: "-22.5%", winRate: "71.3%", avgHold: "8.2h" };
    models[1] = { name: "GPT-5", perf: "-8.51%", color: "text-red-600", cumReturn: "-8.51%", d7: "-2.3%", d30: "-5.1%", d90: "-8.51%", volatility: "31.2%", maxDrawdown: "-19.4%", winRate: "46.8%", avgHold: "3.6h" };
    models[2] = { name: "Doubao Seed", perf: "-11.25%", color: "text-red-600", cumReturn: "-11.25%", d7: "-3.1%", d30: "-6.8%", d90: "-11.25%", volatility: "33.5%", maxDrawdown: "-21.1%", winRate: "43.5%", avgHold: "2.4h" };
  }

  const isNeg = (v: string) => v.startsWith('-');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
           <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">New</span>
           <h3 className="text-xl font-bold text-gray-900">{arena.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="text-sm font-medium text-purple-600">{tag}</span>
          ))}
        </div>
      </div>

      {/* Model Performance Cards */}
      <div className="flex space-x-2 mb-4">
        {models.map((model, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 flex-1 min-w-0">
            <div className="text-[10px] font-bold text-blue-600 truncate mb-1 flex items-center">
                <div className="w-3 h-3 bg-blue-100 rounded-full mr-1"></div>
                {model.name}
            </div>
            <div className={`text-sm font-bold ${model.color}`}>{model.perf}</div>
          </div>
        ))}
      </div>

      {/* AI Metrics Leaderboard Table */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-[10px]" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
          <thead>
            <tr className="text-gray-400 uppercase tracking-wider">
              <th className="text-left py-1 px-1 font-semibold">Agent</th>
              <th className="text-right py-1 px-1 font-semibold">7D</th>
              <th className="text-right py-1 px-1 font-semibold">30D</th>
              <th className="text-right py-1 px-1 font-semibold">90D</th>
              <th className="text-right py-1 px-1 font-semibold">Vol</th>
              <th className="text-right py-1 px-1 font-semibold">MDD</th>
              <th className="text-right py-1 px-1 font-semibold">Win%</th>
              <th className="text-right py-1 px-1 font-semibold">Hold</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model, i) => (
              <tr key={i} className="bg-gray-50 rounded">
                <td className="py-1.5 px-1 font-bold text-gray-700 truncate max-w-[80px]">{model.name.split(' ')[0]}</td>
                <td className={`py-1.5 px-1 text-right font-bold ${isNeg(model.d7) ? 'text-red-500' : 'text-green-600'}`}>{model.d7}</td>
                <td className={`py-1.5 px-1 text-right font-bold ${isNeg(model.d30) ? 'text-red-500' : 'text-green-600'}`}>{model.d30}</td>
                <td className={`py-1.5 px-1 text-right font-bold ${isNeg(model.d90) ? 'text-red-500' : 'text-green-600'}`}>{model.d90}</td>
                <td className="py-1.5 px-1 text-right font-medium text-blue-500">{model.volatility}</td>
                <td className="py-1.5 px-1 text-right font-medium text-red-400">{model.maxDrawdown}</td>
                <td className={`py-1.5 px-1 text-right font-bold ${parseFloat(model.winRate) >= 55 ? 'text-green-600' : 'text-red-500'}`}>{model.winRate}</td>
                <td className="py-1.5 px-1 text-right font-medium text-purple-500">{model.avgHold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold">
                    {String.fromCharCode(65 + i)}
                </div>
            ))}
        </div>
        <button
          onClick={() => onSelect(arena.id)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full text-sm flex items-center transition-colors"
        >
          Copy Trade <span className="ml-2">→</span>
        </button>
      </div>
    </div>
  );
};

export default ArenaCard;
