# Sistech Desk — Central de Chamados Internos
**Santa Casa de Pelotas — Tecnologia da Informação**

O **Sistech Desk** é uma plataforma web completa e moderna para gerenciamento de chamados internos da Santa Casa de Pelotas. Desenvolvido com foco no setor de Tecnologia da Informação, conta com uma arquitetura modular preparada para receber futuramente outros setores hospitalares (Manutenção Predial, Engenharia Clínica e Patrimônio).

---

## 1. Identidade Visual e Mascote Oficial

O sistema adota a paleta institucional em tons de azul-marinho, branco e cinza-claro, com cards arredondados, tipografia moderna (Inter) e ícones via Lucide React.

O mascote oficial **Sistech** (`assets/sistech.png`) está presente de forma destacada em:
- Tela de login institucional;
- Painel de boas-vindas do colaborador;
- Menu lateral azul-marinho;
- Janela flutuante do assistente virtual de suporte.

---

## 2. Tecnologias Utilizadas

### Frontend
- **React 18** com **Vite** e **TypeScript**
- **Tailwind CSS** com tema personalizado
- **Lucide React**
- **React Router 6** (com controle de permissões por perfil)
- **Socket.IO Client** para mensagens e notificações em tempo real

### Backend
- **Node.js** com **Express** e **TypeScript**
- **Socket.IO** (WebSockets) com salas públicas e privadas por chamado
- **PostgreSQL 17** com chaves primárias UUID nativas (`pgcrypto`)
- **Autenticação JWT** com hash de senhas via **Bcrypt**
- **Auditoria completa de ações**

### Infraestrutura
- Compatível com **Windows Server 2019**
- Gerenciamento de processos via **PM2** (`ecosystem.config.js`)
- Configurações centralizadas por variáveis de ambiente (`.env`)

---

## 3. Perfis de Acesso e Controle de Permissões

1. **Master (Administrador Geral)**: Acesso irrestrito a todos os setores, gestão de técnicos, auditoria, configurações globais e categorias.
2. **Gestor de Atendimento**: Visualiza filas de setores autorizados, distribui chamados, acompanha produtividade e tempos de resposta/resolução (SLAs).
3. **Técnico de Suporte**: Visualiza filas da TI, assume chamados, responde no chat em tempo real, cria **notas internas confidenciais**, altera status e registra resoluções.
4. **Colaborador**: Abre chamados dinâmicos, acompanha apenas seus próprios chamados, responde aos técnicos, confirma soluções e avalia o atendimento (1 a 5 estrelas).

---

## 4. Instalação e Execução

### Pré-requisitos
- **Node.js** (v18+) e **npm**
- **PostgreSQL** instalado e ativo (banco `sistech_desk`)

### 1. Clonar e Instalar Dependências
```bash
# Na pasta raiz do projeto:
cd server
npm install

cd ../client
npm install
```

### 2. Configurar o Banco de Dados e Variáveis de Ambiente
Crie o arquivo `server/.env` (baseando-se no `server/.env.example`):
```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5434
DB_NAME=sistech_desk
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_SSL=false

# JWT
JWT_SECRET=sistech_desk_secret_key_santacasa_2026_super_secure
JWT_EXPIRES_IN=7d
```

### 3. Executar Migrations e Dados Demonstrativos
```bash
# Criar tabelas, índices e constraints:
cd server
npm run migrate

# Popular dados de demonstração (usuários, chamados, artigos da base de conhecimento):
npm run seed
```

### 4. Inicializar em Modo de Desenvolvimento
Você pode simplesmente dar dois cliques no arquivo `run-dev.bat` ou executar via terminal:
```bash
# Terminal 1 - Backend:
cd server
npm run dev

# Terminal 2 - Frontend:
cd client
npm run dev
```
Acesse no navegador: **`http://localhost:5173`**

---

## 5. Execução em Produção (Windows Server 2019 + PM2)

1. Gere o build de produção:
   ```bash
   build-all.bat
   ```
2. Inicialize o serviço através do PM2:
   ```bash
   run-prod.bat
   ```
   Ou manualmente:
   ```bash
   npx pm2 start ecosystem.config.js
   npx pm2 save
   ```

---

## 6. Procedimento de Criação do Primeiro Administrador Master

Para configurar ou redefinir o usuário Master com segurança em produção (sem senhas fixas no código):
```bash
ADMIN_LOGIN=admin.master ADMIN_PASS=SenhaForte123! ADMIN_RE=99999 ADMIN_NOME="Gestor de TI" npm run setup-admin
```

---

## 7. Contas de Demonstração (Ambiente de Testes)

Todas as contas utilizam a senha padrão de desenvolvimento: **`sistech123`**

| Perfil | Nome | Login | R.E. | Setor |
| :--- | :--- | :--- | :--- | :--- |
| **Colaboradora** | Marina Santos | `marina.santos` | `00010` | Bloco Cirúrgico |
| **Técnico TI** | Carlos Mendes | `carlos.mendes` | `00003` | Tecnologia da Informação |
| **Técnico TI** | Lucas Ferreira | `lucas.ferreira` | `00004` | Infraestrutura & Redes |
| **Técnica TI** | Fernanda Alves | `fernanda.alves` | `00005` | Sistemas & Banco de Dados |
| **Gestor TI** | Gestor de TI | `gestor.ti` | `00002` | Coordenação de TI |
| **Master** | Administrador Master | `master.admin` | `00001` | TI Santa Casa |

> **Dica**: No cabeçalho da aplicação existe o botão **"Alternar Usuário Demo"**, que permite trocar de perfil instantaneamente com 1 clique para testar todo o fluxo.

---

## 8. Rotina Documentada de Backup e Restauração (PostgreSQL)

### Backup Automático Diário (Dump Lógico)
```powershell
# Executar no PowerShell ou agendar no Agendador de Tarefas do Windows:
$Data = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupFile = "C:\Backups\sistech_desk_$Data.sql"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -p 5434 -U postgres -F p -b -v -f $BackupFile sistech_desk
```

### Restauração do Banco de Dados
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5434 -U postgres -d sistech_desk -f "C:\Backups\sistech_desk_arquivo.sql"
```

---

## 9. Testes Automatizados

O sistema conta com suíte de testes de integração cobrindo autenticação Bcrypt, permissões RBAC, geração de protocolos, workflow de status, mensageria Socket.IO e isolamento de notas internas:

```bash
cd server
npm test
```
Resultado: **15 testes aprovados (100% de sucesso)**.
