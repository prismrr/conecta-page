# Backend

Camada backend do projeto Conecta PrismRR.

## Estrutura
- [backend/api](./api)
  - aplicação FastAPI, routers e serviços
- [backend/jobs](./jobs)
  - rotinas operacionais e de compliance

## Entrypoints canonicos
- Servidor local: [backend/fastapi_server.py](./fastapi_server.py)
- Retencao LGPD: [backend/jobs/retention_job.py](./jobs/retention_job.py)
- Incident drill: [backend/jobs/incident_drill.py](./jobs/incident_drill.py)

## Migracao FastAPI
- Novo app FastAPI em [backend/api/main.py](./api/main.py), com routers tipados, Pydantic v2 e Depends.
- Entry point local experimental: `python3 backend/fastapi_server.py --port 8080`.
- O container de desenvolvimento agora sobe a API FastAPI em `http://localhost:8080` via `bash scripts/dev_docker.sh up`.
- O runtime principal legado foi removido; os wrappers e o modo de comparacao foram descontinuados.
