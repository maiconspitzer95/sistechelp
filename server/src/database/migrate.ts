import { pool } from '../config/database.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migrations do Sistech Desk...');
    // Habilitar extensão pgcrypto se permitido (gen_random_uuid é nativo no PostgreSQL 13+)
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch {
      // Ignora caso o usuário da aplicação não seja superusuário
    }

    await client.query('BEGIN');

    // 1. Tabela de Perfis
    await client.query(`
      CREATE TABLE IF NOT EXISTS perfis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        permissoes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabela de Setores
    await client.query(`
      CREATE TABLE IF NOT EXISTS setores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(150) NOT NULL,
        sigla VARCHAR(50) NOT NULL,
        eh_setor_atendimento BOOLEAN DEFAULT false,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabela de Usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(200) NOT NULL,
        re VARCHAR(50) UNIQUE NOT NULL,
        login VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150),
        senha_hash VARCHAR(255) NOT NULL,
        perfil_id UUID NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
        setor_id UUID REFERENCES setores(id) ON DELETE SET NULL,
        ativo BOOLEAN DEFAULT true,
        pode_atender BOOLEAN DEFAULT false,
        cargo VARCHAR(100),
        telefone_ramal VARCHAR(50),
        avatar_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios(login);
      CREATE INDEX IF NOT EXISTS idx_usuarios_re ON usuarios(re);
      CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil_id);
    `);

    // 4. Equipes de Atendimento
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipes_atendimento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(150) NOT NULL,
        setor_id UUID REFERENCES setores(id) ON DELETE CASCADE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Relação Usuários <-> Equipes
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios_equipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        equipe_id UUID NOT NULL REFERENCES equipes_atendimento(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, equipe_id)
      );
    `);

    // 6. Categorias de Atendimento
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        descricao TEXT,
        icone VARCHAR(50) DEFAULT 'HelpCircle',
        setor_responsavel_id UUID REFERENCES setores(id) ON DELETE SET NULL,
        sla_horas INTEGER DEFAULT 24,
        ativo BOOLEAN DEFAULT true,
        ordem INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Formulários
    await client.query(`
      CREATE TABLE IF NOT EXISTS formularios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        versao INTEGER DEFAULT 1,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Campos dos Formulários
    await client.query(`
      CREATE TABLE IF NOT EXISTS campos_formulario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        formulario_id UUID NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
        nome_campo VARCHAR(100) NOT NULL,
        rotulo VARCHAR(150) NOT NULL,
        tipo_campo VARCHAR(50) NOT NULL, -- text, textarea, select, file, radio, checkbox, etc.
        obrigatorio BOOLEAN DEFAULT false,
        placeholder TEXT,
        opcoes JSONB DEFAULT '[]'::jsonb,
        ordem INTEGER DEFAULT 0,
        largura VARCHAR(20) DEFAULT 'full',
        validacao JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Chamados
    await client.query(`
      CREATE TABLE IF NOT EXISTS chamados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        protocolo VARCHAR(50) UNIQUE NOT NULL,
        categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
        setor_solicitante_id UUID REFERENCES setores(id) ON DELETE SET NULL,
        setor_atendimento_id UUID REFERENCES setores(id) ON DELETE SET NULL,
        solicitante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        tecnico_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        prioridade VARCHAR(20) NOT NULL DEFAULT 'media', -- baixa, media, alta, urgente
        status VARCHAR(30) NOT NULL DEFAULT 'aberto', -- aberto, em_triagem, em_atendimento, aguardando_usuario, aguardando_terceiro, resolvido, concluido, cancelado
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT NOT NULL,
        vnc_ou_ip VARCHAR(100),
        solucao TEXT,
        data_primeira_resposta TIMESTAMP WITH TIME ZONE,
        data_resolucao TIMESTAMP WITH TIME ZONE,
        data_conclusao TIMESTAMP WITH TIME ZONE,
        prazo_limite TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chamados_protocolo ON chamados(protocolo);
      CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
      CREATE INDEX IF NOT EXISTS idx_chamados_solicitante ON chamados(solicitante_id);
      CREATE INDEX IF NOT EXISTS idx_chamados_tecnico ON chamados(tecnico_id);
      CREATE INDEX IF NOT EXISTS idx_chamados_setor_atend ON chamados(setor_atendimento_id);
    `);

    // 10. Respostas de Formulário
    await client.query(`
      CREATE TABLE IF NOT EXISTS respostas_formulario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        dados JSONB NOT NULL DEFAULT '{}'::jsonb,
        colaboradores_acesso JSONB DEFAULT '[]'::jsonb, -- Usado na categoria 'Solicitar Login' com múltiplos colaboradores
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_respostas_chamado ON respostas_formulario(chamado_id);
    `);

    // 11. Atribuições e Transferências
    await client.query(`
      CREATE TABLE IF NOT EXISTS atribuicoes_chamados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        tecnico_anterior_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        tecnico_novo_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        atribuido_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        motivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_atribuicoes_chamado ON atribuicoes_chamados(chamado_id);
    `);

    // 12. Mensagens do Chamado (Chat & Notas Internas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS mensagens_chamados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        conteudo TEXT NOT NULL,
        tipo VARCHAR(30) DEFAULT 'texto', -- texto, sistema, status_mudanca, solicitacao_info
        eh_nota_interna BOOLEAN DEFAULT false,
        lida BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mensagens_chamado ON mensagens_chamados(chamado_id);
      CREATE INDEX IF NOT EXISTS idx_mensagens_eh_nota ON mensagens_chamados(eh_nota_interna);
    `);

    // 13. Anexos
    await client.query(`
      CREATE TABLE IF NOT EXISTS anexos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID REFERENCES chamados(id) ON DELETE CASCADE,
        mensagem_id UUID REFERENCES mensagens_chamados(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho VARCHAR(500) NOT NULL,
        mime_type VARCHAR(150),
        tamanho_bytes BIGINT,
        enviado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Histórico de Eventos do Chamado
    await client.query(`
      CREATE TABLE IF NOT EXISTS historico_chamados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        acao VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        status_anterior VARCHAR(30),
        status_novo VARCHAR(30),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_historico_chamado ON historico_chamados(chamado_id);
    `);

    // 15. Notificações
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        chamado_id UUID REFERENCES chamados(id) ON DELETE CASCADE,
        titulo VARCHAR(150) NOT NULL,
        mensagem TEXT NOT NULL,
        tipo VARCHAR(50) DEFAULT 'info',
        lida BOOLEAN DEFAULT false,
        link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
    `);

    // 16. Base de Conhecimento
    await client.query(`
      CREATE TABLE IF NOT EXISTS base_conhecimento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
        titulo VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        resumo TEXT,
        tags TEXT[] DEFAULT '{}',
        palavras_chave TEXT[] DEFAULT '{}',
        visualizacoes INTEGER DEFAULT 0,
        util_sim INTEGER DEFAULT 0,
        util_nao INTEGER DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        criado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. Avaliações de Atendimento
    await client.query(`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chamado_id UUID UNIQUE NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
        comentario TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. Configurações Globais
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chave VARCHAR(100) UNIQUE NOT NULL,
        valor JSONB NOT NULL,
        descricao TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 19. Auditoria
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        acao VARCHAR(100) NOT NULL,
        entidade VARCHAR(100) NOT NULL,
        entidade_id UUID,
        dados_anteriores JSONB,
        dados_novos JSONB,
        ip VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria(entidade);
    `);

    // Sequência para geração de protocolos sem duplicidade
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS seq_chamados_protocolo START 1000;
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations concluídas com sucesso no Sistech Desk!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao rodar migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
