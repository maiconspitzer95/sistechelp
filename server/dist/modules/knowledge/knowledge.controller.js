"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listArticles = listArticles;
exports.getArticle = getArticle;
exports.voteArticle = voteArticle;
const database_js_1 = require("../../config/database.js");
async function listArticles(req, res) {
    try {
        const { search, categoria_id } = req.query;
        let sql = `
      SELECT kb.id, kb.titulo, kb.resumo, kb.tags, kb.visualizacoes, kb.util_sim, kb.util_nao, kb.created_at,
             cat.nome as categoria_nome, cat.slug as categoria_slug
      FROM base_conhecimento kb
      LEFT JOIN categorias cat ON cat.id = kb.categoria_id
      WHERE kb.ativo = true
    `;
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (kb.titulo ILIKE $${params.length} OR kb.conteudo ILIKE $${params.length} OR $${params.length} ILIKE ANY(kb.tags))`;
        }
        if (categoria_id) {
            params.push(categoria_id);
            sql += ` AND kb.categoria_id = $${params.length}`;
        }
        sql += ' ORDER BY kb.visualizacoes DESC, kb.created_at DESC';
        const result = await (0, database_js_1.query)(sql, params);
        return res.json({ articles: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar artigos:', error);
        return res.status(500).json({ error: 'Erro ao listar artigos' });
    }
}
async function getArticle(req, res) {
    try {
        const { id } = req.params;
        const resDb = await (0, database_js_1.query)(`SELECT kb.*, cat.nome as categoria_nome
       FROM base_conhecimento kb
       LEFT JOIN categorias cat ON cat.id = kb.categoria_id
       WHERE kb.id = $1 AND kb.ativo = true`, [id]);
        if (resDb.rows.length === 0) {
            return res.status(404).json({ error: 'Artigo não encontrado' });
        }
        // Incrementar visualização
        await (0, database_js_1.query)('UPDATE base_conhecimento SET visualizacoes = visualizacoes + 1 WHERE id = $1', [id]);
        return res.json({ article: resDb.rows[0] });
    }
    catch (error) {
        console.error('Erro ao obter artigo:', error);
        return res.status(500).json({ error: 'Erro ao obter artigo' });
    }
}
async function voteArticle(req, res) {
    try {
        const { id } = req.params;
        const { util } = req.body;
        if (util === true) {
            await (0, database_js_1.query)('UPDATE base_conhecimento SET util_sim = util_sim + 1 WHERE id = $1', [id]);
        }
        else {
            await (0, database_js_1.query)('UPDATE base_conhecimento SET util_nao = util_nao + 1 WHERE id = $1', [id]);
        }
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao registrar avaliação' });
    }
}
