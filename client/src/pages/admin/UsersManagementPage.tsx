import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, Sector } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Shield,
  Building,
} from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal de Criação / Edição
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    re: '',
    login: '',
    email: '',
    senha: '',
    perfil_id: '',
    setor_id: '',
    cargo: '',
    pode_atender: false,
    ativo: true,
  });

  useEffect(() => {
    loadUsers();
    loadAuxData();
  }, []);

  const loadAuxData = async () => {
    try {
      const [secRes, profRes] = await Promise.all([api.getSectors(true), api.getProfiles()]);
      setSectors(secRes.sectors || []);
      setProfiles(profRes.profiles || []);
    } catch (err) {}
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.getUsers(query);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormData({
      nome: '',
      re: '',
      login: '',
      email: '',
      senha: '',
      perfil_id: profiles[0]?.id || '',
      setor_id: sectors[0]?.id || '',
      cargo: '',
      pode_atender: false,
      ativo: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingUserId(u.id);
    setFormData({
      nome: u.nome,
      re: u.re,
      login: u.login,
      email: u.email || '',
      senha: '',
      perfil_id: profiles.find((p) => p.codigo === u.perfil_codigo)?.id || '',
      setor_id: u.setor_id || '',
      cargo: u.cargo || '',
      pode_atender: Boolean(u.pode_atender),
      ativo: Boolean(u.ativo),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await api.updateUser(editingUserId, formData);
      } else {
        await api.createUser(formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar usuário');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Usuários e Técnicos de Atendimento</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              {users.length} usuários
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Santa Casa de Pelotas • Gerenciamento de acessos, perfis e permissões da equipe técnica
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Usuário / Técnico</span>
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadUsers();
          }}
          className="relative w-full max-w-md"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, R.E., login ou cargo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </form>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">R.E. / Login</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4 text-center">Pode Atender Chamados?</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{u.nome}</div>
                      <div className="text-[10px] text-slate-400">{u.cargo || 'Funcionário'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-blue-700 font-semibold">{u.re}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.login}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {u.perfil_nome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.setor_nome || 'Geral'}</td>
                    <td className="py-3 px-4 text-center">
                      {u.pode_atender ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Sim (Técnico TI)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Não</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.ativo ? (
                        <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-xs">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition"
                        title="Editar usuário"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {editingUserId ? 'Editar Usuário / Técnico' : 'Cadastrar Novo Usuário / Técnico'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">R.E. *</label>
                  <input
                    type="text"
                    value={formData.re}
                    onChange={(e) => setFormData({ ...formData, re: e.target.value })}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Login de Acesso *</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingUserId ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required={!editingUserId}
                    placeholder={editingUserId ? 'Deixe vazio para manter' : ''}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perfil de Acesso *</label>
                  <select
                    value={formData.perfil_id}
                    onChange={(e) => setFormData({ ...formData, perfil_id: e.target.value })}
                    required
                    className="w-full border rounded-xl p-2 text-xs bg-white"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Setor Hospitalar</label>
                  <select
                    value={formData.setor_id}
                    onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
                    className="w-full border rounded-xl p-2 text-xs bg-white"
                  >
                    <option value="">Selecione...</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.sigla})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Especialidade</label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Analista de Suporte de TI ou Enfermeiro"
                  className="w-full border rounded-xl p-2 text-xs"
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pode_atender}
                    onChange={(e) => setFormData({ ...formData, pode_atender: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Habilitar recebimento de chamados (Técnico de Atendimento)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Usuário Ativo</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
