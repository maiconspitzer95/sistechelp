import { io, Socket } from 'socket.io-client';

// Se VITE_SOCKET_URL não for definido, o Socket.IO conecta na mesma origem (IP + porta) da aplicação
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = SOCKET_URL
      ? io(SOCKET_URL, {
          autoConnect: true,
          transports: ['websocket', 'polling'],
        })
      : io({
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
