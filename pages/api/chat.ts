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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!io) {
    const server = res.socket?.server as HTTPServer;
    io = new IOServer(server, {
      path: '/api/socket.io',
      // allow CORS for dev; adjust for prod
      cors: { origin: '*', methods: ['GET', 'POST'] },
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
