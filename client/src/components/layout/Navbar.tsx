import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, LogOut, User as UserIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitchUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showDemoSwitch, setShowDemoSwitch] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {}
  };

  const unreadCount = notifications.filter((n) => !n.lida).length;

  const handleMarkAllRead = async () => {
    await api.markNotificationAsRead('all');
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const demoUsers = [
    { label: 'Marina Santos (Colaboradora)', username: 'marina.santos', role: 'Bloco Cirúrgico' },
    { label: 'Maicon Spitzer (Técnico TI)', username: 'maiconspitzer', role: 'Analista TI' },
    { label: 'Gabriel Lang (Gestor de TI)', username: 'gabriel', role: 'Gerente de T.I' },
    { label: 'Rafael Pereira (Técnico TI)', username: 'rafael', role: 'Redes & Infra' },
    { label: 'Cristian Almeirda (Técnico TI)', username: 'cristian', role: 'Analista de Redes' },
    { label: 'Administrador Master', username: 'master.admin', role: 'Coordenador Geral' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Esquerda: Identificação Institucional */}
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Santa Casa de Pelotas
          </span>
          <span className="text-sm font-bold text-slate-800">
            Central de Chamados Internos
          </span>
        </div>
      </div>

      {/* Direita: Troca rápida de demonstração, Notificações e Usuário */}
      <div className="flex items-center space-x-4">
        {/* Botão de Troca Rápida de Usuário para Testar o Fluxo */}
        <div className="relative">
          <button
            onClick={() => setShowDemoSwitch(!showDemoSwitch)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
            title="Alternar rapidamente entre Colaborador, Técnico e Gestor para demonstração"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Alternar Usuário Demo</span>
          </button>

          {showDemoSwitch && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Simular Acesso como:
              </div>
              {demoUsers.map((u) => (
                <button
                  key={u.username}
                  onClick={async () => {
                    await quickSwitchUser(u.username);
                    setShowDemoSwitch(false);
                    navigate(u.username === 'marina.santos' ? '/collaborator' : '/technician');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                    user?.login === u.username ? 'bg-blue-50 font-bold text-blue-800' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-medium">{u.label}</div>
                    <div className="text-[10px] text-slate-400">{u.role}</div>
                  </div>
                  {user?.login === u.username && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-full relative transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Notificações</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nenhuma notificação recente.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                        setShowNotifDropdown(false);
                      }}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition ${
                        !n.lida ? 'bg-blue-50/50 font-medium' : 'text-slate-600'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{n.titulo}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{n.mensagem}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Perfil do Usuário */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
            {user?.nome ? user.nome.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user?.nome}
            </span>
            <span className="text-[10px] text-slate-500">
              {user?.perfil_nome} • {user?.setor_sigla || 'Santa Casa'}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
