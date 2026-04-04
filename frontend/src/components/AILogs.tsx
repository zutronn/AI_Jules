import { Cpu, ExternalLink } from 'lucide-react';

function formatLogTimestamp(ts: string | undefined): string {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return ts;
  const month = d.toLocaleString([], { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${month} ${day}, ${time}`;
}

/** Extract the decision tag like [BUY NEM], [SELL AG], [HOLD] from a log message */
function extractDecision(text: string): { tag: string; color: string } | null {
  const match = text.match(/^\[(BUY|SELL|HOLD)\s*([A-Z]*)\]/i);
  if (!match) return null;
  const action = match[1].toUpperCase();
  const symbol = match[2] || '';
  const color = action === 'BUY' ? 'bg-green-500' : action === 'SELL' ? 'bg-red-500' : 'bg-yellow-500';
  return { tag: symbol ? `${action} ${symbol}` : action, color };
}

const AILogs = ({ logs, onViewFullLogs }: { logs: any[]; onViewFullLogs?: () => void }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-black text-orange-700 uppercase tracking-widest">Model Chats</h2>
        <div className="flex items-center space-x-2">
          {onViewFullLogs && (
            <button onClick={onViewFullLogs} className="flex items-center space-x-1 text-[10px] font-bold text-orange-600 hover:text-orange-800 uppercase tracking-widest transition-colors">
              <span>Full Logs</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <Cpu className="w-4 h-4 text-orange-600" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <Cpu className="w-8 h-8 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for insights...</p>
            </div>
        ) : (
            logs.map((log) => {
              const text = log.response || log.message || '';
              const decision = extractDecision(text);
              return (
                <div key={log.id} className="space-y-2 group">
                    <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-orange-600 rounded flex items-center justify-center text-[10px] font-bold text-white">
                            {log.agent_name?.[0] || '?'}
                        </div>
                        <span className="font-black text-xs text-gray-900">{log.agent_name}</span>
                        {decision && (
                          <span className={`${decision.color} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                            {decision.tag}
                          </span>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl rounded-tl-none border border-gray-100 group-hover:border-orange-100 transition-colors">
                      <p className="text-xs font-medium text-gray-600 leading-relaxed">
                          {text}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest ml-1">
                      {formatLogTimestamp(log.timestamp || log.created_at)}
                    </p>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default AILogs;
