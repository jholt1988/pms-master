/**
 * Leasing Agent Bot Component
 * AI-powered leasing assistant for prospective tenants
 * Handles property inquiries, tours, and applications
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Maximize2, Home, Calendar, FileText, Phone } from 'lucide-react';
import { leasingAgentService, Message, LeadInfo } from '../services/LeasingAgentService';
import { useAuth } from '../AuthContext';

interface LeasingAgentBotProps {
  sessionId?: string;
  initialOpen?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  showContactForm?: boolean;
}

export const LeasingAgentBot: React.FC<LeasingAgentBotProps> = ({
  sessionId = 'session-' + Date.now(),
  initialOpen = false,
  position = 'bottom-right',
  showContactForm = true,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        console.log('Initializing leasing agent conversation...');
        const welcomeMsg = await leasingAgentService.startConversation(sessionId);
        console.log('Welcome message received:', welcomeMsg);
        setMessages([welcomeMsg]);
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setMessages([{
          role: 'assistant',
          content: '👋 Hi! I\'m your AI Leasing Agent. How can I help you find your perfect home today?',
          timestamp: new Date(),
        }]);
      }
    };

    if (messages.length === 0) {
      initConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    console.log('Sending message:', userMessage);
    setInputValue('');
    setIsLoading(true);
    setShowQuickActions(false);

    // Add user message to UI immediately
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log('Calling leasingAgentService.sendMessage...');
      const response = await leasingAgentService.sendMessage(sessionId, userMessage, token);
      console.log('Response received:', response);
      setMessages(prev => [...prev, response]);
      
      // Update lead info
      const updatedLead = leasingAgentService.getLeadInfo(sessionId);
      if (updatedLead) {
        console.log('Lead info updated:', updatedLead);
        setLeadInfo(updatedLead);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsLoading(true);
    setShowQuickActions(false);

    // Add user message to UI immediately
    const userMsg: Message = {
      role: 'user',
      content: action,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await leasingAgentService.sendMessage(sessionId, action, token);
      setMessages(prev => [...prev, response]);
      
      // Update lead info
      const updatedLead = leasingAgentService.getLeadInfo(sessionId);
      if (updatedLead) {
        setLeadInfo(updatedLead);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-6 right-6';
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          <div
            className={`text-xs mt-1 ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    if (!showQuickActions) return null;

    const actions = [
      { icon: Home, label: 'Browse Properties', message: 'Show me available properties' },
      { icon: Calendar, label: 'Schedule Tour', message: 'I want to schedule a property tour' },
      { icon: FileText, label: 'Apply Now', message: 'I want to start my application' },
      { icon: Phone, label: 'Contact Info', message: 'How can I contact you?' },
    ];

    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 mb-2 font-semibold">Quick Actions:</div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action.message)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors text-sm"
            >
              <action.icon className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLeadProgress = () => {
    if (!leadInfo) return null;

    const progressSteps = [
      { label: 'Contact Info', completed: !!(leadInfo.email && leadInfo.phone) },
      { label: 'Preferences', completed: !!(leadInfo.bedrooms && leadInfo.budget) },
      { label: 'Qualified', completed: leadInfo.status !== 'NEW' },
    ];

    return (
      <div className="px-4 py-2 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-800">Your Progress:</span>
          <div className="flex gap-1">
            {progressSteps.map((step, index) => (
              <div
                key={index}
                className={`w-16 h-1 rounded ${
                  step.completed ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                title={step.label}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className={`fixed ${getPositionClasses()} z-50 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group`}
        aria-label="Open Leasing Agent"
      >
        <div className="relative">
          <Home className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          💬 Chat with our AI Leasing Agent
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      } bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300`}
    >
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Home className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Leasing Agent</h3>
            <p className="text-xs text-blue-100">Here to help you find your home</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMinimize}
            className="hover:bg-blue-500 p-1 rounded transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleOpen}
            className="hover:bg-blue-500 p-1 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Lead Progress */}
          {renderLeadProgress()}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((msg, index) => renderMessage(msg, index))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg px-4 py-2 border border-gray-200">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Powered by AI • Available 24/7
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeasingAgentBot;
