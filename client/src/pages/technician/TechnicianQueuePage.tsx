import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Ticket, Category, Sector } from '../../types';
import {
  Inbox,
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  ExternalLink,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  RefreshCw,
  X,
  ArrowLeftRight,
  Flame,
  User,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
} from 'lucide-react';

export const TechnicianQueuePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados principais
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({
    aguardando_atendimento: 0,
    em_atendimento: 0,
    aguardando_usuario: 0,
    alta_prioridade: 0,
    resolvidos_hoje: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Listas de apoio para filtros
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Filtros selecionados
  const [selectedStatusPill, setSelectedStatusPill] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSort, setSelectedSort] = useState('recentes');

  // Modal de Transferência
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [selectedTransferTechId, setSelectedTransferTechId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Notificação/Alerta de concorrência ou sucesso
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Carregar dados de estatísticas
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getQueueStats();
      if (data && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas da fila:', err);
    }
  }, []);

  // Carregar listas auxiliares
  const loadAuxData = useCallback(async () => {
    try {
      const [catsRes, sectsRes, techsRes] = await Promise.all([
        api.getCategories(),
        api.getSectors(true),
        api.getTechnicians(),
      ]);
      setCategories(catsRes.categories || []);
      setSectors(sectsRes.sectors || []);
      setTechnicians(techsRes.technicians || []);
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  }, []);

  // Carregar chamados da fila com todos os filtros
  const loadQueue = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        params.append('page', String(page));
        params.append('limit', '15');

        if (selectedStatusPill !== 'todos') {
          params.append('status', selectedStatusPill);
        }
        if (selectedCategory) {
          params.append('categoria_id', selectedCategory);
        }
        if (selectedPriority) {
          params.append('prioridade', selectedPriority);
        }
        if (selectedSector) {
          params.append('setor_id', selectedSector);
        }
        if (selectedTech) {
          params.append('tecnico_id', selectedTech);
        }
        if (selectedPeriod) {
          params.append('periodo', selectedPeriod);
        }
        if (selectedSort) {
          params.append('sort', selectedSort);
        }
        if (search.trim()) {
          params.append('search', search.trim());
        }

        const data = await api.getTickets(`?${params.toString()}`);
        setTickets(data.tickets || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Erro ao carregar fila técnica:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      selectedStatusPill,
      selectedCategory,
      selectedPriority,
      selectedSector,
      selectedTech,
      selectedPeriod,
      selectedSort,
      search,
    ]
  );

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    loadStats();
    loadQueue();
  }, [loadStats, loadQueue]);

  // Sincronização em tempo real via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleQueueUpdated = () => {
      loadStats();
      loadQueue(true);
    };

    const handleNewMessage = () => {
      loadQueue(true);
    };

    socket.on('queue_updated', handleQueueUpdated);
    socket.on('new_message_global', handleNewMessage);

    return () => {
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('new_message_global', handleNewMessage);
    };
  }, [loadStats, loadQueue]);

  // Assumir Chamado com Proteção Atômica de Concorrência
  const handleAssignToMe = async (ticket: Ticket) => {
    try {
      setConflictAlert(null);
      const res = await api.assignTicket(ticket.id, {});
      setSuccessToast(`Chamado ${ticket.protocolo} assumido com sucesso!`);
      setTimeout(() => setSuccessToast(null), 4000);
      await Promise.all([loadStats(), loadQueue(true)]);
    } catch (err: any) {
      if (err.message && err.message.includes('já foi assumido')) {
        setConflictAlert(
          `Atenção: O chamado ${ticket.protocolo} acabou de ser assumido por outro técnico!`
        );
      } else {
        setConflictAlert(err.message || 'Erro ao assumir chamado');
      }
      // Atualiza a fila para refletir o novo dono
      await Promise.all([loadStats(), loadQueue(true)]);
    }
  };

  // Abrir Modal de Transferência
  const handleOpenTransfer = (ticket: Ticket) => {
    setTransferTicket(ticket);
    setSelectedTransferTechId('');
    setTransferReason('');
    setTransferError('');
  };

  const handleConfirmTransfer = async () => {
    if (!transferTicket || !selectedTransferTechId) {
      setTransferError('Selecione o técnico de destino.');
      return;
    }
    try {
      setTransferring(true);
      setTransferError('');
      await api.assignTicket(transferTicket.id, {
        tecnico_id: selectedTransferTechId,
        motivo: transferReason.trim() || 'Transferência efetuada na fila de chamados',
      });
      setTransferTicket(null);
      setSuccessToast(`Chamado ${transferTicket.protocolo} transferido com sucesso!`);
      setTimeout(() => setSuccessToast(null), 4000);
      await Promise.all([loadStats(), loadQueue(true)]);
    } catch (err: any) {
      setTransferError(err.message || 'Erro ao transferir chamado');
    } finally {
      setTransferring(false);
    }
  };

  // Limpar todos os filtros
  const handleResetFilters = () => {
    setSelectedStatusPill('todos');
    setSearch('');
    setSelectedCategory('');
    setSelectedPriority('');
    setSelectedSector('');
    setSelectedTech('');
    setSelectedPeriod('');
    setSelectedSort('recentes');
    setPage(1);
  };

  const hasActiveFilters =
    selectedStatusPill !== 'todos' ||
    search.trim() !== '' ||
    selectedCategory !== '' ||
    selectedPriority !== '' ||
    selectedSector !== '' ||
    selectedTech !== '' ||
    selectedPeriod !== '' ||
    selectedSort !== 'recentes';

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
            <Flame className="w-3.5 h-3.5 text-rose-600" />
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
      case 'aberto':
      case 'em_triagem':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
            Aberto
          </span>
        );
      case 'em_atendimento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Em Atendimento
          </span>
        );
      case 'aguardando_usuario':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Aguardando Usuário
          </span>
        );
      case 'resolvido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Resolvido
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle className="w-3 h-3 text-slate-500" />
            Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {s.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'TI';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Alertas Flutuantes de Sucesso / Conflito */}
      {conflictAlert && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{conflictAlert}</span>
          </div>
          <button
            onClick={() => setConflictAlert(null)}
            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Topo: Título & Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <Inbox className="w-4 h-4" />
            Central de Atendimento TI
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Fila Geral de Chamados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize, filtre e assuma demandas abertas pelos colaboradores da Santa Casa de Pelotas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats();
              loadQueue(true);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            title="Atualizar fila"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => navigate('/technician/my-tickets')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Meus Atendimentos
          </button>
        </div>
      </div>

      {/* 5 Cards de Indicadores no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* 1. Aguardando Atendimento */}
        <div
          onClick={() => {
            setSelectedStatusPill('nao_atribuidos');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
            selectedStatusPill === 'nao_atribuidos'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                selectedStatusPill === 'nao_atribuidos' ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              Aguardando TI
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedStatusPill === 'nao_atribuidos'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.aguardando_atendimento}</div>
          <div
            className={`text-[11px] mt-1 font-medium ${
              selectedStatusPill === 'nao_atribuidos' ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            Sem técnico atribuído
          </div>
        </div>

        {/* 2. Em Atendimento */}
        <div
          onClick={() => {
            setSelectedStatusPill('em_atendimento');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
            selectedStatusPill === 'em_atendimento'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                selectedStatusPill === 'em_atendimento' ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              Em Atendimento
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedStatusPill === 'em_atendimento'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.em_atendimento}</div>
          <div
            className={`text-[11px] mt-1 font-medium ${
              selectedStatusPill === 'em_atendimento' ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            Em andamento na equipe
          </div>
        </div>

        {/* 3. Aguardando Usuário */}
        <div
          onClick={() => {
            setSelectedStatusPill('aguardando_usuario');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
            selectedStatusPill === 'aguardando_usuario'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                selectedStatusPill === 'aguardando_usuario' ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              Aguardando Usuário
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedStatusPill === 'aguardando_usuario'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.aguardando_usuario}</div>
          <div
            className={`text-[11px] mt-1 font-medium ${
              selectedStatusPill === 'aguardando_usuario' ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            Informações pendentes
          </div>
        </div>

        {/* 4. Alta Prioridade */}
        <div
          onClick={() => {
            setSelectedPriority(selectedPriority === 'urgente' ? '' : 'urgente');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
            selectedPriority === 'urgente' || selectedPriority === 'alta'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                selectedPriority === 'urgente' || selectedPriority === 'alta'
                  ? 'text-rose-100'
                  : 'text-slate-400'
              }`}
            >
              Alta Prioridade
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedPriority === 'urgente' || selectedPriority === 'alta'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.alta_prioridade}</div>
          <div
            className={`text-[11px] mt-1 font-medium ${
              selectedPriority === 'urgente' || selectedPriority === 'alta'
                ? 'text-rose-100'
                : 'text-slate-500'
            }`}
          >
            Urgentes ou altas
          </div>
        </div>

        {/* 5. Resolvidos Hoje */}
        <div
          onClick={() => {
            setSelectedStatusPill('resolvido');
            setSelectedPeriod('hoje');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
            selectedStatusPill === 'resolvido' && selectedPeriod === 'hoje'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                selectedStatusPill === 'resolvido' && selectedPeriod === 'hoje'
                  ? 'text-emerald-100'
                  : 'text-slate-400'
              }`}
            >
              Resolvidos Hoje
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                selectedStatusPill === 'resolvido' && selectedPeriod === 'hoje'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.resolvidos_hoje}</div>
          <div
            className={`text-[11px] mt-1 font-medium ${
              selectedStatusPill === 'resolvido' && selectedPeriod === 'hoje'
                ? 'text-emerald-100'
                : 'text-slate-500'
            }`}
          >
            Finalizados na data
          </div>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Linha 1: Pills de Status Rápido + Campo de Busca */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'todos', label: 'Todos os Chamados' },
              { id: 'nao_atribuidos', label: 'Aguardando Atendimento' },
              { id: 'em_atendimento', label: 'Em Atendimento' },
              { id: 'aguardando_usuario', label: 'Aguardando Usuário' },
              { id: 'resolvido', label: 'Resolvidos' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => {
                  setSelectedStatusPill(pill.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedStatusPill === pill.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar protocolo, título, solicitante..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Linha 2: Filtros Combinados (Dropdowns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Categoria */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Prioridade
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          {/* Setor Solicitante */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Setor
            </label>
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sigla} - {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Técnico Responsável */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Responsável
            </label>
            <select
              value={selectedTech}
              onChange={(e) => {
                setSelectedTech(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="unassigned">Sem Responsável</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Qualquer data</option>
              <option value="hoje">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Ordenar por
            </label>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="prioridade">Prioridade (Urgente 1º)</option>
              <option value="sla">Prazo SLA</option>
            </select>
          </div>
        </div>

        {/* Indicador de Filtros Ativos + Botão de Limpar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Filtros ativos aplicados na fila
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar todos os filtros
            </button>
          </div>
        )}

        {/* Tabela de Chamados da Fila */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Carregando fila de atendimento...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Nenhum chamado encontrado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Não foram encontrados chamados que correspondam aos filtros selecionados.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar filtros e ver todos
              </button>
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
                  <th className="py-3 px-3">Técnico Responsável</th>
                  <th className="py-3 px-3">Aberto / Tempo</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tickets.map((t) => {
                  const isUrgent = t.prioridade === 'urgente';
                  const isAssignedToMe = t.tecnico_id === user?.id;
                  const isUnassigned = !t.tecnico_id;

                  return (
                    <tr
                      key={t.id}
                      className={`group hover:bg-blue-50/40 transition-colors ${
                        isUrgent ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      {/* Protocolo */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/technician/tickets/${t.id}`)}
                          className="hover:text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {t.protocolo}
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
                          {(t.mensagens_nao_lidas || 0) > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
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

                      {/* Técnico Responsável */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {t.tecnico_nome ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              isAssignedToMe
                                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {getInitials(t.tecnico_nome)}
                            </div>
                            <span className={`font-semibold ${isAssignedToMe ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                              {isAssignedToMe ? 'Você' : t.tecnico_nome}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Não atribuído
                          </span>
                        )}
                      </td>

                      {/* Aberto / Tempo */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{getTimeOpen(t.created_at)}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUnassigned ? (
                            <button
                              onClick={() => handleAssignToMe(t)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                              title="Assumir este chamado para você"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Assumir
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenTransfer(t)}
                              title="Transferir para outro técnico"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs inline-flex items-center gap-1 transition-all"
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

      {/* Modal de Transferência */}
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
                  value={selectedTransferTechId}
                  onChange={(e) => setSelectedTransferTechId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium"
                >
                  <option value="">Selecione o técnico responsável...</option>
                  {technicians
                    .filter((tec) => tec.id !== transferTicket.tecnico_id)
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
                  placeholder="Explique o motivo para encaminhar este chamado..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                O chamado será reatribuído ao técnico selecionado com registro completo na auditoria do sistema.
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
                disabled={transferring || !selectedTransferTechId}
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
export default TechnicianQueuePage;
