import React from 'react';
import { Shield, Lock, UserCog, Terminal } from 'lucide-react';

export const AuditLogCard = () => {
  const logs = [
    { id: 1, action: 'LOGIN_SUCCESS', user: 'admin_sys', ip: '192.168.1.42', time: '09:41:22' },
    { id: 2, action: 'LEASE_MODIFIED', user: 'mgr_jdoe', ip: '10.0.0.12', time: '09:38:15' },
    { id: 3, action: 'PAYMENT_GATEWAY', user: 'system', ip: 'localhost', time: '09:30:00' },
  ];

  return (
    <div className="w-full font-mono text-xs">
        <div className="flex items-center justify-between mb-4 text-neon-blue opacity-80">
            <div className="flex items-center gap-2">
                <Terminal size={14} />
                <span>SYS.AUDIT_LOG</span>
            </div>
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-ping" />
                <span className="text-[10px]">LIVE</span>
            </div>
        </div>

        <div className="space-y-1">
            {logs.map((log) => (
                <div 
                    key={log.id} 
                    className="flex items-center gap-3 p-2 rounded hover:bg-neon-blue/5 transition-colors border-l-2 border-transparent hover:border-neon-blue cursor-default"
                >
                    <span className="text-gray-500 select-none">{log.time}</span>
                    <span className={`
                        ${log.action.includes('LOGIN') ? 'text-green-400' : ''}
                        ${log.action.includes('LEASE') ? 'text-yellow-400' : ''}
                        ${log.action.includes('PAYMENT') ? 'text-purple-400' : ''}
                    `}>
                        {log.action}
                    </span>
                    <span className="text-gray-400 ml-auto truncate max-w-[100px]">{log.user}</span>
                </div>
            ))}
             {/* Fake cursor blinking effect at the bottom */}
            <div className="p-2 text-neon-blue animate-pulse">_</div>
        </div>
    </div>
  );
};