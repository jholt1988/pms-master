import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

export interface Notification {
  title: string;
  body: string;
  timestamp: number;
}

export function useNotificationSocket() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socket.io' });
    socketRef.current = socket;
    socket.on('notification', (note: Notification) => {
      setNotifications((prev) => [...prev, note]);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const sendNotification = (note: Omit<Notification, 'timestamp'>) => {
    const full = { ...note, timestamp: Date.now() };
    socketRef.current?.emit('notification', full);
    setNotifications((prev) => [...prev, full]);
  };

  return { notifications, sendNotification };
}
