"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const database_js_1 = require("../config/database.js");
async function logAudit(req, usuarioId, acao, entidade, entidadeId = null, dadosAnteriores = null, dadosNovos = null) {
    try {
        const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Desconhecido';
        await (0, database_js_1.query)(`INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_anteriores, dados_novos, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            usuarioId,
            acao,
            entidade,
            entidadeId,
            dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
            dadosNovos ? JSON.stringify(dadosNovos) : null,
            ip,
            userAgent,
        ]);
    }
    catch (error) {
        console.error('Erro ao registrar log de auditoria:', error);
    }
}
