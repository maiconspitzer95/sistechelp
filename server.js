/**
 * ==============================================================================
 * Sistech Desk — Central de Chamados Internos
 * Santa Casa de Pelotas — Tecnologia da Informação
 *
 * Servidor Principal Unificado (Node.js + Express + Socket.IO + React Build)
 * Ponto único de entrada da aplicação para ambiente de produção e PM2.
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');

// 1. Carregar variáveis de ambiente (.env)
const rootEnvPath = path.resolve(__dirname, '.env');
const serverEnvPath = path.resolve(__dirname, 'server', '.env');

// Garantir resolução de dependências no diretório raiz e em ./server/node_modules
const serverNodeModules = path.join(__dirname, 'server', 'node_modules');
if (fs.existsSync(serverNodeModules) && !module.paths.includes(serverNodeModules)) {
  module.paths.push(serverNodeModules);
}

const dotenv = require('dotenv');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

// 2. Verificar se o backend compilado existe
const compiledDbPath = path.join(__dirname, 'server', 'dist', 'config', 'database.js');
if (!fs.existsSync(compiledDbPath)) {
  console.error('=======================================================');
  console.error('❌ ERRO CRÍTICO: Backend compilado não encontrado!');
  console.error('👉 O diretório "server/dist" ainda não foi gerado.');
  console.error('👉 Execute o comando de compilação antes de iniciar:');
  console.error('      npm run build');
  console.error('=======================================================');
  process.exit(1);
}

const express = require('express');
const http = require('http');
const cors = require('cors');

// 3. Inicializar Express e Servidor HTTP compartilhado
const app = express();
const server = http.createServer(app);

// 4. Inicializar Socket.IO no mesmo servidor HTTP
const { initSocketIO } = require('./server/dist/config/socket.js');
initSocketIO(server);

// Conexão com o banco PostgreSQL
const { pool } = require('./server/dist/config/database.js');

// Configuração de portas e endereçamento de rede
const PORT = Number(process.env.PORT) || 5002;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares padrão
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir diretório de uploads
const uploadDirName = process.env.UPLOAD_DIR || 'uploads';
const uploadsPath = path.resolve(__dirname, uploadDirName);
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    console.warn(`Aviso ao criar diretório de uploads: ${err.message}`);
  }
}
app.use('/uploads', express.static(uploadsPath));

// 5. Rota de Health Check para monitoramento (Windows Server, PM2, Zabbix, etc.)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const dbRes = await pool.query('SELECT NOW() AS now, current_database() AS db');
    if (dbRes.rows && dbRes.rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'error: ' + (err.message || 'unknown');
  }

  res.json({
    status: 'online',
    app: 'Sistech Desk - Santa Casa de Pelotas',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
  });
});

// 6. Registrar Rotas da API REST
try {
  const authRoutes = require('./server/dist/modules/auth/auth.routes.js').default;
  const usersRoutes = require('./server/dist/modules/users/users.routes.js').default;
  const sectorsRoutes = require('./server/dist/modules/sectors/sectors.routes.js').default;
  const ticketsRoutes = require('./server/dist/modules/tickets/tickets.routes.js').default;
  const chatRoutes = require('./server/dist/modules/chat/chat.routes.js').default;
  const assistantRoutes = require('./server/dist/modules/assistant/assistant.routes.js').default;
  const dashboardRoutes = require('./server/dist/modules/dashboard/dashboard.routes.js').default;
  const notificationsRoutes = require('./server/dist/modules/notifications/notifications.routes.js').default;
  const knowledgeRoutes = require('./server/dist/modules/knowledge/knowledge.routes.js').default;
  const auditRoutes = require('./server/dist/modules/audit/audit.routes.js').default;

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
} catch (routeErr) {
  console.error('❌ Erro ao carregar rotas da API:', routeErr.message);
}

// 7. Tratamento de 404 exclusivo para a API (evita que caiam no fallback HTML do React)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado na API do Sistech Desk' });
});

// 8. Servir arquivos estáticos do Frontend compilado (React + Vite)
const distPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : fs.existsSync(path.join(__dirname, 'client', 'dist', 'index.html'))
    ? path.join(__dirname, 'client', 'dist')
    : path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 9. Fallback para rotas do React Router (SPA)
// Redireciona todas as rotas de navegação direta para o index.html, preservando /api e /socket.io
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(503).send(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<title>Sistech Desk — Frontend em Preparação</title>' +
    '<style>body{font-family:Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;' +
    'align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;}' +
    '.card{background:#1e293b;padding:40px;border-radius:16px;max-width:500px;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #334155;}' +
    'h1{color:#38bdf8;margin-bottom:12px;font-size:24px;}p{color:#94a3b8;font-size:14px;line-height:1.6;}' +
    'code{background:#0f172a;color:#fbbf24;padding:4px 8px;border-radius:4px;font-family:Consolas,monospace;}</style></head>' +
    '<body><div class="card"><h1>Sistech Desk — Santa Casa de Pelotas</h1>' +
    '<p>O servidor está ativo, porém os arquivos do frontend ainda não foram gerados.</p>' +
    '<p>Para compilar o frontend React, execute no terminal do projeto:</p>' +
    '<p><code>npm run build</code></p></div></body></html>'
  );
});

// 10. Tratamento global de erros da aplicação
app.use((err, req, res, next) => {
  console.error('💥 Erro interno no Express:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Erro interno no servidor do Sistech Desk' });
});

// 11. Inicialização do Servidor e Diagnóstico
async function startServer() {
  console.log('=======================================================');
  console.log('🏥 SISTECH DESK — CENTRAL DE CHAMADOS INTERNOS');
  console.log('   Santa Casa de Pelotas — Tecnologia da Informação');
  console.log('=======================================================');

  // Testar conectividade com PostgreSQL
  try {
    const dbRes = await pool.query('SELECT NOW() AS now, current_database() AS db');
    console.log(`✅ PostgreSQL conectado com sucesso [Banco: "${dbRes.rows[0].db}"]`);
  } catch (err) {
    console.warn(`⚠️ PostgreSQL não conectado no momento: ${err.message}`);
    console.warn(`⚠️ O servidor continuará ativo para responder à interface e requisições.`);
  }

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor unificado ativo: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`🌐 Porta única HTTP/WebSockets: ${PORT}`);
    console.log(`📁 Frontend servido a partir de: ${distPath}`);
    console.log(`🩺 Health check disponível em: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Ambiente: ${process.env.NODE_ENV || 'production'}`);
    console.log('=======================================================');
  });
}

// 12. Encerramento gracioso de conexões (Graceful Shutdown)
function gracefulShutdown(signal) {
  console.log(`\n🛑 Sinal ${signal} recebido. Encerrando Sistech Desk...`);

  server.close(async () => {
    console.log('🔒 Servidor HTTP encerrado.');
    try {
      await pool.end();
      console.log('🔒 Conexões com PostgreSQL finalizadas.');
    } catch (err) {
      console.error('Erro ao finalizar pool PostgreSQL:', err.message);
    }
    console.log('👋 Processo finalizado com segurança.');
    process.exit(0);
  });

  // Forçar encerramento caso trave por mais de 10 segundos
  setTimeout(() => {
    console.error('⚠️ Encerramento forçado por tempo limite excedido (10s).');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promessa rejeitada não tratada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Exceção não capturada:', err);
});

// Executar
startServer().catch((err) => {
  console.error('💥 Falha fatal na inicialização:', err);
  process.exit(1);
});
