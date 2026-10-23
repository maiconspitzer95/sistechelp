"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const env_js_1 = require("./config/env.js");
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
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Inicializar Socket.IO
(0, socket_js_1.initSocketIO)(server);
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Servir uploads estáticos com segurança
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
// Health check para monitoramento do Windows Server e PM2
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'Sistech Desk - Santa Casa de Pelotas',
        timestamp: new Date().toISOString(),
    });
});
// Rotas da API
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/users', users_routes_js_1.default);
app.use('/api/sectors', sectors_routes_js_1.default);
app.use('/api/tickets', tickets_routes_js_1.default);
app.use('/api/chat', chat_routes_js_1.default);
app.use('/api/assistant', assistant_routes_js_1.default);
app.use('/api/dashboard', dashboard_routes_js_1.default);
app.use('/api/notifications', notifications_routes_js_1.default);
app.use('/api/knowledge', knowledge_routes_js_1.default);
app.use('/api/audit', audit_routes_js_1.default);
// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado na API do Sistech Desk' });
});
// Iniciar servidor HTTP
const PORT = env_js_1.env.PORT;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Sistech Desk API rodando na porta ${PORT}`);
    console.log(`🏥 Santa Casa de Pelotas - Tecnologia da Informação`);
    console.log(`🌐 Ambiente: ${env_js_1.env.NODE_ENV}`);
    console.log(`=======================================================`);
});
