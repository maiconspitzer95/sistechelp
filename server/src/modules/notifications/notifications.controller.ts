import { Response } from 'express';
import { query } from '../../config/database.js';
import { AuthRequest } from '../../middlewares/auth.js';

export async function listNotifications(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const sql = `
      SELECT id, chamado_id, titulo, mensagem, tipo, lida, link, created_at
      FROM notificacoes
      WHERE usuario_id = $1
      ORDER BY created_at DESC
      LIMIT 30
    `;
    const result = await query(sql, [user.id]);
    return res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    return res.status(500).json({ error: 'Erro ao listar notificações' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (id === 'all') {
      await query('UPDATE notificacoes SET lida = true WHERE usuario_id = $1', [user.id]);
    } else {
      await query('UPDATE notificacoes SET lida = true WHERE id = $1 AND usuario_id = $2', [id, user.id]);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
}
