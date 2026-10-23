import { query } from '../config/database.js';

export async function generateProtocol(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const seqRes = await query("SELECT nextval('seq_chamados_protocolo') as num");
  const num = seqRes.rows[0].num;

  return `SC-${year}${month}-${num}`;
}
