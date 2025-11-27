import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Mic, X, Sparkles, Cpu, Activity, Loader2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { aiOperatingSystemService } from '../../services/AIOperatingSystemService';
import { AISystemMessage } from '../../types/ai-operating-system';

export const AIOperatingSystem: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  // Initialize messages based on authentication status
  const getInitialMessages = (): AISystemMessage[] => {
    if (user && token) {
      return [
        {
          id: 'init-1',
          type: 'system',
          content: 'PMS.OS Neural Interface Initialized. Ready for commands.',
          timestamp: new Date(),
        },
      ];
    } else {
      return [
        {
          id: 'init-1',
          type: 'system',
          content: 'PMS.OS Neural Interface Initialized. Welcome! I can help you find properties, answer questions, and guide you through the rental application process.',
          timestamp: new Date(),
        },
      ];
    }
  };

  const [messages, setMessages] = useState<AISystemMessage[]>(getInitialMessages());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        // Auto-send after voice input
        setTimeout(() => {
          handleSendMessage();
        }, 100);
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Load proactive suggestions when opening (only for authenticated users)
  useEffect(() => {
    if (isOpen && user && token) {
      loadProactiveSuggestions();
    } else if (isOpen && !user) {
      // For unauthenticated users, show helpful initial message
      const welcomeMsg: AISystemMessage = {
        id: `welcome-${Date.now()}`,
        type: 'ai',
        content: 'Hello! I\'m here to help you find your perfect rental property. You can ask me about:\n\n• Available properties and units\n• Rental application process\n• Property features and amenities\n• Scheduling tours\n• General questions about renting\n\nWhat would you like to know?',
        timestamp: new Date(),
        confidence: 0.95,
      };
      setMessages(prev => {
        // Only add welcome message if it's not already there
        if (!prev.some(msg => msg.id.startsWith('welcome-'))) {
          return [...prev, welcomeMsg];
        }
        return prev;
      });
    }
  }, [isOpen, user, token]);

  const loadProactiveSuggestions = async () => {
    if (!user || !token) return;
    try {
      const context = {
        userId: user.sub || user.id || '',
        username: user.username || '',
        role: (user.role as 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN') || 'TENANT',
        currentPage: location.pathname,
        currentRoute: location.pathname,
      };
      const suggestions = await aiOperatingSystemService.getProactiveSuggestions(context);
      if (suggestions.length > 0) {
        const suggestionMsg: AISystemMessage = {
          id: `suggestion-${Date.now()}`,
          type: 'ai',
          content: `💡 Proactive Suggestion: ${suggestions[0].title} - ${suggestions[0].description}`,
          timestamp: new Date(),
          metadata: {
            suggestion: suggestions[0],
          },
        };
        setMessages(prev => [...prev, suggestionMsg]);
      }
    } catch (error) {
      console.error('Failed to load proactive suggestions:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const newUserMsg: AISystemMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // Get user context (handle unauthenticated users)
      const userId = user?.sub || user?.id || `guest-${Date.now()}`;
      const context = {
        userId: userId,
        username: user?.username || 'Guest',
        role: (user?.role as 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN') || undefined,
        currentPage: location.pathname,
        currentRoute: location.pathname,
      };

      // Send message to AI service (works without token for basic features)
      const result = await aiOperatingSystemService.sendMessage(
        userId,
        messageText,
        sessionId,
        token || undefined,
        context,
      );

      setSessionId(result.sessionId);

      // Handle command execution
      if (result.response.type === 'command' && result.response.metadata?.commandResult) {
        const commandResult = result.response.metadata.commandResult;
        if (commandResult.success && commandResult.action.type === 'navigate') {
          // Execute navigation
          if (commandResult.action.target) {
            navigate(commandResult.action.target);
          }
        }
      }

      // Add AI response
      setMessages(prev => [...prev, result.response]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: AISystemMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        confidence: 0,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setIsListening(false);
      }
    }
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
        <div className="fixed  z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          
          {/* Main Glass Container */}
          <div className="
            w-full max-w-[95vw] h-[80vh] flex flex-col
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
                        : msg.type === 'command'
                        ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 rounded-tl-none'
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}
                  `}>
                    {msg.type !== 'system' && msg.content}
                    {msg.type === 'system' && <div className="flex items-center justify-center gap-2"><Activity size={10}/> {msg.content}</div>}
                    
                    {/* Suggested Actions */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.suggestedActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (action.action === 'navigate' && action.params?.path) {
                                navigate(action.params.path);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded-md text-neon-purple transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Confidence Meter for AI */}
                    {msg.confidence && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-neon-purple uppercase font-bold opacity-70">
                        <Sparkles size={10} />
                        Confidence Score: {Math.round(msg.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 text-gray-200 rounded-2xl rounded-tl-none p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-neon-purple" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
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
                  placeholder={user && token 
                    ? "Ask PMS.OS to analyze rents, draft leases, or check maintenance..."
                    : "Ask about available properties, rental applications, or property features..."}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 font-mono text-sm h-10"
                  autoFocus
                  aria-label="AI assistant input"
                  aria-describedby="ai-input-description"
                />
                
                {/* Mic Button */}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                    aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                    aria-pressed={isListening}
                  >
                    <Mic size={18} />
                  </button>
                )}

                {/* Send Button */}
                <button 
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2 bg-neon-purple/20 hover:bg-neon-purple text-neon-purple hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
              
              {/* Quick Actions / Hints */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(user && token 
                  ? ['Draft Lease Renewal', 'Analyze Market Rates', 'Show Vacancies', 'Email All Tenants']
                  : ['Show Available Properties', 'How to Apply', 'Schedule a Tour', 'Property Features']
                ).map((action) => (
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