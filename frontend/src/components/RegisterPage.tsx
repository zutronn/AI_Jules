import { useState } from 'react';
import { ChevronLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RegisterPageProps {
  arenaId?: string;
  arenaName?: string;
  onBack: () => void;
}

const RegisterPage = ({ arenaName, onBack }: RegisterPageProps) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResult({ success: true, message: 'Registration successful! Check your email for verification.' });
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        setResult({ success: false, message: data.detail || 'Registration failed. Please try again.' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <button
          onClick={onBack}
          className="text-gray-500 font-bold flex items-center text-sm hover:text-orange-600 transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Copy Trading</h1>
          <p className="text-gray-500 text-sm mb-2">
            {arenaName ? (
              <>Register to copy trade AI agents in <span className="font-bold text-orange-600">{arenaName}</span></>
            ) : (
              'Register to copy trade the best AI agents'
            )}
          </p>
          <p className="text-gray-400 text-xs mb-8">Enter your email to get started. We'll notify you when copy trading is live.</p>

          {result?.success ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-700 font-bold">{result.message}</p>
              <button
                onClick={onBack}
                className="text-orange-600 font-bold text-sm hover:underline"
              >
                Return to Trading Hub
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setResult(null); }}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                autoFocus
              />

              {result && !result.success && (
                <div className="flex items-center space-x-2 text-red-500 text-xs font-bold">
                  <AlertCircle className="w-3 h-3" />
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'Registering...' : 'Register for Copy Trading'}
              </button>

              <p className="text-[10px] text-gray-400">By registering, you agree to receive email notifications about AI trading activity.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
