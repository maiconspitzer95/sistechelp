import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getSocket, joinTicketRoom, leaveTicketRoom } from '../../services/socket';
import { Ticket, ChatMessage, TicketHistoryEvent } from '../../types';
import {
  ArrowLeft,
  Send,
  Lock,
  UserCheck,
  CheckCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  Star,
  History,
  Info,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Modais de Ações
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [solucaoText, setSolucaoText] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.pode_atender || ['master', 'gestor', 'tecnico'].includes(user?.perfil_codigo || '');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!id) return;
    loadTicketAndMessages();

    // Conectar ao Socket.IO na sala do chamado
    joinTicketRoom(id, isStaff);
    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Atualizar status do chamado na tela caso tenha mudado
      loadTicketAndMessages(false);
    };

    const handleInternalNote = (note: ChatMessage) => {
      if (isStaff) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === note.id)) return prev;
          return [...prev, note];
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_internal_note', handleInternalNote);

    return () => {
      leaveTicketRoom(id);
      socket.off('new_message', handleNewMessage);
      socket.off('new_internal_note', handleInternalNote);
    };
  }, [id, isStaff]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTicketAndMessages = async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading) setLoading(true);
      const [ticketData, msgsData] = await Promise.all([
        api.getTicket(id),
        api.getMessages(id),
      ]);
      setTicket(ticketData.ticket);
      setMessages(msgsData.messages || []);
    } catch (err: any) {
      console.error('Erro ao carregar chamado:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, solicitarInfo = false) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !id) return;

    try {
      const text = inputText.trim();
      setInputText('');
      await api.sendMessage(id, {
        conteudo: text,
        eh_nota_interna: isInternalNote,
        solicitar_info: solicitarInfo,
      });

      // Recarrega para refletir qualquer mudança de status no banco
      await loadTicketAndMessages(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem');
    }
  };

  const handleAssignToMe = async () => {
    if (!id) return;
    try {
      await api.assignTicket(id, {});
      await loadTicketAndMessages(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao assumir chamado');
    }
  };

  const handleResolve = async () => {
    if (!id || !solucaoText.trim()) return;
    try {
      await api.resolveTicket(id, { solucao: solucaoText.trim() });
      setShowResolveModal(false);
      setSolucaoText('');
      await loadTicketAndMessages(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar resolução');
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await api.completeTicket(id, { nota: rating, comentario: ratingComment.trim() });
      setShowCompleteModal(false);
      await loadTicketAndMessages(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao concluir chamado');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Aberto</span>;
      case 'em_triagem':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Em Triagem</span>;
      case 'em_atendimento':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">Em Atendimento</span>;
      case 'aguardando_usuario':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">Aguardando Usuário</span>;
      case 'aguardando_terceiro':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">Aguardando Terceiro</span>;
      case 'resolvido':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Resolvido</span>;
      case 'concluido':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">Concluído</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  if (loading || !ticket) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando conversa do chamado...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Topo do Chamado */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {ticket.protocolo}
            </span>
            {getStatusBadge(ticket.status)}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600 uppercase">
              {ticket.categoria_nome}
            </span>
          </div>

          <h1 className="text-lg font-bold text-slate-800">{ticket.titulo}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              Solicitante: <strong className="text-slate-700">{ticket.solicitante_nome}</strong> (
              {ticket.setor_solicitante_nome || 'Santa Casa'})
            </span>
            {ticket.vnc_ou_ip && (
              <span>
                VNC / IP: <strong className="text-blue-700 font-mono">{ticket.vnc_ou_ip}</strong>
              </span>
            )}
            <span>
              Técnico:{' '}
              {ticket.tecnico_nome ? (
                <strong className="text-slate-800">{ticket.tecnico_nome}</strong>
              ) : (
                <span className="text-amber-600 italic">Não atribuído</span>
              )}
            </span>
          </div>
        </div>

        {/* Botões de Ação do Técnico / Solicitante */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Técnico assume atendimento */}
          {isStaff && !ticket.tecnico_id && (
            <button
              onClick={handleAssignToMe}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Assumir Chamado</span>
            </button>
          )}

          {/* Técnico registra resolução */}
          {isStaff && ['em_atendimento', 'aguardando_usuario'].includes(ticket.status) && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Registrar Resolução</span>
            </button>
          )}

          {/* Solicitante confirma conclusão quando resolvido */}
          {ticket.status === 'resolvido' && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg animate-pulse transition flex items-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar Conclusão & Avaliar</span>
            </button>
          )}

          {/* Botão de Histórico */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            title="Ver Histórico de Eventos"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Principal: Chat de Conversa e Painel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Coluna do Chat (3 Colunas) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[600px] overflow-hidden">
          {/* Cabeçalho do Chat */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">
                Conversa em Tempo Real (Socket.IO)
              </span>
            </div>

            {/* Alternador de Nota Interna (Apenas para equipe autorizada) */}
            {isStaff && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsInternalNote(false)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                    !isInternalNote
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mensagem Pública
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote(true)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center space-x-1 transition ${
                    isInternalNote
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                  title="Notas internas são visíveis apenas para a equipe técnica de TI"
                >
                  <Lock className="w-3 h-3" />
                  <span>Nota Interna (TI)</span>
                </button>
              </div>
            )}
          </div>

          {/* Banner de Aviso de Nota Interna */}
          {isInternalNote && isStaff && (
            <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Modo Nota Interna: Esta anotação NUNCA será visível para o solicitante.</span>
            </div>
          )}

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {messages.map((m) => {
              const isMe = m.autor_id === user?.id;
              const isTech = ['tecnico', 'gestor', 'master'].includes(m.autor_perfil_codigo);

              // Mensagem de sistema / status
              if (m.tipo === 'sistema' || m.tipo === 'status_mudanca') {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <div className="bg-slate-200/70 text-slate-600 text-[11px] px-3.5 py-1.5 rounded-full font-medium max-w-md text-center shadow-2xs">
                      {m.conteudo}
                    </div>
                  </div>
                );
              }

              // Mensagem de Nota Interna
              if (m.eh_nota_interna) {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <div className="bg-amber-50 border border-amber-300/80 text-amber-950 p-3 rounded-2xl max-w-lg w-full text-xs shadow-sm">
                      <div className="flex items-center justify-between font-bold text-amber-800 text-[10px] uppercase mb-1">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Nota Interna da Equipe • {m.autor_nome}
                        </span>
                        <span>
                          {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="whitespace-pre-line text-slate-800">{m.conteudo}</div>
                    </div>
                  </div>
                );
              }

              // Mensagem Normal de Chat
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-700">{m.autor_nome}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        isTech ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isTech ? 'TI Santa Casa' : 'Colaborador'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.conteudo}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Envio de Mensagem */}
          <form
            onSubmit={(e) => handleSendMessage(e, false)}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            {isStaff && (
              <button
                type="button"
                onClick={() => handleSendMessage(undefined, true)}
                className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold whitespace-nowrap transition"
                title="Envia a mensagem e muda o status para Aguardando Usuário"
              >
                Solicitar Informações
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isInternalNote
                  ? 'Digite uma nota interna para a equipe técnica...'
                  : 'Digite sua mensagem ou resposta...'
              }
              className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 transition ${
                isInternalNote
                  ? 'bg-amber-50/50 border-amber-300 focus:ring-amber-500'
                  : 'bg-slate-50 border-slate-200 focus:ring-blue-600 focus:bg-white'
              }`}
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 text-white rounded-xl shadow transition disabled:opacity-50 ${
                isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Coluna Lateral: Detalhes, Respostas do Formulário e Histórico (1 Coluna) */}
        <div className="space-y-4">
          {/* Card de Informações do Chamado */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Detalhes do Chamado</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Aberto em:</span>
                <span className="font-semibold text-slate-700">
                  {new Date(ticket.created_at).toLocaleString('pt-BR')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Prazo de Resolução (SLA):</span>
                <span className="font-semibold text-slate-700">
                  {ticket.prazo_limite
                    ? new Date(ticket.prazo_limite).toLocaleString('pt-BR')
                    : '24 horas úteis'}
                </span>
              </div>

              {ticket.solucao && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-emerald-700 font-bold block text-[10px] uppercase">
                    Solução Registrada:
                  </span>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-line bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    {ticket.solucao}
                  </p>
                </div>
              )}

              {ticket.avaliacao && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-amber-600 font-bold block text-[10px] uppercase">
                    Avaliação do Usuário:
                  </span>
                  <div className="flex items-center space-x-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= ticket.avaliacao!.nota
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {ticket.avaliacao.nota}/5
                    </span>
                  </div>
                  {ticket.avaliacao.comentario && (
                    <p className="text-slate-500 italic text-[11px] mt-1">
                      "{ticket.avaliacao.comentario}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dados do Formulário Dinâmico */}
          {ticket.formulario_dados && Object.keys(ticket.formulario_dados).length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Respostas do Formulário
              </h3>
              <div className="space-y-2 text-xs">
                {Object.entries(ticket.formulario_dados).map(([key, val]) => (
                  <div key={key} className="border-b border-slate-100 pb-1.5 last:border-0">
                    <span className="text-slate-400 block text-[10px] uppercase">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium text-slate-700">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Colaboradores Solicitados (Categoria Solicitar Login) */}
          {ticket.colaboradores_acesso && ticket.colaboradores_acesso.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Colaboradores para Acesso ({ticket.colaboradores_acesso.length})
              </h3>
              <div className="space-y-2">
                {ticket.colaboradores_acesso.map((c, i) => (
                  <div key={i} className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                    <div className="font-bold text-slate-800">{c.nome}</div>
                    <div className="text-[11px] text-slate-500">
                      R.E.: {c.re} • Setor: {c.setor}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Registro de Resolução */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Registrar Solução do Atendimento</h3>
            <p className="text-xs text-slate-500">
              Descreva detalhadamente o procedimento realizado para solucionar o chamado.
            </p>
            <textarea
              rows={4}
              value={solucaoText}
              onChange={(e) => setSolucaoText(e.target.value)}
              placeholder="Ex: Realizada substituição do rolete de tração da impressora e calibração do sensor..."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolve}
                disabled={!solucaoText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                Concluir Atendimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação & Avaliação pelo Solicitante */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Confirmar Conclusão do Chamado</h3>
            <p className="text-xs text-slate-500">
              Como foi a qualidade do atendimento da equipe de TI da Santa Casa?
            </p>

            {/* Estrelas 1 a 5 */}
            <div className="flex justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 hover:scale-110 transition"
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Deixe um comentário ou elogio opcional..."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-600 text-left"
            />

            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                onClick={handleComplete}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Confirmar e Avaliar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
