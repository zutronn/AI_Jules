import React from 'react';

const ArenaSelector = ({ arenas, selectedArenaId, onSelect }: { arenas: any[], selectedArenaId: number | null, onSelect: (id: number) => void }) => {
  return (
    <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
      {arenas.map((arena) => (
        <button
          key={arena.id}
          onClick={() => onSelect(arena.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
            selectedArenaId === arena.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {arena.name}
        </button>
      ))}
    </div>
  );
};

export default ArenaSelector;
