import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api';

const ArenaForm = ({ onCreated }: { onCreated: () => void }) => {
  const [name, setName] = useState('');
  const [tickers, setTickers] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [rule, setRule] = useState('');
  const [promptText, setPromptText] = useState('');
  const [cycleTime, setCycleTime] = useState(10);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/arenas`, {
        name,
        tickers,
        tags,
        description,
        rule,
        prompt_text: promptText,
        cycle_time: cycleTime,
        is_active: true
      });
      setName('');
      setTickers('');
      setTags('');
      setDescription('');
      setRule('');
      setPromptText('');
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
        className="px-6 py-2 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition-colors shadow-lg"
      >
        + Create Arena
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Start New Arena</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Arena Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
              placeholder="e.g. AI PMs Storm Cup"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tickers</label>
                <input
                  type="text"
                  value={tickers}
                  onChange={(e) => setTickers(e.target.value)}
                  className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
                  placeholder="AAPL,MSFT"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Cycle (sec)</label>
                <input
                  type="number"
                  min="1"
                  value={cycleTime}
                  onChange={(e) => setCycleTime(parseInt(e.target.value))}
                  className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
                  required
                />
              </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Rule</label>
            <input
              type="text"
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
              placeholder="e.g. Live Trading Cup"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Prompt</label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
              placeholder="System prompt for AI agents..."
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
              placeholder="#Momentum,#Hedging"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg"
            >
              Launch Arena
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
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
