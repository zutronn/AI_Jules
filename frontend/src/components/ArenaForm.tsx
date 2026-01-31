import React, { useState } from 'react';
import axios from 'axios';

const ArenaForm = ({ onCreated }: { onCreated: () => void }) => {
  const [name, setName] = useState('');
  const [tickers, setTickers] = useState('');
  const [cycleTime, setCycleTime] = useState(10);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/arenas', {
        name,
        tickers,
        cycle_time: cycleTime,
        is_active: true
      });
      setName('');
      setTickers('');
      setCycleTime(10);
      setIsOpen(false);
      onCreated();
    } catch (error) {
      console.error('Error creating arena:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        + New Arena
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Create New Arena</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Arena Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
              placeholder="e.g. Tech Giants"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tickers (comma separated)</label>
            <input
              type="text"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
              placeholder="e.g. AAPL,MSFT,GOOGL"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cycle Time (seconds)</label>
            <input
              type="number"
              min="1"
              value={cycleTime}
              onChange={(e) => setCycleTime(parseInt(e.target.value))}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-gray-800 text-gray-400 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArenaForm;
