# Regras do Projeto

## Estrutura
- `docs/` para toda a documentação.
- `../sql/` para scripts SQL e migrações.
- `src/` para código.
- `tests/` para testes.
- `config/` para configuração.
- `infra/` para IaC e pipelines.
- `scripts/` para utilitários.
- `notebooks/` para notebooks Jupyter.
- `data/` para dados de exemplo e fixtures.

## Convenções
- Nomes de ficheiros em minúsculas com hífen ou snake case.
- Uma responsabilidade por ficheiro.
- Funções puras quando possível.
- SQL parametrizado e versionado.

## Paths e I/O
- Código só referencia SQL via `../sql/...` a partir de `src/`.
- Documentação referencia Markdown via `docs/...`.
- Proibir caminhos absolutos fora do repositório.

## Qualidade
- Lint obrigatório antes de commit.
- Testes unitários com cobertura mínima de 80%.
- Revisão de código com 2 olhos.

## Commits
- Prefixos: feat, fix, refactor, chore, docs, test.
- Um tema por commit.
- Mensagem curta e clara.

## Documentação
- Atualizar `README.md` quando a estrutura mudar.
- Adotar ADRs curtas para decisões relevantes.

## Segurança
- Nunca commitar segredos.
- Usar ficheiros `.env` locais ignorados no git.

## Releases
- Changelog por versão.
- Tag semântica.

