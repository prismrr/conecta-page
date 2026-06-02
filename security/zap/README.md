# OWASP ZAP API Scan

Este diretório contém o baseline de escaneamento automatizado de segurança para APIs.

## Pré-requisitos

- Docker instalado e disponível no PATH.
- API alvo acessível no ambiente de execução.
- Contrato OpenAPI versionado em `contracts/openapi`.

## Execução local

1. Inicie a API alvo (exemplo local em `http://127.0.0.1:8080`).
2. Execute:

`bash scripts/zap_api_scan.sh`

## Variáveis suportadas

- `OPENAPI_FILE`: caminho para o contrato OpenAPI alvo.
- `TARGET_URL`: URL base da API alvo.
- `REPORT_DIR`: diretório de saída dos relatórios.
- `FAIL_ON_WARN`: quando `true`, trata warnings como falha.

## Gate recomendado no pipeline

- Bloquear deploy para qualquer finding `High` ou `Medium` não aceito formalmente.
- Nunca permitir finding `Critical` em release candidate.
- Publicar relatório HTML, JSON e XML como artefato de auditoria.
