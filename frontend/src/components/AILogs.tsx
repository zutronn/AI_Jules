import React from 'react';
import { Cpu } from 'lucide-react';

const AILogs = ({ logs }: { logs: any[] }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest">Model Chats</h2>
        <Cpu className="w-4 h-4 text-purple-600" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <Cpu className="w-8 h-8 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for insights...</p>
            </div>
        ) : (
            logs.map((log) => (
            <div key={log.id} className="space-y-2 group">
                <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center text-[10px] font-bold text-white">
                        {log.agent_name[0]}
                    </div>
                    <span className="font-black text-xs text-gray-900">{log.agent_name}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl rounded-tl-none border border-gray-100 group-hover:border-purple-100 transition-colors">
                  <p className="text-xs font-medium text-gray-600 leading-relaxed">
                      {log.response}
                  </p>
                </div>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest ml-1">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default AILogs;
