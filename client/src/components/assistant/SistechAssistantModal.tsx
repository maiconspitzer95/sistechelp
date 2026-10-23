import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, ExternalLink, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface AssistantMessage {
  id: string;
  sender: 'sistech' | 'user';
  text: string;
  action?: string;
  suggestions?: string[];
  tickets?: any[];
}

export const SistechAssistantModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'sistech',
      text: 'Olá! Sou o **Sistech**, assistente virtual da TI da **Santa Casa de Pelotas**. Como posso ajudar no seu atendimento hoje?',
      suggestions: [
        'Como encontrar o VNC?',
        'Problema na impressora',
        'Solicitar novo login',
        'Consultar meus chamados',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.askAssistant(text.trim());
      const sistechMsg: AssistantMessage = {
        id: String(Date.now() + 1),
        sender: 'sistech',
        text: data.reply,
        action: data.action,
        suggestions: data.suggestions,
        tickets: data.tickets,
      };
      setMessages((prev) => [...prev, sistechMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'sistech',
          text: 'Desculpe, ocorreu uma instabilidade ao consultar a base de conhecimento. Você pode abrir um chamado diretamente pelo menu principal.',
          suggestions: ['Abrir chamado de suporte'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action?: string) => {
    setIsOpen(false);
    if (action === 'open_ticket_software') {
      navigate('/tickets/new?cat=software');
    } else if (action === 'open_ticket_hardware') {
      navigate('/tickets/new?cat=hardware-rede');
    } else if (action === 'open_ticket_login') {
      navigate('/tickets/new?cat=solicitar-login');
    } else {
      navigate('/tickets/new');
    }
  };

  return (
    <>
      {/* Botão Flutuante com o Mascote Oficial */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-gradient-to-r from-blue-700 to-navy-900 text-white pl-3.5 pr-5 py-2.5 rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-brand-cyan/40 group"
          title="Falar com o Sistech - Assistente Virtual da TI"
        >
          <div className="relative">
            <img
              src="/sistech.png"
              alt="Mascote Sistech"
              className="w-10 h-10 object-contain drop-shadow"
            />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-navy-900 rounded-full" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight flex items-center gap-1 text-white">
              Sistech <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
            </span>
            <span className="text-[10px] text-cyan-200 font-medium">Assistente de TI</span>
          </div>
        </button>
      )}

      {/* Janela Flutuante de Conversa */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-64px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Cabeçalho */}
          <div className="bg-gradient-to-r from-navy-900 via-blue-900 to-blue-800 p-4 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white/10 rounded-full p-1 border border-cyan-400/40 flex items-center justify-center">
                <img src="/sistech.png" alt="Sistech" className="w-9 h-9 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold flex items-center gap-1.5">
                  Sistech Desk
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded-full font-semibold">
                    Assistente TI
                  </span>
                </span>
                <span className="text-[11px] text-slate-300">Santa Casa de Pelotas</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {/* Ação direcionada para abertura de chamado */}
                  {m.action && (
                    <button
                      onClick={() => handleAction(m.action)}
                      className="mt-2.5 w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Chamado Agora</span>
                    </button>
                  )}
                </div>

                {/* Sugestões de Respostas Rápidas */}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(sug)}
                        className="text-[11px] bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full shadow-2xs transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <Bot className="w-4 h-4 animate-bounce text-blue-500" />
                <span>Sistech está consultando a base de TI...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Pergunta */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua dúvida ou problema..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition shadow-sm"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
