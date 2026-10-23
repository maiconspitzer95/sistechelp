"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.getSocketIO = getSocketIO;
const socket_io_1 = require("socket.io");
let io = null;
function initSocketIO(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*', // Permite rede interna e desenvolvimento
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        // Entrar na sala pública de um chamado
        socket.on('join_ticket', (ticketId) => {
            socket.join(`ticket_${ticketId}`);
        });
        // Entrar na sala privada da equipe técnica de um chamado
        socket.on('join_ticket_staff', (ticketId) => {
            socket.join(`ticket_${ticketId}_staff`);
        });
        // Sair de uma sala
        socket.on('leave_ticket', (ticketId) => {
            socket.leave(`ticket_${ticketId}`);
            socket.leave(`ticket_${ticketId}_staff`);
        });
        socket.on('disconnect', () => { });
    });
    return io;
}
function getSocketIO() {
    return io;
}
