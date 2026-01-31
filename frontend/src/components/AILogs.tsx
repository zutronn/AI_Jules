import React from 'react';

const AILogs = ({ logs }: { logs: any[] }) => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-900">AI Model Insights</h2>
      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
        {logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Waiting for AI models to analyze the market...</div>
        ) : (
            logs.map((log) => (
            <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:border-purple-200">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-700">
                            {log.agent_name[0]}
                        </div>
                        <span className="font-bold text-gray-900">{log.agent_name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    {log.response}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Model Analysis</span>
                    <span className={`text-[10px] font-bold ${log.response.includes('BUY') ? 'text-green-600' : log.response.includes('SELL') ? 'text-red-600' : 'text-gray-500'}`}>
                        {log.response.split('.')[0]}
                    </span>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default AILogs;
