"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
exports.startServer = startServer;
exports.setupGracefulShutdown = setupGracefulShutdown;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_js_1 = require("./config/env.js");
const database_js_1 = require("./config/database.js");
const socket_js_1 = require("./config/socket.js");
// Importar rotas
const auth_routes_js_1 = __importDefault(require("./modules/auth/auth.routes.js"));
const users_routes_js_1 = __importDefault(require("./modules/users/users.routes.js"));
const sectors_routes_js_1 = __importDefault(require("./modules/sectors/sectors.routes.js"));
const tickets_routes_js_1 = __importDefault(require("./modules/tickets/tickets.routes.js"));
const chat_routes_js_1 = __importDefault(require("./modules/chat/chat.routes.js"));
const assistant_routes_js_1 = __importDefault(require("./modules/assistant/assistant.routes.js"));
const dashboard_routes_js_1 = __importDefault(require("./modules/dashboard/dashboard.routes.js"));
const notifications_routes_js_1 = __importDefault(require("./modules/notifications/notifications.routes.js"));
const knowledge_routes_js_1 = __importDefault(require("./modules/knowledge/knowledge.routes.js"));
const audit_routes_js_1 = __importDefault(require("./modules/audit/audit.routes.js"));
exports.app = (0, express_1.default)();
exports.server = http_1.default.createServer(exports.app);
// Inicializar Socket.IO no mesmo servidor HTTP
(0, socket_js_1.initSocketIO)(exports.server);
// Middlewares
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({ limit: '20mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Servir uploads estáticos com segurança
const uploadsPath = path_1.default.resolve(process.cwd(), env_js_1.env.UPLOAD_DIR);
if (!fs_1.default.existsSync(uploadsPath)) {
    try {
        fs_1.default.mkdirSync(uploadsPath, { recursive: true });
    }
    catch (err) {
        console.warn(`Aviso ao criar diretório de uploads: ${err.message}`);
    }
}
exports.app.use('/uploads', express_1.default.static(uploadsPath));
// Health check para monitoramento do Windows Server e PM2
exports.app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        const dbRes = await database_js_1.pool.query('SELECT NOW() AS now, current_database() AS db');
        if (dbRes.rows && dbRes.rows.length > 0) {
            dbStatus = 'connected';
        }
    }
    catch (err) {
        dbStatus = 'error: ' + (err.message || 'unknown');
    }
    res.json({
        status: 'online',
        app: 'Sistech Desk - Santa Casa de Pelotas',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: dbStatus,
        environment: env_js_1.env.NODE_ENV,
        port: env_js_1.env.PORT,
    });
});
// Rotas da API REST
exports.app.use('/api/auth', auth_routes_js_1.default);
exports.app.use('/api/users', users_routes_js_1.default);
exports.app.use('/api/sectors', sectors_routes_js_1.default);
exports.app.use('/api/tickets', tickets_routes_js_1.default);
exports.app.use('/api/chat', chat_routes_js_1.default);
exports.app.use('/api/assistant', assistant_routes_js_1.default);
exports.app.use('/api/dashboard', dashboard_routes_js_1.default);
exports.app.use('/api/notifications', notifications_routes_js_1.default);
exports.app.use('/api/knowledge', knowledge_routes_js_1.default);
exports.app.use('/api/audit', audit_routes_js_1.default);
// Tratamento de 404 exclusivo para rotas da API (não cai no fallback do React)
exports.app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado na API do Sistech Desk' });
});
// Localização dos arquivos compilados do frontend (raiz/dist ou client/dist)
const distPath = fs_1.default.existsSync(path_1.default.resolve(process.cwd(), 'dist', 'index.html'))
    ? path_1.default.resolve(process.cwd(), 'dist')
    : fs_1.default.existsSync(path_1.default.resolve(__dirname, '../../dist', 'index.html'))
        ? path_1.default.resolve(__dirname, '../../dist')
        : path_1.default.resolve(__dirname, '../../../dist');
// Servir arquivos estáticos do frontend React compilado
if (fs_1.default.existsSync(distPath)) {
    exports.app.use(express_1.default.static(distPath));
}
// Fallback para rotas do React Router (SPA)
exports.app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ error: 'Endpoint não encontrado' });
    }
    const indexPath = path_1.default.join(distPath, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    return res.status(503).send('<!doctype html><html><head><meta charset="utf-8"><title>Sistech Desk</title></head>' +
        '<body style="font-family:Segoe UI, sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">' +
        '<h2>Sistech Desk — Central de Chamados Internos</h2>' +
        '<p>Frontend ainda não foi compilado ou index.html não foi encontrado.</p>' +
        '<p>Execute <code>npm run build</code> para gerar os arquivos estáticos.</p>' +
        '</body></html>');
});
// Inicialização do servidor
async function startServer() {
    const PORT = env_js_1.env.PORT;
    const HOST = env_js_1.env.HOST;
    // Testar conectividade com PostgreSQL
    try {
        const dbRes = await database_js_1.pool.query('SELECT NOW() AS now, current_database() AS db');
        console.log(`✅ Banco de dados PostgreSQL conectado com sucesso [banco: ${dbRes.rows[0].db}]`);
    }
    catch (err) {
        console.warn(`⚠️ PostgreSQL não conectado na inicialização: ${err.message}`);
        console.warn(`⚠️ O servidor continuará em execução para servir o frontend e endpoints de saúde.`);
    }
    exports.server.listen(PORT, HOST, () => {
        console.log(`=======================================================`);
        console.log(`🚀 Sistech Desk rodando em http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`🏥 Santa Casa de Pelotas - Tecnologia da Informação`);
        console.log(`🌐 Ambiente: ${env_js_1.env.NODE_ENV}`);
        console.log(`📁 Frontend estático: ${distPath}`);
        console.log(`=======================================================`);
    });
}
// Encerramento gracioso
function setupGracefulShutdown() {
    const shutdown = (signal) => {
        console.log(`\n🛑 Sinal ${signal} recebido. Encerrando Sistech Desk graciosamente...`);
        exports.server.close(async () => {
            console.log('🔒 Servidor HTTP encerrado com sucesso.');
            try {
                await database_js_1.pool.end();
                console.log('🔒 Conexões com PostgreSQL encerradas.');
            }
            catch (err) {
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
