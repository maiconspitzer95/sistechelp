import { Request, Response } from 'express';
import { query } from '../../config/database.js';
import { AuthRequest } from '../../middlewares/auth.js';

export async function listArticles(req: Request, res: Response) {
  try {
    const { search, categoria_id } = req.query;
    let sql = `
      SELECT kb.id, kb.titulo, kb.resumo, kb.tags, kb.visualizacoes, kb.util_sim, kb.util_nao, kb.created_at,
             cat.nome as categoria_nome, cat.slug as categoria_slug
      FROM base_conhecimento kb
      LEFT JOIN categorias cat ON cat.id = kb.categoria_id
      WHERE kb.ativo = true
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (kb.titulo ILIKE $${params.length} OR kb.conteudo ILIKE $${params.length} OR $${params.length} ILIKE ANY(kb.tags))`;
    }

    if (categoria_id) {
      params.push(categoria_id);
      sql += ` AND kb.categoria_id = $${params.length}`;
    }

    sql += ' ORDER BY kb.visualizacoes DESC, kb.created_at DESC';

    const result = await query(sql, params);
    return res.json({ articles: result.rows });
  } catch (error) {
    console.error('Erro ao listar artigos:', error);
    return res.status(500).json({ error: 'Erro ao listar artigos' });
  }
}

export async function getArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const resDb = await query(
      `SELECT kb.*, cat.nome as categoria_nome
       FROM base_conhecimento kb
       LEFT JOIN categorias cat ON cat.id = kb.categoria_id
       WHERE kb.id = $1 AND kb.ativo = true`,
      [id]
    );

    if (resDb.rows.length === 0) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    // Incrementar visualização
    await query('UPDATE base_conhecimento SET visualizacoes = visualizacoes + 1 WHERE id = $1', [id]);

    return res.json({ article: resDb.rows[0] });
  } catch (error) {
    console.error('Erro ao obter artigo:', error);
    return res.status(500).json({ error: 'Erro ao obter artigo' });
  }
}

export async function voteArticle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { util } = req.body;

    if (util === true) {
      await query('UPDATE base_conhecimento SET util_sim = util_sim + 1 WHERE id = $1', [id]);
    } else {
      await query('UPDATE base_conhecimento SET util_nao = util_nao + 1 WHERE id = $1', [id]);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar avaliação' });
  }
}
