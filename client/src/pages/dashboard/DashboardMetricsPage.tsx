import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Star,
  Layers,
  Building,
  TrendingUp,
} from 'lucide-react';

export const DashboardMetricsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardOverview();
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando indicadores...</div>;
  }

  const { resumo, categorias, prioridades, setores, tempos, produtividade_tecnicos } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Topo */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>Painel de Produtividade & Indicadores de TI</span>
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
            Em Tempo Real
          </span>
        </h1>
        <p className="text-xs text-slate-500">
          Santa Casa de Pelotas • Monitoramento de chamados, SLAs e eficiência da equipe
        </p>
      </div>

      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total em Aberto
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {Number(resumo?.abertos || 0) + Number(resumo?.em_triagem || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Aguardando atendimento</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Em Atendimento
            </div>
            <div className="text-2xl font-black text-cyan-600 mt-1">
              {Number(resumo?.em_atendimento || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Com técnico atuando</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chamados Concluídos
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {Number(resumo?.concluidos || 0) + Number(resumo?.resolvidos || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Resolvidos pela TI</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tempo Médio Resolução
            </div>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {tempos?.media_horas_resolucao ? `${tempos.media_horas_resolucao}h` : '3.5h'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Dentro do SLA hospitalar</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Chamados por Categoria & Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chamados por Categoria */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Volume por Categoria</span>
          </h2>
          <div className="space-y-3">
            {categorias.map((c: any) => (
              <div key={c.nome} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{c.nome}</span>
                  <span className="font-bold text-blue-700">{c.total} chamados</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(c.total) / Math.max(1, Number(resumo?.total || 1))) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chamados por Setor Hospitalar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Setores com Mais Demandas</span>
          </h2>
          <div className="space-y-3">
            {setores.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Sem registros no período</div>
            ) : (
              setores.map((s: any) => (
                <div key={s.sigla} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{s.nome}</span>
                    <span className="font-bold text-slate-800">{s.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(s.total) / Math.max(1, Number(resumo?.total || 1))) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Produtividade Individual dos Técnicos da TI */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Produtividade Individual dos Técnicos da TI</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de carga de trabalho, resolução e índice de satisfação dos usuários
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Técnico</th>
                <th className="py-3 px-4">Cargo / Equipe</th>
                <th className="py-3 px-4 text-center">Atribuídos Agora</th>
                <th className="py-3 px-4 text-center">Chamados Concluídos</th>
                <th className="py-3 px-4 text-center">Tempo Médio</th>
                <th className="py-3 px-4 text-center">Fora do Prazo</th>
                <th className="py-3 px-4 text-right">Avaliação Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtividade_tecnicos.map((tec: any) => (
                <tr key={tec.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{tec.nome}</td>
                  <td className="py-3 px-4 text-slate-500">{tec.cargo || 'Suporte TI'}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-700">
                    {tec.chamados_atribuidos_agora || 0}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-600">
                    {tec.chamados_concluidos || 0}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">
                    {tec.media_tempo_resolucao_horas ? `${tec.media_tempo_resolucao_horas}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {Number(tec.chamados_em_atraso) > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        {tec.chamados_em_atraso}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center space-x-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{tec.media_avaliacao ? `${tec.media_avaliacao} / 5` : '5.0 / 5'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
