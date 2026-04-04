import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Clock, Zap, RefreshCw, Save, ChevronLeft, Lock, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'lawliet2026';

interface SettingItem {
  key: string;
  value: string;
  description: string;
}

const SETTING_LABELS: Record<string, { label: string; icon: React.ReactNode; unit: string; min: number; max: number }> = {
  ai_thinking_interval: {
    label: 'AI Analysis Interval',
    icon: <Clock className="w-5 h-5" />,
    unit: 'seconds',
    min: 60,
    max: 86400,
  },
  trading_cycle_seconds: {
    label: 'Trading Cycle Interval',
    icon: <Zap className="w-5 h-5" />,
    unit: 'seconds',
    min: 10,
    max: 3600,
  },
  chat_min_interval: {
    label: 'Chat Min Interval',
    icon: <Clock className="w-5 h-5" />,
    unit: 'seconds',
    min: 1,
    max: 300,
  },
  chat_max_interval: {
    label: 'Chat Max Interval',
    icon: <Clock className="w-5 h-5" />,
    unit: 'seconds',
    min: 5,
    max: 600,
  },
  price_update_interval: {
    label: 'Price Update Interval',
    icon: <RefreshCw className="w-5 h-5" />,
    unit: 'seconds',
    min: 1,
    max: 60,
  },
};

const formatInterval = (seconds: number): string => {
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
};

const AdminPage = ({ onBack }: { onBack: () => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [loading, setLoading] = useState(true);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const adminHeaders = { 'X-Admin-Key': passwordInput || ADMIN_PASSWORD };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/settings`, { headers: adminHeaders });
      if (Array.isArray(res.data)) {
        setSettings(res.data);
        const values: Record<string, string> = {};
        for (const s of res.data) {
          values[s.key] = s.value;
        }
        setEditValues(values);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleSave = async (key: string) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    setSaveStatus(prev => ({ ...prev, [key]: null }));
    try {
      await axios.put(`${API_BASE_URL}/settings/${key}`, { value: editValues[key] }, { headers: adminHeaders });
      setSaveStatus(prev => ({ ...prev, [key]: 'success' }));
      // Refresh settings after save
      await fetchSettings();
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: null })), 3000);
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [key]: null })), 5000);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleQuickSet = (key: string, valueInSeconds: number) => {
    setEditValues(prev => ({ ...prev, [key]: String(valueInSeconds) }));
  };

  // Quick presets for ai_thinking_interval
  const aiIntervalPresets = [
    { label: '5 min', value: 300 },
    { label: '15 min', value: 900 },
    { label: '30 min', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '2 hours', value: 7200 },
    { label: '6 hours', value: 21600 },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <button
            onClick={onBack}
            className="text-gray-500 font-bold flex items-center text-sm hover:text-orange-600 transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Trading Hub
          </button>

          <div className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Admin Access</h1>
            <p className="text-gray-500 text-sm mb-8">Enter the admin password to access settings.</p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  placeholder="Enter password"
                  className={`w-full px-4 py-3 border ${passwordError ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'} rounded-xl text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-12`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <p className="text-red-500 text-xs font-bold">Incorrect password. Please try again.</p>
              )}

              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
              >
                Unlock Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <button
          onClick={onBack}
          className="text-gray-500 font-bold flex items-center text-sm hover:text-orange-600 transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Trading Hub
        </button>

        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-4xl font-black text-orange-700">Admin Settings</h1>
        </div>
        <p className="text-gray-500 mb-10 ml-13">Configure how often AI agents analyze the market and make trading decisions.</p>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 opacity-40" />
            <p className="text-sm font-bold">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Analysis Interval - Featured Card */}
            {settings.filter(s => s.key === 'ai_thinking_interval').map(setting => {
              const meta = SETTING_LABELS[setting.key];
              const currentVal = parseInt(editValues[setting.key] || setting.value);
              const originalVal = parseInt(setting.value);
              const hasChanged = String(currentVal) !== String(originalVal);

              return (
                <div key={setting.key} className="bg-white rounded-3xl border-2 border-orange-100 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        {meta?.icon || <Settings className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900">{meta?.label || setting.key}</h3>
                        <p className="text-xs text-gray-400">{setting.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-orange-600">{formatInterval(currentVal)}</div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">Current interval</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Presets</p>
                    <div className="flex flex-wrap gap-2">
                      {aiIntervalPresets.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handleQuickSet(setting.key, preset.value)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            currentVal === preset.value
                              ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Custom value (seconds)</label>
                      <input
                        type="number"
                        value={editValues[setting.key] || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        min={meta?.min || 60}
                        max={meta?.max || 86400}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(setting.key)}
                      disabled={saving[setting.key] || !hasChanged}
                      className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all mt-5 ${
                        hasChanged
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 hover:bg-orange-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {saving[setting.key] ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{saving[setting.key] ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>

                  {saveStatus[setting.key] === 'success' && (
                    <p className="text-green-500 text-xs font-bold mt-3">Setting saved successfully!</p>
                  )}
                  {saveStatus[setting.key] === 'error' && (
                    <p className="text-red-500 text-xs font-bold mt-3">Failed to save. The backend may not support updates yet — deploy the updated backend first.</p>
                  )}

                  <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p className="text-xs font-bold text-orange-700 mb-1">How it works</p>
                    <p className="text-xs text-orange-600 leading-relaxed">
                      Every <strong>{formatInterval(currentVal)}</strong>, each AI agent will analyze the current stock market data for their arena,
                      review other agents' recent trading decisions and reasoning logs, then decide to <strong>buy</strong>, <strong>sell</strong>,
                      or <strong>hold</strong> their positions. Agents learn from each other's strategies over time.
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Other Settings */}
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pt-4">Other Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.filter(s => s.key !== 'ai_thinking_interval').map(setting => {
                const meta = SETTING_LABELS[setting.key];
                const currentVal = editValues[setting.key] || setting.value;
                const hasChanged = currentVal !== setting.value;

                return (
                  <div key={setting.key} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        {meta?.icon || <Settings className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{meta?.label || setting.key}</h4>
                        <p className="text-[10px] text-gray-400">{setting.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={currentVal}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        min={meta?.min || 1}
                        max={meta?.max || 86400}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-orange-400"
                      />
                      <span className="text-xs text-gray-400 font-bold">{meta?.unit || 'sec'}</span>
                      <button
                        onClick={() => handleSave(setting.key)}
                        disabled={saving[setting.key] || !hasChanged}
                        className={`p-2 rounded-lg transition-all ${
                          hasChanged
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {saving[setting.key] ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-gray-400">
                      Current: <strong>{formatInterval(parseInt(currentVal))}</strong>
                    </div>

                    {saveStatus[setting.key] === 'success' && (
                      <p className="text-green-500 text-[10px] font-bold mt-2">Saved!</p>
                    )}
                    {saveStatus[setting.key] === 'error' && (
                      <p className="text-red-500 text-[10px] font-bold mt-2">Save failed</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
