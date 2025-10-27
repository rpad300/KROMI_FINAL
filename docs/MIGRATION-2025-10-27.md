# Migração de Estrutura 2025-10-27

## Resumo
Reorganização do projeto por tipo de artefacto. Atualização de referências internas. Sem alterações funcionais.

## Alterações principais
- *.md → docs/
- *.sql → sql/
- Código solto → src/
- Configuração → config/
- Notebooks → notebooks/
- IaC e pipelines → infra/

## Antes e depois

### Estrutura de Pastas
**Antes:**
```
.project-root/
  ├── *.md (207 ficheiros na raiz e subpastas)
  ├── *.sql (122 ficheiros na raiz e subpastas)
  ├── *.html (ficheiros de interface)
  ├── *.js (ficheiros de lógica)
  ├── *.css (estilos)
  └── docs/ (já existia com alguns ficheiros)
```

**Depois:**
```
.project-root/
  ├── docs/          # Toda a documentação Markdown
  ├── sql/           # Scripts SQL e migrações
  ├── src/           # Código fonte (HTML, JS, CSS)
  ├── config/        # Configurações (YAML, JSON, etc)
  ├── scripts/       # Utilitários e scripts de automação
  ├── infra/         # Infraestrutura (Docker, etc)
  ├── tests/         # Testes
  ├── data/          # Dados de exemplo
  ├── notebooks/     # Notebooks Jupyter
  └── README.md      # Mantém-se na raiz
```

### Exemplos de Referências Atualizadas
- Ficheiros em `src/` que liam SQL: `./query.sql` → `../sql/query.sql`
- Links em Markdown: `[Setup](setup.md)` → `[Setup](docs/setup.md)`
- Imports relativos atualizados conforme nova estrutura

## Estatísticas

### Ficheiros Movidos
- Documentação Markdown: **209 ficheiros** → `docs/`
- Scripts SQL: **122 ficheiros** → `sql/`
- Código fonte (HTML/JS/CSS): **115 ficheiros** → `src/`
- Scripts PowerShell/Bash: **7 ficheiros** → `scripts/`
- Ficheiros de infraestrutura: **4 ficheiros** → `infra/` (Docker, nginx, docker-compose)
- Total: **457 ficheiros reorganizados**

### Ficheiros Não Movidos
- `README.md` - mantido na raiz
- Ficheiros em `node_modules/` - ignorados
- Ficheiros em `.git/` - ignorados
- Ficheiros CI/CD - mantidos nas suas pastas

## Impacto
- Zero impacto funcional esperado.
- Ganho de clareza e navegabilidade.
- Melhor organização para onboarding de novos desenvolvedores.
- Estrutura alinhada com boas práticas de projetos profissionais.

## Validação
- Build e testes a passar após migração.
- Pesquisa por referências antigas sem resultados.
- Git history preservado através do uso de `git mv`.

## Reverter
Se necessário reverter esta migração:
```bash
git revert <commit-hash>
```

Ou reverter os commits individuais na ordem inversa:
```bash
git revert <commit-docs>
git revert <commit-paths>
git revert <commit-move>
git revert <commit-folders>
```

## Riscos Mitigados
- ✅ Perda de histórico Git - Mitigado com `git mv`
- ✅ Quebra de referências - Mitigado com script de reescrita automática
- ✅ Build quebrado - Validação pós-migração
- ✅ Testes falhando - Verificação completa após mudanças

## Próximos Passos
1. Monitorizar builds nos próximos dias
2. Atualizar documentação de onboarding com nova estrutura
3. Comunicar equipa sobre nova organização

