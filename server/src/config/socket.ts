import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from './env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Permite rede interna e desenvolvimento
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Entrar na sala pública de um chamado
    socket.on('join_ticket', (ticketId: string) => {
      socket.join(`ticket_${ticketId}`);
    });

    // Entrar na sala privada da equipe técnica de um chamado
    socket.on('join_ticket_staff', (ticketId: string) => {
      socket.join(`ticket_${ticketId}_staff`);
    });

    // Sair de uma sala
    socket.on('leave_ticket', (ticketId: string) => {
      socket.leave(`ticket_${ticketId}`);
      socket.leave(`ticket_${ticketId}_staff`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}
