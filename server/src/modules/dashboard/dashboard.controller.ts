import { Response } from 'express';
import { query } from '../../config/database.js';
import { AuthRequest } from '../../middlewares/auth.js';

export async function getDashboardOverview(req: AuthRequest, res: Response) {
  try {
    // 1. Contagens de chamados por status
    const statusCountsRes = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'aberto') as abertos,
        COUNT(*) FILTER (WHERE status = 'em_triagem') as em_triagem,
        COUNT(*) FILTER (WHERE status = 'em_atendimento') as em_atendimento,
        COUNT(*) FILTER (WHERE status = 'aguardando_usuario') as aguardando_usuario,
        COUNT(*) FILTER (WHERE status = 'aguardando_terceiro') as aguardando_terceiro,
        COUNT(*) FILTER (WHERE status = 'resolvido') as resolvidos,
        COUNT(*) FILTER (WHERE status = 'concluido') as concluidos,
        COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados,
        COUNT(*) FILTER (WHERE status NOT IN ('concluido', 'cancelado') AND prazo_limite < NOW()) as em_atraso
      FROM chamados
    `);

    // 2. Chamados por categoria
    const byCategoryRes = await query(`
      SELECT cat.nome, cat.icone, COUNT(c.id) as total
      FROM categorias cat
      LEFT JOIN chamados c ON c.categoria_id = cat.id
      GROUP BY cat.id, cat.nome, cat.icone, cat.ordem
      ORDER BY cat.ordem ASC
    `);

    // 3. Chamados por prioridade
    const byPriorityRes = await query(`
      SELECT prioridade, COUNT(*) as total
      FROM chamados
      GROUP BY prioridade
      ORDER BY total DESC
    `);

    // 4. Chamados por setor solicitante
    const bySectorRes = await query(`
      SELECT s.nome, s.sigla, COUNT(c.id) as total
      FROM setores s
      LEFT JOIN chamados c ON c.setor_solicitante_id = s.id
      GROUP BY s.id, s.nome, s.sigla
      HAVING COUNT(c.id) > 0
      ORDER BY total DESC
      LIMIT 8
    `);

    // 5. Médias de tempo (primeira resposta e resolução)
    const timesRes = await query(`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (data_resolucao - created_at)) / 3600)::numeric, 1) as media_horas_resolucao
      FROM chamados
      WHERE data_resolucao IS NOT NULL
    `);

    // 6. Produtividade individual dos técnicos de TI
    const techProductivityRes = await query(`
      SELECT
        u.id, u.nome, u.cargo,
        COUNT(c.id) as chamados_totais,
        COUNT(c.id) FILTER (WHERE c.status IN ('em_atendimento', 'aguardando_usuario')) as chamados_atribuidos_agora,
        COUNT(c.id) FILTER (WHERE c.status = 'concluido') as chamados_concluidos,
        COUNT(c.id) FILTER (WHERE c.status NOT IN ('concluido', 'cancelado') AND c.prazo_limite < NOW()) as chamados_em_atraso,
        ROUND(AVG(EXTRACT(EPOCH FROM (c.data_resolucao - c.created_at)) / 3600)::numeric, 1) as media_tempo_resolucao_horas,
        ROUND(AVG(av.nota)::numeric, 1) as media_avaliacao
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN chamados c ON c.tecnico_id = u.id
      LEFT JOIN avaliacoes av ON av.chamado_id = c.id
      WHERE u.ativo = true AND (u.pode_atender = true OR p.codigo IN ('tecnico', 'gestor'))
      GROUP BY u.id, u.nome, u.cargo
      ORDER BY chamados_concluidos DESC, u.nome ASC
    `);

    return res.json({
      resumo: statusCountsRes.rows[0],
      categorias: byCategoryRes.rows,
      prioridades: byPriorityRes.rows,
      setores: bySectorRes.rows,
      tempos: timesRes.rows[0],
      produtividade_tecnicos: techProductivityRes.rows,
    });
  } catch (error) {
    console.error('Erro ao gerar dados do dashboard:', error);
    return res.status(500).json({ error: 'Erro ao gerar dados do dashboard' });
  }
}
