"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProfiles = listProfiles;
exports.listUsers = listUsers;
exports.listTechnicians = listTechnicians;
exports.createUser = createUser;
exports.updateUser = updateUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_js_1 = require("../../config/database.js");
const audit_js_1 = require("../../utils/audit.js");
async function listProfiles(req, res) {
    try {
        const resDb = await (0, database_js_1.query)('SELECT id, codigo, nome, descricao FROM perfis ORDER BY nome ASC');
        return res.json({ profiles: resDb.rows });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao listar perfis' });
    }
}
async function listUsers(req, res) {
    try {
        const { search, perfil, setor_id, ativo } = req.query;
        let sql = `
      SELECT u.id, u.nome, u.re, u.login, u.email, u.cargo, u.ativo, u.pode_atender, u.created_at,
             p.codigo as perfil_codigo, p.nome as perfil_nome,
             s.id as setor_id, s.nome as setor_nome, s.sigla as setor_sigla
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN setores s ON s.id = u.setor_id
      WHERE 1=1
    `;
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (u.nome ILIKE $${params.length} OR u.login ILIKE $${params.length} OR u.re ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }
        if (perfil) {
            params.push(perfil);
            sql += ` AND p.codigo = $${params.length}`;
        }
        if (setor_id) {
            params.push(setor_id);
            sql += ` AND u.setor_id = $${params.length}`;
        }
        if (ativo !== undefined && ativo !== '') {
            params.push(ativo === 'true');
            sql += ` AND u.ativo = $${params.length}`;
        }
        sql += ' ORDER BY u.nome ASC';
        const result = await (0, database_js_1.query)(sql, params);
        return res.json({ users: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
}
async function listTechnicians(req, res) {
    try {
        const sql = `
      SELECT u.id, u.nome, u.re, u.login, u.email, u.cargo, u.ativo,
             s.nome as setor_nome,
             COUNT(c.id) FILTER (WHERE c.status IN ('aberto', 'em_triagem', 'em_atendimento', 'aguardando_usuario', 'aguardando_terceiro')) as chamados_em_aberto
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN setores s ON s.id = u.setor_id
      LEFT JOIN chamados c ON c.tecnico_id = u.id
      WHERE u.ativo = true AND (u.pode_atender = true OR p.codigo IN ('tecnico', 'gestor', 'master'))
      GROUP BY u.id, u.nome, u.re, u.login, u.email, u.cargo, u.ativo, s.nome
      ORDER BY chamados_em_aberto ASC, u.nome ASC
    `;
        const result = await (0, database_js_1.query)(sql);
        return res.json({ technicians: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar técnicos:', error);
        return res.status(500).json({ error: 'Erro ao listar técnicos' });
    }
}
async function createUser(req, res) {
    try {
        const { nome, re, login, email, senha, perfil_id, setor_id, pode_atender, cargo } = req.body;
        if (!nome || !re || !login || !senha || !perfil_id) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
        }
        const checkExists = await (0, database_js_1.query)('SELECT id FROM usuarios WHERE login = $1 OR re = $2', [login.trim(), re.trim()]);
        if (checkExists.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe um usuário com este Login ou R.E.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const senhaHash = await bcryptjs_1.default.hash(senha, salt);
        const inserted = await (0, database_js_1.query)(`INSERT INTO usuarios (nome, re, login, email, senha_hash, perfil_id, setor_id, pode_atender, cargo, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, nome, re, login, email, cargo, ativo, pode_atender, created_at`, [
            nome.trim(),
            re.trim(),
            login.trim().toLowerCase(),
            email ? email.trim() : null,
            senhaHash,
            perfil_id,
            setor_id || null,
            Boolean(pode_atender),
            cargo ? cargo.trim() : null,
        ]);
        const newUser = inserted.rows[0];
        await (0, audit_js_1.logAudit)(req, req.user.id, 'criacao_usuario', 'usuarios', newUser.id, null, newUser);
        return res.status(201).json({ user: newUser });
    }
    catch (error) {
        console.error('Erro ao criar usuário:', error);
        return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
}
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { nome, re, login, email, senha, perfil_id, setor_id, pode_atender, cargo, ativo } = req.body;
        const currentRes = await (0, database_js_1.query)('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const current = currentRes.rows[0];
        let senhaHash = current.senha_hash;
        if (senha && senha.trim().length >= 6) {
            const salt = await bcryptjs_1.default.genSalt(10);
            senhaHash = await bcryptjs_1.default.hash(senha.trim(), salt);
        }
        const updated = await (0, database_js_1.query)(`UPDATE usuarios
       SET nome = COALESCE($1, nome),
           re = COALESCE($2, re),
           login = COALESCE($3, login),
           email = COALESCE($4, email),
           senha_hash = $5,
           perfil_id = COALESCE($6, perfil_id),
           setor_id = COALESCE($7, setor_id),
           pode_atender = COALESCE($8, pode_atender),
           cargo = COALESCE($9, cargo),
           ativo = COALESCE($10, ativo),
           updated_at = NOW()
       WHERE id = $11
       RETURNING id, nome, re, login, email, cargo, ativo, pode_atender, updated_at`, [
            nome ? nome.trim() : null,
            re ? re.trim() : null,
            login ? login.trim().toLowerCase() : null,
            email !== undefined ? email : null,
            senhaHash,
            perfil_id || null,
            setor_id || null,
            pode_atender !== undefined ? pode_atender : null,
            cargo !== undefined ? cargo : null,
            ativo !== undefined ? ativo : null,
            id,
        ]);
        await (0, audit_js_1.logAudit)(req, req.user.id, 'edicao_usuario', 'usuarios', id, current, updated.rows[0]);
        return res.json({ user: updated.rows[0] });
    }
    catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
}
