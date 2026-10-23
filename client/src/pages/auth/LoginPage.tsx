import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginOrRe, setLoginOrRe] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOrRe.trim() || !senha) {
      setError('Por favor, informe seu Usuário/R.E. e Senha');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(loginOrRe.trim(), senha);
      navigate('/collaborator');
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  // Demonstração local rápida
  const handleQuickFill = (u: string) => {
    setLoginOrRe(u);
    setSenha('sistech123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex flex-col justify-center items-center p-4">
      {/* Container Principal */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-200/80 p-8 sm:p-10 relative overflow-hidden">
        {/* Detalhe visual de topo */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-brand-cyan to-blue-800" />

        {/* Mascote Sistech Centralizado */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative group mb-3">
            <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-200/80 flex items-center justify-center p-2 shadow-inner">
              <img
                src="/sistech.png"
                alt="Mascote Oficial Sistech"
                className="w-20 h-20 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="absolute bottom-1 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>

          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Portal do Colaborador
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acesse para gerenciar seus chamados na <span className="font-semibold text-blue-800">Santa Casa de Pelotas</span>
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Usuário ou R.E. */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Usuário ou R.E.
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={loginOrRe}
                onChange={(e) => setLoginOrRe(e.target.value)}
                placeholder="Ex: marina.santos ou 00010"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha de acesso"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lembrar Usuário & Ajuda */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span>Lembrar usuário</span>
            </label>
            <span
              className="text-blue-700 hover:underline cursor-pointer"
              title="Para redefinir sua senha, solicite suporte à equipe de TI ou ao gestor do seu setor"
            >
              Esqueceu a senha?
            </span>
          </div>

          {/* Botão Acessar o Sistema */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition text-sm cursor-pointer"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Acessar o Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Card de Teste Rápido de Demonstração */}
        <div className="mt-8 pt-5 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Contas de Demonstração (Clique para preencher):</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('marina.santos')}
              className="p-1.5 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
            >
              <div className="font-semibold text-slate-800">Marina Santos</div>
              <div className="text-slate-500 text-[10px]">Colaboradora</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('carlos.mendes')}
              className="p-1.5 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
            >
              <div className="font-semibold text-slate-800">Carlos Mendes</div>
              <div className="text-slate-500 text-[10px]">Técnico TI</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('gestor.ti')}
              className="p-1.5 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
            >
              <div className="font-semibold text-slate-800">Gestor de TI</div>
              <div className="text-slate-500 text-[10px]">Gestão</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('master.admin')}
              className="p-1.5 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-[11px]"
            >
              <div className="font-semibold text-slate-800">Master Admin</div>
              <div className="text-slate-500 text-[10px]">Administrador</div>
            </button>
          </div>
        </div>
      </div>

      {/* Identificação Institucional no Rodapé */}
      <footer className="mt-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Santa Casa de Pelotas</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Tecnologia da Informação • Sistema Sistech Desk v1.0
        </p>
      </footer>
    </div>
  );
};
