import { Response } from 'express';
import { query } from '../../config/database.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { generateProtocol } from '../../utils/protocol.js';
import { logAudit } from '../../utils/audit.js';
import { getSocketIO } from '../../config/socket.js';

// 1. Estatísticas da Fila Geral de Chamados da TI
export async function getQueueStats(req: AuthRequest, res: Response) {
  try {
    const statsSql = `
      SELECT
        COUNT(*) FILTER (WHERE c.tecnico_id IS NULL AND c.status IN ('aberto', 'em_triagem')) AS aguardando_atendimento,
        COUNT(*) FILTER (WHERE c.status = 'em_atendimento') AS em_atendimento,
        COUNT(*) FILTER (WHERE c.status = 'aguardando_usuario') AS aguardando_usuario,
        COUNT(*) FILTER (WHERE c.prioridade IN ('alta', 'urgente') AND c.status NOT IN ('resolvido', 'concluido', 'cancelado')) AS alta_prioridade,
        COUNT(*) FILTER (WHERE c.status IN ('resolvido', 'concluido') AND DATE(COALESCE(c.data_resolucao, c.updated_at)) = CURRENT_DATE) AS resolvidos_hoje
      FROM chamados c
    `;
    const resStats = await query(statsSql);
    const r = resStats.rows[0] || {};
    const statsObj = {
      aguardando_atendimento: parseInt(r.aguardando_atendimento || '0', 10),
      em_atendimento: parseInt(r.em_atendimento || '0', 10),
      aguardando_usuario: parseInt(r.aguardando_usuario || '0', 10),
      alta_prioridade: parseInt(r.alta_prioridade || '0', 10),
      resolvidos_hoje: parseInt(r.resolvidos_hoje || '0', 10),
    };
    return res.json({ ...statsObj, stats: statsObj });
  } catch (error) {
    console.error('Erro ao buscar indicadores da fila:', error);
    return res.status(500).json({ error: 'Erro ao buscar indicadores da fila' });
  }
}

// 2. Indicadores Individuais de Meus Atendimentos
export async function getMyAssignedStats(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const statsSql = `
      SELECT
        COUNT(*) FILTER (WHERE c.tecnico_id = $1 AND c.status = 'em_atendimento') as meus_em_atendimento,
        COUNT(*) FILTER (WHERE c.tecnico_id = $1 AND c.status = 'aguardando_usuario') as aguardando_usuario,
        COUNT(*) FILTER (WHERE c.tecnico_id = $1 AND c.status IN ('resolvido', 'concluido') AND DATE(COALESCE(c.data_resolucao, c.updated_at)) = CURRENT_DATE) as resolvidos_hoje,
        COUNT(*) FILTER (WHERE c.tecnico_id = $1 AND c.prazo_limite < NOW() AND c.status NOT IN ('resolvido', 'concluido', 'cancelado')) as em_atraso
      FROM chamados c
    `;
    const resStats = await query(statsSql, [user.id]);
    const r = resStats.rows[0] || {};
    const statsObj = {
      em_atendimento: parseInt(r.meus_em_atendimento || '0', 10),
      meus_em_atendimento: parseInt(r.meus_em_atendimento || '0', 10),
      aguardando_usuario: parseInt(r.aguardando_usuario || '0', 10),
      resolvidos_hoje: parseInt(r.resolvidos_hoje || '0', 10),
      em_atraso: parseInt(r.em_atraso || '0', 10),
    };
    return res.json({ ...statsObj, stats: statsObj });
  } catch (error) {
    console.error('Erro ao buscar indicadores individuais:', error);
    return res.status(500).json({ error: 'Erro ao buscar indicadores individuais' });
  }
}

// 3. Buscar Chamados Atribuídos ao Técnico Autenticado (Meus Atendimentos)
export async function getMyAssignedTickets(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { aba = 'atuais', status, search, categoria_id, prioridade, page = '1', limit = '15', sort = 'prioridade' } = req.query;

    if (!user.pode_atender && !['master', 'gestor', 'tecnico'].includes(user.perfil_codigo)) {
      return res.status(403).json({ error: 'Acesso restrito à equipe técnica de atendimento' });
    }

    const isHistorico = aba === 'historico';
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 15));
    const offset = (pageNum - 1) * limitNum;

    const params: any[] = [user.id];

    let baseSql = `
      FROM chamados c
      JOIN categorias cat ON cat.id = c.categoria_id
      JOIN usuarios sol ON sol.id = c.solicitante_id
      LEFT JOIN setores setor_sol ON setor_sol.id = c.setor_solicitante_id
      LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
      WHERE 1=1
    `;

    if (!isHistorico) {
      // Aba Atendimentos Atuais: estritamente o técnico logado e chamado em andamento
      baseSql += ` AND c.tecnico_id = $1 AND c.status NOT IN ('concluido', 'cancelado')`;

      if (status && status !== 'todos') {
        params.push(status);
        baseSql += ` AND c.status = $${params.length}`;
      }
    } else {
      // Aba Histórico: chamados em que o técnico atuou (concluídos por ele OU transferidos para outro)
      baseSql += ` AND (
        (c.tecnico_id = $1 AND c.status IN ('concluido', 'resolvido'))
        OR EXISTS (
          SELECT 1 FROM atribuicoes_chamados ac
          WHERE ac.chamado_id = c.id
            AND (ac.tecnico_anterior_id = $1 OR ac.tecnico_novo_id = $1)
        )
      )`;

      if (status && status !== 'todos') {
        params.push(status);
        baseSql += ` AND c.status = $${params.length}`;
      }
    }

    if (categoria_id) {
      params.push(categoria_id);
      baseSql += ` AND c.categoria_id = $${params.length}`;
    }

    if (prioridade) {
      params.push(prioridade);
      baseSql += ` AND c.prioridade = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      baseSql += ` AND (c.protocolo ILIKE $${params.length} OR c.titulo ILIKE $${params.length} OR sol.nome ILIKE $${params.length} OR sol.re ILIKE $${params.length})`;
    }

    // Contagem total para paginação
    const countRes = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Ordenação
    let orderBy = 'c.updated_at DESC';
    if (!isHistorico) {
      if (sort === 'prioridade') {
        orderBy = `
          CASE c.prioridade
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            ELSE 4
          END ASC,
          mensagens_nao_lidas DESC,
          c.created_at DESC
        `;
      } else if (sort === 'sla') {
        orderBy = `c.prazo_limite ASC NULLS LAST, c.created_at DESC`;
      } else if (sort === 'antigos') {
        orderBy = `c.created_at ASC`;
      } else {
        orderBy = `mensagens_nao_lidas DESC, c.updated_at DESC`;
      }
    } else {
      orderBy = `c.updated_at DESC`;
    }

    const selectSql = `
      SELECT c.id, c.protocolo, c.prioridade, c.status, c.titulo, c.descricao, c.vnc_ou_ip,
             c.created_at, c.updated_at, c.prazo_limite, c.data_resolucao, c.data_conclusao,
             cat.id as categoria_id, cat.nome as categoria_nome, cat.slug as categoria_slug, cat.icone as categoria_icone,
             sol.id as solicitante_id, sol.nome as solicitante_nome, sol.re as solicitante_re,
             setor_sol.id as setor_solicitante_id, setor_sol.nome as setor_solicitante_nome, setor_sol.sigla as setor_solicitante_sigla,
             tec.id as tecnico_id, tec.nome as tecnico_nome,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id) as total_mensagens,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id AND m.lida = false AND m.autor_id != $1) as mensagens_nao_lidas,
             (SELECT MAX(created_at) FROM mensagens_chamados m WHERE m.chamado_id = c.id) as ultima_mensagem_em,
             CASE
               WHEN c.tecnico_id = $1 AND c.status IN ('concluido', 'resolvido') THEN 'concluido_por_mim'
               WHEN c.tecnico_id != $1 AND EXISTS (SELECT 1 FROM atribuicoes_chamados ac WHERE ac.chamado_id = c.id AND ac.tecnico_anterior_id = $1) THEN 'transferido'
               WHEN c.tecnico_id = $1 THEN 'atual'
               ELSE 'participacao'
             END as tipo_participacao
      ${baseSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const selectParams = [...params, limitNum, offset];
    const result = await query(selectSql, selectParams);

    return res.json({
      tickets: result.rows,
      total,
      page: pageNum,
      totalPages,
      aba: isHistorico ? 'historico' : 'atuais',
    });
  } catch (error) {
    console.error('Erro ao listar atendimentos do técnico:', error);
    return res.status(500).json({ error: 'Erro ao listar atendimentos' });
  }
}

// 4. Função Principal para listar chamados (Fila de Atendimento)
export async function listTickets(req: AuthRequest, res: Response) {
  try {
    const {
      status,
      categoria_id,
      prioridade,
      tecnico_id,
      setor_id,
      search,
      apenas_meus,
      periodo,
      sort = 'recentes',
      page = '1',
      limit = '15',
    } = req.query;
    const user = req.user!;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 15));
    const offset = (pageNum - 1) * limitNum;

    const params: any[] = [user.id];

    let baseSql = `
      FROM chamados c
      JOIN categorias cat ON cat.id = c.categoria_id
      JOIN usuarios sol ON sol.id = c.solicitante_id
      LEFT JOIN setores setor_sol ON setor_sol.id = c.setor_solicitante_id
      LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
      WHERE 1=1
    `;

    // Regra de perfil: Colaborador só vê seus próprios chamados
    if (user.perfil_codigo === 'colaborador' || apenas_meus === 'true') {
      params.push(user.id);
      baseSql += ` AND c.solicitante_id = $${params.length}`;
    }

    if (status && status !== 'todos') {
      if (status === 'nao_atribuidos') {
        baseSql += ` AND c.tecnico_id IS NULL AND c.status IN ('aberto', 'em_triagem')`;
      } else if (status === 'meus_atendimentos') {
        params.push(user.id);
        baseSql += ` AND c.tecnico_id = $${params.length}`;
      } else {
        params.push(status);
        baseSql += ` AND c.status = $${params.length}`;
      }
    }

    if (categoria_id) {
      params.push(categoria_id);
      baseSql += ` AND c.categoria_id = $${params.length}`;
    }

    if (prioridade) {
      params.push(prioridade);
      baseSql += ` AND c.prioridade = $${params.length}`;
    }

    if (tecnico_id) {
      if (tecnico_id === 'unassigned') {
        baseSql += ` AND c.tecnico_id IS NULL`;
      } else {
        params.push(tecnico_id);
        baseSql += ` AND c.tecnico_id = $${params.length}`;
      }
    }

    if (setor_id) {
      params.push(setor_id);
      baseSql += ` AND c.setor_solicitante_id = $${params.length}`;
    }

    if (periodo) {
      if (periodo === 'hoje') {
        baseSql += ` AND c.created_at >= CURRENT_DATE`;
      } else if (periodo === '7d') {
        baseSql += ` AND c.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (periodo === '30d') {
        baseSql += ` AND c.created_at >= NOW() - INTERVAL '30 days'`;
      }
    }

    if (search) {
      params.push(`%${search}%`);
      baseSql += ` AND (c.protocolo ILIKE $${params.length} OR c.titulo ILIKE $${params.length} OR sol.nome ILIKE $${params.length} OR sol.re ILIKE $${params.length})`;
    }

    // Contagem total para paginação
    const countRes = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    let orderBy = 'c.created_at DESC';
    if (sort === 'prioridade') {
      orderBy = `
        CASE c.prioridade
          WHEN 'urgente' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'media' THEN 3
          ELSE 4
        END ASC, c.created_at DESC
      `;
    } else if (sort === 'sla') {
      orderBy = 'c.prazo_limite ASC NULLS LAST, c.created_at DESC';
    } else if (sort === 'antigos') {
      orderBy = 'c.created_at ASC';
    } else {
      orderBy = 'c.created_at DESC';
    }

    const selectSql = `
      SELECT c.id, c.protocolo, c.prioridade, c.status, c.titulo, c.descricao, c.vnc_ou_ip,
             c.created_at, c.updated_at, c.prazo_limite, c.data_resolucao, c.data_conclusao,
             cat.id as categoria_id, cat.nome as categoria_nome, cat.slug as categoria_slug, cat.icone as categoria_icone,
             sol.id as solicitante_id, sol.nome as solicitante_nome, sol.re as solicitante_re,
             setor_sol.id as setor_solicitante_id, setor_sol.nome as setor_solicitante_nome, setor_sol.sigla as setor_solicitante_sigla,
             tec.id as tecnico_id, tec.nome as tecnico_nome,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id) as total_mensagens,
             (SELECT COUNT(*) FROM mensagens_chamados m WHERE m.chamado_id = c.id AND m.lida = false AND m.autor_id != $1) as mensagens_nao_lidas,
             (SELECT MAX(created_at) FROM mensagens_chamados m WHERE m.chamado_id = c.id) as ultima_mensagem_em
      ${baseSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const selectParams = [...params, limitNum, offset];
    const result = await query(selectSql, selectParams);

    return res.json({
      tickets: result.rows,
      total,
      page: pageNum,
      totalPages,
    });
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

    if (!categoria_id) {
      return res.status(400).json({ error: 'Categoria é obrigatória' });
    }

    // Buscar SLA e setor da categoria
    const catRes = await query('SELECT id, slug, sla_horas, setor_responsavel_id FROM categorias WHERE id = $1', [categoria_id]);
    if (catRes.rows.length === 0) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }
    const cat = catRes.rows[0];

    const isLoginRequest = cat.slug === 'solicitar-login' || (Array.isArray(colaboradores_acesso) && colaboradores_acesso.length > 0);
    const isRelatorioRequest = cat.slug === 'relatorio';
    const isNovoSoftwareRequest = cat.slug === 'novo-programa';

    let finalTitulo = titulo ? titulo.trim() : '';
    let finalDescricao = descricao ? descricao.trim() : '';

    if (isLoginRequest) {
      if (!Array.isArray(colaboradores_acesso) || colaboradores_acesso.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos um colaborador para a solicitação de login' });
      }

      for (let i = 0; i < colaboradores_acesso.length; i++) {
        const c = colaboradores_acesso[i];
        if (!c.nome || !c.nome.trim() || !c.re || !c.re.trim() || !c.setor || !c.setor.trim()) {
          return res.status(400).json({
            error: `Preencha o Nome Completo, R.E. e Setor do colaborador #${i + 1}`,
          });
        }
      }

      // Geração automática do título conforme especificação:
      // 1 colaborador: "Solicitação de Login — João Silva"
      // Vários: "Solicitação de Login — 3 colaboradores"
      if (colaboradores_acesso.length === 1) {
        finalTitulo = `Solicitação de Login — ${colaboradores_acesso[0].nome.trim()}`;
      } else {
        finalTitulo = `Solicitação de Login — ${colaboradores_acesso.length} colaboradores`;
      }

      // Geração automática da descrição/resumo contendo os colaboradores para a equipe de TI
      const descLinhas = [
        'Solicitação de liberação de login e acessos aos sistemas:',
        ...colaboradores_acesso.map((c: any, idx: number) => {
          const cargo = c.cargo && c.cargo.trim() ? ` — Cargo: ${c.cargo.trim()}` : '';
          return `• Colaborador ${idx + 1}: ${c.nome.trim()} (R.E.: ${c.re.trim()}) — Setor: ${c.setor.trim()}${cargo}`;
        }),
      ];
      finalDescricao = descLinhas.join('\n');
    } else if (isRelatorioRequest) {
      const resp = respostas || {};
      const tituloRel = (resp.titulo_relatorio || finalTitulo || '').trim();
      const sistOrigem = (resp.sistema_origem || '').trim();
      const necessidades = (resp.necessidades_relatorio || '').trim();
      const filtros = (resp.filtros_necessarios || '').trim();

      if (!tituloRel) {
        return res.status(400).json({ error: 'Por favor, informe o título do relatório' });
      }
      if (!sistOrigem) {
        return res.status(400).json({ error: 'Por favor, informe o sistema ou módulo de origem dos dados' });
      }
      if (!necessidades) {
        return res.status(400).json({ error: 'Por favor, descreva o que é necessário para o relatório' });
      }

      // Título preenchido automaticamente com o valor de "Título do Relatório"
      finalTitulo = tituloRel;

      // Descrição interna gerada a partir das especificações
      finalDescricao = [
        'ESPECIFICAÇÕES DO RELATÓRIO',
        `• Título do Relatório: ${tituloRel}`,
        `• Sistema ou Módulo de Origem dos Dados: ${sistOrigem}`,
        '',
        'O que é necessário para o relatório:',
        necessidades,
        '',
        'Filtros Necessários:',
        filtros || 'Nenhum filtro específico informado',
      ].join('\n');
    } else if (isNovoSoftwareRequest) {
      const resp = respostas || {};
      const descSoftware = (resp.descreva_software || '').trim();
      const procAtual = (resp.processo_atual || '').trim();
      const benefEsperados = (resp.beneficios_esperados || '').trim();

      if (!descSoftware) {
        return res.status(400).json({ error: 'Por favor, descreva o novo software' });
      }
      if (!procAtual) {
        return res.status(400).json({ error: 'Por favor, explique como o processo funciona atualmente' });
      }
      if (!benefEsperados) {
        return res.status(400).json({ error: 'Por favor, descreva os benefícios esperados para a Santa Casa' });
      }

      // Título gerado no backend com tamanho limitado e tratamento adequado
      const cleanProposta = descSoftware.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      const resumo = cleanProposta.length > 60 ? cleanProposta.substring(0, 57).trim() + '...' : cleanProposta;
      finalTitulo = `Solicitação de Novo Software — ${resumo || 'Nova Proposta'}`;

      // Descrição interna composta pelos três campos
      finalDescricao = [
        'PROPOSTA DE NOVO SOFTWARE',
        '',
        'Descreva o Novo Software:',
        descSoftware,
        '',
        'Como o Processo Funciona Atualmente:',
        procAtual,
        '',
        'Benefícios Esperados para a Santa Casa:',
        benefEsperados,
      ].join('\n');
    } else {
      if (!finalTitulo || !finalDescricao) {
        return res.status(400).json({ error: 'Por favor, informe o título e a descrição do problema' });
      }
    }

    const protocolo = await generateProtocol();
    const setorSolicitante = setor_solicitante_id || user.setor_id;
    const prioridadeFinal = prioridade || 'media';

    // Calcular prazo limite baseado no SLA
    const prazoLimite = new Date();
    prazoLimite.setHours(prazoLimite.getHours() + (cat.sla_horas || 24));

    // VNC não se aplica a Solicitar Login, Relatório ou Novo Software
    const vncFinal = (isLoginRequest || isRelatorioRequest || isNovoSoftwareRequest)
      ? null
      : (vnc_ou_ip ? vnc_ou_ip.trim() : null);

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
        finalTitulo,
        finalDescricao,
        vncFinal,
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
      [ticket.id, user.id, finalDescricao]
    );

    // Notificação interna para a equipe
    await query(
      `INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
       SELECT u.id, $1::uuid, 'Novo chamado aberto', 'Chamado ' || $2 || ' foi aberto por ' || $3, 'chamado_criado', '/technician/tickets/' || $1::text
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

// Assumir ou Transferir chamado com concorrência atômica e auditoria
export async function assignTicket(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { tecnico_id, motivo } = req.body;
    const user = req.user!;

    // Apenas quem pode atender ou gestor/master pode assumir/atribuir
    if (!user.pode_atender && !['master', 'gestor', 'tecnico'].includes(user.perfil_codigo)) {
      return res.status(403).json({ error: 'Você não tem permissão para assumir ou transferir chamados' });
    }

    const ticketRes = await query('SELECT * FROM chamados WHERE id = $1', [id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    const ticket = ticketRes.rows[0];

    const isTransfer = Boolean(tecnico_id && tecnico_id !== user.id);

    if (!isTransfer) {
      // =========================================================================
      // AÇÃO: ASSUMIR CHAMADO
      // =========================================================================
      // Se já possui técnico atribuído e não é o próprio usuário, bloquear com 409
      if (ticket.tecnico_id && ticket.tecnico_id !== user.id) {
        return res.status(409).json({ error: 'Este chamado já foi assumido por outro técnico.' });
      }

      // Operação atômica condicional no PostgreSQL para garantir exclusão mútua em concorrência simultânea
      const novoStatus = ['aberto', 'em_triagem'].includes(ticket.status) ? 'em_atendimento' : ticket.status;
      const updateRes = await query(
        `UPDATE chamados
         SET tecnico_id = $1, status = $2, updated_at = NOW()
         WHERE id = $3 AND (tecnico_id IS NULL OR tecnico_id = $1)
         RETURNING *`,
        [user.id, novoStatus, id]
      );

      if (updateRes.rows.length === 0) {
        return res.status(409).json({ error: 'Este chamado já foi assumido por outro técnico.' });
      }

      const tecNome = user.nome;

      // Registrar histórico e atribuição
      await query(
        `INSERT INTO atribuicoes_chamados (chamado_id, tecnico_anterior_id, tecnico_novo_id, atribuido_por_id, motivo)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, ticket.tecnico_id, user.id, user.id, motivo || 'Chamado assumido na fila de atendimento']
      );

      await query(
        `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
         VALUES ($1, $2, 'atribuicao', $3, $4, $5)`,
        [id, user.id, `Chamado assumido pelo técnico ${tecNome}`, ticket.status, novoStatus]
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
         VALUES ($1, $2::uuid, 'Técnico atribuído ao seu chamado', 'O técnico ' || $3 || ' assumiu o atendimento do seu chamado ' || $4, 'tecnico_atribuido', '/collaborator/tickets/' || $2::text)`,
        [ticket.solicitante_id, id, tecNome, ticket.protocolo]
      );

      await logAudit(req, user.id, 'assumir_chamado', 'chamados', id, { tecnico_anterior: ticket.tecnico_id }, { tecnico_novo: user.id });

      // Transmissão via Socket.IO
      const io = getSocketIO();
      if (io) {
        io.emit('queue_updated', {
          action: 'assumir',
          ticketId: id,
          tecnico_id: user.id,
          tecnico_nome: tecNome,
          status: novoStatus,
        });
        io.to(`ticket_${id}`).emit('new_message', {
          chamado_id: id,
          tipo: 'sistema',
          conteudo: `Atendimento assumido por ${tecNome}.`,
          created_at: new Date().toISOString(),
        });
      }

      return res.json({
        message: 'Chamado assumido com sucesso',
        ticket: updateRes.rows[0],
        tecnico_id: user.id,
        status: novoStatus,
      });
    } else {
      // =========================================================================
      // AÇÃO: TRANSFERIR CHAMADO
      // =========================================================================
      const isCurrentTech = ticket.tecnico_id === user.id;
      const isManager = ['master', 'gestor'].includes(user.perfil_codigo);
      if (!isCurrentTech && !isManager) {
        return res.status(403).json({ error: 'Você não tem permissão para transferir este chamado' });
      }

      const tecRes = await query('SELECT nome FROM usuarios WHERE id = $1', [tecnico_id]);
      if (tecRes.rows.length === 0) {
        return res.status(400).json({ error: 'Técnico de destino não encontrado' });
      }
      const tecNome = tecRes.rows[0].nome;

      const updateRes = await query(
        `UPDATE chamados
         SET tecnico_id = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [tecnico_id, id]
      );

      await query(
        `INSERT INTO atribuicoes_chamados (chamado_id, tecnico_anterior_id, tecnico_novo_id, atribuido_por_id, motivo)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, ticket.tecnico_id, tecnico_id, user.id, motivo || 'Transferência de atendimento']
      );

      const descr = `Chamado transferido para o técnico ${tecNome}. Motivo: ${motivo || 'Sem observações'}`;
      await query(
        `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
         VALUES ($1, $2, 'transferencia', $3, $4, $4)`,
        [id, user.id, descr, ticket.status]
      );

      // Mensagem de sistema no chat
      await query(
        `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
         VALUES ($1, $2, $3, 'sistema', false, true)`,
        [id, user.id, `Chamado transferido para ${tecNome}. Motivo: ${motivo || 'Sem observações'}`]
      );

      // Notificar o novo técnico responsável
      await query(
        `INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
         VALUES ($1, $2::uuid, 'Chamado transferido para você', $3 || ' transferiu o chamado ' || $4 || ' para você', 'chamado_transferido', '/technician/tickets/' || $2::text)`,
        [tecnico_id, id, user.nome, ticket.protocolo]
      );

      await logAudit(req, user.id, 'transferencia_chamado', 'chamados', id, { tecnico_anterior: ticket.tecnico_id }, { tecnico_novo: tecnico_id, motivo });

      // Transmissão via Socket.IO
      const io = getSocketIO();
      if (io) {
        io.emit('queue_updated', {
          action: 'transferir',
          ticketId: id,
          tecnico_anterior_id: ticket.tecnico_id,
          tecnico_novo_id: tecnico_id,
          tecnico_nome: tecNome,
          status: ticket.status,
        });
        io.to(`ticket_${id}`).emit('new_message', {
          chamado_id: id,
          tipo: 'sistema',
          conteudo: `Chamado transferido para ${tecNome}.`,
          created_at: new Date().toISOString(),
        });
      }

      return res.json({
        message: 'Chamado transferido com sucesso',
        ticket: updateRes.rows[0],
        tecnico_id,
        status: ticket.status,
      });
    }
  } catch (error) {
    console.error('Erro ao assumir/transferir chamado:', error);
    return res.status(500).json({ error: 'Erro ao processar atendimento do chamado' });
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
       VALUES ($1, $2::uuid, 'Seu chamado foi resolvido', 'O chamado ' || $3 || ' foi marcado como resolvido. Por favor, confira e confirme a conclusão.', 'chamado_resolvido', '/collaborator/tickets/' || $2::text)`,
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
