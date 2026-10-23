import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { initSocketIO } from './config/socket.js';

// Importar rotas
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import sectorsRoutes from './modules/sectors/sectors.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import assistantRoutes from './modules/assistant/assistant.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import knowledgeRoutes from './modules/knowledge/knowledge.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

const app = express();
const server = http.createServer(app);

// Inicializar Socket.IO
initSocketIO(server);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir uploads estáticos com segurança
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check para monitoramento do Windows Server e PM2
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Sistech Desk - Santa Casa de Pelotas',
    timestamp: new Date().toISOString(),
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sectors', sectorsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/audit', auditRoutes);

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado na API do Sistech Desk' });
});

// Iniciar servidor HTTP
const PORT = env.PORT;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Sistech Desk API rodando na porta ${PORT}`);
  console.log(`🏥 Santa Casa de Pelotas - Tecnologia da Informação`);
  console.log(`🌐 Ambiente: ${env.NODE_ENV}`);
  console.log(`=======================================================`);
});
