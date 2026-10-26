import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Category, Sector } from '../../types';
import {
  Monitor,
  Wifi,
  UserPlus,
  FileSpreadsheet,
  Code,
  ArrowLeft,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  HelpCircle,
} from 'lucide-react';

export const NewTicketPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedCatSlug, setSelectedCatSlug] = useState<string>('software');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos padrão
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');
  const [setorId, setSetorId] = useState(user?.setor_id || '');
  const [vncOuIp, setVncOuIp] = useState('');

  // Respostas específicas por categoria
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});

  // Lista dinâmica de colaboradores para Solicitar Login (múltiplos no mesmo chamado!)
  const [colaboradoresLogin, setColaboradoresLogin] = useState<
    Array<{ nome: string; re: string; setor: string; cargo: string }>
  >([{ nome: '', re: '', setor: '', cargo: '' }]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [catData, secData] = await Promise.all([api.getCategories(), api.getSectors()]);
      setCategories(catData.categories || []);
      setSectors(secData.sectors || []);

      const paramCat = searchParams.get('cat');
      if (paramCat) {
        setSelectedCatSlug(paramCat);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do formulário:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = categories.find((c) => c.slug === selectedCatSlug) || categories[0];

  const handleFieldChange = (field: string, value: any) => {
    setFormAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCollaborator = () => {
    setColaboradoresLogin((prev) => [...prev, { nome: '', re: '', setor: '', cargo: '' }]);
  };

  const handleRemoveCollaborator = (index: number) => {
    if (colaboradoresLogin.length === 1) return;
    setColaboradoresLogin((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCollaboratorChange = (index: number, field: string, val: string) => {
    setColaboradoresLogin((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalTitulo = titulo.trim();
    let finalDescricao = descricao.trim();

    if (selectedCatSlug === 'solicitar-login') {
      if (colaboradoresLogin.length === 0) {
        setError('Por favor, adicione ao menos um colaborador.');
        return;
      }

      for (let i = 0; i < colaboradoresLogin.length; i++) {
        const c = colaboradoresLogin[i];
        if (!c.nome.trim() || !c.re.trim() || !c.setor.trim()) {
          setError(`Por favor, preencha o Nome Completo, R.E. e Setor do colaborador #${i + 1}.`);
          return;
        }
      }

      // Geração automática do título conforme especificação:
      // 1 colaborador: "Solicitação de Login — João Silva"
      // Vários: "Solicitação de Login — 3 colaboradores"
      if (colaboradoresLogin.length === 1) {
        finalTitulo = `Solicitação de Login — ${colaboradoresLogin[0].nome.trim()}`;
      } else {
        finalTitulo = `Solicitação de Login — ${colaboradoresLogin.length} colaboradores`;
      }

      // Geração automática da descrição / resumo para a equipe de TI
      const descLinhas = [
        'Solicitação de liberação de login e acessos aos sistemas:',
        ...colaboradoresLogin.map(
          (c, idx) =>
            `• Colaborador ${idx + 1}: ${c.nome.trim()} (R.E.: ${c.re.trim()}) — Setor: ${c.setor.trim()}${
              c.cargo.trim() ? ` — Cargo: ${c.cargo.trim()}` : ''
            }`
        ),
      ];
      finalDescricao = descLinhas.join('\n');
    } else if (selectedCatSlug === 'relatorio') {
      const titRel = (formAnswers.titulo_relatorio || '').trim();
      const sistOrig = (formAnswers.sistema_origem || '').trim();
      const necess = (formAnswers.necessidades_relatorio || '').trim();
      const filtros = (formAnswers.filtros_necessarios || '').trim();

      if (!titRel) {
        setError('Por favor, informe o Título do Relatório.');
        return;
      }
      if (!sistOrig) {
        setError('Por favor, informe o Sistema ou Módulo de Origem dos Dados.');
        return;
      }
      if (!necess) {
        setError('Por favor, descreva o que é necessário para o relatório.');
        return;
      }

      // Preenchimento automático do título com o Título do Relatório
      finalTitulo = titRel;

      // Descrição interna gerada a partir das especificações
      finalDescricao = [
        'ESPECIFICAÇÕES DO RELATÓRIO',
        `• Título do Relatório: ${titRel}`,
        `• Sistema ou Módulo de Origem dos Dados: ${sistOrig}`,
        '',
        'O que é necessário para o relatório:',
        necess,
        '',
        'Filtros Necessários:',
        filtros || 'Nenhum filtro específico informado',
      ].join('\n');
    } else if (selectedCatSlug === 'novo-programa') {
      const descSw = (formAnswers.descreva_software || '').trim();
      const procAt = (formAnswers.processo_atual || '').trim();
      const benef = (formAnswers.beneficios_esperados || '').trim();

      if (!descSw) {
        setError('Por favor, descreva o Novo Software.');
        return;
      }
      if (!procAt) {
        setError('Por favor, explique como o processo funciona atualmente.');
        return;
      }
      if (!benef) {
        setError('Por favor, descreva os benefícios esperados para a Santa Casa.');
        return;
      }

      const cleanProposta = descSw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      const resumo = cleanProposta.length > 60 ? cleanProposta.substring(0, 57).trim() + '...' : cleanProposta;
      finalTitulo = `Solicitação de Novo Software — ${resumo || 'Nova Proposta'}`;

      finalDescricao = [
        'PROPOSTA DE NOVO SOFTWARE',
        '',
        'Descreva o Novo Software:',
        descSw,
        '',
        'Como o Processo Funciona Atualmente:',
        procAt,
        '',
        'Benefícios Esperados para a Santa Casa:',
        benef,
      ].join('\n');
    } else {
      if (!finalTitulo || !finalDescricao) {
        setError('Por favor, informe o título e a descrição do problema');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const isNoVnc = ['solicitar-login', 'relatorio', 'novo-programa'].includes(selectedCatSlug);

      const payload = {
        categoria_id: currentCategory.id,
        setor_solicitante_id: setorId || user?.setor_id || null,
        titulo: finalTitulo,
        descricao: finalDescricao,
        prioridade: (selectedCatSlug === 'relatorio' || selectedCatSlug === 'novo-programa') ? 'media' : prioridade,
        vnc_ou_ip: isNoVnc ? null : (vncOuIp.trim() || null),
        respostas: formAnswers,
        colaboradores_acesso: selectedCatSlug === 'solicitar-login' ? colaboradoresLogin : [],
      };

      const res = await api.createTicket(payload);
      navigate(`/collaborator/tickets/${res.ticket.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar chamado');
    } finally {
      setSubmitting(false);
    }
  };

  const getCatIcon = (slug: string) => {
    switch (slug) {
      case 'software':
        return <Monitor className="w-5 h-5" />;
      case 'hardware-rede':
        return <Wifi className="w-5 h-5" />;
      case 'solicitar-login':
        return <UserPlus className="w-5 h-5" />;
      case 'relatorio':
        return <FileSpreadsheet className="w-5 h-5" />;
      case 'novo-programa':
        return <Code className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando formulários...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Botão Voltar e Cabeçalho */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Abrir Novo Chamado</h1>
          <p className="text-xs text-slate-500">
            Selecione a categoria e preencha os detalhes para a equipe de TI da Santa Casa
          </p>
        </div>
      </div>

      {/* Seleção de Categoria Dinâmica */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => {
              setSelectedCatSlug(c.slug);
              setFormAnswers({});
              setError(null);
            }}
            className={`p-3 rounded-2xl border text-left transition flex flex-col items-start justify-between ${
              selectedCatSlug === c.slug
                ? 'border-blue-600 bg-blue-50/70 text-blue-800 shadow-sm font-semibold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div
              className={`p-2 rounded-xl mb-2 ${
                selectedCatSlug === c.slug ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {getCatIcon(c.slug)}
            </div>
            <div className="text-xs">{c.nome}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">SLA: {c.sla_horas}h</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Formulário de {currentCategory?.nome}</span>
            <span className="text-[11px] font-medium bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              SLA Máximo: {currentCategory?.sla_horas} horas
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{currentCategory?.descricao}</p>
        </div>

        {/* ========================================================================= */}
        {/* CAMPOS COMUNS: Setor, VNC e Prioridade (Apenas para Software, Hardware e Login) */}
        {/* ========================================================================= */}
        {selectedCatSlug !== 'relatorio' && selectedCatSlug !== 'novo-programa' && (
          <div
            className={`grid grid-cols-1 ${
              selectedCatSlug === 'solicitar-login' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
            } gap-4`}
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Setor / Unidade Solicitante *
              </label>
              <select
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="">Selecione o setor...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.sigla})
                  </option>
                ))}
              </select>
            </div>

            {/* VNC não aparece em Solicitar Login */}
            {selectedCatSlug !== 'solicitar-login' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  VNC ou Identificação do PC
                </label>
                <input
                  type="text"
                  value={vncOuIp}
                  onChange={(e) => setVncOuIp(e.target.value)}
                  placeholder="Ex: 10.0.14.32 ou TI-BC-01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Prioridade Sugerida
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="baixa">Baixa (Dúvidas ou rotina)</option>
                <option value="media">Média (Atendimento padrão)</option>
                <option value="alta">Alta (Impacto no setor)</option>
                <option value="urgente">Urgente (Parada crítica assistencial)</option>
              </select>
            </div>
          </div>
        )}

        {/* Título e Resumo Geral — Omitidos nas categorias Solicitar Login, Relatório e Novo Software */}
        {selectedCatSlug !== 'solicitar-login' && selectedCatSlug !== 'relatorio' && selectedCatSlug !== 'novo-programa' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Título do Chamado *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Impressora de etiquetas não responde no Bloco Cirúrgico"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descrição Detalhada do Problema *
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva detalhadamente o que está ocorrendo, horário de início e pessoas afetadas..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAMPOS ESPECÍFICOS: 1. SOFTWARE */}
        {/* ========================================================================= */}
        {selectedCatSlug === 'software' && (
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              QUAL SISTEMA OU MÓDULO APRESENTA PROBLEMAS?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sistema com Problema
                </label>
                <select
                  value={formAnswers.sistema_problema || ''}
                  onChange={(e) => handleFieldChange('sistema_problema', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">Selecione o sistema (opcional)...</option>
                  <option value="SISHOS / PEP">SISHOS / PEP</option>
                  <option value="PEP Enfermagem">PEP Enfermagem</option>
                  <option value="Prontuário Eletrônico">Prontuário Eletrônico</option>
                  <option value="Laboratório / PACS">Laboratório / PACS</option>
                  <option value="Financeiro / Faturamento">Financeiro / Faturamento</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mensagem de Erro Exibida na Tela
                </label>
                <input
                  type="text"
                  placeholder="Ex: Erro 1005: Registro bloqueado por outro usuário"
                  value={formAnswers.mensagem_erro || ''}
                  onChange={(e) => handleFieldChange('mensagem_erro', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAMPOS ESPECÍFICOS: 2. HARDWARE E REDE */}
        {/* ========================================================================= */}
        {selectedCatSlug === 'hardware-rede' && (
          <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100 space-y-4">
            <h3 className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
              Detalhes do Equipamento / Infraestrutura
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Equipamento ou Serviço *
                </label>
                <select
                  value={formAnswers.tipo_equipamento || ''}
                  onChange={(e) => handleFieldChange('tipo_equipamento', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">Selecione o tipo de equipamento...</option>
                  <option value="Impressora Laser / Térmica">Impressora Laser / Térmica</option>
                  <option value="Computador / Monitor">Computador / Monitor</option>
                  <option value="Ponto de Rede / Sem Internet">Ponto de Rede / Sem Internet</option>
                  <option value="Telefone IP / Ramal">Telefone IP / Ramal</option>
                  <option value="Leitor de Código de Barras">Leitor de Código de Barras</option>
                  <option value="No-Break / Estabilizador">No-Break / Estabilizador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Localização Exata na Unidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Balcão central ao lado do leito 4"
                  value={formAnswers.localizacao_exata || ''}
                  onChange={(e) => handleFieldChange('localizacao_exata', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAMPOS ESPECÍFICOS: 3. SOLICITAR LOGIN (MÚLTIPLOS COLABORADORES) */}
        {/* ========================================================================= */}
        {selectedCatSlug === 'solicitar-login' && (
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Colaboradores para Liberação de Acesso
                </h3>
                <p className="text-[11px] text-slate-500">
                  Você pode solicitar acesso para múltiplos colaboradores no mesmo chamado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Colaborador</span>
              </button>
            </div>

            <div className="space-y-3">
              {colaboradoresLogin.map((colab, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                >
                  <input
                    type="text"
                    value={colab.nome}
                    onChange={(e) => handleCollaboratorChange(idx, 'nome', e.target.value)}
                    placeholder="Nome Completo do Funcionário"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    value={colab.re}
                    onChange={(e) => handleCollaboratorChange(idx, 're', e.target.value)}
                    placeholder="R.E. do Colaborador"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    value={colab.setor}
                    onChange={(e) => handleCollaboratorChange(idx, 'setor', e.target.value)}
                    placeholder="Setor de Atuação"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={colab.cargo}
                      onChange={(e) => handleCollaboratorChange(idx, 'cargo', e.target.value)}
                      placeholder="Cargo / Função"
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                    {colaboradoresLogin.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAMPOS ESPECÍFICOS: 4. RELATÓRIO (SIMPLIFICADO — APENAS SEÇÃO PRINCIPAL) */}
        {/* ========================================================================= */}
        {selectedCatSlug === 'relatorio' && (
          <div className="p-5 sm:p-6 bg-amber-50/50 rounded-3xl border border-amber-200/80 shadow-xs space-y-5">
            <div className="border-b border-amber-200/60 pb-3">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                ESPECIFICAÇÕES DO RELATÓRIO
              </h3>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                Preencha os detalhes e necessidades para que a equipe de TI extraia os dados com precisão.
              </p>
            </div>

            {/* Primeira linha: Título do Relatório e Sistema / Módulo de Origem dos Dados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título do Relatório *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Relatório de Atendimentos por Convênio"
                  value={formAnswers.titulo_relatorio || ''}
                  onChange={(e) => handleFieldChange('titulo_relatorio', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sistema ou Módulo de Origem dos Dados *
                </label>
                <input
                  type="text"
                  required
                  list="sistemas-origem-list"
                  placeholder="Ex: SISHOS / PEP — Módulo de Internação"
                  value={formAnswers.sistema_origem || ''}
                  onChange={(e) => handleFieldChange('sistema_origem', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
                <datalist id="sistemas-origem-list">
                  <option value="SISHOS / PEP — Módulo de Internação" />
                  <option value="SISHOS / PEP — Ambulatório e Consultórios" />
                  <option value="SISHOS / PEP — Faturamento e Convênios" />
                  <option value="PEP Enfermagem — Censo e Evoluções" />
                  <option value="Prontuário Eletrônico do Paciente" />
                  <option value="Laboratório / PACS / Imagens" />
                  <option value="Farmácia / Estoque Central" />
                  <option value="Financeiro / Contabilidade" />
                  <option value="Recursos Humanos / Departamento Pessoal" />
                </datalist>
              </div>
            </div>

            {/* Segunda linha: O que é necessário para o relatório? (largura total) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                O que é necessário para o relatório? *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Descreva quais informações devem aparecer no relatório. Ex.: número do atendimento, nome do paciente, data, setor, convênio, profissional responsável, valores, totais..."
                value={formAnswers.necessidades_relatorio || ''}
                onChange={(e) => handleFieldChange('necessidades_relatorio', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Terceira linha: Filtros Necessários (largura total) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Filtros Necessários
              </label>
              <textarea
                rows={3}
                placeholder="Ex.: Período inicial e final, setor, convênio, médico, tipo de atendimento, situação..."
                value={formAnswers.filtros_necessarios || ''}
                onChange={(e) => handleFieldChange('filtros_necessarios', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAMPOS ESPECÍFICOS: 5. NOVO SOFTWARE (SIMPLIFICADO — APENAS SEÇÃO PRINCIPAL) */}
        {/* ========================================================================= */}
        {selectedCatSlug === 'novo-programa' && (
          <div className="p-5 sm:p-6 bg-purple-50/50 rounded-3xl border border-purple-200/80 shadow-xs space-y-5">
            <div className="border-b border-purple-200/60 pb-3">
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                PROPOSTA DE NOVO SOFTWARE
              </h3>
              <p className="text-[11px] text-purple-800/80 mt-0.5">
                Descreva sua ideia de desenvolvimento ou automação para a equipe de tecnologia avaliar.
              </p>
            </div>

            {/* 1. Descreva o Novo Software */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descreva o Novo Software *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Descreva o software que deseja desenvolver, sua finalidade, quais funcionalidades deverá possuir e qual problema pretende resolver."
                value={formAnswers.descreva_software || ''}
                onChange={(e) => handleFieldChange('descreva_software', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* 2. Como o Processo Funciona Atualmente? */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Como o Processo Funciona Atualmente? *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explique como essa atividade é realizada hoje. Ex.: planilhas de Excel, formulários impressos, controles manuais, mensagens ou sistemas existentes."
                value={formAnswers.processo_atual || ''}
                onChange={(e) => handleFieldChange('processo_atual', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* 3. Benefícios Esperados para a Santa Casa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Benefícios Esperados para a Santa Casa *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Descreva os benefícios esperados. Ex.: redução de retrabalho, economia de tempo, melhoria dos processos, segurança das informações e maior eficiência."
                value={formAnswers.beneficios_esperados || ''}
                onChange={(e) => handleFieldChange('beneficios_esperados', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Botão de Envio */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Registrando Chamado...' : 'Registrar Chamado'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
