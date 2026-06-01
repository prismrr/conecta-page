# Ingestão e Consulta de Inscrições

Este documento descreve como configurar, executar e validar o sistema de ingestão assíncrona de inscrições a partir de um CSV externo e como consultar os dados normalizados pela API FastAPI.

## Visão Geral

O fluxo é composto por quatro partes:

1. Origem CSV externa, pública ou autenticada.
2. Pipeline assíncrona com Redis + Celery para baixar, validar, normalizar e persistir os dados.
3. Banco intermediário SQLite como fonte oficial de consulta.
4. API FastAPI de leitura para o frontend e para validação operacional.

Fluxo resumido:

```mermaid
flowchart LR
  CSV[CSV externo\nURL pública/autenticada] --> DL[Download e checksum]
  REDIS[(Redis broker)] --> WORKER[Celery Worker]
  BEAT[Celery Beat] --> REDIS
  WORKER --> DL
  DL --> VAL[Validação estrita\nUTF-8, schema, tipos]
  VAL --> UPSERT[Upsert incremental\npor id]
  UPSERT --> DB[(SQLite intermediário\ninscricoes + ingest_batches)]
  API[FastAPI\nGET /api/inscricoes/{id}] --> DB
  API2[FastAPI\nGET /api/inscricoes/lotes/{loteImportacao}] --> DB
```

## Pré-requisitos

- Docker e Docker Compose instalados.
- API do projeto configurada para rodar localmente.
- Arquivo `.env` com a chave de criptografia e a URL da origem CSV.
- Dependências de teste e runtime do backend instaladas pelo fluxo Docker.

## Configuração

As variáveis principais ficam em [.env.example](../.env.example):

- `CONECTA_INSCRICOES_CSV_URL`: URL do CSV de origem.
- `CONECTA_INSCRICOES_SOURCE_TOKEN`: token opcional para origem autenticada.
- `CONECTA_INSCRICOES_SOURCE_AUTH_HEADER`: nome do header de autenticação.
- `CONECTA_INSCRICOES_MAX_FILE_BYTES`: limite máximo do arquivo.
- `CONECTA_CELERY_BROKER_URL`: broker do Celery.
- `CONECTA_CELERY_RESULT_BACKEND`: backend de resultados do Celery.
- `CONECTA_PII_FERNET_KEY`: chave Fernet para criptografar campos pessoais no banco intermediário.

Exemplo mínimo para ambiente local:

```env
CONECTA_INSCRICOES_CSV_URL=http://conecta-csv-source:8090/inscricoes-seed.csv
CONECTA_CELERY_BROKER_URL=redis://conecta-redis:6379/0
CONECTA_CELERY_RESULT_BACKEND=redis://conecta-redis:6379/0
CONECTA_PII_FERNET_KEY=cole_uma_chave_fernet_valida_aqui
```

## Estrutura de Dados

As tabelas relevantes são criadas em [backend/api/sqlite_utils.py](../backend/api/sqlite_utils.py):

- `inscricoes`: tabela intermediária de consulta.
- `ingest_batches`: controle de lote, checksum e métricas.
- `ingest_batch_errors`: erros por linha e divergências do CSV.

Campos principais em `inscricoes`:

- `id`
- `nome`
- `email_ciphertext`
- `email_hash`
- `status`
- `data_atualizacao_origem`
- `source_checksum`
- `lote_importacao`
- `created_at`
- `updated_at`

## Como Subir a Stack de Ingestão

Suba os serviços de ingestão com os comandos npm:

```bash
npm run dev:docker:ingestion:up
```

Ou diretamente pelo script:

```bash
bash scripts/dev_docker.sh ingestion-up
```

Isso sobe:

- `conecta-redis`: broker Redis.
- `conecta-csv-source`: servidor local com o CSV de seed.
- `conecta-worker`: worker Celery.
- `conecta-beat`: scheduler Celery Beat.

## Como Disparar a Ingestão

Para executar a task de ingestão manualmente:

```bash
npm run dev:docker:ingestion:trigger
```

Ou:

```bash
bash scripts/dev_docker.sh ingestion-trigger
```

O worker realiza:

1. Download do CSV.
2. Cálculo de checksum do arquivo.
3. Validação do cabeçalho.
4. Validação por linha.
5. Normalização de status e timestamps.
6. Upsert incremental por `id`.
7. Persistência de métricas do lote e erros de linha.

## Como Monitorar a Execução

Logs da stack de ingestão:

```bash
npm run dev:docker:ingestion:logs
```

Ou:

```bash
bash scripts/dev_docker.sh ingestion-logs
```

Se precisar encerrar a stack:

```bash
npm run dev:docker:ingestion:down
```

Ou:

```bash
bash scripts/dev_docker.sh ingestion-down
```

## Validação do Resultado

Depois da ingestão, a fonte de consulta é o banco intermediário SQLite. Os endpoints disponíveis são:

- `GET /api/inscricoes/{id}`
- `GET /api/inscricoes/lotes/{loteImportacao}`

Exemplo de consulta por inscrição:

```bash
curl http://localhost:8080/api/inscricoes/PRISM-2026-001
```

Resposta esperada:

```json
{
  "id": "PRISM-2026-001",
  "status": "APROVADO",
  "ultimaAtualizacao": "2026-05-24T10:00:00Z"
}
```

Exemplo de consulta por lote:

```bash
curl http://localhost:8080/api/inscricoes/lotes/ING-TEST-20260531-0001
```

Campos esperados no retorno do lote:

- `loteImportacao`
- `statusLote`
- `checksumArquivo`
- `totalLinhas`
- `linhasValidas`
- `linhasInvalidas`
- `registrosInseridos`
- `registrosAtualizados`
- `iniciadoEm`
- `finalizadoEm`

## Testes Recomendados

### Teste de integração

Valida a API com banco intermediário populado por seed controlado:

```bash
npm run test:integration -- tests/integration/dev-server.integration.test.js
```

Cobertura principal:

- `GET /api/inscricoes/{id}` retorna payload normalizado.
- `GET /api/inscricoes/{id}` responde `404` para inscrição inexistente.
- `GET /api/inscricoes/lotes/{loteImportacao}` retorna métricas do lote.

### Teste de contrato

Valida o contrato OpenAPI da API de inscrições normalizadas:

```bash
npm run test:contract -- tests/contract/inscricoes-openapi.contract.test.js
```

O teste verifica:

- versão do OpenAPI.
- path `/api/inscricoes/{id}`.
- payload 200 conforme schema.
- payload 404 conforme schema de erro.

### Suíte completa de contratos

```bash
npm run test:contract
```

## Boas Práticas Operacionais

- Não consultar diretamente a planilha na requisição da API.
- Tratar o CSV como origem assíncrona, nunca como fonte de leitura online.
- Manter os dados pessoais sensíveis minimizados e criptografados no banco intermediário.
- Usar `loteImportacao` e `checksumArquivo` para auditoria e idempotência.
- Registrar erros de parsing e divergências em `ingest_batch_errors`.

## Referências

- [docs/api.md](api.md)
- [docs/arquitetura.md](arquitetura.md)
- [contracts/openapi/inscricoes.v1.0.0.openapi.json](../contracts/openapi/inscricoes.v1.0.0.openapi.json)
- [tests/integration/dev-server.integration.test.js](../tests/integration/dev-server.integration.test.js)
- [tests/contract/inscricoes-openapi.contract.test.js](../tests/contract/inscricoes-openapi.contract.test.js)
