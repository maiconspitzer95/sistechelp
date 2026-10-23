import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Ticket } from '../../types';
import {
  Inbox,
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  ExternalLink,
  Clock,
  AlertCircle,
  ArrowRight,
  UserPlus,
} from 'lucide-react';

export const TechnicianQueuePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [search, setSearch] = useState('');

  // Modal de Transferência
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  useEffect(() => {
    loadQueue();
    loadTechnicians();
  }, [selectedFilter]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (selectedFilter === 'nao_atribuidos') {
        query += 'status=nao_atribuidos&';
      } else if (selectedFilter === 'meus_atendimentos') {
        query += 'status=meus_atendimentos&';
      } else if (selectedFilter !== 'todos') {
        query += `status=${selectedFilter}&`;
      }
      if (search) {
        query += `search=${encodeURIComponent(search)}&`;
      }
      const data = await api.getTickets(query);
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Erro ao carregar fila técnica:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const data = await api.getTechnicians();
      setTechnicians(data.technicians || []);
    } catch (err) {}
  };

  const handleAssignToMe = async (ticketId: string) => {
    try {
      await api.assignTicket(ticketId, {});
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Erro ao assumir chamado');
    }
  };

  const handleTransfer = async () => {
    if (!transferTicketId || !selectedTechId) return;
    try {
      await api.assignTicket(transferTicketId, { tecnico_id: selectedTechId });
      setTransferTicketId(null);
      setSelectedTechId('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Erro ao transferir chamado');
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
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-red-800 uppercase animate-pulse">Urgente</span>;
      case 'alta':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 uppercase">Alta</span>;
      case 'media':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 text-blue-800 uppercase">Média</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">Baixa</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">Aberto</span>;
      case 'em_triagem':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">Em Triagem</span>;
      case 'em_atendimento':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800">Em Atendimento</span>;
      case 'aguardando_usuario':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">Aguardando Usuário</span>;
      case 'aguardando_terceiro':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Aguardando Terceiro</span>;
      case 'resolvido':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Resolvido</span>;
      case 'concluido':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">Concluído</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Topo: Painel de Atendimento da TI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Fila de Atendimento da TI</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              {tickets.length} chamados
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Santa Casa de Pelotas • Distribuição, triagem e atendimento técnico
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/technician/dashboard')}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Ver Indicadores & SLA
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filtros em Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'nao_atribuidos', label: 'Não Atribuídos' },
            { id: 'meus_atendimentos', label: 'Meus Chamados' },
            { id: 'em_atendimento', label: 'Em Atendimento' },
            { id: 'aguardando_usuario', label: 'Aguardando Usuário' },
            { id: 'resolvido', label: 'Resolvidos' },
            { id: 'concluido', label: 'Concluídos' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                selectedFilter === pill.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Campo de Busca */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadQueue();
          }}
          className="relative w-full md:w-72"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Protocolo, título, solicitante..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </form>
      </div>

      {/* Tabela da Fila */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando fila...</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Nenhum chamado nesta fila</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Título / Categoria</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Técnico TI</th>
                  <th className="py-3 px-4">Tempo em Aberto</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{t.protocolo}</td>
                    <td className="py-3.5 px-4">{getPriorityBadge(t.prioridade)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{t.titulo}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        {t.categoria_nome}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">{t.solicitante_nome}</div>
                      <div className="text-[10px] text-slate-400">R.E. {t.solicitante_re}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {t.setor_solicitante_sigla || 'Santa Casa'}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4">
                      {t.tecnico_nome ? (
                        <span className="font-semibold text-slate-800">{t.tecnico_nome}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Fila Geral</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{getTimeOpen(t.created_at)}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Se não atribuído, técnico pode assumir com um clique */}
                        {!t.tecnico_id && (
                          <button
                            onClick={() => handleAssignToMe(t.id)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                            title="Assumir este chamado"
                          >
                            Assumir
                          </button>
                        )}

                        {/* Botão de transferir */}
                        <button
                          onClick={() => {
                            setTransferTicketId(t.id);
                            setSelectedTechId(t.tecnico_id || '');
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                          title="Transferir para outro técnico"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>

                        {/* Abrir tela do chamado */}
                        <button
                          onClick={() => navigate(`/technician/tickets/${t.id}`)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition inline-flex items-center space-x-1"
                        >
                          <span>Atender</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Transferência de Chamado */}
      {transferTicketId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Transferir Atendimento do Chamado</h3>
            <p className="text-xs text-slate-500">
              Selecione o técnico de TI para o qual o chamado será encaminhado:
            </p>

            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Selecione um técnico...</option>
              {technicians.map((tec) => (
                <option key={tec.id} value={tec.id}>
                  {tec.nome} ({tec.chamados_em_aberto} chamados em aberto)
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setTransferTicketId(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedTechId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
