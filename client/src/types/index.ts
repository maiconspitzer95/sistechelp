export interface User {
  id: string;
  nome: string;
  re: string;
  login: string;
  email: string | null;
  cargo?: string;
  perfil_codigo: 'master' | 'gestor' | 'tecnico' | 'colaborador';
  perfil_nome: string;
  permissoes: string[];
  setor_id: string | null;
  setor_nome: string | null;
  setor_sigla: string | null;
  pode_atender: boolean;
  ativo?: boolean;
}

export interface Sector {
  id: string;
  nome: string;
  sigla: string;
  eh_setor_atendimento: boolean;
  ativo: boolean;
}

export interface FormField {
  id: string;
  nome_campo: string;
  rotulo: string;
  tipo_campo: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[];
  ordem: number;
  largura?: string;
}

export interface Category {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  sla_horas: number;
  ordem: number;
  ativo: boolean;
  setor_nome?: string;
  formulario?: {
    id: string;
    nome: string;
    campos: FormField[];
  };
}

export type TicketStatus =
  | 'aberto'
  | 'em_triagem'
  | 'em_atendimento'
  | 'aguardando_usuario'
  | 'aguardando_terceiro'
  | 'resolvido'
  | 'concluido'
  | 'cancelado';

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Ticket {
  id: string;
  protocolo: string;
  categoria_id: string;
  categoria_nome: string;
  categoria_slug: string;
  categoria_icone: string;
  setor_solicitante_id?: string;
  setor_solicitante_nome?: string;
  setor_solicitante_sigla?: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_re: string;
  solicitante_email?: string;
  solicitante_cargo?: string;
  tecnico_id?: string | null;
  tecnico_nome?: string | null;
  prioridade: TicketPriority;
  status: TicketStatus;
  titulo: string;
  descricao: string;
  vnc_ou_ip?: string;
  solucao?: string;
  data_resolucao?: string;
  data_conclusao?: string;
  prazo_limite?: string;
  created_at: string;
  updated_at: string;
  total_mensagens?: number;
  mensagens_nao_lidas?: number;
  ultima_mensagem_em?: string;
  tipo_participacao?: string;
  tecnico_atual_nome?: string;
  motivo_transferencia?: string;
  transferido_em?: string;
  formulario_dados?: Record<string, any>;
  colaboradores_acesso?: Array<{
    nome: string;
    re: string;
    setor: string;
    cargo?: string;
  }>;
  historico?: TicketHistoryEvent[];
  avaliacao?: {
    nota: number;
    comentario?: string;
  };
}

export interface TicketHistoryEvent {
  id: string;
  usuario_nome?: string;
  acao: string;
  descricao: string;
  status_anterior?: string;
  status_novo?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chamado_id: string;
  autor_id: string;
  autor_nome: string;
  autor_cargo?: string;
  autor_perfil_codigo: string;
  autor_perfil_nome: string;
  conteudo: string;
  tipo: 'texto' | 'sistema' | 'status_mudanca' | 'solicitacao_info';
  eh_nota_interna: boolean;
  lida: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  chamado_id?: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link?: string;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  titulo: string;
  conteudo: string;
  resumo?: string;
  tags?: string[];
  visualizacoes: number;
  util_sim: number;
  util_nao: number;
  created_at: string;
  categoria_nome?: string;
}
