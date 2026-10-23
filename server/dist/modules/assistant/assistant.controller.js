"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAssistant = askAssistant;
const database_js_1 = require("../../config/database.js");
async function askAssistant(req, res) {
    try {
        const { question } = req.body;
        const user = req.user;
        if (!question || question.trim().length === 0) {
            return res.status(400).json({ error: 'Pergunta não informada' });
        }
        const qLower = question.toLowerCase().trim();
        // 1. Consulta ao andamento de chamados do usuário logado
        if (qLower.includes('meus chamado') ||
            qLower.includes('meu chamado') ||
            qLower.includes('andamento') ||
            qLower.includes('status') ||
            qLower.includes('sc-')) {
            // Buscar chamados abertos do usuário
            const myTicketsRes = await (0, database_js_1.query)(`SELECT c.id, c.protocolo, c.titulo, c.status, c.created_at, cat.nome as categoria_nome,
                tec.nome as tecnico_nome
         FROM chamados c
         JOIN categorias cat ON cat.id = c.categoria_id
         LEFT JOIN usuarios tec ON tec.id = c.tecnico_id
         WHERE c.solicitante_id = $1
         ORDER BY c.created_at DESC
         LIMIT 3`, [user.id]);
            if (myTicketsRes.rows.length === 0) {
                return res.json({
                    reply: `Olá ${user.nome}! Você não possui nenhum chamado em aberto no momento. Se precisar de suporte com software, hardware ou novos logins, posso te ajudar a abrir um agora!`,
                    action: 'open_ticket',
                    suggestions: ['Como encontrar o VNC?', 'Problema na impressora', 'Solicitar novo login'],
                });
            }
            const listStr = myTicketsRes.rows
                .map((t) => {
                const statusMap = {
                    aberto: 'Aberto (na fila de triagem)',
                    em_triagem: 'Em triagem',
                    em_atendimento: `Em atendimento com ${t.tecnico_nome || 'a equipe de TI'}`,
                    aguardando_usuario: 'Aguardando suas informações adicionais',
                    aguardando_terceiro: 'Aguardando suporte terceiro',
                    resolvido: 'Resolvido (aguardando sua confirmação)',
                    concluido: 'Concluído',
                    cancelado: 'Cancelado',
                };
                return `• **${t.protocolo}** — *${t.titulo}*\n  Status: ${statusMap[t.status] || t.status}`;
            })
                .join('\n\n');
            return res.json({
                reply: `Localizei seus chamados recentes na Santa Casa de Pelotas:\n\n${listStr}\n\nVocê pode clicar no chamado na sua lista para ver a conversa completa com a equipe técnica.`,
                tickets: myTicketsRes.rows,
                suggestions: ['Como encontrar o VNC?', 'Problemas com impressora', 'Abrir novo chamado'],
            });
        }
        // 2. Orientação de VNC
        if (qLower.includes('vnc') || qLower.includes('ip') || qLower.includes('acesso remoto') || qLower.includes('identificação do computador')) {
            return res.json({
                reply: `💻 **Como encontrar o VNC ou IP do seu computador:**\n\n1. Olhe no canto inferior direito da tela (perto do relógio do Windows).\n2. Procure pelo ícone azul com a letra **"V"** ou um desenho de monitor.\n3. Passe o mouse por cima ou clique com o botão direito: o endereço IP aparecerá (ex: **10.0.14.45** ou **TI-BC-02**).\n4. Se não encontrar perto do relógio, clique no menu Iniciar e digite **"VNC"**.\n\nInforme esse número ao abrir seu chamado para que a TI possa realizar o acesso remoto!`,
                action: 'open_ticket_software',
                suggestions: ['Abrir chamado de Software', 'Problema na impressora', 'Consultar meus chamados'],
            });
        }
        // 3. Orientação de Impressora / Luz Vermelha
        if (qLower.includes('impressora') ||
            qLower.includes('luz vermelha') ||
            qLower.includes('não imprime') ||
            qLower.includes('papel preso') ||
            qLower.includes('toner')) {
            return res.json({
                reply: `🖨️ **Problemas comuns com impressora:**\n\n1. **Luz vermelha piscando?** Abra a tampa frontal e certifique-se de que não há papel preso nos roletes e que o toner está bem travado.\n2. **Reinicialização:** Desligue no botão de energia, aguarde 10 segundos e ligue novamente.\n3. **Cabo de rede:** Verifique se o cabo azul conectado atrás da impressora está firme com as luzes verde/laranja acesas.\n\nSe continuar travada, posso abrir um chamado de **Hardware e Rede** direto para a nossa equipe técnica ir até o seu setor!`,
                action: 'open_ticket_hardware',
                suggestions: ['Abrir chamado de Hardware e Rede', 'Como encontrar o VNC?', 'Consultar meus chamados'],
            });
        }
        // 4. Solicitação de Logins
        if (qLower.includes('login') || qLower.includes('senha') || qLower.includes('novo usuario') || qLower.includes('acesso') || qLower.includes('cadastrar funcionario')) {
            return res.json({
                reply: `👤 **Como solicitar novos logins ou acessos:**\n\n1. Utilize a opção **"Solicitar Login"** no menu inicial do Sistech Desk.\n2. Você pode incluir mais de um funcionário no mesmo chamado através do botão **"Adicionar Colaborador"**.\n3. Tenha em mãos o Nome Completo, R.E. e o setor do colaborador.\n4. As senhas iniciais geradas pela TI são temporárias e exigem troca no primeiro acesso por segurança.`,
                action: 'open_ticket_login',
                suggestions: ['Abrir Solicitação de Login', 'Como encontrar o VNC?', 'Problema na impressora'],
            });
        }
        // 5. Pesquisa na Base de Conhecimento do Sistech Desk
        const words = qLower.split(/\s+/).filter((w) => w.length > 3);
        if (words.length > 0) {
            const searchPattern = `%${words[0]}%`;
            const kbRes = await (0, database_js_1.query)(`SELECT titulo, conteudo, resumo
         FROM base_conhecimento
         WHERE ativo = true AND (
           titulo ILIKE $1 OR conteudo ILIKE $1 OR $2 = ANY(palavras_chave)
         )
         LIMIT 1`, [searchPattern, words[0]]);
            if (kbRes.rows.length > 0) {
                const art = kbRes.rows[0];
                return res.json({
                    reply: `💡 **${art.titulo}**\n\n${art.conteudo}`,
                    suggestions: ['Abrir um chamado de suporte', 'Como encontrar o VNC?', 'Consultar meus chamados'],
                });
            }
        }
        // 6. Resposta padrão inteligente com sugestões
        return res.json({
            reply: `Não encontrei uma resposta exata para a sua dúvida na minha base de conhecimento, mas a equipe de TI da Santa Casa de Pelotas está pronta para te atender!\n\nVocê gostaria de abrir um chamado agora? É rápido e você poderá conversar diretamente com um técnico pelo chat.`,
            action: 'open_ticket',
            suggestions: [
                'Abrir chamado de Software',
                'Abrir chamado de Hardware e Rede',
                'Solicitar Login de acesso',
                'Como encontrar o VNC?',
            ],
        });
    }
    catch (error) {
        console.error('Erro no assistente Sistech:', error);
        return res.status(500).json({ error: 'Erro ao processar mensagem do assistente' });
    }
}
