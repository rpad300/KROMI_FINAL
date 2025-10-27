# Reestruturação Docker & Nginx - VisionKrono

## Resumo das Alterações

### 1. Docker Compose (`docker-compose.yml`)

**Mudanças principais:**
- ✅ Adicionado serviço `nginx` como reverse proxy
- ✅ Build context ajustado: `context: ..` e `dockerfile: infra/Dockerfile`
- ✅ Volumes ajustados: caminhos relativos corretos (`../certs`, `../data`, `../logs`)
- ✅ Adicionado volume para certificados do nginx

**Estrutura:**
```yaml
services:
  visionkrono:  # Aplicação Node.js
    build:
      context: ..          # Constrói a partir da raiz do projeto
      dockerfile: infra/Dockerfile
    ports:
      - "1144:1144"        # HTTPS direto (sem nginx)
    volumes:
      - ../certs:/app/certs
      - ../data:/app/data
      - ../logs:/app/logs

  nginx:         # Reverse Proxy
    image: nginx:alpine
    ports:
      - "80:80"             # HTTP (redireciona para HTTPS)
      - "443:443"           # HTTPS público
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ../certs:/etc/nginx/certs:ro
    depends_on:
      - visionkrono
```

### 2. Dockerfile

**Melhorias:**
- ✅ Cria diretórios necessários: `certs`, `data`, `logs`, `src/certs`
- ✅ Gera certificados SSL automaticamente se não existirem
- ✅ Copia certificados para `src/certs/` (compatibilidade)
- ✅ Usuário não-root (`visionkrono`)

**Processo de build:**
```bash
1. Copia package.json e instala dependências
2. Copia todo o código
3. Cria diretórios necessários
4. Gera certificados SSL (se não existirem)
5. Cria usuário não-root
6. Troca para usuário não-root
7. Expõe porta 1144
8. Inicia aplicação com npm start
```

### 3. Nginx Configuration (`nginx.conf`)

**Principais configurações:**

#### A. SSL Termination
Nginx gerencia SSL na porta 443, comunica-se com a aplicação via HTTPS na porta 1144.

#### B. Rate Limiting (Proteção contra DDoS)
```nginx
# API: máximo 10 requisições por segundo
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Arquivos estáticos: máximo 30 requisições por segundo
limit_req_zone $binary_remote_addr zone=static:10m rate=30r/s;
```

#### C. SSL Security
```nginx
ssl_protocols TLSv1.2 TLSv1.3;  # Apenas versões seguras
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:...;  # Cifras fortes
ssl_session_cache shared:SSL:10m;  # Cache de sessões
```

#### D. Security Headers
```nginx
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

#### E. Gzip Compression
Comprime automaticamente JavaScript, CSS, HTML, JSON para economizar banda.

#### F. Cache Control
Arquivos estáticos: cache de 1 ano
```nginx
expires 1y;
add_header Cache-Control "public, immutable";
```

#### G. WebSocket Support (Socket.IO)
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## Como Usar

### Desenvolvimento Local (sem nginx)
```bash
npm start
# Acesso: https://localhost:1144
```

### Docker com nginx (produção)
```bash
cd infra
docker-compose up -d
# Acesso: https://seu-dominio.com
```

### Ver logs
```bash
# Logs da aplicação
docker-compose logs -f visionkrono

# Logs do nginx
docker-compose logs -f nginx

# Logs de ambos
docker-compose logs -f
```

### Reconstruir após mudanças
```bash
docker-compose up -d --build
```

### Parar serviços
```bash
docker-compose down
```

## Parâmetros Nginx Explicados

### 1. Rate Limiting

**limit_req_zone:**
- `$binary_remote_addr`: IP do cliente (formato binário)
- `zone=api:10m`: Nome da zona e tamanho (10MB)
- `rate=10r/s`: Taxa máxima (10 requests por segundo)

**limit_req:**
- `zone=api`: Usa a zona definida
- `burst=5`: Permite 5 requisições extra além do limite
- `nodelay`: Rejeita imediatamente sem atraso

### 2. SSL Configuration

**ssl_protocols:**
- `TLSv1.2`: Versão TLS mínima aceita
- `TLSv1.3`: Versão TLS mais recente e segura

**ssl_ciphers:**
- Lista de cifras de criptografia permitidas
- Ordem indica preferência
- Apenas cifras fortes (ECDHE, AES-GCM, SHA512)

**ssl_session_cache:**
- `shared:SSL:10m`: Cache compartilhado entre workers
- `10m`: 10 megabytes de memória

**ssl_session_timeout:**
- `10m`: Sessões SSL expiram após 10 minutos

### 3. Security Headers

**X-Frame-Options:**
- `DENY`: Bloqueia iframes (proteção contra clickjacking)

**X-Content-Type-Options:**
- `nosniff`: Impede browsers de ignorar MIME types

**X-XSS-Protection:**
- `1; mode=block`: Ativa proteção XSS no browser

**Strict-Transport-Security:**
- `max-age=31536000`: Força HTTPS por 1 ano
- `includeSubDomains`: Aplica também a subdomínios

### 4. Gzip Compression

**gzip on:**
- Ativa compressão de respostas

**gzip_min_length:**
- `1024`: Só comprime arquivos maiores que 1KB

**gzip_types:**
- Lista de tipos MIME para comprimir
- text/plain, text/css, text/javascript, application/json, etc.

### 5. Proxy Settings

**proxy_pass:**
- `https://visionkrono`: Proxy para a aplicação
- Nome `visionkrono` vem do docker-compose

**proxy_ssl_verify:**
- `off`: Desabilita verificação SSL (para certificados auto-assinados)
- Em produção com Let's Encrypt, usar `on`

**proxy_set_header:**
- `Host $host`: Preserva hostname original
- `X-Real-IP $remote_addr`: IP real do cliente
- `X-Forwarded-For $proxy_add_x_forwarded_for`: Cadeia de proxies
- `X-Forwarded-Proto $scheme`: Protocolo original (http/https)

**proxy_http_version:**
- `1.1`: Necessário para WebSockets

**proxy_set_header Upgrade:**
- `$http_upgrade`: Preserva header de upgrade WebSocket

**proxy_set_header Connection:**
- `upgrade`: Indica conexão de upgrade

### 6. Timeouts

**proxy_connect_timeout:**
- `60s`: Tempo máximo para conectar ao backend

**proxy_send_timeout:**
- `60s`: Tempo máximo para enviar request ao backend

**proxy_read_timeout:**
- `60s`: Tempo máximo para ler resposta do backend

### 7. Cache Control

**expires:**
- `1y`: Arquivos expiram em 1 ano

**add_header Cache-Control:**
- `public, immutable`: Cache público e imutável
- Usado para arquivos estáticos com hash no filename

## Melhores Práticas Implementadas

✅ **Security:**
- TLS 1.2+
- Cifras fortes
- Security headers
- Rate limiting
- HTTPS redirect

✅ **Performance:**
- Gzip compression
- Cache control
- Worker connections otimizado

✅ **Reliability:**
- Health checks
- Graceful shutdown
- Restart policies
- Volume persistence

✅ **Observability:**
- Logs estruturados
- Health monitoring
- Error handling

## Produção - Passos Finais

### 1. Obter certificados Let's Encrypt
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

### 2. Atualizar nginx.conf
Trocar certificados auto-assinados por Let's Encrypt:
```nginx
ssl_certificate /etc/nginx/certs/cert.pem;
# → /etc/letsencrypt/live/yourdomain.com/fullchain.pem

ssl_certificate_key /etc/nginx/certs/key.pem;
# → /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 3. Habilitar verificação SSL
```nginx
proxy_ssl_verify on;  # Em vez de off
```

### 4. Auto-renovação
Adicionar ao crontab:
```bash
0 0 * * * certbot renew --quiet && docker-compose -f infra/docker-compose.yml restart nginx
```

## Troubleshooting

### Problema: Nginx não inicia
```bash
docker-compose logs nginx
# Verificar erros de configuração
docker-compose exec nginx nginx -t
```

### Problema: Certificados não encontrados
```bash
# Gerar certificados
npm run generate-cert
```

### Problema: Aplicação não conecta
```bash
# Verificar logs
docker-compose logs -f visionkrono
# Verificar saúde
docker-compose ps
```

### Problema: Rate limiting muito restritivo
Ajustar em `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;  # Aumentar
```

## Arquitetura Final

```
Internet
    ↓
Nginx (80 → HTTPS redirect, 443 → SSL termination)
    ↓
VisionKrono App (1144, HTTPS interno)
    ↓
- Socket.IO WebSockets
- REST API
- Static files
- Background processors
```

## Referências

- Documentação completa: `infra/README.md`
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- Docker Compose: https://docs.docker.com/compose/

