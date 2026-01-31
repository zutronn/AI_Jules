import React from 'react';

const AILogs = ({ logs }: { logs: any[] }) => {
  return (
    <div className="p-4 bg-gray-900 text-green-400 rounded-lg shadow-md font-mono text-xs h-64 overflow-y-auto">
      <h2 className="text-sm font-bold mb-2 text-white uppercase tracking-wider">AI Orchestration Logs</h2>
      {logs.map((log) => (
        <div key={log.id} className="mb-1">
          <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
          <span className="text-blue-400">[{log.agent_name}]</span>{' '}
          {log.response}
        </div>
      ))}
    </div>
  );
};

export default AILogs;
