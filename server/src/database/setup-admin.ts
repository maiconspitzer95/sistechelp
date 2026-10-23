import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

/**
 * Script seguro para criar ou atualizar o primeiro usuário Master.
 * Pode ser executado em produção via:
 * ADMIN_LOGIN=admin ADMIN_PASS=senhaSegura ADMIN_RE=00001 npm run setup-admin
 */
export async function setupMasterUser() {
  const login = process.env.ADMIN_LOGIN || 'master.admin';
  const rawPassword = process.env.ADMIN_PASS || 'Sistech@2026Master';
  const re = process.env.ADMIN_RE || '99999';
  const nome = process.env.ADMIN_NOME || 'Administrador Master';
  const email = process.env.ADMIN_EMAIL || 'ti.master@santacasadepelotas.com.br';

  console.log('--- Configuração Segura do Usuário Master ---');
  console.log(`Definindo usuário master: ${login} (RE: ${re})`);

  // Buscar perfil master
  const perfilRes = await query("SELECT id FROM perfis WHERE codigo = 'master'");
  let perfilId = perfilRes.rows[0]?.id;

  if (!perfilId) {
    const newPerfil = await query(`
      INSERT INTO perfis (codigo, nome, descricao, permissoes)
      VALUES ('master', 'Administrador Master', 'Acesso total irrestrito ao sistema', '["*"]'::jsonb)
      RETURNING id
    `);
    perfilId = newPerfil.rows[0].id;
  }

  // Buscar setor TI
  const setorRes = await query("SELECT id FROM setores WHERE sigla = 'TI'");
  let setorId = setorRes.rows[0]?.id;
  if (!setorId) {
    const newSetor = await query(`
      INSERT INTO setores (nome, sigla, eh_setor_atendimento)
      VALUES ('Tecnologia da Informação', 'TI', true)
      RETURNING id
    `);
    setorId = newSetor.rows[0].id;
  }

  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(rawPassword, salt);

  const existingUser = await query('SELECT id FROM usuarios WHERE login = $1 OR re = $2', [login, re]);

  if (existingUser.rows.length > 0) {
    await query(
      `UPDATE usuarios 
       SET senha_hash = $1, nome = $2, email = $3, perfil_id = $4, setor_id = $5, ativo = true, pode_atender = true, updated_at = NOW()
       WHERE id = $6`,
      [senhaHash, nome, email, perfilId, setorId, existingUser.rows[0].id]
    );
    console.log(`✅ Usuário Master [${login}] atualizado com sucesso!`);
  } else {
    await query(
      `INSERT INTO usuarios (nome, re, login, email, senha_hash, perfil_id, setor_id, ativo, pode_atender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)`,
      [nome, re, login, email, senhaHash, perfilId, setorId]
    );
    console.log(`✅ Usuário Master [${login}] criado com sucesso!`);
  }

  console.log('Credenciais salvas com hash seguro Bcrypt.');
}

if (process.argv[1]?.endsWith('setup-admin.ts') || process.argv[1]?.endsWith('setup-admin.js')) {
  setupMasterUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro na criação do Master:', err);
      process.exit(1);
    });
}
