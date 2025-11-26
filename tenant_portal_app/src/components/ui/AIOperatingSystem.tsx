import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, X, Sparkles, Cpu, Activity } from 'lucide-react';

// Types for our AI messages
interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
}

export const AIOperatingSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      type: 'system',
      content: 'PMS.OS Neural Interface Initialized. Ready for commands.',
      timestamp: new Date(),
    },
    {
      id: 'init-2',
      type: 'ai',
      content: 'Good evening, Property Manager. I have analyzed 14 new maintenance requests and optimized 3 lease renewals. How can I assist?',
      timestamp: new Date(),
    }
  ]);

  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    // Simulate AI "Thinking" delay then response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm processing that request against the current market data...",
        timestamp: new Date(),
        confidence: 0.98
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <>
      {/* --- THE ORB (Always Visible in Header) --- */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`
          relative group flex items-center justify-center gap-3 px-4 py-2
          rounded-full transition-all duration-500
          ${isOpen ? 'bg-neon-purple/10 border-neon-purple' : 'hover:bg-white/5 border-transparent'}
          border
        `}
        aria-label="Open AI Assistant"
        aria-expanded={isOpen}
      >
        {/* Text Label */}
        <span className="text-xs font-mono text-neon-purple tracking-widest hidden md:block">
          AI ASSISTANT
        </span>

        {/* The Orb Visual */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-neon-purple rounded-full blur-md opacity-40 animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple to-blue-500 rounded-full opacity-80"></div>
          
          {/* Inner Core Animation */}
          <div className="absolute inset-[2px] bg-deep-900 rounded-full z-10 flex items-center justify-center overflow-hidden">
             <div className={`w-full h-full bg-neon-purple opacity-20 rounded-full ${isOpen ? 'animate-ping' : ''}`}></div>
          </div>
          
          <Sparkles size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white z-20" />
        </div>
      </button>

      {/* --- HOLOGRAPHIC INTERFACE OVERLAY --- */}
      {/* Only renders when open. Uses a fixed positioning to overlay the screen content */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          
          {/* Main Glass Container */}
          <div className="
            w-full max-w-2xl h-[80vh] flex flex-col
            bg-glass-surface backdrop-blur-xl border border-glass-highlight
            rounded-3xl shadow-[0_0_100px_-20px_rgba(112,0,255,0.3)]
            overflow-hidden animate-in zoom-in-95 duration-300
          ">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Cpu className="text-neon-purple" size={20} />
                <div>
                  <h2 className="text-white font-sans text-lg tracking-wide">PMS.OS CO-PILOT</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-400 font-mono">ONLINE • 98% TOKEN EFFICIENCY</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="Close AI Assistant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Stream Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed
                    ${msg.type === 'user' 
                      ? 'bg-neon-blue/20 border border-neon-blue/50 text-white rounded-br-none' 
                      : msg.type === 'system'
                        ? 'w-full bg-transparent border-b border-white/5 text-gray-500 font-mono text-xs py-2'
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}
                  `}>
                    {msg.type !== 'system' && msg.content}
                    {msg.type === 'system' && <div className="flex items-center justify-center gap-2"><Activity size={10}/> {msg.content}</div>}
                    
                    {/* Confidence Meter for AI */}
                    {msg.confidence && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-neon-purple uppercase font-bold opacity-70">
                        <Sparkles size={10} />
                        Confidence Score: {msg.confidence * 100}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area (The "Command Deck") */}
            <div className="p-4 bg-deep-900/50 border-t border-white/10">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-2 pl-4 focus-within:border-neon-purple/50 transition-colors"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask PMS.OS to analyze rents, draft leases, or check maintenance..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 font-mono text-sm h-10"
                  autoFocus
                  aria-label="AI assistant input"
                  aria-describedby="ai-input-description"
                />
                
                {/* Mic Button */}
                <button
                  type="button"
                  onClick={() => setIsListening(!isListening)}
                  className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  aria-pressed={isListening}
                >
                  <Mic size={18} />
                </button>

                {/* Send Button */}
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-2 bg-neon-purple/20 hover:bg-neon-purple text-neon-purple hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              
              {/* Quick Actions / Hints */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['Draft Lease Renewal', 'Analyze Market Rates', 'Show Vacancies', 'Email All Tenants'].map((action) => (
                  <button 
                    key={action}
                    onClick={() => setInputValue(action)}
                    className="whitespace-nowrap px-3 py-1 rounded-md border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-neon-blue hover:border-neon-blue/50 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};