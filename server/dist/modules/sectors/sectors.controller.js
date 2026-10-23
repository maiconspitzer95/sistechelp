"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSectors = listSectors;
exports.createSector = createSector;
exports.updateSector = updateSector;
const database_js_1 = require("../../config/database.js");
const audit_js_1 = require("../../utils/audit.js");
async function listSectors(req, res) {
    try {
        const onlyActive = req.query.all !== 'true';
        const sql = `
      SELECT id, nome, sigla, eh_setor_atendimento, ativo, created_at
      FROM setores
      ${onlyActive ? 'WHERE ativo = true' : ''}
      ORDER BY nome ASC
    `;
        const result = await (0, database_js_1.query)(sql);
        return res.json({ sectors: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar setores:', error);
        return res.status(500).json({ error: 'Erro ao listar setores' });
    }
}
async function createSector(req, res) {
    try {
        const { nome, sigla, eh_setor_atendimento } = req.body;
        if (!nome || !sigla) {
            return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
        }
        const resDb = await (0, database_js_1.query)(`INSERT INTO setores (nome, sigla, eh_setor_atendimento)
       VALUES ($1, $2, $3)
       RETURNING *`, [nome.trim(), sigla.trim().toUpperCase(), Boolean(eh_setor_atendimento)]);
        await (0, audit_js_1.logAudit)(req, req.user.id, 'criacao_setor', 'setores', resDb.rows[0].id, null, resDb.rows[0]);
        return res.status(201).json({ sector: resDb.rows[0] });
    }
    catch (error) {
        console.error('Erro ao criar setor:', error);
        return res.status(500).json({ error: 'Erro ao criar setor' });
    }
}
async function updateSector(req, res) {
    try {
        const { id } = req.params;
        const { nome, sigla, eh_setor_atendimento, ativo } = req.body;
        const currentRes = await (0, database_js_1.query)('SELECT * FROM setores WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Setor não encontrado' });
        }
        const updated = await (0, database_js_1.query)(`UPDATE setores
       SET nome = COALESCE($1, nome),
           sigla = COALESCE($2, sigla),
           eh_setor_atendimento = COALESCE($3, eh_setor_atendimento),
           ativo = COALESCE($4, ativo),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`, [nome?.trim(), sigla?.trim().toUpperCase(), eh_setor_atendimento, ativo, id]);
        await (0, audit_js_1.logAudit)(req, req.user.id, 'edicao_setor', 'setores', id, currentRes.rows[0], updated.rows[0]);
        return res.json({ sector: updated.rows[0] });
    }
    catch (error) {
        console.error('Erro ao atualizar setor:', error);
        return res.status(500).json({ error: 'Erro ao atualizar setor' });
    }
}
