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
