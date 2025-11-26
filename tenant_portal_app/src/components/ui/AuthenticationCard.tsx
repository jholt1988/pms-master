import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';

export const AuthenticationCard = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="w-full max-w-4xl mx-auto">
       {/* Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-black/20 p-1 rounded-full border border-white/10 backdrop-blur-md">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-6 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-all duration-300
                ${activeTab === tab 
                  ? 'bg-neon-blue/20 text-neon-blue shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                  : 'text-gray-500 hover:text-white'}
              `}
            >
              {tab === 'login' ? 'System Access' : 'New Identity'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Login Module */}
        <div className={`transition-opacity duration-500 ${activeTab === 'login' ? 'opacity-100' : 'opacity-50 blur-[1px]'}`}>
          <div className="p-8 rounded-2xl bg-glass-surface border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <Lock size={64} className="text-neon-blue" />
            </div>
            
            <h2 className="text-xl text-white font-light mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-neon-blue rounded-full shadow-[0_0_10px_#00f0ff]"></span>
              SECURE LOGIN
            </h2>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-mono">Identity Key (Email)</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={16} />
                    <input type="email" placeholder="user@system.net" className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-neon-blue/50 focus:outline-none transition-all font-mono text-sm" />
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-mono">Passcode</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={16} />
                    <input type="password" placeholder="••••••••" className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-neon-blue/50 focus:outline-none transition-all font-mono text-sm" />
                </div>
              </div>

              <button className="w-full py-3 bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/50 text-neon-blue rounded-lg transition-all flex items-center justify-center gap-2 group uppercase text-xs tracking-widest font-bold">
                Authenticate <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="text-center">
                 <button className="text-xs text-gray-500 hover:text-neon-blue transition-colors underline decoration-dotted">Recover Access Credentials</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Up Module */}
        <div className={`transition-opacity duration-500 ${activeTab === 'signup' ? 'opacity-100' : 'opacity-50 blur-[1px]'}`}>
           <div className="p-8 rounded-2xl bg-glass-surface border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20">
                <ShieldCheck size={64} className="text-neon-purple" />
            </div>

            <h2 className="text-xl text-white font-light mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-neon-purple rounded-full shadow-[0_0_10px_#7000ff]"></span>
              REGISTRATION
            </h2>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-mono">Full Designation</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-purple transition-colors" size={16} />
                    <input type="text" placeholder="Jane Doe" className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-neon-purple/50 focus:outline-none transition-all font-mono text-sm" />
                </div>
              </div>
              
              <div className="group">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-mono">Communication Link</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-purple transition-colors" size={16} />
                    <input type="email" placeholder="jane@example.com" className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-neon-purple/50 focus:outline-none transition-all font-mono text-sm" />
                </div>
              </div>

               <div className="group">
                <label className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 block font-mono">Security Token</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-neon-purple transition-colors" size={16} />
                    <input type="password" placeholder="Create Password" className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-neon-purple/50 focus:outline-none transition-all font-mono text-sm" />
                </div>
              </div>

              <button className="w-full py-3 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/50 text-neon-purple rounded-lg transition-all flex items-center justify-center gap-2 group uppercase text-xs tracking-widest font-bold">
                Initialize Account <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
           </div>
        </div>
      </div>
    </div>
  );
};