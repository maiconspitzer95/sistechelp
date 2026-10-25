import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { pool } from './config/database.js';
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

export const app = express();
export const server = http.createServer(app);

// Inicializar Socket.IO no mesmo servidor HTTP
initSocketIO(server);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir uploads estáticos com segurança
const uploadsPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err: any) {
    console.warn(`Aviso ao criar diretório de uploads: ${err.message}`);
  }
}
app.use('/uploads', express.static(uploadsPath));

// Health check para monitoramento do Windows Server e PM2
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const dbRes = await pool.query('SELECT NOW() AS now, current_database() AS db');
    if (dbRes.rows && dbRes.rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch (err: any) {
    dbStatus = 'error: ' + (err.message || 'unknown');
  }

  res.json({
    status: 'online',
    app: 'Sistech Desk - Santa Casa de Pelotas',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: env.NODE_ENV,
    port: env.PORT,
  });
});

// Rotas da API REST
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

// Tratamento de 404 exclusivo para rotas da API (não cai no fallback do React)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado na API do Sistech Desk' });
});

// Localização dos arquivos compilados do frontend (raiz/dist ou client/dist)
const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
  ? path.resolve(process.cwd(), 'dist')
  : fs.existsSync(path.resolve(__dirname, '../../dist', 'index.html'))
    ? path.resolve(__dirname, '../../dist')
    : path.resolve(__dirname, '../../../dist');

// Servir arquivos estáticos do frontend React compilado
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback para rotas do React Router (SPA)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(503).send(
    '<!doctype html><html><head><meta charset="utf-8"><title>Sistech Desk</title></head>' +
    '<body style="font-family:Segoe UI, sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">' +
    '<h2>Sistech Desk — Central de Chamados Internos</h2>' +
    '<p>Frontend ainda não foi compilado ou index.html não foi encontrado.</p>' +
    '<p>Execute <code>npm run build</code> para gerar os arquivos estáticos.</p>' +
    '</body></html>'
  );
});

// Inicialização do servidor
export async function startServer() {
  const PORT = env.PORT;
  const HOST = env.HOST;

  // Testar conectividade com PostgreSQL
  try {
    const dbRes = await pool.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`✅ Banco de dados PostgreSQL conectado com sucesso [banco: ${dbRes.rows[0].db}]`);
  } catch (err: any) {
    console.warn(`⚠️ PostgreSQL não conectado na inicialização: ${err.message}`);
    console.warn(`⚠️ O servidor continuará em execução para servir o frontend e endpoints de saúde.`);
  }

  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Sistech Desk rodando em http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`🏥 Santa Casa de Pelotas - Tecnologia da Informação`);
    console.log(`🌐 Ambiente: ${env.NODE_ENV}`);
    console.log(`📁 Frontend estático: ${distPath}`);
    console.log(`=======================================================`);
  });
}

// Encerramento gracioso
export function setupGracefulShutdown() {
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Sinal ${signal} recebido. Encerrando Sistech Desk graciosamente...`);
    server.close(async () => {
      console.log('🔒 Servidor HTTP encerrado com sucesso.');
      try {
        await pool.end();
        console.log('🔒 Conexões com PostgreSQL encerradas.');
      } catch (err: any) {
        console.error('Erro ao encerrar conexões com PostgreSQL:', err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️ Encerramento forçado por timeout de 10 segundos.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

setupGracefulShutdown();

// Iniciar se executado diretamente
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startServer().catch((err) => {
    console.error('💥 Erro fatal ao iniciar o servidor:', err);
    process.exit(1);
  });
}
