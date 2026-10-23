import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Sector } from '../../types';
import { Building2, Plus, CheckCircle2, XCircle, Edit2 } from 'lucide-react';

export const SectorsManagementPage: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
    eh_setor_atendimento: false,
    ativo: true,
  });

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    try {
      setLoading(true);
      const res = await api.getSectors(true);
      setSectors(res.sectors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nome: '', sigla: '', eh_setor_atendimento: false, ativo: true });
    setShowModal(true);
  };

  const handleOpenEdit = (s: Sector) => {
    setEditingId(s.id);
    setFormData({
      nome: s.nome,
      sigla: s.sigla,
      eh_setor_atendimento: s.eh_setor_atendimento,
      ativo: s.ativo,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateSector(editingId, formData);
      } else {
        await api.createSector(formData);
      }
      setShowModal(false);
      loadSectors();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar setor');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Setores Hospitalares da Santa Casa</span>
            <span className="text-xs font-semibold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
              {sectors.length} setores
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Arquitetura modular preparada para TI, Manutenção, Engenharia Clínica e Patrimônio
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Setor</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando setores...</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nome do Setor</th>
                <th className="py-3 px-4">Sigla</th>
                <th className="py-3 px-4 text-center">Setor de Atendimento?</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sectors.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{s.nome}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-700">{s.sigla}</td>
                  <td className="py-3 px-4 text-center">
                    {s.eh_setor_atendimento ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        Atende Chamados (Equipe)
                      </span>
                    ) : (
                      <span className="text-slate-400">Solicitante</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {s.ativo ? (
                      <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {editingId ? 'Editar Setor' : 'Cadastrar Setor'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Setor *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Engenharia Clínica"
                  required
                  className="w-full border rounded-xl p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sigla *</label>
                <input
                  type="text"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value })}
                  placeholder="Ex: ENG_CLINICA"
                  required
                  className="w-full border rounded-xl p-2 text-xs"
                />
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.eh_setor_atendimento}
                    onChange={(e) =>
                      setFormData({ ...formData, eh_setor_atendimento: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>É um setor de atendimento (recebe chamados)?</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Setor Ativo</span>
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
