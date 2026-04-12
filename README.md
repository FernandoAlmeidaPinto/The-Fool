# The Fool

Plataforma de aprendizado de tarot com leituras guiadas por IA, carta do dia, diário espiritual e exploração interativa de baralhos.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (design system Ivory & Charcoal)
- **Auth.js v5** — JWT sessions, login com email/senha e Google OAuth
- **MongoDB** + Mongoose
- **MinIO** (S3) — armazenamento de imagens
- **TipTap** — editor de texto rico
- **Sharp** — processamento de imagens

## Funcionalidades

### Carta do Dia

Sorteio diário de uma carta de tarot (uma por usuário por dia, fuso de São Paulo). Inclui reflexão editorial e histórico navegável por data.

### Leituras de Tarot

Wizard de leitura com interpretação por IA, modo prática com feedback e combinações de cartas. Quota de leituras por plano.

### Diário Espiritual

Diário pessoal com três tipos de entrada: reflexão da carta do dia, anotação de leitura e texto livre. Suporte a paginação e arquivamento.

### Baralhos & Cartas

Exploração de baralhos com grid de cartas e visualização detalhada. Anotações interativas posicionadas por clique (editor admin), exibidas com linhas SVG (desktop) e pontos numerados (mobile).

### Perfil & Planos

Gerenciamento de perfil do usuário (nome, avatar, data de nascimento) e visualização de planos disponíveis. Integração com pagamento pendente.

### Painel Admin

CRUD completo para perfis, planos, baralhos, cartas, anotações, perguntas de prática e gerenciamento de usuários.

## Pré-requisitos

- Node.js 20+
- Yarn
- Docker & Docker Compose

## Setup

1. Clone o repositório e instale as dependências:

```bash
git clone <repo-url>
cd the_fool
yarn install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
# Edite .env com seus valores (AUTH_SECRET, Google OAuth, etc.)
```

3. Inicie os serviços de infraestrutura:

```bash
docker compose up -d  # MongoDB + MinIO
```

4. Popule o banco com dados iniciais:

```bash
yarn seed  # Cria perfis admin e free_tier
```

5. Inicie o servidor de desenvolvimento:

```bash
yarn dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `yarn dev` | Servidor de desenvolvimento com hot reload |
| `yarn build` | Build de produção |
| `yarn start` | Servidor de produção |
| `yarn lint` | Linting com ESLint |
| `yarn seed` | Seed do banco de dados |
| `docker compose up -d` | Iniciar MongoDB + MinIO |
| `docker compose down` | Parar MongoDB + MinIO |

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | URI de conexão do MongoDB |
| `AUTH_SECRET` | Secret do Auth.js (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Client ID do Google OAuth |
| `AUTH_GOOGLE_SECRET` | Client Secret do Google OAuth |
| `NEXTAUTH_URL` | URL base da aplicação |
| `S3_ENDPOINT` | Endpoint do MinIO/S3 |
| `S3_ACCESS_KEY` | Access key do MinIO/S3 |
| `S3_SECRET_KEY` | Secret key do MinIO/S3 |
| `S3_BUCKET` | Nome do bucket para imagens |
| `S3_REGION` | Região do S3 |
