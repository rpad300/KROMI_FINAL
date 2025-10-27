# VisionKrono - Docker & Nginx Configuration

## Estrutura

```
visionkrono/
├── infra/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   └── README.md (este arquivo)
├── src/
│   └── server.js
├── certs/
└── ...
```

## Docker Compose

### Serviços

1. **visionkrono**: Aplicação Node.js
2. **nginx**: Reverse proxy com SSL termination

### Como usar

```bash
# Construir e iniciar
cd infra
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down

# Reconstruir após alterações
docker-compose up -d --build
```

### Portas

- **80**: HTTP → redireciona para HTTPS (nginx)
- **443**: HTTPS (nginx)
- **1144**: HTTPS (aplicação diretamente, sem nginx)

## Nginx Configuration

### Conceitos Principais

#### 1. Upstream
```
upstream visionkrono {
    server visionkrono:1144;
}
```
- Define o servidor backend (aplicação Node.js)
- Nome `visionkrono` corresponde ao nome do serviço no docker-compose
- Comunicação interna via HTTPS (aplicação requer SSL para acesso à câmera)

#### 2. Rate Limiting (Limitação de Taxa)
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static:10m rate=30r/s;
```
**Parâmetros:**
- `$binary_remote_addr`: IP do cliente (em formato binário, mais eficiente)
- `zone=api:10m`: Cria zona "api" com 10MB de memória
- `zone=static:10m`: Cria zona "static" com 10MB de memória
- `rate=10r/s`: Máximo 10 requisições por segundo
- `rate=30r/s`: Máximo 30 requisições por segundo para arquivos estáticos

**Uso:**
```nginx
location /api/ {
    limit_req zone=api burst=5 nodelay;
    # burst=5: permite até 5 requisições extra além do limite
    # nodelay: sem atraso, rejeita imediatamente se exceder
}
```

#### 3. SSL Configuration
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:...;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```
**Parâmetros:**
- `ssl_protocols`: Versões TLS permitidas (apenas modernas)
- `ssl_ciphers`: Cifras de criptografia permitidas (prioriza segurança)
- `ssl_prefer_server_ciphers off`: Cliente escolhe a melhor cifra
- `ssl_session_cache shared:SSL:10m`: Cache de sessões SSL (10MB compartilhado entre workers)
- `ssl_session_timeout 10m`: Sessões SSL expiram após 10 minutos

#### 4. Security Headers
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```
**Parâmetros:**
- `X-Frame-Options DENY`: Bloqueia iframe (proteção clickjacking)
- `X-Content-Type-Options nosniff`: Impede browsers de ignorar MIME types
- `X-XSS-Protection`: Ativa proteção XSS no browser
- `Strict-Transport-Security`: Força HTTPS por 1 ano (max-age=31536000 segundos)
- `includeSubDomains`: Aplica a subdomínios também
- `always`: Adiciona header mesmo em respostas de erro

#### 5. Gzip Compression
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript ...;
```
**Parâmetros:**
- `gzip on`: Ativa compressão
- `gzip_vary on`: Adiciona header `Vary: Accept-Encoding`
- `gzip_min_length 1024`: Só comprime arquivos com mais de 1KB
- `gzip_types`: Lista de tipos MIME para comprimir

#### 6. Proxy Headers
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```
**Parâmetros:**
- `Host $host`: Preserva o hostname original
- `X-Real-IP $remote_addr`: IP real do cliente
- `X-Forwarded-For`: Cadeia de proxies (para logging)
- `X-Forwarded-Proto`: Protocolo original (http ou https)
- `proxy_ssl_verify off`: Desabilita verificação SSL (para certificados auto-assinados)

#### 7. WebSocket Support (Socket.IO)
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```
**Parâmetros:**
- `proxy_http_version 1.1`: HTTP/1.1 é necessário para WebSockets
- `Upgrade $http_upgrade`: Preserva header de upgrade
- `Connection "upgrade"`: Indica conexão de upgrade (WebSocket)

#### 8. Cache Control
```nginx
expires 1y;
add_header Cache-Control "public, immutable";
```
**Parâmetros:**
- `expires 1y`: Arquivos expiram em 1 ano
- `Cache-Control "public, immutable"`: Cache público e imutável (para recursos estáticos com hash no filename)

#### 9. Timeouts
```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```
**Parâmetros:**
- `proxy_connect_timeout`: Tempo máximo para conectar ao backend
- `proxy_send_timeout`: Tempo máximo para enviar request ao backend
- `proxy_read_timeout`: Tempo máximo para ler resposta do backend

### Locations (Rotas)

#### Static Files (Arquivos Estáticos)
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    limit_req zone=static burst=20 nodelay;
    proxy_pass https://visionkrono;
    proxy_ssl_verify off;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
- Matches arquivos por extensão (`~*` = regex case-insensitive)
- Rate limit: 30 req/s com burst de 20
- Cache longo: 1 ano com "immutable"

#### API Routes
```nginx
location /api/ {
    limit_req zone=api burst=5 nodelay;
    proxy_pass https://visionkrono;
    proxy_ssl_verify off;
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
- Rate limit mais restritivo: 10 req/s com burst de 5
- Suporta WebSockets para comunicação em tempo real

#### Socket.IO
```nginx
location /socket.io/ {
    proxy_pass https://visionkrono;
    proxy_ssl_verify off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
- Rotas Socket.IO não têm rate limiting (conexão persistente)
- Upgrade para WebSocket

#### All Other Requests
```nginx
location / {
    proxy_pass https://visionkrono;
    proxy_ssl_verify off;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```
- Catch-all para todas as outras rotas
- Timeouts configurados

## HTTPS Redirect

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```
- Redireciona todo HTTP (porta 80) para HTTPS (porta 443)
- Status code 301 (redirecionamento permanente)

## Produção: Configurar Certificados Reais

### 1. Obter certificados Let's Encrypt
```bash
# Instalar certbot
sudo apt-get install certbot

# Obter certificado
sudo certbot certonly --standalone -d yourdomain.com
```

### 2. Atualizar nginx.conf
```nginx
# Substituir paths no nginx.conf
ssl_certificate /etc/nginx/certs/cert.pem;  # → /etc/letsencrypt/live/yourdomain.com/fullchain.pem
ssl_certificate_key /etc/nginx/certs/key.pem;  # → /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Adicionar verificação SSL
proxy_ssl_verify on;
```

### 3. Atualizar docker-compose.yml
```yaml
volumes:
  - ../certs:/etc/nginx/certs:ro
# Adicionar:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 4. Atualizar certificados automaticamente
```bash
# Adicionar ao crontab (renovar a cada 60 dias)
0 0 * * * certbot renew --quiet && docker-compose -f infra/docker-compose.yml restart nginx
```

## Troubleshooting

### Ver logs do nginx
```bash
docker-compose logs nginx
```

### Testar configuração nginx
```bash
docker-compose exec nginx nginx -t
```

### Acessar nginx container
```bash
docker-compose exec nginx sh
```

### Verificar certificados
```bash
# Dentro do container
openssl x509 -in /app/certs/cert.pem -text -noout
```

## Resumo das Configurações

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| Rate Limit API | 10 req/s | Proteção contra abuso |
| Rate Limit Static | 30 req/s | Arquivos estáticos |
| SSL Protocols | TLSv1.2, TLSv1.3 | Apenas versões seguras |
| Cache Static | 1 ano | Performance |
| Timeout Connect | 60s | Conexão ao backend |
| Timeout Send | 60s | Envio de dados |
| Timeout Read | 60s | Leitura de resposta |
| Worker Connections | 1024 | Conexões simultâneas |

## Arquitetura

```
Internet → Nginx (443, SSL termination) → VisionKrono App (1144, HTTPS)
                 ↓
            Certificados SSL
            Rate Limiting
            Compression
            Security Headers
```

## Referências

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Docker Compose](https://docs.docker.com/compose/)

