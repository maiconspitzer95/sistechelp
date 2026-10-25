# Guia de Implantação e Operação — Sistech Desk
**Santa Casa de Pelotas — Tecnologia da Informação**
**Ambiente: Windows Server 2019 / Node.js / PM2 / PostgreSQL**

---

## 1. Visão Geral da Arquitetura

O **Sistech Desk** opera em arquitetura consolidada de **processo único e porta HTTP única**:

```text
NAVEGADOR DO COLABORADOR
          │
          │ http://IP-DO-SERVIDOR:5002
          ▼
      server.js (Node.js + Express)
          │
          ├─────────────────────────┬─────────────────────────┐
          ▼                         ▼                         ▼
   Frontend React               API REST                  Socket.IO
(dist/ compilado)                /api/*                  /socket.io/*
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                         PostgreSQL 17 (DB)
```

- **Frontend, API e Socket.IO**: Acessíveis pelo mesmo IP e porta (padrão: `5002`, configurável via `.env`).
- **Gerenciador de Processos**: PM2 em processo único (`sistech`).
- **Zero necessidade de portas separadas**: Não há execução de Vite dev server em ambiente de produção.

---

## 2. Pré-requisitos no Windows Server 2019

1. **Node.js**: Versão 18.x, 20.x ou superior instalada (verificar com `node -v` e `npm -v`).
2. **PostgreSQL**: Versão 17 ou compatível em execução.
3. **PM2**: Instalado globalmente:
   ```cmd
   npm install -g pm2
   ```
4. **Git**: Instalado para controle de versão e atualizações.

---

## 3. Instalação e Configuração Passo a Passo

### Passo 1 — Clonar ou Acessar a Pasta do Projeto
Abra o **Prompt de Comando (CMD)** ou **PowerShell** no diretório do projeto:
```cmd
cd C:\Projetos\sistechelp
```

### Passo 2 — Configurar as Variáveis de Ambiente (`.env`)
Copie o modelo `.env.example` para `.env` na raiz do projeto:
```cmd
copy .env.example .env
```
Edite o arquivo `.env` com os dados do ambiente de produção:
```env
# Porta única de escuta
PORT=5002
HOST=0.0.0.0
NODE_ENV=production

# Conexão com o Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5434
DB_NAME=sistech_desk
DB_USER=postgres
DB_PASSWORD=sua_senha_segura
DB_SSL=false

# Segurança JWT
JWT_SECRET=chave_secreta_longa_e_segura_santacasa_2026
JWT_EXPIRES_IN=7d

# Diretório de uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=15
```

### Passo 3 — Instalar as Dependências
Execute na raiz do projeto:
```cmd
npm install
```
*(O script pós-instalação garante que todas as dependências do servidor e do frontend sejam instaladas).*  
Caso deseje instalar explicitamente:
```cmd
npm run install:all
```

### Passo 4 — Executar Migrations e Carga Inicial (se banco novo)
Se for uma instalação limpa do banco de dados:
```cmd
npm run migrate
npm run seed
```
*(Atenção: não execute migrations caso o banco já possua dados de produção).*

Para cadastrar ou redefinir o Administrador Geral (Master) com segurança:
```cmd
set ADMIN_LOGIN=admin.master
set ADMIN_PASS=SenhaSegura123!
set ADMIN_RE=99999
set ADMIN_NOME=Gestor de TI
npm run setup-admin
```

### Passo 5 — Compilar a Aplicação Completa
Execute o comando de build na raiz:
```cmd
npm run build
```
Esse comando compila:
1. O backend TypeScript para JavaScript CommonJS em `server/dist`.
2. O frontend React + Vite para arquivos estáticos na pasta `dist/` da raiz.

---

## 4. Inicialização do Sistema

### Opção A — Execução Direta via Node.js
Para testes rápidos e validação:
```cmd
node server.js
```
O console exibirá:
```text
=======================================================
🏥 SISTECH DESK — CENTRAL DE CHAMADOS INTERNOS
   Santa Casa de Pelotas — Tecnologia da Informação
=======================================================
✅ PostgreSQL conectado com sucesso [Banco: "sistech_desk"]
🚀 Servidor unificado ativo: http://localhost:5002
🌐 Porta única HTTP/WebSockets: 5002
📁 Frontend servido a partir de: C:\Projetos\sistechelp\dist
🩺 Health check disponível em: http://localhost:5002/api/health
=======================================================
```

### Opção B — Execução em Produção via PM2 (Recomendado)
Para iniciar o processo gerenciado pelo PM2 com o nome `sistech`:
```cmd
pm2 start server.js --name sistech
```
Também é possível iniciar via arquivo de ecossistema:
```cmd
pm2 start ecosystem.config.js
```

Para salvar o estado do PM2 para inicialização automática:
```cmd
pm2 save
```

---

## 5. Gerenciamento do Processo com PM2

| Comando | Descrição |
| :--- | :--- |
| `pm2 status` | Exibe o status da aplicação, uso de memória e CPU |
| `pm2 restart sistech` | Reinicia o Sistech Desk sem downtime perceptível |
| `pm2 stop sistech` | Pausa a execução do sistema |
| `pm2 logs sistech` | Exibe os logs em tempo real (HTTP, API, banco e erros) |
| `pm2 logs sistech --lines 100` | Exibe as últimas 100 linhas de log |
| `pm2 save` | Salva a lista de processos ativos |

---

## 6. Fluxo de Atualização Contínua (Deploy com Git)

Ao disponibilizar melhorias ou novas versões no repositório Git, execute a sequência padrão:

```cmd
git pull
npm install
npm run build
pm2 restart sistech
```

### Script de Atualização Rápida no Windows (`update.bat`)
Caso deseje automatizar, crie um arquivo `update.bat`:
```bat
@echo off
echo Atualizando Sistech Desk...
git pull
call npm install
call npm run build
call pm2 restart sistech
echo Sistech Desk atualizado com sucesso!
```

---

## 7. Verificação de Saúde e Conectividade

### 1. Testar Rota de Saúde da API
Pelo navegador ou PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5002/api/health"
```
Resposta esperada:
```json
{
  "status": "online",
  "app": "Sistech Desk - Santa Casa de Pelotas",
  "timestamp": "2026-10-25T00:46:27.989Z",
  "uptime": 120,
  "database": "connected",
  "environment": "production",
  "port": 5002
}
```

### 2. Testar Acesso ao Frontend
Abra no navegador da rede hospitalar:
```text
http://IP-DO-SERVIDOR:5002
```
A tela de login oficial com o mascote Sistech deverá carregar diretamente.

### 3. Testar Navegação Direta (React Router)
Acesse uma rota profunda como:
```text
http://IP-DO-SERVIDOR:5002/collaborator/tickets
```
O servidor Express servirá o `index.html` com o fallback configurado sem erro 404.

---

## 8. Liberação de Porta no Windows Firewall

Para permitir que os computadores da rede interna da Santa Casa acessem o Sistech Desk, execute no **PowerShell (como Administrador)**:

```powershell
New-NetFirewallRule -DisplayName "Sistech Desk (Porta 5002)" `
  -Direction Inbound `
  -LocalPort 5002 `
  -Protocol TCP `
  -Action Allow
```

Para verificar a regra criada:
```powershell
Get-NetFirewallRule -DisplayName "Sistech Desk (Porta 5002)"
```

---

## 9. Inicialização Automática no Boot do Windows Server 2019

Para que o PM2 inicie o Sistech Desk automaticamente quando o Windows Server for reiniciado:

### Método 1: via `pm2-windows-service`
1. Instale o serviço:
   ```cmd
   npm install -g pm2-windows-service
   pm2-service-install
   ```
2. Responda às perguntas:
   - Perform environment setup: `Y`
   - PM2_HOME: `C:\Users\<Usuario>\.pm2`
3. Salve o processo:
   ```cmd
   pm2 start server.js --name sistech
   pm2 save
   ```

### Método 2: via Agendador de Tarefas do Windows (Task Scheduler)
1. Abra `taskschd.msc`.
2. Crie uma Tarefa Básica:
   - **Nome**: `Sistech Desk Startup`
   - **Disparador**: `Ao iniciar o computador`
   - **Ação**: `Iniciar um programa`
   - **Programa**: `cmd.exe`
   - **Argumentos**: `/c pm2 resurrect`

---

## 10. Resolução de Problemas Comuns

### Erro: `Backend compilado não encontrado em server/dist`
- **Causa**: O comando de build ainda não foi executado.
- **Solução**: Execute `npm run build` na raiz do projeto.

### Erro: `PostgreSQL não conectado no momento`
- **Causa**: O serviço do PostgreSQL está inativo ou as credenciais no `.env` estão incorretas.
- **Solução**:
  1. Verifique se o serviço está ativo: `Get-Service *postgres*`.
  2. Verifique `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` no `.env`.
  3. O Sistech Desk continuará em execução e restabelecerá a conexão assim que o banco estiver acessível.

### Erro: `ExecutionPolicy` ao executar `pm2` no PowerShell
- **Causa**: Políticas restritivas de script no PowerShell.
- **Solução**:
  - Utilize o Prompt de Comando (**CMD**), ou
  - Chame via `pm2.cmd` / `cmd.exe /c pm2 start server.js --name sistech`, ou
  - Libere a política para o usuário atual: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
