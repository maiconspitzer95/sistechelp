"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const database_js_1 = require("../config/database.js");
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticação não fornecido' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
        const sql = `
      SELECT u.id, u.nome, u.re, u.login, u.email, u.setor_id, u.pode_atender, u.ativo,
             p.codigo as perfil_codigo, p.nome as perfil_nome, p.permissoes,
             s.nome as setor_nome, s.sigla as setor_sigla
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN setores s ON s.id = u.setor_id
      WHERE u.id = $1
    `;
        const result = await (0, database_js_1.query)(sql, [decoded.id]);
        if (result.rows.length === 0 || !result.rows[0].ativo) {
            return res.status(401).json({ error: 'Usuário inválido ou inativo no sistema' });
        }
        const row = result.rows[0];
        req.user = {
            id: row.id,
            nome: row.nome,
            re: row.re,
            login: row.login,
            email: row.email,
            perfil_codigo: row.perfil_codigo,
            perfil_nome: row.perfil_nome,
            permissoes: Array.isArray(row.permissoes) ? row.permissoes : [],
            setor_id: row.setor_id,
            setor_nome: row.setor_nome,
            setor_sigla: row.setor_sigla,
            pode_atender: Boolean(row.pode_atender),
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Sessão expirada ou token inválido' });
    }
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        if (req.user.perfil_codigo === 'master') {
            return next(); // Master tem acesso total irrestrito
        }
        if (!allowedRoles.includes(req.user.perfil_codigo)) {
            return res.status(403).json({ error: 'Acesso negado para o seu perfil de usuário' });
        }
        next();
    };
}
