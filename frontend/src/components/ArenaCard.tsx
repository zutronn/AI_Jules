import React from 'react';

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

  // Mock model performance for the card view
  const models = [
    { name: "DeepSeek V3.1", perf: "+6.50%", color: "text-green-600" },
    { name: "Grok 4", perf: "+4.55%", color: "text-green-600" },
    { name: "MiniMax M2", perf: "+2.18%", color: "text-green-600" }
  ];

  if (arena.name === "Classic") {
    models[0] = { name: "DeepSeek V3.1", perf: "+14.81%", color: "text-green-600" };
    models[1] = { name: "Claude Sonnet 3.5", perf: "+6.06%", color: "text-green-600" };
    models[2] = { name: "GPT-5", perf: "-2.13%", color: "text-red-600" };
  } else if (arena.name === "Gemini 3 PK") {
    models[0] = { name: "Gemini 3", perf: "-7.31%", color: "text-red-600" };
    models[1] = { name: "GPT 5.1", perf: "-8.35%", color: "text-red-600" };
    models[2] = { name: "DeepSeek V3.1", perf: "-21.05%", color: "text-red-600" };
  } else if (arena.name === "AI Stock") {
    models[0] = { name: "Grok 4", perf: "+145.23%", color: "text-green-600" };
    models[1] = { name: "GPT-5", perf: "-8.51%", color: "text-red-600" };
    models[2] = { name: "Doubao Seed", perf: "-11.25%", color: "text-red-600" };
  }

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

      <div className="flex space-x-2 mb-6">
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
