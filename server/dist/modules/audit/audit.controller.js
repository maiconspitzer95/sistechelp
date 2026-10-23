"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
const database_js_1 = require("../../config/database.js");
async function listAuditLogs(req, res) {
    try {
        const { entidade, acao } = req.query;
        let sql = `
      SELECT a.id, a.acao, a.entidade, a.entidade_id, a.dados_anteriores, a.dados_novos,
             a.ip, a.user_agent, a.created_at,
             u.nome as usuario_nome, u.re as usuario_re, u.login as usuario_login
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE 1=1
    `;
        const params = [];
        if (entidade) {
            params.push(entidade);
            sql += ` AND a.entidade = $${params.length}`;
        }
        if (acao) {
            params.push(acao);
            sql += ` AND a.acao = $${params.length}`;
        }
        sql += ' ORDER BY a.created_at DESC LIMIT 100';
        const result = await (0, database_js_1.query)(sql, params);
        return res.json({ logs: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar auditoria:', error);
        return res.status(500).json({ error: 'Erro ao listar auditoria' });
    }
}
