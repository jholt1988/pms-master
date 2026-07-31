import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
}

export function useChatSocket() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socket.io' });
    socketRef.current = socket;
    socket.on('connect', () => {
      console.log('socket connected', socket.id);
    });
    socket.on('chatMessage', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = (msg: Omit<ChatMessage, 'timestamp'>) => {
    const fullMsg = { ...msg, timestamp: Date.now() };
    socketRef.current?.emit('chatMessage', fullMsg);
    setMessages((prev) => [...prev, fullMsg]);
  };

  return { messages, sendMessage };
}
