"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getMe = getMe;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_js_1 = require("../../config/database.js");
const env_js_1 = require("../../config/env.js");
const audit_js_1 = require("../../utils/audit.js");
async function login(req, res) {
    try {
        const { loginOrRe, senha } = req.body;
        if (!loginOrRe || !senha) {
            return res.status(400).json({ error: 'Informe o Usuário/R.E. e a Senha' });
        }
        const trimmedInput = loginOrRe.trim();
        const sql = `
      SELECT u.id, u.nome, u.re, u.login, u.email, u.senha_hash, u.ativo, u.pode_atender, u.cargo,
             p.codigo as perfil_codigo, p.nome as perfil_nome, p.permissoes,
             s.id as setor_id, s.nome as setor_nome, s.sigla as setor_sigla
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN setores s ON s.id = u.setor_id
      WHERE LOWER(u.login) = LOWER($1) OR u.re = $1
    `;
        const result = await (0, database_js_1.query)(sql, [trimmedInput]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
        const user = result.rows[0];
        if (!user.ativo) {
            return res.status(403).json({ error: 'Usuário inativo. Procure a equipe de TI ou o gestor.' });
        }
        const passwordMatch = await bcryptjs_1.default.compare(senha, user.senha_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, perfil: user.perfil_codigo }, env_js_1.env.JWT_SECRET, { expiresIn: env_js_1.env.JWT_EXPIRES_IN });
        await (0, audit_js_1.logAudit)(req, user.id, 'login', 'usuarios', user.id, null, { login: user.login });
        return res.json({
            token,
            user: {
                id: user.id,
                nome: user.nome,
                re: user.re,
                login: user.login,
                email: user.email,
                cargo: user.cargo,
                perfil_codigo: user.perfil_codigo,
                perfil_nome: user.perfil_nome,
                permissoes: user.permissoes,
                setor_id: user.setor_id,
                setor_nome: user.setor_nome,
                setor_sigla: user.setor_sigla,
                pode_atender: user.pode_atender,
            },
        });
    }
    catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno ao realizar autenticação' });
    }
}
async function getMe(req, res) {
    return res.json({ user: req.user });
}
async function changePassword(req, res) {
    try {
        const { senhaAtual, novaSenha } = req.body;
        if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
            return res.status(400).json({ error: 'A nova senha deve possuir pelo menos 6 caracteres' });
        }
        const userRes = await (0, database_js_1.query)('SELECT senha_hash FROM usuarios WHERE id = $1', [req.user.id]);
        const valid = await bcryptjs_1.default.compare(senhaAtual, userRes.rows[0].senha_hash);
        if (!valid) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const novoHash = await bcryptjs_1.default.hash(novaSenha, salt);
        await (0, database_js_1.query)('UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2', [novoHash, req.user.id]);
        await (0, audit_js_1.logAudit)(req, req.user.id, 'alteracao_senha', 'usuarios', req.user.id);
        return res.json({ message: 'Senha atualizada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao alterar senha:', error);
        return res.status(500).json({ error: 'Erro ao alterar senha' });
    }
}
