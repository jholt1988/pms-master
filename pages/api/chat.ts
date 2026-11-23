import { Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

// Ensure a single Socket.io server instance per Node process
let io: IOServer | null = null;

export const config = {
  api: {
    bodyParser: false,
  },
};

function allowedChatOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
  return origins.length > 0 ? origins : ['http://localhost:3000'];
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!io) {
    const server = res.socket?.server as HTTPServer;
    io = new IOServer(server, {
      path: '/api/socket.io',
      cors: { origin: allowedChatOrigins(), methods: ['GET', 'POST'] },
    });
    io.on('connection', (socket) => {
      console.log('New socket connected', socket.id);
      socket.on('chatMessage', (msg) => {
        // broadcast to all clients
        io?.emit('chatMessage', msg);
      });
      socket.on('notification', (note) => {
        io?.emit('notification', note);
      });
    });
  }
  // Keep the connection open for socket.io
  res.end();
}
