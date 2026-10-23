"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMessages = listMessages;
exports.sendMessage = sendMessage;
const database_js_1 = require("../../config/database.js");
const socket_js_1 = require("../../config/socket.js");
async function listMessages(req, res) {
    try {
        const { chamadoId } = req.params;
        const user = req.user;
        // Validar se usuário tem acesso ao chamado
        const ticketRes = await (0, database_js_1.query)('SELECT id, solicitante_id, tecnico_id FROM chamados WHERE id = $1', [chamadoId]);
        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }
        const ticket = ticketRes.rows[0];
        if (user.perfil_codigo === 'colaborador' && ticket.solicitante_id !== user.id) {
            return res.status(403).json({ error: 'Acesso negado a este chamado' });
        }
        // Se for colaborador, NUNCA carregar notas internas!
        let sql = `
      SELECT m.id, m.chamado_id, m.conteudo, m.tipo, m.eh_nota_interna, m.lida, m.created_at,
             u.id as autor_id, u.nome as autor_nome, u.cargo as autor_cargo,
             p.codigo as autor_perfil_codigo, p.nome as autor_perfil_nome
      FROM mensagens_chamados m
      JOIN usuarios u ON u.id = m.autor_id
      JOIN perfis p ON p.id = u.perfil_id
      WHERE m.chamado_id = $1
    `;
        const params = [chamadoId];
        if (user.perfil_codigo === 'colaborador') {
            sql += ' AND m.eh_nota_interna = false';
        }
        sql += ' ORDER BY m.created_at ASC';
        const result = await (0, database_js_1.query)(sql, params);
        // Marcar mensagens recebidas como lidas
        await (0, database_js_1.query)(`UPDATE mensagens_chamados
       SET lida = true
       WHERE chamado_id = $1 AND autor_id != $2 AND lida = false`, [chamadoId, user.id]);
        return res.json({ messages: result.rows });
    }
    catch (error) {
        console.error('Erro ao listar mensagens:', error);
        return res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
}
async function sendMessage(req, res) {
    try {
        const { chamadoId } = req.params;
        const { conteudo, eh_nota_interna, solicitar_info } = req.body;
        const user = req.user;
        if (!conteudo || conteudo.trim().length === 0) {
            return res.status(400).json({ error: 'A mensagem não pode ser vazia' });
        }
        const ticketRes = await (0, database_js_1.query)(`SELECT c.*, sol.nome as sol_nome, tec.nome as tec_nome
       FROM chamados c
       JOIN usuarios sol ON sol.id = c.solicitante_id
       LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
       WHERE c.id = $1`, [chamadoId]);
        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }
        const ticket = ticketRes.rows[0];
        // Impedir que colaborador envie nota interna
        const isNota = Boolean(eh_nota_interna);
        if (isNota && user.perfil_codigo === 'colaborador') {
            return res.status(403).json({ error: 'Colaboradores não têm permissão para criar notas internas' });
        }
        // Inserir mensagem no banco
        const msgInsert = await (0, database_js_1.query)(`INSERT INTO mensagens_chamados (chamado_id, autor_id, conteudo, tipo, eh_nota_interna, lida)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, chamado_id, conteudo, tipo, eh_nota_interna, lida, created_at`, [
            chamadoId,
            user.id,
            conteudo.trim(),
            solicitar_info ? 'solicitacao_info' : 'texto',
            isNota,
        ]);
        const message = {
            ...msgInsert.rows[0],
            autor_id: user.id,
            autor_nome: user.nome,
            autor_cargo: user.setor_nome || 'Santa Casa',
            autor_perfil_codigo: user.perfil_codigo,
            autor_perfil_nome: user.perfil_nome,
        };
        // Fluxo automático de status:
        // 1. Técnico solicitou informações adicionais -> Chamado muda para 'aguardando_usuario'
        if (solicitar_info && !isNota) {
            await (0, database_js_1.query)(`UPDATE chamados SET status = 'aguardando_usuario', updated_at = NOW() WHERE id = $1`, [chamadoId]);
            await (0, database_js_1.query)(`INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
         VALUES ($1, $2, 'solicitacao_informacao', 'Técnico solicitou informações adicionais ao usuário', $3, 'aguardando_usuario')`, [chamadoId, user.id, ticket.status]);
        }
        // 2. Colaborador respondeu e estava em 'aguardando_usuario' -> Retorna automaticamente para 'em_atendimento'
        else if (user.id === ticket.solicitante_id && ticket.status === 'aguardando_usuario') {
            await (0, database_js_1.query)(`UPDATE chamados SET status = 'em_atendimento', updated_at = NOW() WHERE id = $1`, [chamadoId]);
            await (0, database_js_1.query)(`INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, status_anterior, status_novo)
         VALUES ($1, $2, 'resposta_usuario', 'Colaborador respondeu à solicitação. Retornado para atendimento.', 'aguardando_usuario', 'em_atendimento')`, [chamadoId, user.id]);
            // Notificar o técnico responsável
            if (ticket.tecnico_id) {
                await (0, database_js_1.query)(`INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
           VALUES ($1, $2, 'Resposta recebida no chamado', 'O colaborador ' || $3 || ' respondeu no chamado ' || $4, 'mensagem_recebida', '/technician/tickets/' || $2)`, [ticket.tecnico_id, chamadoId, user.nome, ticket.protocolo]);
            }
        }
        // 3. Notificar usuário caso tenha recebido mensagem pública do técnico
        else if (user.id !== ticket.solicitante_id && !isNota) {
            await (0, database_js_1.query)(`INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem, tipo, link)
         VALUES ($1, $2, 'Nova mensagem no seu chamado', $3 || ' enviou uma resposta no chamado ' || $4, 'mensagem_recebida', '/collaborator/tickets/' || $2)`, [ticket.solicitante_id, chamadoId, user.nome, ticket.protocolo]);
        }
        // Transmissão via Socket.IO
        const io = (0, socket_js_1.getSocketIO)();
        if (io) {
            if (isNota) {
                // Envia apenas para técnicos na sala de notas daquele chamado
                io.to(`ticket_${chamadoId}_staff`).emit('new_internal_note', message);
            }
            else {
                // Mensagem pública para a sala do chamado
                io.to(`ticket_${chamadoId}`).emit('new_message', message);
            }
        }
        return res.status(201).json({ message });
    }
    catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
}
