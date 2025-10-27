# Solução para Erro de Build - npm ci

## Problema
```
npm error The npm ci command can only install with an existing package-lock.json
```

## Solução Aplicada

### 1. Atualização do Dockerfile
Mudado de `npm ci` para `npm install --omit=dev`:
- ✅ Funciona com ou sem `package-lock.json`
- ✅ Mais flexível para diferentes ambientes
- ✅ Mesma funcionalidade (instala apenas dependências de produção)

### 2. Criação de .dockerignore na Raiz
Adicionado `.dockerignore` na raiz do projeto para garantir que arquivos necessários sejam copiados:
- ✅ package.json
- ✅ package-lock.json
- ✅ src/
- ✅ Certificados, data, etc.

## Como Executar

```bash
# Ir para a pasta infra
cd infra

# Limpar builds anteriores (opcional)
sudo docker compose down
sudo docker system prune -f

# Construir novamente
sudo docker compose up -d --build

# Ver logs
sudo docker compose logs -f
```

## Verificação

Se ainda houver problemas, verificar:

### 1. Confirmar que package-lock.json existe
```bash
ls -la /var/www/KROMI_FINAL/package-lock.json
```

### 2. Ver logs detalhados
```bash
sudo docker compose logs visionkrono
```

### 3. Verificar contexto do build
```bash
# Dentro da pasta infra
ls ..
```

## Alternativa: Gerar package-lock.json

Se o `package-lock.json` não existir ou estiver corrompido:

```bash
cd /var/www/KROMI_FINAL
npm install --package-lock-only
```

Isso gera um novo `package-lock.json` atualizado.

## Comandos Úteis

```bash
# Ver status dos containers
sudo docker compose ps

# Reconstruir do zero
sudo docker compose down -v
sudo docker compose up -d --build

# Limpar tudo e recomeçar
sudo docker system prune -a -f
sudo docker compose up -d --build
```

## Mudanças Aplicadas

1. ✅ Dockerfile usa `npm install` em vez de `npm ci`
2. ✅ `.dockerignore` simplificado na raiz
3. ✅ Verificação de `package-lock.json` removida (npm install funciona sem ele)

