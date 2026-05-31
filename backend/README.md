# Backend

Camada backend do projeto Conecta PrismRR.

## Estrutura
- [backend/server](./server)
  - servidor HTTP local e endpoints de API
- [backend/jobs](./jobs)
  - rotinas operacionais e de compliance

## Entrypoints canonicos
- Servidor local: [backend/server/dev_server.py](./server/dev_server.py)
- Retencao LGPD: [backend/jobs/retention_job.py](./jobs/retention_job.py)
- Incident drill: [backend/jobs/incident_drill.py](./jobs/incident_drill.py)

## Compatibilidade
Os caminhos antigos em [scripts/dev_server.py](../scripts/dev_server.py), [scripts/retention_job.py](../scripts/retention_job.py) e [scripts/incident_drill.py](../scripts/incident_drill.py) foram mantidos como wrappers para evitar quebra em CI, scripts npm e automacoes existentes.

## Migracao FastAPI
- Novo app FastAPI em [backend/api/main.py](./api/main.py), com routers tipados, Pydantic v2 e Depends.
- Entry point local experimental: `python3 backend/fastapi_server.py --port 8080`.
- O container de desenvolvimento agora sobe a API FastAPI em `http://localhost:8080` via `bash scripts/dev_docker.sh up`.
- O servidor legado em [backend/server/dev_server.py](./server/dev_server.py) continua ativo enquanto a paridade de contratos nao for concluida.
