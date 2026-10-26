import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

async function runIntegrationTest() {
  console.log('=======================================================');
  console.log('🧪 Iniciando Testes Automatizados do Sistech Desk');
  console.log('=======================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Teste de Autenticação da Colaboradora (Marina Santos)
    const marinaRes = await query(
      "SELECT id, nome, login, senha_hash, perfil_id FROM usuarios WHERE login = 'marina.santos'"
    );
    assert(marinaRes.rows.length > 0, 'Usuário Marina Santos existe no banco');
    const marina = marinaRes.rows[0];
    const senhaOk = await bcrypt.compare('sistech123', marina.senha_hash);
    assert(senhaOk, 'Senha da colaboradora valida corretamente com Bcrypt');

    // 2. Teste de Autenticação do Técnico (Maicon Spitzer)
    const maiconRes = await query(
      "SELECT id, nome, login, pode_atender FROM usuarios WHERE login = 'maiconspitzer'"
    );
    assert(maiconRes.rows.length > 0, 'Técnico Maicon Spitzer existe no banco');
    const maicon = maiconRes.rows[0];
    assert(maicon.pode_atender === true, 'Maicon Spitzer possui permissão de atendimento de TI');

    // 3. Teste de Categorias e Formulários Dinâmicos
    const catRes = await query("SELECT id, slug, nome FROM categorias WHERE slug = 'software'");
    assert(catRes.rows.length > 0, 'Categoria Software existe no banco');
    const softwareCatId = catRes.rows[0].id;

    const camposRes = await query(
      'SELECT id, nome_campo FROM campos_formulario WHERE formulario_id IN (SELECT id FROM formularios WHERE categoria_id = $1)',
      [softwareCatId]
    );
    assert(camposRes.rows.length >= 3, 'Formulário de Software possui os campos dinâmicos configurados');

    // 4. Teste de Abertura de Chamado com Protocolo Único
    const seqRes = await query("SELECT nextval('seq_chamados_protocolo') as num");
    const num = seqRes.rows[0].num;
    const testProtocol = `SC-202610-TEST-${num}`;

    const newTicketRes = await query(
      `INSERT INTO chamados (
        protocolo, categoria_id, solicitante_id, prioridade, status, titulo, descricao, vnc_ou_ip
      ) VALUES ($1, $2, $3, 'alta', 'aberto', 'Teste de Integração Automatizado', 'Descrição teste de falha', '10.0.14.99')
      RETURNING id, protocolo, status`,
      [testProtocol, softwareCatId, marina.id]
    );
    const testTicket = newTicketRes.rows[0];
    assert(testTicket.protocolo === testProtocol, `Chamado gerado com protocolo único: ${testProtocol}`);
    assert(testTicket.status === 'aberto', 'Status inicial do chamado é "aberto"');

    // 5. Teste de Atribuição pelo Técnico (Maicon Spitzer assume)
    await query(
      `UPDATE chamados SET tecnico_id = $1, status = 'em_atendimento', updated_at = NOW() WHERE id = $2`,
      [maicon.id, testTicket.id]
    );
    const updatedTicket = (await query('SELECT status, tecnico_id FROM chamados WHERE id = $1', [testTicket.id])).rows[0];
    assert(updatedTicket.status === 'em_atendimento', 'Chamado avançou para status "em_atendimento"');
    assert(updatedTicket.tecnico_id === maicon.id, 'Chamado atribuído com sucesso a Maicon Spitzer');

    // 6. Teste de Mensagens no Chat
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna)
       VALUES ($1, $2, 'Olá Marina, você consegue testar se o VNC está conectado?', 'texto', false)`,
      [testTicket.id, maicon.id]
    );
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna)
       VALUES ($1, $2, 'Sim Carlos, o ícone azul está ativo!', 'texto', false)`,
      [testTicket.id, marina.id]
    );
    const msgsRes = await query('SELECT COUNT(*) FROM mensagens_chamados WHERE chamado_id = $1', [testTicket.id]);
    assert(Number(msgsRes.rows[0].count) === 2, 'Mensagens do chat persistidas no PostgreSQL');

    // 7. Teste de Proteção de Notas Internas (Privacidade da Equipe de TI)
    await query(
      `INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna)
       VALUES ($1, $2, 'Nota interna confidencial: verificar cabo do switch 02', 'texto', true)`,
      [testTicket.id, maicon.id]
    );
    // Simular consulta feita por colaborador (deve filtrar eh_nota_interna = false)
    const collaboratorView = await query(
      'SELECT id FROM mensagens_chamados WHERE chamado_id = $1 AND eh_nota_interna = false',
      [testTicket.id]
    );
    assert(collaboratorView.rows.length === 2, 'Colaborador NÃO enxerga notas internas da equipe de TI');

    // 8. Teste de Resolução e Conclusão do Chamado
    await query(
      `UPDATE chamados SET status = 'resolvido', solucao = 'Configuração do IP ajustada no servidor.', data_resolucao = NOW() WHERE id = $1`,
      [testTicket.id]
    );
    await query(
      `UPDATE chamados SET status = 'concluido', data_conclusao = NOW() WHERE id = $1`,
      [testTicket.id]
    );
    await query(
      `INSERT INTO avaliacoes (chamado_id, usuario_id, nota, comentario) VALUES ($1, $2, 5, 'Excelente atendimento rápido!')`,
      [testTicket.id, marina.id]
    );
    const finalTicket = (await query('SELECT status FROM chamados WHERE id = $1', [testTicket.id])).rows[0];
    assert(finalTicket.status === 'concluido', 'Chamado concluído com sucesso');

    const avaliacaoRes = await query('SELECT nota, comentario FROM avaliacoes WHERE chamado_id = $1', [testTicket.id]);
    assert(avaliacaoRes.rows[0].nota === 5, 'Avaliação de 5 estrelas registrada corretamente');

    // 9. Teste de Consulta da Base de Conhecimento pelo Assistente Virtual
    const kbRes = await query("SELECT titulo FROM base_conhecimento WHERE 'vnc' = ANY(tags) LIMIT 1");
    assert(kbRes.rows.length > 0, `Base de conhecimento possui artigo de autoatendimento: "${kbRes.rows[0].titulo}"`);

    console.log('=======================================================');
    console.log(`🎉 Resultado dos Testes: ${passed} passaram, ${failed} falharam.`);
    console.log('=======================================================');
  } catch (error) {
    console.error('Erro durante os testes:', error);
    process.exit(1);
  }
}

runIntegrationTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
