# Rede de Atendimento Hapvida

Monorepo com backend NestJS, frontend React e indexador Oracle → Elasticsearch.

## Estrutura

```
rede_hapvida/
  docker-compose.yml
  backend/         # NestJS API + Elasticsearch
  frontend/        # React + Vite
  indexador/       # Extrator Oracle → API (carga em batch)
```

## Pré-requisitos

- Docker + Docker Compose v2
- (Opcional) Node.js 20+ para desenvolvimento local

---

## Subir o ambiente completo

```bash
# Copiar variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Subir elasticsearch + backend + frontend
docker compose up -d

# Acessar
# Frontend:  http://localhost:80
# Backend:   http://localhost:3000
# Elastic:   http://localhost:9200
```

---

## Rodar o indexador (extração do Oracle)

```bash
# Configurar credenciais Oracle
cp indexador/.env.example indexador/.env
# Editar indexador/.env com ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECTION_STRING

# Executar a carga (limpando o índice antes)
CLEAN_INDEX=true docker compose --profile indexador run --rm indexador

# Atualização incremental (sem limpar)
docker compose --profile indexador run --rm indexador
```

## Seed com dados do protótipo HTML (sem Oracle)

O `index.html` original já contém todos os dados embutidos em JavaScript.
O seeder extrai esse array e faz a primeira indexação sem precisar de Oracle:

```bash
cd indexador

# Copiar .env
cp .env.example .env
# Ajustar API_URL e API_KEY se necessário

# Opção 1 — limpa o índice antes de indexar (recomendado para primeira carga)
npm run seed:clean

# Opção 2 — indexação sem limpar (modo incremental / upsert)
npm run seed

# Opção 3 — passando o caminho do HTML manualmente
CLEAN_INDEX=true npx ts-node src/seed-from-html.ts ../index.html
```

> O script detecta automaticamente o `index.html` na raiz do monorepo.

---

## Desenvolvimento local

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Indexador

```bash
cd indexador
cp .env.example .env
# editar .env com credenciais
npm install
npm run dev
```

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/prestadores` | Lista paginada com filtros |
| GET | `/prestadores/aggregations` | KPIs e contagens para dashboard |
| GET | `/prestadores/suggest?q=` | Autocomplete de prestador |
| GET | `/prestadores/filter-options` | Valores distintos para filtros |
| GET | `/prestadores/geo` | Marcadores e contagens por raio |
| POST | `/prestadores/batch` | Carga em lote (requer `x-api-key`) |
| DELETE | `/prestadores/clear` | Limpa o índice (requer `x-api-key`) |

### Filtros disponíveis (query params)

`operadora`, `uf`, `cidade`, `servico`, `grupoServico`, `especialidade`, `rede`, `search`, `page`, `limit`

---

## Mapeamento Oracle → Elasticsearch

| Oracle | Elasticsearch |
|--------|---------------|
| `cd_empresa_plano` (CASE) | `operadora` |
| `nm_fantasia` | `nomeFantasia` |
| `cd_uf` | `uf` |
| `nm_cidade` | `cidade` |
| `endereco` | `endereco` |
| `ds_compl_endereco` | `complemento` |
| `nm_bairro` | `bairro` |
| `cd_cep` | `cep` |
| `ds_fone` | `telefones` |
| `fl_tipo_pessoa` | `contratacao` |
| `ds_servico` | `servico` |
| `ds_especialidade` (quando CLINICAS) | `grupoServico` |
| `ds_especialidade` (outros) | `especialidade` |
| `cd_natureza_juridica` | `rede` |
| `cd_latitude`, `cd_longitude` | `localizacao` (geo_point) |
| `cd_prestador` | `codigoPrestador` |
| `nu_cgc_cpf` | `cnpjCpf` |
| `nm_prestador` | `razaoSocial` |
| `nu_cnes_crm` | `crmCnes` |
