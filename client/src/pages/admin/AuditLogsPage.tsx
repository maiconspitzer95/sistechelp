import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldCheck, Search, Clock, User } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>Auditoria e Segurança do Sistema</span>
          <span className="text-xs font-semibold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
            Registro Imutável
          </span>
        </h1>
        <p className="text-xs text-slate-500">
          Rastreabilidade de autenticações, alterações administrativas e atribuições de chamados
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando logs de auditoria...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Nenhum evento registrado ainda.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 font-mono">
                      {log.acao}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{log.entidade}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.usuario_nome ? (
                      <span className="font-medium text-slate-800">
                        {log.usuario_nome} ({log.usuario_re})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Sistema</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
