# Guia de Deploy e Configuração de Produção (Supabase & Vercel)

Este guia orienta o processo de migração do banco de dados local do **AutoCare Manager** para o **Supabase PostgreSQL** e a realização do deploy do projeto na **Vercel**.

---

## 1. Configurando o Supabase (Banco de Dados)

### Passo 1: Criar o projeto no Supabase
1. Acesse o painel do [Supabase](https://supabase.com/).
2. Clique em **New Project** e selecione sua organização.
3. Defina os seguintes dados:
   * **Name**: `AutoCare Manager` ou `autocare`
   * **Database Password**: Defina uma senha forte (guarde-a bem, ela será necessária na string de conexão).
   * **Region**: Selecione a região de servidor mais recomendada (ex: `sa-east-1` - São Paulo para menor latência).
4. Clique em **Create new project** e aguarde o provisionamento (cerca de 2 minutos).

### Passo 2: Obter as strings de conexão
1. No painel lateral do seu projeto, acesse **Project Settings** (ícone de engrenagem) > **Database**.
2. Role a página até encontrar a seção **Connection string**.
3. Selecione a aba **URI** e copie as duas strings de conexão necessárias:
   * **Transaction Connection (Pooler)** (Geralmente na porta `6543`): Copie para usar como `DATABASE_URL`.
     * Formato esperado: `postgresql://postgres:[SENHA]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1`
   * **Session/Direct Connection** (Geralmente na porta `5432`): Copie para usar como `DIRECT_URL`.
     * Formato esperado: `postgresql://postgres:[SENHA]@db.[PROJECT_REF].supabase.co:5432/postgres?schema=public`
4. Lembre-se de substituir o placeholder `[SENHA]` ou `[YOUR-PASSWORD]` pela senha do banco de dados definida no Passo 1.

---

## 2. Configurando o Ambiente e Variáveis

### Desenvolvimento Local (`.env`)
No seu ambiente local, você deve manter o arquivo `.env` configurado para o banco Docker ou local. Exemplo:

```env
DATABASE_URL="postgresql://autocare_user:autocare_password@localhost:5432/autocare_db?schema=public"
DIRECT_URL="postgresql://autocare_user:autocare_password@localhost:5432/autocare_db?schema=public"
JWT_SECRET="chave_local_de_desenvolvimento"
```

> [!CAUTION]
> **Segurança**: Nunca envie o arquivo `.env` para o Git. Certifique-se de que ele está listado no `.gitignore`.

### Produção (Vercel)
No painel da Vercel, você deve adicionar as seguintes variáveis de ambiente nas configurações do projeto:

| Variável | Descrição | Exemplo / Valor |
|---|---|---|
| `DATABASE_URL` | String de conexão (Pooler / Porta 6543) | `postgresql://postgres:senha@db.ref.supabase.co:6543/postgres?pgbouncer=true...` |
| `DIRECT_URL` | String de conexão direta (Porta 5432) | `postgresql://postgres:senha@db.ref.supabase.co:5432/postgres?schema=public` |
| `JWT_SECRET` | Chave de assinatura para sessões de usuários | *Chave forte aleatória* (ex: gerada com `openssl rand -base64 32`) |
| `NODE_ENV` | Identificação do ambiente de execução | `production` |

---

## 3. Lógica de Migrações do Banco

### Comandos de Desenvolvimento vs. Produção

* **Durante o Desenvolvimento**:
  * Ao criar novos modelos ou alterar colunas localmente, use o comando:
    ```bash
    npx prisma migrate dev --name nome_da_alteracao
    ```
    Isso gera o histórico local de migrações e atualiza seu banco de dados local.

* **Durante o Deploy em Produção (Supabase)**:
  * **NÃO** utilize `prisma migrate dev` diretamente contra o Supabase para não corromper o estado das migrações do banco.
  * Para aplicar as migrações já testadas localmente no banco de produção, utilize:
    ```bash
    npx prisma migrate deploy
    ```
    Este comando lê os arquivos de migração gerados na pasta `prisma/migrations/` e os aplica de forma segura no Supabase.

---

## 4. Realizando o Deploy na Vercel

### Passo 1: Subir código para o GitHub
Garante que todo o seu código esteja comitadado em um repositório Git privado (excluindo o `.env` e a pasta `.next`).

### Passo 2: Criar Projeto na Vercel
1. Acesse o painel da [Vercel](https://vercel.com/) e clique em **Add New** > **Project**.
2. Importe o repositório GitHub do seu projeto.
3. Nas configurações do projeto:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `./` (ou selecione a pasta da aplicação, caso esteja em um subdiretório)
4. Abra a aba **Environment Variables** e insira as 4 variáveis detalhadas na seção 2 deste guia (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` e `NODE_ENV`).

### Passo 3: Configurar o Build e Deploy
* A Vercel executará o comando configurado em nosso `package.json` (`prisma generate && next build`) automaticamente.
* Isso garante que os tipos estáticos do Prisma Client sejam devidamente gerados e compilados junto à build do Next.js.
* Clique em **Deploy** e aguarde a finalização da compilação.

### Passo 4: Aplicar as tabelas no Supabase
1. Após a build ou pouco antes dela, você deve rodar localmente no seu terminal as migrações apontando temporariamente para o Supabase (ou usar uma pipeline de CI/CD).
2. Para aplicar localmente a partir de sua máquina ao Supabase:
   * Substitua temporariamente a `DATABASE_URL` e `DIRECT_URL` no seu `.env` pelas URLs do Supabase (com a senha real).
   * Execute no terminal:
     ```bash
     npx prisma migrate deploy
     ```
   * Restaure as variáveis locais do `.env` para o banco local Docker após o deploy terminar.
3. Acesse o painel do Supabase, vá em **Table Editor** ou **Database** e confirme se todas as tabelas (`User`, `Car`, `Maintenance`, `MaintenancePart`, `FuelRecord`, `VehicleWebInfo`) foram criadas com sucesso.

Pronto! Sua aplicação está publicada e funcionando com o banco do Supabase e infraestrutura serverless da Vercel.
