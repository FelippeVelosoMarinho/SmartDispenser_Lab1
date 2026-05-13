# Módulo — Banco de dados (PostgreSQL)

## Papel

Armazena identidades (usuários/cuidadores/pacientes), hierarquia de hardware (dispensers, gavetas, slots), medicamentos, agendas, logs de dispensação e histórico de reabastecimento.

## Inicialização

O arquivo **`database/init.sql`** é montado em:

`/docker-entrypoint-initdb.d/init.sql`

no container **PostgreSQL** apenas na **primeira criação** do volume persistente. Reinícios posteriores não reaplicam o script automaticamente.

## Compose

| Campo | Valor |
|-------|-------|
| Serviço | `db` |
| Imagem | `postgres:16-alpine` |
| Usuário | `user` |
| Senha | `password` |
| Banco | `smart_dispenser` |
| Porta no host | **5433** → 5432 no container |

Volume nomeado: `postgres_data`.

## Backend

O backend usa **`DATABASE_URL`** apontando para o hostname **`db`** na rede Compose (`postgresql://user:password@db:5432/smart_dispenser`).

Além do SQL inicial, o **SQLAlchemy** (`Base.metadata.create_all` em `app/main.py`) cria/atualiza tabelas conforme os modelos Python na primeira subida — mantenha `init.sql` e modelos alinhados em evoluções futuras.

## Integração

Visão de sistema: [`INTEGRACAO.md`](INTEGRACAO.md).
