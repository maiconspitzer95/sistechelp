import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Ticket } from '../../types';
import {
  Inbox,
  PlusCircle,
  Search,
  MessageSquare,
  Clock,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const CollaboratorTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('todos');

  useEffect(() => {
    loadTickets();
  }, [selectedStatus]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let query = '?apenas_meus=true';
      if (selectedStatus !== 'todos') {
        query += `&status=${selectedStatus}`;
      }
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      const data = await api.getTickets(query);
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Erro ao listar chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Aberto</span>;
      case 'em_triagem':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Em Triagem</span>;
      case 'em_atendimento':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">Em Atendimento</span>;
      case 'aguardando_usuario':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">Aguardando Você</span>;
      case 'aguardando_terceiro':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Aguardando Terceiro</span>;
      case 'resolvido':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Resolvido</span>;
      case 'concluido':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Concluído</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Topo: Título e Botão de Novo Chamado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Meus Chamados de Suporte</h1>
          <p className="text-xs text-slate-500">
            Acompanhe o status e converse diretamente com a equipe de TI da Santa Casa
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Chamado</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Pills de Status */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'aberto', label: 'Abertos' },
            { id: 'em_atendimento', label: 'Em Atendimento' },
            { id: 'aguardando_usuario', label: 'Aguardando Você' },
            { id: 'resolvido', label: 'Resolvidos' },
            { id: 'concluido', label: 'Concluídos' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedStatus(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                selectedStatus === pill.id
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
            loadTickets();
          }}
          className="relative w-full md:w-72"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por protocolo ou título..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </form>
      </div>

      {/* Lista de Chamados */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando chamados...</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum chamado encontrado</p>
            <p className="text-xs text-slate-400 mt-0.5">Tente alterar os filtros acima ou abra um novo chamado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Resumo do Problema</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data de Abertura</th>
                  <th className="py-3 px-4">Técnico TI</th>
                  <th className="py-3 px-4 text-center">Mensagens</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{t.protocolo}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{t.categoria_nome}</td>
                    <td className="py-3.5 px-4 max-w-sm truncate text-slate-600 font-medium">
                      {t.titulo}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {t.tecnico_nome ? (
                        <span className="font-semibold text-slate-800">{t.tecnico_nome}</span>
                      ) : (
                        <span className="text-slate-400 italic">Fila de triagem</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                        <MessageSquare className="w-3 h-3" />
                        <span>{t.total_mensagens || 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/collaborator/tickets/${t.id}`)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-xs transition inline-flex items-center space-x-1"
                      >
                        <span>Abrir Chat</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
