import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

export interface AuthenticatedUser {
  id: string;
  nome: string;
  re: string;
  login: string;
  email: string | null;
  perfil_codigo: string;
  perfil_nome: string;
  permissoes: string[];
  setor_id: string | null;
  setor_nome: string | null;
  setor_sigla: string | null;
  pode_atender: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };

    const sql = `
      SELECT u.id, u.nome, u.re, u.login, u.email, u.setor_id, u.pode_atender, u.ativo,
             p.codigo as perfil_codigo, p.nome as perfil_nome, p.permissoes,
             s.nome as setor_nome, s.sigla as setor_sigla
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      LEFT JOIN setores s ON s.id = u.setor_id
      WHERE u.id = $1
    `;
    const result = await query(sql, [decoded.id]);

    if (result.rows.length === 0 || !result.rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo no sistema' });
    }

    const row = result.rows[0];
    req.user = {
      id: row.id,
      nome: row.nome,
      re: row.re,
      login: row.login,
      email: row.email,
      perfil_codigo: row.perfil_codigo,
      perfil_nome: row.perfil_nome,
      permissoes: Array.isArray(row.permissoes) ? row.permissoes : [],
      setor_id: row.setor_id,
      setor_nome: row.setor_nome,
      setor_sigla: row.setor_sigla,
      pode_atender: Boolean(row.pode_atender),
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sessão expirada ou token inválido' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (req.user.perfil_codigo === 'master') {
      return next(); // Master tem acesso total irrestrito
    }

    if (!allowedRoles.includes(req.user.perfil_codigo)) {
      return res.status(403).json({ error: 'Acesso negado para o seu perfil de usuário' });
    }

    next();
  };
}
