import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Ticket } from '../../types';
import { ChipMascot } from '../../components/common/ChipMascot';
import {
  PlusCircle,
  Inbox,
  MessageSquare,
  Monitor,
  Wifi,
  UserPlus,
  FileSpreadsheet,
  Code,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const CollaboratorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentTickets();
  }, []);

  const loadRecentTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getTickets('?apenas_meus=true');
      setRecentTickets((data.tickets || []).slice(0, 5));
    } catch (err) {
      console.error('Erro ao carregar chamados recentes:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickCards = [
    {
      title: 'Software',
      slug: 'software',
      desc: 'SISHOS, PEP, travamentos ou erros em tela',
      icon: Monitor,
      color: 'from-blue-600 to-indigo-700',
      badge: 'Sistemas',
    },
    {
      title: 'Hardware e Rede',
      slug: 'hardware-rede',
      desc: 'Impressoras, computadores, pontos de rede',
      icon: Wifi,
      color: 'from-cyan-600 to-blue-600',
      badge: 'Equipamentos',
    },
    {
      title: 'Solicitar Login',
      slug: 'solicitar-login',
      desc: 'Acessos para novos funcionários ou setores',
      icon: UserPlus,
      color: 'from-emerald-600 to-teal-700',
      badge: 'Contas & Acessos',
    },
    {
      title: 'Relatório',
      slug: 'relatorio',
      desc: 'Exportações de dados, planilhas Excel ou PDF',
      icon: FileSpreadsheet,
      color: 'from-amber-600 to-orange-600',
      badge: 'Relatórios',
    },
    {
      title: 'Novo Software',
      slug: 'novo-programa',
      desc: 'Propostas de novos softwares e automações',
      icon: Code,
      color: 'from-purple-600 to-pink-700',
      badge: 'Inovação',
    },
  ];

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner de Boas-Vindas com Mascote Oficial */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-blue-900 to-blue-800 text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-xs font-semibold border border-white/10">
              <span>Santa Casa de Pelotas • Atendimento de TI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, <span className="text-cyan-300">{user?.nome?.split(' ')[0]}</span>! Precisa de suporte hoje?
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Abra chamados para suporte a sistemas, impressoras, computadores ou solicite novos logins com facilidade.
              Nossa equipe técnica e o assistente Chip estão à sua disposição!
            </p>

            {/* 3 Botões Principais */}
            <div className="pt-2 flex flex-wrap gap-2.5 justify-center md:justify-start">
              <button
                onClick={() => navigate('/tickets/new')}
                className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Abrir Novo Chamado</span>
              </button>

              <button
                onClick={() => navigate('/collaborator/tickets')}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl backdrop-blur-md border border-white/10 transition"
              >
                <Inbox className="w-4 h-4 text-cyan-300" />
                <span>Meus Chamados</span>
              </button>

              <button
                onClick={() => {
                  const btn = (document.querySelector('button[title*="Falar com o Chip"]') ||
                    document.querySelector('button[title*="Chip"]')) as HTMLButtonElement;
                  if (btn) btn.click();
                }}
                className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-medium text-xs rounded-xl border border-cyan-400/30 transition shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-cyan-300" />
                <span>Falar com o Chip</span>
              </button>

            </div>
          </div>

          {/* Mascote Chip com destaque institucional */}
          <div className="shrink-0 flex items-center justify-center">
            <ChipMascot
              size="banner"
              alt="Mascote Chip — Assistente Oficial da TI"
              interactive={true}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Cards de Abertura Rápida */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Categorias de Atendimento Rápido
            </h2>
            <p className="text-xs text-slate-500">
              Selecione o tipo de chamado para preencher o formulário específico
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.slug}
                onClick={() => navigate(`/tickets/new?cat=${card.slug}`)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-400/60 cursor-pointer transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                  <span>Abrir chamado</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 3: Tabela de Chamados Recentes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Meus Chamados Recentes</h2>
          </div>
          <button
            onClick={() => navigate('/collaborator/tickets')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando chamados...</div>
        ) : recentTickets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhum chamado aberto ainda</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Quando você registrar um chamado de software, impressora ou login, ele aparecerá aqui com atualizações em tempo real.
            </p>
            <button
              onClick={() => navigate('/tickets/new')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition"
            >
              Abrir Primeiro Chamado
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Resumo</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{t.protocolo}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{t.categoria_nome}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">{t.titulo}</td>
                    <td className="py-3 px-4 text-slate-500">{t.setor_solicitante_sigla || 'Santa Casa'}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {t.tecnico_nome ? (
                        <span className="font-medium text-slate-800">{t.tecnico_nome}</span>
                      ) : (
                        <span className="text-slate-400 italic">Aguardando atribuição</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/collaborator/tickets/${t.id}`)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-xs transition inline-flex items-center space-x-1"
                      >
                        <span>Visualizar</span>
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
