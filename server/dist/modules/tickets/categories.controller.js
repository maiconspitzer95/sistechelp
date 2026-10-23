"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.getCategoryBySlug = getCategoryBySlug;
const database_js_1 = require("../../config/database.js");
async function listCategories(req, res) {
    try {
        const catSql = `
      SELECT c.id, c.nome, c.slug, c.descricao, c.icone, c.sla_horas, c.ordem, c.ativo,
             s.id as setor_id, s.nome as setor_nome
      FROM categorias c
      LEFT JOIN setores s ON s.id = c.setor_responsavel_id
      WHERE c.ativo = true
      ORDER BY c.ordem ASC, c.nome ASC
    `;
        const categories = (await (0, database_js_1.query)(catSql)).rows;
        // Buscar campos dos formulários vinculados
        for (const cat of categories) {
            const formRes = await (0, database_js_1.query)(`SELECT id, nome FROM formularios WHERE categoria_id = $1 AND ativo = true LIMIT 1`, [cat.id]);
            if (formRes.rows.length > 0) {
                const formId = formRes.rows[0].id;
                const fieldsRes = await (0, database_js_1.query)(`SELECT id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem, largura, validacao
           FROM campos_formulario
           WHERE formulario_id = $1
           ORDER BY ordem ASC`, [formId]);
                cat.formulario = {
                    id: formId,
                    nome: formRes.rows[0].nome,
                    campos: fieldsRes.rows,
                };
            }
        }
        return res.json({ categories });
    }
    catch (error) {
        console.error('Erro ao listar categorias:', error);
        return res.status(500).json({ error: 'Erro ao listar categorias' });
    }
}
async function getCategoryBySlug(req, res) {
    try {
        const { slug } = req.params;
        const catRes = await (0, database_js_1.query)(`SELECT c.id, c.nome, c.slug, c.descricao, c.icone, c.sla_horas, c.ativo,
              s.id as setor_id, s.nome as setor_nome
       FROM categorias c
       LEFT JOIN setores s ON s.id = c.setor_responsavel_id
       WHERE c.slug = $1 AND c.ativo = true`, [slug]);
        if (catRes.rows.length === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        const cat = catRes.rows[0];
        const formRes = await (0, database_js_1.query)(`SELECT id, nome FROM formularios WHERE categoria_id = $1 AND ativo = true LIMIT 1`, [cat.id]);
        if (formRes.rows.length > 0) {
            const formId = formRes.rows[0].id;
            const fieldsRes = await (0, database_js_1.query)(`SELECT id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem, largura, validacao
         FROM campos_formulario
         WHERE formulario_id = $1
         ORDER BY ordem ASC`, [formId]);
            cat.formulario = {
                id: formId,
                nome: formRes.rows[0].nome,
                campos: fieldsRes.rows,
            };
        }
        return res.json({ category: cat });
    }
    catch (error) {
        console.error('Erro ao buscar categoria:', error);
        return res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
}
