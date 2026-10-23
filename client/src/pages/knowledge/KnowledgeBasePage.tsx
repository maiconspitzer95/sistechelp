import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { KnowledgeArticle } from '../../types';
import {
  BookOpen,
  Search,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  HelpCircle,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.getKnowledgeArticles(query);
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Erro ao carregar artigos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = async (art: KnowledgeArticle) => {
    try {
      const data = await api.getKnowledgeArticle(art.id);
      setSelectedArticle(data.article);
    } catch (err) {
      setSelectedArticle(art);
    }
  };

  const handleVote = async (util: boolean) => {
    if (!selectedArticle) return;
    try {
      await api.voteKnowledgeArticle(selectedArticle.id, util);
      setSelectedArticle((prev) =>
        prev
          ? {
              ...prev,
              util_sim: util ? prev.util_sim + 1 : prev.util_sim,
              util_nao: !util ? prev.util_nao + 1 : prev.util_nao,
            }
          : null
      );
    } catch (err) {}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Base de Conhecimento Sistech</span>
            <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
              Autoatendimento TI
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Guias práticos, tutoriais e procedimentos padrão da Santa Casa de Pelotas
          </p>
        </div>

        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Não achou? Abra um Chamado</span>
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadArticles();
          }}
          className="relative max-w-xl mx-auto"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite palavras como: impressora, vnc, senha, sishos, acesso..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
          />
        </form>
      </div>

      {/* Grid: Lista de Artigos e Leitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lista de Artigos (1 coluna) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Artigos Disponíveis
          </div>
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">Carregando artigos...</div>
          ) : (
            articles.map((art) => (
              <button
                key={art.id}
                onClick={() => handleSelectArticle(art)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  selectedArticle?.id === art.id
                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold line-clamp-2">{art.titulo}</div>
                <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {art.visualizacoes}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ThumbsUp className="w-3 h-3" />
                    {art.util_sim}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Leitor do Artigo Selecionado (2 colunas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          {selectedArticle ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">{selectedArticle.titulo}</h2>
              <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-100">
                {selectedArticle.tags?.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line py-2">
                {selectedArticle.conteudo}
              </div>

              {/* Avaliação de Utilidade */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Este guia foi útil?</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleVote(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Sim ({selectedArticle.util_sim})</span>
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold transition"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Não ({selectedArticle.util_nao})</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">Selecione um artigo ao lado para visualizar as instruções.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
