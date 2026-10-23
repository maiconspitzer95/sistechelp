import { query } from '../config/database.js';
import { Request } from 'express';

export async function logAudit(
  req: Request,
  usuarioId: string | null,
  acao: string,
  entidade: string,
  entidadeId: string | null = null,
  dadosAnteriores: any = null,
  dadosNovos: any = null
) {
  try {
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    await query(
      `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, dados_anteriores, dados_novos, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        usuarioId,
        acao,
        entidade,
        entidadeId,
        dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dadosNovos ? JSON.stringify(dadosNovos) : null,
        ip,
        userAgent,
      ]
    );
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
  }
}
