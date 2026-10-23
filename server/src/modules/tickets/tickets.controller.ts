import { Response } from 'express';
import { query } from '../../config/database.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { generateProtocol } from '../../utils/protocol.js';
import { logAudit } from '../../utils/audit.js';

// Função para buscar lista de chamados
export async function listTickets(req: AuthRequest, res: Response) {
  try {
    const { status, categoria_id, prioridade, tecnico_id, setor_id, search, apenas_meus } = req.query;
    const user = req.user!;

    let sql = `
      SELECT c.id, c.protocolo, c.prioridade, c.status, c.titulo, c.descricao, c.vnc_ou_ip,
             c.created_at, c.updated_at, c.prazo_limite, c.data_resolucao, c.data_conclusao,
             cat.id as categoria_id, cat.nome as categoria_nome, cat.slug as categoria_slug, cat.icone as categoria_icone,
             sol.id as solicitante_id, sol.nome as solicitante_nome, sol.re as solicitante_re,
             setor_sol.id as setor_solicitante_id, setor_sol.nome as setor_solicitante_nome, setor_sol.sigla as setor_solicitante_sigla,
             tec.id as tecnico_id, tec.nome as tecnico_nome,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id) as total_mensagens,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id AND m.lida = false AND m.autor_id != $1) as mensagens_nao_lidas
      FROM chamados c
      JOIN categorias cat ON cat.id = c.categoria_id
      JOIN usuarios sol ON sol.id = c.solicitante_id
      LEFT JOIN setores setor_sol ON setor_sol.id = c.setor_solicitante_id
      LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
      WHERE 1=1
    `;
    const params: any[] = [user.id];

    // Regra de perfil: Colaborador só vê seus próprios chamados
    if (user.perfil_codigo === 'colaborador' || apenas_meus === 'true') {
      params.push(user.id);
      sql += ` AND c.solicitante_id = $${params.length}`;
    }

    if (status && status !== 'todos') {
      if (status === 'nao_atribuidos') {
        sql += ` AND c.tecnico_id IS NULL AND c.status IN ('aberto', 'em_triagem')`;
      } else if (status === 'meus_atendimentos') {
        params.push(user.id);
        sql += ` AND c.tecnico_id = $${params.length}`;
      } else {
        params.push(status);
        sql += ` AND c.status = $${params.length}`;
      }
    }

    if (categoria_id) {
      params.push(categoria_id);
      sql += ` AND c.categoria_id = $${params.length}`;
    }

    if (prioridade) {
      params.push(prioridade);
      sql += ` AND c.prioridade = $${params.length}`;
    }

    if (tecnico_id) {
      if (tecnico_id === 'unassigned') {
        sql += ` AND c.tecnico_id IS NULL`;
      } else {
        params.push(tecnico_id);
        sql += ` AND c.tecnico_id = $${params.length}`;
      }
    }

    if (setor_id) {
      params.push(setor_id);
      sql += ` AND c.setor_solicitante_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.protocolo ILIKE $${params.length} OR c.titulo ILIKE $${params.length} OR sol.nome ILIKE $${params.length} OR sol.re ILIKE $${params.length})`;
    }

    sql += ' ORDER BY c.created_at DESC';

    const result = await query(sql, params);
    return res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    return res.status(500).json({ error: 'Erro ao listar chamados' });
  }
}

// Buscar chamado específico por ID ou Protocolo
export async function getTicket(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const sql = `
      SELECT c.*,
             cat.nome as categoria_nome, cat.slug as categoria_slug, cat.icone as categoria_icone, cat.sla_horas,
             sol.nome as solicitante_nome, sol.re as solicitante_re, sol.email as solicitante_email, sol.cargo as solicitante_cargo,
             setor_sol.nome as setor_solicitante_nome, setor_sol.sigla as setor_solicitante_sigla,
             tec.nome as tecnico_nome, tec.email as tecnico_email, tec.cargo as tecnico_cargo,
             rf.dados as formulario_dados, rf.colaboradores_acesso
      FROM chamados c
      JOIN categorias cat ON cat.id = c.categoria_id
      JOIN usuarios sol ON sol.id = c.solicitante_id
      LEFT JOIN setores setor_sol ON setor_sol.id = c.setor_solicitante_id
      LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
      LEFT JOIN respostas_formulario rf ON rf.chamado_id = c.id
      WHERE c.id::text = $1 OR c.protocolo = $1
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    const ticket = result.rows[0];

    // Se for colaborador, validar que é o próprio solicitante
    if (user.perfil_codigo === 'colaborador' && ticket.solicitante_id !== user.id) {
      return res.status(403).json({ error: 'Você não possui permissão para visualizar este chamado' });
    }

    // Buscar histórico de eventos
    const histRes = await query(
      `SELECT h.*, u.nome as usuario_nome
       FROM historico_chamados h
       LEFT JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.chamado_id = $1
       ORDER BY h.created_at ASC`,
      [ticket.id]
    );
    ticket.historico = histRes.rows;

    // Buscar avaliação caso exista
    const avalRes = await query('SELECT * FROM avaliacoes WHERE chamado_id = $1', [ticket.id]);
    ticket.avaliacao = avalRes.rows[0] || null;

    return res.json({ ticket });
  } catch (error) {
    console.error('Erro ao buscar detalhes do chamado:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do chamado' });
  }
}

// Criar novo chamado
export async function createTicket(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { categoria_id, titulo, descricao, prioridade, vnc_ou_ip, setor_solicitante_id, respostas, colaboradores_acesso } = req.body;

    if (!categoria_id || !titulo || !descricao) {
      return res.status(400).json({ error: 'Preencha categoria, título e descrição' });
    }

    // Buscar SLA e setor da categoria
    const catRes = await query('SELECT id, sla_horas, setor_responsavel_id FROM categorias WHERE id = $1', [categoria_id]);
    if (catRes.rows.length === 0) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }
    const cat = catRes.rows[0];

    const protocolo = await generateProtocol();
    const setorSolicitante = setor_solicitante_id || user.setor_id;
    const prioridadeFinal = prioridade || 'media';

    // Calcular prazo limite baseado no SLA
    const prazoLimite = new Date();
    prazoLimite.setHours(prazoLimite.getHours() + (cat.sla_horas || 24));

    // Inserir chamado
    const insertRes = await query(
      `INSERT INTO chamados (
        protocolo, categoria_id, setor_solicitante_id, setor_atendimento_id,
        solicitante_id, prioridade, status, titulo, descricao, vnc_ou_ip, prazo_limite
      ) VALUES ($1, $2, $3, $4, $5, $6, 'aberto', $7, $8, $9, $10)
      RETURNING *`,
      [
        protocolo,
        categoria_id,
        setorSolicitante,
        cat.setor_responsavel_id,
        user.id,
        prioridadeFinal,
        titulo.trim(),
        descricao.trim(),
        vnc_ou_ip ? vnc_ou_ip.trim() : null,
        prazoLimite,
      ]
    );

    const ticket = insertRes.rows[0];

    // Inserir respostas dinâmicas
    if (respostas || colaboradores_acesso) {
      await query(
        `INSERT INTO respostas_formulario (chamado_id, dados, colaboradores_acesso)
         VALUES ($1, $2, $3)`,
        [
          ticket.id,
          JSON.stringify(respostas || {}),
          JSON.stringify(colaboradores_acesso || []),
        ]
      );
    }

    // Inserir evento de abertura no histórico
    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_novo)
       VALUES ($1, $2, 'abertura', 'Chamado aberto pelo colaborador', 'aberto')`,
      [ticket.id, user.id]
    );

    // Mensagem inicial no chat
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, $3, 'texto', false, true)`,
      [ticket.id, user.id, descricao.trim()]
    );

    // Notificação interna para a equipe
    await query(
      `INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
       SELECT u.id, $1, 'Novo chamado aberto', 'Chamado ' || $2 || ' foi aberto por ' || $3, 'chamado_criado', '/technician/tickets/' || $1
       FROM usuarios u
       WHERE u.pode_atender = true AND u.ativo = true AND u.id != $4`,
      [ticket.id, ticket.protocolo, user.nome, user.id]
    );

    await logAudit(req, user.id, 'abertura_chamado', 'chamados', ticket.id, null, { protocolo: ticket.protocolo });

    return res.status(201).json({ ticket });
  } catch (error) {
    console.error('Erro ao abrir chamado:', error);
    return res.status(500).json({ error: 'Erro ao abrir chamado' });
  }
}

// Assumir ou atribuir chamado
export async function assignTicket(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { tecnico_id, motivo } = req.body;
    const user = req.user!;

    // Apenas quem pode atender ou gestor/master pode assumir/atribuir
    if (!user.pode_atender && !['master', 'gestor', 'tecnico'].includes(user.perfil_codigo)) {
      return res.status(403).json({ error: 'Você não tem permissão para atribuir chamados' });
    }

    const ticketRes = await query('SELECT * FROM chamados WHERE id = $1', [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    const ticket = ticketRes.rows[0];

    const targetTecnicoId = tecnico_id || user.id;

    // Buscar nome do novo técnico
    const tecRes = await query('SELECT nome FROM usuarios WHERE id = $1', [targetTecnicoId]);
    if (tecRes.rows.length === 0) {
      return res.status(400).json({ error: 'Técnico selecionado não encontrado' });
    }
    const tecNome = tecRes.rows[0].nome;

    // Se estiver em aberto ou triagem, avança para em_atendimento
    const novoStatus = ['aberto', 'em_triagem'].includes(ticket.status) ? 'em_atendimento' : ticket.status;

    await query(
      `UPDATE chamados
       SET tecnico_id = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [targetTecnicoId, novoStatus, id]
    );

    // Registrar histórico e atribuição
    await query(
      `INSERT INTO atribuicoes_chamados (chamado_id, tecnico_anterior_id, tecnico_novo_id, atribuido_por_id, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, ticket.tecnico_id, targetTecnicoId, user.id, motivo || 'Atribuição de atendimento']
    );

    const descr = ticket.tecnico_id
      ? `Chamado transferido para o técnico ${tecNome}`
      : `Chamado assumido pelo técnico ${tecNome}`;

    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
       VALUES ($1, $2, 'atribuicao', $3, $4, $5)`,
      [id, user.id, descr, ticket.status, novoStatus]
    );

    // Mensagem de sistema no chat
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, $3, 'sistema', false, true)`,
      [id, user.id, `Atendimento assumido por ${tecNome}.`]
    );

    // Notificar solicitante
    await query(
      `INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
       VALUES ($1, $2, 'Técnico atribuído ao seu chamado', 'O técnico ' || $3 || ' assumiu o atendimento do seu chamado ' || $4, 'tecnico_atribuido', '/collaborator/tickets/' || $2)`,
      [ticket.solicitante_id, id, tecNome, ticket.protocolo]
    );

    await logAudit(req, user.id, 'atribuicao_chamado', 'chamados', id, { tecnico_anterior: ticket.tecnico_id }, { tecnico_novo: targetTecnicoId });

    return res.json({ message: 'Chamado atribuído com sucesso', tecnico_id: targetTecnicoId, status: novoStatus });
  } catch (error) {
    console.error('Erro ao atribuir chamado:', error);
    return res.status(500).json({ error: 'Erro ao atribuir chamado' });
  }
}

// Alterar Status do chamado
export async function updateStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, motivo } = req.body;
    const user = req.user!;

    const statusValidos = [
      'aberto',
      'em_triagem',
      'em_atendimento',
      'aguardando_usuario',
      'aguardando_terceiro',
      'resolvido',
      'concluido',
      'cancelado',
    ];

    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status informado é inválido' });
    }

    const ticketRes = await query('SELECT * FROM chamados WHERE id = $1', [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    const ticket = ticketRes.rows[0];

    await query(
      `UPDATE chamados SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
       VALUES ($1, $2, 'mudanca_status', $3, $4, $5)`,
      [id, user.id, motivo || `Status alterado para ${status}`, ticket.status, status]
    );

    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, $3, 'status_mudanca', false, true)`,
      [id, user.id, `Status do chamado atualizado para: ${status.replace('_', ' ').toUpperCase()}`]
    );

    return res.json({ message: 'Status atualizado com sucesso', status });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status' });
  }
}

// Registrar Resolução do Chamado pelo Técnico
export async function resolveTicket(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { solucao } = req.body;
    const user = req.user!;

    if (!solucao || solucao.trim().length < 5) {
      return res.status(400).json({ error: 'Informe uma descrição clara da solução aplicada' });
    }

    const ticketRes = await query('SELECT * FROM chamados WHERE id = $1', [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    const ticket = ticketRes.rows[0];

    await query(
      `UPDATE chamados
       SET status = 'resolvido', solucao = $1, data_resolucao = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [solucao.trim(), id]
    );

    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
       VALUES ($1, $2, 'resolucao', $3, $4, 'resolvido')`,
      [id, user.id, `Chamado marcado como resolvido: ${solucao.trim()}`, ticket.status]
    );

    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, $3, 'sistema', false, true)`,
      [id, user.id, `Solução registrada pelo técnico: ${solucao.trim()}\n\nPor favor, confirme se o problema foi resolvido.`]
    );

    // Notificar solicitante para confirmar resolução
    await query(
      `INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
       VALUES ($1, $2, 'Seu chamado foi resolvido', 'O chamado ' || $3 || ' foi marcado como resolvido. Por favor, confira e confirme a conclusão.', 'chamado_resolvido', '/collaborator/tickets/' || $2)`,
      [ticket.solicitante_id, id, ticket.protocolo]
    );

    return res.json({ message: 'Resolução registrada com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar resolução:', error);
    return res.status(500).json({ error: 'Erro ao registrar resolução' });
  }
}

// Confirmar Conclusão pelo Solicitante e Avaliar Atendimento
export async function completeTicket(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nota, comentario } = req.body;
    const user = req.user!;

    const ticketRes = await query('SELECT * FROM chamados WHERE id = $1', [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    const ticket = ticketRes.rows[0];

    // O solicitante, gestor ou master pode concluir
    if (user.perfil_codigo === 'colaborador' && ticket.solicitante_id !== user.id) {
      return res.status(403).json({ error: 'Você só pode concluir os seus próprios chamados' });
    }

    await query(
      `UPDATE chamados
       SET status = 'concluido', data_conclusao = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    if (nota && Number(nota) >= 1 && Number(nota) <= 5) {
      await query(
        `INSERT INTO avaliacoes (chamado_id, usuario_id, nota, comentario)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (chamado_id) DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario`,
        [id, user.id, Number(nota), comentario ? comentario.trim() : null]
      );
    }

    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
       VALUES ($1, $2, 'conclusao', 'Chamado confirmado e concluído pelo solicitante', $3, 'concluido')`,
      [id, user.id, ticket.status]
    );

    return res.json({ message: 'Chamado concluído com sucesso. Obrigado pela avaliação!' });
  } catch (error) {
    console.error('Erro ao concluir chamado:', error);
    return res.status(500).json({ error: 'Erro ao concluir chamado' });
  }
}
