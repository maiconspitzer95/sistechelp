import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  PlusCircle,
  Inbox,
  UserCheck,
  BarChart3,
  BookOpen,
  Users,
  ShieldCheck,
  Building2,
  HelpCircle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isTechOrAdmin = user?.pode_atender || ['master', 'gestor', 'tecnico'].includes(user?.perfil_codigo || '');
  const isMaster = user?.perfil_codigo === 'master';
  const isGestor = ['master', 'gestor'].includes(user?.perfil_codigo || '');

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 text-white select-none">
      {/* Topo: Mascote Sistech e Título */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="relative">
          <img
            src="/sistech.png"
            alt="Mascote Sistech"
            className="w-11 h-11 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-navy-900 rounded-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-extrabold tracking-wide text-white flex items-center gap-1">
            Sistech <span className="text-brand-cyan">Desk</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
            Santa Casa de Pelotas
          </span>
        </div>
      </div>

      {/* Navegação Principal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sessão Colaborador */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Atendimento
          </div>
          <nav className="space-y-1">
            <NavLink to="/collaborator" end className={linkClass}>
              <Home className="w-4 h-4 text-blue-400" />
              <span>Portal Principal</span>
            </NavLink>
            <NavLink to="/tickets/new" className={linkClass}>
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Novo Chamado</span>
            </NavLink>
            <NavLink to="/collaborator/tickets" className={linkClass}>
              <Inbox className="w-4 h-4 text-amber-400" />
              <span>Meus Chamados</span>
            </NavLink>
          </nav>
        </div>

        {/* Sessão da Equipe Técnica */}
        {isTechOrAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Painel Técnico de TI
            </div>
            <nav className="space-y-1">
              <NavLink to="/technician" end className={linkClass}>
                <Inbox className="w-4 h-4 text-blue-400" />
                <span>Fila de Chamados</span>
              </NavLink>
              <NavLink to="/technician/my-tickets" className={linkClass}>
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Meus Atendimentos</span>
              </NavLink>
              <NavLink to="/technician/dashboard" className={linkClass}>
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Produtividade & SLAs</span>
              </NavLink>
              <NavLink to="/knowledge" className={linkClass}>
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Base de Conhecimento</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Sessão Administrativa */}
        {isGestor && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Administração
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin/users" className={linkClass}>
                <Users className="w-4 h-4 text-sky-400" />
                <span>Usuários & Técnicos</span>
              </NavLink>
              {isMaster && (
                <>
                  <NavLink to="/admin/sectors" className={linkClass}>
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Setores Hospitalares</span>
                  </NavLink>
                  <NavLink to="/admin/audit" className={linkClass}>
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <span>Auditoria do Sistema</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Rodapé: Versão e Suporte do Mascote */}
      <div className="p-4 border-t border-slate-800 bg-navy-950/40">
        <div className="flex items-center space-x-2.5 text-xs text-slate-400">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="leading-tight">
            <div className="font-medium text-slate-300">Suporte Interno TI</div>
            <div className="text-[10px] text-slate-500">Ramal 1234 • Sala TI</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
