import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

export async function runSeeds() {
  console.log('--- Executando Seeds Demonstrativos do Sistech Desk ---');

  // 1. Perfis
  const perfis = [
    {
      codigo: 'master',
      nome: 'Administrador Master',
      descricao: 'Acesso total, gestão de técnicos, setores, categorias, configurações e auditoria',
      permissoes: JSON.stringify(['*']),
    },
    {
      codigo: 'gestor',
      nome: 'Gestor de Atendimento',
      descricao: 'Visualiza setores autorizados, distribui chamados, produtividade e relatórios',
      permissoes: JSON.stringify(['tickets:view', 'tickets:assign', 'reports:view', 'dashboard:view']),
    },
    {
      codigo: 'tecnico',
      nome: 'Técnico de Suporte',
      descricao: 'Atende chamados, envia mensagens, solicita informações, resolve e transfere chamados',
      permissoes: JSON.stringify(['tickets:view', 'tickets:handle', 'chat:reply', 'chat:internal_notes']),
    },
    {
      codigo: 'colaborador',
      nome: 'Colaborador',
      descricao: 'Abre chamados, acompanha andamento, interage via chat e avalia atendimento',
      permissoes: JSON.stringify(['tickets:create', 'tickets:own_view', 'chat:reply', 'feedback:rate']),
    },
  ];

  for (const p of perfis) {
    await query(
      `INSERT INTO perfis (codigo, nome, descricao, permissoes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (codigo) DO UPDATE 
       SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, permissoes = EXCLUDED.permissoes`,
      [p.codigo, p.nome, p.descricao, p.permissoes]
    );
  }

  // 2. Setores Hospitalares
  const setores = [
    { nome: 'Tecnologia da Informação', sigla: 'TI', eh_atend: true },
    { nome: 'Manutenção Predial', sigla: 'MANUTENCAO', eh_atend: true },
    { nome: 'Engenharia Clínica', sigla: 'ENG_CLINICA', eh_atend: true },
    { nome: 'Patrimônio', sigla: 'PATRIMONIO', eh_atend: true },
    { nome: 'Bloco Cirúrgico', sigla: 'BLOCO_CIRURGICO', eh_atend: false },
    { nome: 'Posto de Enfermagem 3º Andar', sigla: 'ENFERMAGEM_3', eh_atend: false },
    { nome: 'Recepção Central', sigla: 'RECEPCAO', eh_atend: false },
    { nome: 'Recursos Humanos', sigla: 'RH', eh_atend: false },
    { nome: 'Farmácia Hospitalar', sigla: 'FARMACIA', eh_atend: false },
  ];

  for (const s of setores) {
    await query(
      `INSERT INTO setores (nome, sigla, eh_setor_atendimento)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [s.nome, s.sigla, s.eh_atend]
    );
  }

  // Obter IDs dos perfis e setores
  const perfilRows = (await query('SELECT id, codigo FROM perfis')).rows;
  const perfilMap = Object.fromEntries(perfilRows.map((r) => [r.codigo, r.id]));

  const setorRows = (await query('SELECT id, sigla FROM setores')).rows;
  const setorMap = Object.fromEntries(setorRows.map((r) => [r.sigla, r.id]));

  // 3. Equipes de Atendimento
  const tiSetorId = setorMap['TI'];
  const equipeSuporte = await query(
    `INSERT INTO equipes_atendimento (nome, setor_id, descricao)
     VALUES ('Suporte N1 & Helpdesk', $1, 'Atendimento a incidentes de software, hardware e login')
     RETURNING id`,
    [tiSetorId]
  );
  const equipeId = equipeSuporte.rows[0]?.id;

  // 4. Usuários de Demonstração (Senha padrão para dev: "sistech123")
  const salt = await bcrypt.genSalt(10);
  const senhaPadraoHash = await bcrypt.hash('sistech123', salt);

  const usuariosDemo = [
    {
      nome: 'Administrador Master',
      re: '00001',
      login: 'master.admin',
      email: 'master@santacasadepelotas.com.br',
      perfil: 'master',
      setor: 'TI',
      pode_atender: true,
      cargo: 'Coordenador Geral de Sistemas',
    },
    {
      nome: 'Gestor de TI',
      re: '00002',
      login: 'gestor.ti',
      email: 'gestor.ti@santacasadepelotas.com.br',
      perfil: 'gestor',
      setor: 'TI',
      pode_atender: true,
      cargo: 'Gestor de Atendimento e Suporte',
    },
    {
      nome: 'Carlos Mendes',
      re: '00003',
      login: 'carlos.mendes',
      email: 'carlos.mendes@santacasadepelotas.com.br',
      perfil: 'tecnico',
      setor: 'TI',
      pode_atender: true,
      cargo: 'Analista de Suporte de TI',
    },
    {
      nome: 'Lucas Ferreira',
      re: '00004',
      login: 'lucas.ferreira',
      email: 'lucas.ferreira@santacasadepelotas.com.br',
      perfil: 'tecnico',
      setor: 'TI',
      pode_atender: true,
      cargo: 'Técnico de Redes e Infraestrutura',
    },
    {
      nome: 'Fernanda Alves',
      re: '00005',
      login: 'fernanda.alves',
      email: 'fernanda.alves@santacasadepelotas.com.br',
      perfil: 'tecnico',
      setor: 'TI',
      pode_atender: true,
      cargo: 'Analista de Sistemas e Banco de Dados',
    },
    {
      nome: 'Marina Santos',
      re: '00010',
      login: 'marina.santos',
      email: 'marina.santos@santacasadepelotas.com.br',
      perfil: 'colaborador',
      setor: 'BLOCO_CIRURGICO',
      pode_atender: false,
      cargo: 'Enfermeira Assistencial Chefe',
    },
  ];

  for (const u of usuariosDemo) {
    const res = await query(
      `INSERT INTO usuarios (nome, re, login, email, senha_hash, perfil_id, setor_id, ativo, pode_atender, cargo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
       ON CONFLICT (login) DO UPDATE
       SET nome = EXCLUDED.nome, re = EXCLUDED.re, senha_hash = EXCLUDED.senha_hash, 
           perfil_id = EXCLUDED.perfil_id, setor_id = EXCLUDED.setor_id, pode_atender = EXCLUDED.pode_atender, cargo = EXCLUDED.cargo
       RETURNING id`,
      [u.nome, u.re, u.login, u.email, senhaPadraoHash, perfilMap[u.perfil], setorMap[u.setor], u.pode_atender, u.cargo]
    );

    const userId = res.rows[0].id;

    // Vincular técnicos à equipe de suporte
    if (u.pode_atender && equipeId) {
      await query(
        `INSERT INTO usuarios_equipes (usuario_id, equipe_id)
         VALUES ($1, $2)
         ON CONFLICT (usuario_id, equipe_id) DO NOTHING`,
        [userId, equipeId]
      );
    }
  }

  // 5. Categorias Dinâmicas Oficiais
  const categorias = [
    {
      nome: 'Software',
      slug: 'software',
      descricao: 'Falhas de sistemas hospitalares (SISHOS, PEP, Tasy, MV), lentidão, travamentos e erros em tela',
      icone: 'Monitor',
      sla_horas: 12,
      ordem: 1,
    },
    {
      nome: 'Hardware e Rede',
      slug: 'hardware-rede',
      descricao: 'Problemas físicos em computadores, impressoras com defeito, cabeamento, pontos de rede e internet',
      icone: 'Wifi',
      sla_horas: 8,
      ordem: 2,
    },
    {
      nome: 'Solicitar Login',
      slug: 'solicitar-login',
      descricao: 'Criação de novos acessos, permissões, troca de setor ou liberação para múltiplos colaboradores',
      icone: 'UserPlus',
      sla_horas: 24,
      ordem: 3,
    },
    {
      nome: 'Relatório',
      slug: 'relatorio',
      descricao: 'Solicitação de relatórios gerenciais, extração de dados clínicos ou financeiros em Excel, PDF ou BI',
      icone: 'FileSpreadsheet',
      sla_horas: 48,
      ordem: 4,
    },
    {
      nome: 'Novo Programa',
      slug: 'novo-programa',
      descricao: 'Propostas de novas ferramentas, automação de planilhas manuais e desenvolvimento interno de software',
      icone: 'Code',
      sla_horas: 72,
      ordem: 5,
    },
  ];

  for (const c of categorias) {
    const resCat = await query(
      `INSERT INTO categorias (nome, slug, descricao, icone, setor_responsavel_id, sla_horas, ordem, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (slug) DO UPDATE
       SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, icone = EXCLUDED.icone, sla_horas = EXCLUDED.sla_horas, ordem = EXCLUDED.ordem
       RETURNING id`,
      [c.nome, c.slug, c.descricao, c.icone, tiSetorId, c.sla_horas, c.ordem]
    );

    const catId = resCat.rows[0].id;

    // Criar formulário vinculado
    const formRes = await query(
      `INSERT INTO formularios (categoria_id, nome, descricao, versao, ativo)
       VALUES ($1, $2, $3, 1, true)
       RETURNING id`,
      [catId, `Formulário de ${c.nome}`, `Campos específicos para atendimento de ${c.nome}`]
    );
    const formId = formRes.rows[0].id;

    // Campos específicos para cada categoria
    if (c.slug === 'software') {
      const campos = [
        { nome: 'sistema_problema', rotulo: 'Sistema com Problema', tipo: 'select', obrigatorio: true, opcoes: JSON.stringify(['SISHOS / PEP', 'PEP Enfermagem', 'Sistema Financeiro', 'Prontuário Eletrônico', 'Laboratório', 'Outro']), ordem: 1 },
        { nome: 'vnc_computador', rotulo: 'VNC ou Identificação do Computador', tipo: 'text', obrigatorio: true, placeholder: 'Ex: 10.0.12.45 ou TI-BC-02', ordem: 2 },
        { nome: 'mensagem_erro', rotulo: 'Mensagem de Erro Exibida (se houver)', tipo: 'textarea', obrigatorio: false, placeholder: 'Copie a mensagem exata ou código de erro exibido', ordem: 3 },
      ];
      for (const f of campos) {
        await query(
          `INSERT INTO campos_formulario (formulario_id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [formId, f.nome, f.rotulo, f.tipo, f.obrigatorio, f.placeholder, f.opcoes, f.ordem]
        );
      }
    } else if (c.slug === 'hardware-rede') {
      const campos = [
        { nome: 'tipo_equipamento', rotulo: 'Tipo de Equipamento ou Serviço', tipo: 'select', obrigatorio: true, opcoes: JSON.stringify(['Impressora Laser / Térmica', 'Computador / Monitor', 'Ponto de Rede / Sem Internet', 'Telefone IP / Ramal', 'Leitor de Código de Barras', 'No-Break / Estabilizador']), ordem: 1 },
        { nome: 'identificacao_equipamento', rotulo: 'Identificação ou Patrimônio do Equipamento', tipo: 'text', obrigatorio: true, placeholder: 'Ex: PAT-01492 ou Zebra Posto 3', ordem: 2 },
        { nome: 'localizacao_exata', rotulo: 'Localização Exata na Unidade', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Balcão de triagem ao lado do leito 4', ordem: 3 },
      ];
      for (const f of campos) {
        await query(
          `INSERT INTO campos_formulario (formulario_id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [formId, f.nome, f.rotulo, f.tipo, f.obrigatorio, f.placeholder, f.opcoes, f.ordem]
        );
      }
    } else if (c.slug === 'solicitar-login') {
      const campos = [
        { nome: 'sistema_alvo', rotulo: 'Sistema para o qual deseja acesso', tipo: 'select', obrigatorio: true, opcoes: JSON.stringify(['SISHOS / PEP', 'Windows / Domínio', 'E-mail Institucional', 'Sistema Farmácia', 'Painel de Fichas']), ordem: 1 },
        { nome: 'tipo_acesso', rotulo: 'Tipo de Acesso Necessário', tipo: 'select', obrigatorio: true, opcoes: JSON.stringify(['Acesso Padrão do Setor', 'Consulta e Evolução', 'Acesso Médico / Prescrição', 'Administrativo / Faturamento']), ordem: 2 },
        { nome: 'justificativa', rotulo: 'Justificativa do Acesso', tipo: 'textarea', obrigatorio: true, placeholder: 'Motivo da liberação, ex: novo colaborador contratado para o plantão', ordem: 3 },
      ];
      for (const f of campos) {
        await query(
          `INSERT INTO campos_formulario (formulario_id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [formId, f.nome, f.rotulo, f.tipo, f.obrigatorio, f.placeholder, f.opcoes, f.ordem]
        );
      }
    } else if (c.slug === 'relatorio') {
      const campos = [
        { nome: 'nome_relatorio', rotulo: 'Nome do Relatório', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Censo Diário de Internações Cirúrgicas', ordem: 1 },
        { nome: 'objetivo', rotulo: 'Objetivo da Análise', tipo: 'textarea', obrigatorio: true, placeholder: 'Qual decisão será tomada a partir desses dados?', ordem: 2 },
        { nome: 'filtros_necessarios', rotulo: 'Filtros Necessários', tipo: 'textarea', obrigatorio: true, placeholder: 'Ex: Período de datas, setor, convênio, médico responsável', ordem: 3 },
        { nome: 'sistema_origem', rotulo: 'Sistema de Origem dos Dados', tipo: 'text', obrigatorio: true, placeholder: 'Ex: SISHOS tela de internação', ordem: 4 },
        { nome: 'formato_desejado', rotulo: 'Formato Desejado', tipo: 'select', obrigatorio: true, opcoes: JSON.stringify(['Planilha Excel (.xlsx)', 'Relatório em PDF', 'Dashboard / Painel Web', 'Direto na tela do sistema']), ordem: 5 },
      ];
      for (const f of campos) {
        await query(
          `INSERT INTO campos_formulario (formulario_id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [formId, f.nome, f.rotulo, f.tipo, f.obrigatorio, f.placeholder, f.opcoes, f.ordem]
        );
      }
    } else if (c.slug === 'novo-programa') {
      const campos = [
        { nome: 'nome_sugerido', rotulo: 'Nome Sugerido do Programa', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Central de Agendamento de Dietas', opcoes: JSON.stringify([]), ordem: 1 },
        { nome: 'problema_resolver', rotulo: 'Problema que Resolverá', tipo: 'textarea', obrigatorio: true, placeholder: 'Descreva a dificuldade atual que gera retrabalho', opcoes: JSON.stringify([]), ordem: 2 },
        { nome: 'processo_atual', rotulo: 'Como o Processo Funciona Atualmente', tipo: 'textarea', obrigatorio: true, placeholder: 'Usa papéis impressos, planilhas Excel soltas, mensagens?', opcoes: JSON.stringify([]), ordem: 3 },
        { nome: 'setores_envolvidos', rotulo: 'Setores Envolvidos', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Nutrição, Enfermagem e Almoxarifado', opcoes: JSON.stringify([]), ordem: 4 },
        { nome: 'beneficios_esperados', rotulo: 'Benefícios Esperados', tipo: 'textarea', obrigatorio: true, placeholder: 'Economia de tempo, segurança do paciente, redução de desperdício', opcoes: JSON.stringify([]), ordem: 5 },
      ];
      for (const f of campos) {
        await query(
          `INSERT INTO campos_formulario (formulario_id, nome_campo, rotulo, tipo_campo, obrigatorio, placeholder, opcoes, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [formId, f.nome, f.rotulo, f.tipo, f.obrigatorio, f.placeholder, f.opcoes, f.ordem]
        );
      }
    }
  }

  // 6. Base de Conhecimento Oficial Sistech
  const artigos = [
    {
      titulo: 'Como encontrar o VNC ou IP do seu computador',
      conteudo: `Para que a equipe de TI possa realizar o acesso remoto e resolver seu problema com agilidade, você precisa informar o endereço de VNC:
1. Olhe no canto inferior direito da tela (perto do relógio do Windows).
2. Procure pelo ícone azul com a letra "V" ou um símbolo de monitor.
3. Posicione o mouse sobre o ícone ou clique com o botão direito: o endereço IP aparecerá (ex: 10.0.15.82 ou TI-BC-02).
4. Informe esse número no formulário de chamado.
Caso o ícone não esteja visível, você também pode abrir o menu Iniciar e digitar "VNC" ou "Meu IP".`,
      tags: ['vnc', 'ip', 'acesso_remoto', 'suporte'],
      palavras_chave: ['vnc', 'ip', 'numero vnc', 'onde fica o vnc', 'acesso remoto', 'endereço do computador'],
    },
    {
      titulo: 'Impressora com luz vermelha piscando ou não imprimindo',
      conteudo: `Quando a impressora estiver apresentando luz vermelha piscando:
1. **Verifique o papel**: Abra a bandeja principal e confira se há folhas presas ou amassadas no rolete.
2. **Confira a tampa**: Certifique-se de que a tampa frontal do toner está completamente travada.
3. **Reinicie o equipamento**: Desligue a impressora no botão de energia, aguarde 10 segundos e ligue novamente.
4. **Cabo de rede**: Verifique se o cabo azul de rede atrás da impressora está com as luzinhas verde/laranja acesas.
Se após esses passos a luz vermelha continuar piscando, abra um chamado na categoria "Hardware e Rede" informando o número do patrimônio da impressora.`,
      tags: ['impressora', 'luz vermelha', 'papel preso', 'hardware'],
      palavras_chave: ['impressora', 'luz vermelha', 'não imprime', 'impressao', 'papel preso', 'toner'],
    },
    {
      titulo: 'Como solicitar acesso e novos logins de colaboradores',
      conteudo: `Para solicitar novos logins para funcionários da Santa Casa:
1. Utilize a categoria **"Solicitar Login"** na tela inicial do Sistech Desk.
2. Você pode solicitar acesso para múltiplos colaboradores no mesmo chamado clicando no botão **"Adicionar Colaborador"**.
3. Preencha nome completo, R.E. e o perfil desejado no sistema (ex: SISHOS, PEP, E-mail).
4. A TI processará as credenciais de forma segura. A primeira senha será temporária e exigirá troca obrigatória no primeiro login.`,
      tags: ['login', 'senha', 'novo usuario', 'acesso', 'sishos', 're'],
      palavras_chave: ['login', 'criar login', 'senha', 'novo acesso', 'adicionar usuario', 'novo funcionario'],
    },
    {
      titulo: 'Como abrir chamados e prazos de SLA de atendimento',
      conteudo: `O Sistech Desk possui diferentes prazos de atendimento (SLA) conforme a gravidade e categoria:
- **Software crítico (PEP/SISHOS fora do ar)**: Triagem imediata e atendimento prioritário em até 2 horas.
- **Hardware e Rede**: Atendimento em até 8 horas úteis.
- **Solicitação de Login**: Conclusão em até 24 horas úteis.
- **Relatórios Gerenciais**: Elaboração em até 48 horas úteis.
- **Novos Programas e Automações**: Análise de viabilidade em até 72 horas úteis.
Acompanhe sempre o histórico e mensagens dentro do chamado.`,
      tags: ['sla', 'prazos', 'abrir chamado', 'regras'],
      palavras_chave: ['prazo', 'sla', 'tempo', 'demora', 'urgente', 'regras de atendimento'],
    },
  ];

  for (const a of artigos) {
    await query(
      `INSERT INTO base_conhecimento (titulo, conteudo, resumo, tags, palavras_chave, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT DO NOTHING`,
      [a.titulo, a.conteudo, a.conteudo.slice(0, 150) + '...', a.tags, a.palavras_chave]
    );
  }

  // 7. Chamados Fictícios para Demonstração Completa
  const marinaId = (await query("SELECT id FROM usuarios WHERE login = 'marina.santos'")).rows[0]?.id;
  const carlosId = (await query("SELECT id FROM usuarios WHERE login = 'carlos.mendes'")).rows[0]?.id;
  const catHardwareId = (await query("SELECT id FROM categorias WHERE slug = 'hardware-rede'")).rows[0]?.id;
  const catSoftwareId = (await query("SELECT id FROM categorias WHERE slug = 'software'")).rows[0]?.id;
  const blocoCirurgicoId = setorMap['BLOCO_CIRURGICO'];

  if (marinaId && carlosId && catHardwareId) {
    // Chamado 1: Impressora da Marina (Diálogo oficial solicitado na especificação!)
    const chamado1Res = await query(
      `INSERT INTO chamados (
        protocolo, categoria_id, setor_solicitante_id, setor_atendimento_id,
        solicitante_id, tecnico_id, prioridade, status, titulo, descricao, vnc_ou_ip
      ) VALUES (
        'SC-202610-1001', $1, $2, $3, $4, $5, 'alta', 'em_atendimento',
        'Impressora do Bloco Cirúrgico travada com luz piscando',
        'A impressora de etiquetas do posto de enfermagem do Bloco Cirúrgico parou de imprimir guias de pacientes.',
        '10.0.14.32'
      ) ON CONFLICT (protocolo) DO UPDATE SET titulo = EXCLUDED.titulo
      RETURNING id`,
      [catHardwareId, blocoCirurgicoId, tiSetorId, marinaId, carlosId]
    );

    const chamado1Id = chamado1Res.rows[0].id;

    // Respostas do formulário do chamado 1
    await query(
      `INSERT INTO respostas_formulario (chamado_id, dados)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [
        chamado1Id,
        JSON.stringify({
          tipo_equipamento: 'Impressora Laser / Térmica',
          identificacao_equipamento: 'Zebra GK420t - Posto 01',
          localizacao_exata: 'Bancada central de admissão do Bloco Cirúrgico',
        }),
      ]
    );

    // Diálogo exato solicitado no item 9 do Prompt:
    // Marina: "A impressora não está funcionando."
    // Carlos: "Bom dia! Você consegue verificar se aparece alguma luz vermelha?"
    // Marina: "Sim, a luz vermelha está piscando."
    // Carlos: "Obrigado. Vou verificar o equipamento."
    const msgs = [
      { autor: marinaId, texto: 'A impressora não está funcionando.', nota: false, tipo: 'texto' },
      { autor: carlosId, texto: 'Bom dia! Você consegue verificar se aparece alguma luz vermelha?', nota: false, tipo: 'texto' },
      { autor: marinaId, texto: 'Sim, a luz vermelha está piscando.', nota: false, tipo: 'texto' },
      { autor: carlosId, texto: 'Obrigado. Vou verificar o equipamento.', nota: false, tipo: 'texto' },
      { autor: carlosId, texto: 'Nota interna: Testar reposição do rolete e recalibração do sensor de mídia no local.', nota: true, tipo: 'texto' },
    ];

    for (const m of msgs) {
      await query(
        `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [chamado1Id, m.autor, m.texto, m.tipo, m.nota]
      );
    }

    // Histórico de eventos do chamado 1
    await query(
      `INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
       VALUES 
       ($1, $2, 'abertura', 'Chamado aberto pelo colaborador via Portal Sistech', NULL, 'aberto'),
       ($1, $3, 'atribuicao', 'Chamado assumido pelo técnico Carlos Mendes', 'aberto', 'em_atendimento')`,
      [chamado1Id, marinaId, carlosId]
    );
  }

  // Chamado 2: PEP Enfermagem com erro de evolução
  if (marinaId && catSoftwareId) {
    const chamado2Res = await query(
      `INSERT INTO chamados (
        protocolo, categoria_id, setor_solicitante_id, setor_atendimento_id,
        solicitante_id, prioridade, status, titulo, descricao, vnc_ou_ip
      ) VALUES (
        'SC-202610-1002', $1, $2, $3, $4, 'media', 'aberto',
        'Erro ao salvar evolução de enfermagem no PEP',
        'Aparece aviso de bloqueio de registro ao tentar salvar a evolução do leito 12.',
        '10.0.14.35'
      ) ON CONFLICT (protocolo) DO UPDATE SET titulo = EXCLUDED.titulo
      RETURNING id`,
      [catSoftwareId, blocoCirurgicoId, tiSetorId, marinaId]
    );

    const chamado2Id = chamado2Res.rows[0].id;
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, 'Chamado aberto. Aguardando triagem da equipe de TI.', 'sistema', false, true)`,
      [chamado2Id, marinaId]
    );
  }

  console.log('✅ Seeds demonstrativos inseridos com sucesso!');
  console.log('--- Credenciais de Acesso de Demonstração (Senha: sistech123) ---');
  console.log('• Colaboradora:  marina.santos  (RE: 00010)');
  console.log('• Técnico TI:    carlos.mendes  (RE: 00003)');
  console.log('• Técnico TI:    lucas.ferreira (RE: 00004)');
  console.log('• Técnica TI:    fernanda.alves (RE: 00005)');
  console.log('• Gestor de TI:  gestor.ti      (RE: 00002)');
  console.log('• Master Admin:  master.admin   (RE: 00001)');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro na execução dos seeds:', err);
      process.exit(1);
    });
}
