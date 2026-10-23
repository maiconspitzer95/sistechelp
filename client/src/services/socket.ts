import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function joinTicketRoom(ticketId: string, isStaff = false) {
  const s = getSocket();
  s.emit('join_ticket', ticketId);
  if (isStaff) {
    s.emit('join_ticket_staff', ticketId);
  }
}

export function leaveTicketRoom(ticketId: string) {
  const s = getSocket();
  s.emit('leave_ticket', ticketId);
}
