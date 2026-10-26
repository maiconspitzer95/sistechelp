import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Ticket } from '../../types';
import {
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ArrowLeftRight,
  User,
  Inbox,
  Calendar,
  AlertCircle,
  Search,
  RefreshCw,
  X,
  History,
  Activity,
} from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'atuais' | 'historico'>('atuais');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({
    em_atendimento: 0,
    aguardando_usuario: 0,
    resolvidos_hoje: 0,
    em_atraso: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal de Transferência
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Carregar dados
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getMyAssignedStats();
      if (data && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas pessoais:', err);
    }
  }, []);

  const loadTickets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append('aba', activeTab);
      params.append('page', String(page));
      params.append('limit', '15');
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.getMyAssignedTickets(`?${params.toString()}`);
      setTickets(res.tickets || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Erro ao carregar Meus Atendimentos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, search]);

  const loadTechnicians = useCallback(async () => {
    try {
      const data = await api.getTechnicians();
      setTechnicians(data.technicians || []);
    } catch (err) {
      console.error('Erro ao carregar lista de técnicos:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadTickets();
    loadTechnicians();
  }, [loadStats, loadTickets, loadTechnicians]);

  // Sincronização em tempo real via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleQueueUpdated = (payload: any) => {
      // Se a ação envolve o usuário atual, recarregar imediatamente
      if (
        payload.tecnico_id === user?.id ||
        payload.tecnico_anterior_id === user?.id ||
        payload.tecnico_novo_id === user?.id
      ) {
        loadStats();
        loadTickets(true);
      }
    };

    const handleNewMessage = (payload: any) => {
      if (payload.tecnico_id === user?.id) {
        loadTickets(true);
      }
    };

    socket.on('queue_updated', handleQueueUpdated);
    socket.on('new_message_global', handleNewMessage);

    return () => {
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('new_message_global', handleNewMessage);
    };
  }, [user?.id, loadStats, loadTickets]);

  const handleOpenTransfer = (ticket: Ticket) => {
    setTransferTicket(ticket);
    setSelectedTechId('');
    setTransferReason('');
    setTransferError('');
  };

  const handleConfirmTransfer = async () => {
    if (!transferTicket || !selectedTechId) {
      setTransferError('Selecione o técnico de destino.');
      return;
    }
    try {
      setTransferring(true);
      setTransferError('');
      await api.assignTicket(transferTicket.id, {
        tecnico_id: selectedTechId,
        motivo: transferReason.trim() || 'Transferência de atendimento solicitado pelo técnico',
      });
      setTransferTicket(null);
      await Promise.all([loadStats(), loadTickets(true)]);
    } catch (err: any) {
      setTransferError(err.message || 'Erro ao transferir chamado');
    } finally {
      setTransferring(false);
    }
  };

  const getTimeOpen = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'há menos de 1h';
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays}d ${diffHours % 24}h`;
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Urgente
          </span>
        );
      case 'alta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Alta
          </span>
        );
      case 'media':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            Média
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            Baixa
          </span>
        );
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'em_atendimento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Em Atendimento
          </span>
        );
      case 'aguardando_usuario':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Aguardando Usuário
          </span>
        );
      case 'resolvido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Resolvido
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle className="w-3 h-3 text-slate-500" />
            Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {s.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <UserCheck className="w-4 h-4" />
            Painel do Técnico
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Meus Atendimentos
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {user?.nome}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chamados vinculados diretamente ao seu usuário para atendimento e acompanhamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats();
              loadTickets(true);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => navigate('/technician')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
          >
            <Inbox className="w-3.5 h-3.5" />
            Ver Fila Geral
          </button>
        </div>
      </div>

      {/* 4 Cards de Indicadores Individuais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Em Atendimento */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Em Atendimento
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.em_atendimento}</div>
          </div>
        </div>

        {/* Card 2: Aguardando Usuário */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aguardando Usuário
            </div>
            <div className="text-2xl font-black text-amber-600">{stats.aguardando_usuario}</div>
          </div>
        </div>

        {/* Card 3: Resolvidos Hoje */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Resolvidos Hoje
            </div>
            <div className="text-2xl font-black text-emerald-600">{stats.resolvidos_hoje}</div>
          </div>
        </div>

        {/* Card 4: Em Atraso */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 transition-transform hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Em Atraso
            </div>
            <div className={`text-2xl font-black ${stats.em_atraso > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.em_atraso}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas + Barra de Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('atuais');
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'atuais'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Atendimentos Atuais
              {stats.em_atendimento + stats.aguardando_usuario > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'atuais' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {stats.em_atendimento + stats.aguardando_usuario}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('historico');
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'historico'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico de Atendimentos
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por protocolo, título ou solicitante..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Tabela de Chamados */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Carregando seus atendimentos...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <UserCheck className="w-8 h-8" />
            </div>
            {activeTab === 'atuais' ? (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Você ainda não possui chamados atribuídos.
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Novos chamados abertos pelos colaboradores aguardam na Fila Geral de Atendimento da TI.
                </p>
                <button
                  onClick={() => navigate('/technician')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/30 transition-all"
                >
                  <Inbox className="w-4 h-4" />
                  Ir para a Fila Geral e Assumir Chamado
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Nenhum chamado no seu histórico.
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Chamados que você concluir ou transferir para outros técnicos serão listados aqui.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Protocolo</th>
                  <th className="py-3 px-3">Chamado & Categoria</th>
                  <th className="py-3 px-3">Solicitante / Setor</th>
                  <th className="py-3 px-3">Prioridade</th>
                  <th className="py-3 px-3">Status</th>
                  {activeTab === 'historico' ? (
                    <th className="py-3 px-3">Participação</th>
                  ) : (
                    <th className="py-3 px-3">Aberto / Tempo</th>
                  )}
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tickets.map((t) => {
                  const isUrgent = t.prioridade === 'urgente';
                  const hasUnread = (t.mensagens_nao_lidas || 0) > 0;

                  return (
                    <tr
                      key={t.id}
                      className={`group hover:bg-blue-50/40 transition-colors ${
                        isUrgent ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Protocolo */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/technician/tickets/${t.id}`)}
                          className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          {t.protocolo}
                          {hasUnread && (
                            <span
                              title={`${t.mensagens_nao_lidas} nova(s) mensagem(ns)`}
                              className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"
                            />
                          )}
                        </button>
                      </td>

                      {/* Chamado & Categoria */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600">
                          {t.titulo}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {t.categoria_nome}
                          {hasUnread && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {t.mensagens_nao_lidas} nova(s) msg
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Solicitante / Setor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{t.solicitante_nome}</div>
                        <div className="text-[11px] text-slate-400">
                          {t.setor_solicitante_sigla || t.setor_solicitante_nome || 'Santa Casa'}
                        </div>
                      </td>

                      {/* Prioridade */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getPriorityBadge(t.prioridade)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Aberto / Participação */}
                      {activeTab === 'historico' ? (
                        <td className="py-3 px-3 whitespace-nowrap">
                          {t.tipo_participacao === 'transferido' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                                <ArrowLeftRight className="w-3 h-3" />
                                Transferido
                              </span>
                              {t.tecnico_atual_nome && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  para {t.tecnico_atual_nome}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                <CheckCircle className="w-3 h-3" />
                                Encerrado por você
                              </span>
                              {t.data_resolucao && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  em {new Date(t.data_resolucao).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      ) : (
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{getTimeOpen(t.created_at)}</span>
                          </div>
                        </td>
                      )}

                      {/* Ações */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === 'atuais' && (
                            <button
                              onClick={() => handleOpenTransfer(t)}
                              title="Transferir chamado para outro técnico"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-xs inline-flex items-center gap-1 transition-all"
                            >
                              <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                              Transferir
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/technician/tickets/${t.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                          >
                            <span>Atender</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Mostrando <span className="font-bold text-slate-700">{tickets.length}</span> de{' '}
              <span className="font-bold text-slate-700">{totalCount}</span> chamados
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Anterior
              </button>
              <span className="font-bold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Transferência de Chamado */}
      {transferTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Transferir Atendimento</h3>
                  <p className="text-xs text-slate-500">Protocolo {transferTicket.protocolo}</p>
                </div>
              </div>
              <button
                onClick={() => setTransferTicket(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {transferError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Técnico de Destino *
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium"
                >
                  <option value="">Selecione o técnico responsável...</option>
                  {technicians
                    .filter((tec) => tec.id !== user?.id)
                    .map((tec) => (
                      <option key={tec.id} value={tec.id}>
                        {tec.nome} ({tec.setor_sigla || tec.perfil_nome})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Motivo da Transferência
                </label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Explique o motivo para encaminhar este chamado a outro técnico..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                Ao confirmar, o chamado será transferido e sairá da sua lista de atendimentos ativos, passando para a responsabilidade do novo técnico. O histórico registrará a auditoria completa.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferTicket(null)}
                disabled={transferring}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferring || !selectedTechId}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {transferring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Confirmar Transferência
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MyTicketsPage;
