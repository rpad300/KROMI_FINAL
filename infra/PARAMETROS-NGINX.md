# Parâmetros Nginx - Guia Visual

## 📋 Índice de Parâmetros

### 1. Rate Limiting (Limitação de Taxa)
### 2. SSL/TLS
### 3. Security Headers
### 4. Compression
### 5. Cache
### 6. Proxy Settings
### 7. WebSocket
### 8. Timeouts

---

## 1️⃣ Rate Limiting

### Configuração Global
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static:10m rate=30r/s;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `$binary_remote_addr` | IP do cliente | Variável nginx (formato binário, mais eficiente) |
| `zone=api` | Nome da zona | Identificador para a zona de rate limiting |
| `10m` | 10 megabytes | Tamanho da memória alocada para a zona |
| `rate=10r/s` | 10 req/s | Máximo 10 requisições por segundo |

### Uso em Location
```nginx
location /api/ {
    limit_req zone=api burst=5 nodelay;
}
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `zone=api` | Refere à zona definida | Usa a zona "api" |
| `burst=5` | 5 requisições | Permite até 5 requisições extra além do limite |
| `nodelay` | Sem atraso | Rejeita imediatamente ao exceder |

**Exemplo prático:**
- Limite: 10 req/s
- Burst: 5
- Resultado: Cliente pode fazer até 15 requisições no primeiro segundo, depois volta para 10/s

---

## 2️⃣ SSL/TLS

### Configuração de Certificados
```nginx
ssl_certificate /etc/nginx/certs/cert.pem;
ssl_certificate_key /etc/nginx/certs/key.pem;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `ssl_certificate` | Path do certificado | Certificado SSL público |
| `ssl_certificate_key` | Path da chave | Chave privada do certificado |

### Configuração de Protocolos
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:...;
ssl_prefer_server_ciphers off;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `ssl_protocols` | TLSv1.2, TLSv1.3 | Apenas versões modernas e seguras |
| `ssl_ciphers` | Lista de cifras | Cifras de criptografia permitidas |
| `ssl_prefer_server_ciphers off` | Cliente decide | Cliente escolhe a melhor cifra |

### Configuração de Sessões
```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `shared:SSL:10m` | Cache compartilhado | 10MB de memória compartilhada entre workers |
| `10m` | 10 minutos | Tempo de expiração das sessões SSL |

**Benefício:** Reutilização de sessões SSL melhora performance

---

## 3️⃣ Security Headers

```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

| Header | Valor | Proteção |
|--------|-------|----------|
| `X-Frame-Options: DENY` | Bloqueia iframes | Clickjacking |
| `X-Content-Type-Options: nosniff` | Impede ignorar MIME | MIME sniffing |
| `X-XSS-Protection: 1; mode=block` | Ativa proteção XSS | Cross-Site Scripting |
| `Strict-Transport-Security` | Força HTTPS por 1 ano | HTTP → HTTPS redirect |

**max-age=31536000** = 1 ano em segundos

---

## 4️⃣ Gzip Compression

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `gzip on` | Ativar compressão | Comprime respostas |
| `gzip_vary on` | Header Vary | Adiciona `Vary: Accept-Encoding` |
| `gzip_min_length 1024` | 1KB | Só comprime arquivos > 1KB |
| `gzip_types` | Lista de tipos | Tipos MIME para comprimir |

**Economia típica:** 70-80% de redução em JavaScript/CSS

---

## 5️⃣ Cache Control

```nginx
expires 1y;
add_header Cache-Control "public, immutable";
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `expires 1y` | 1 ano | Browser cache por 1 ano |
| `Cache-Control: public` | Público | Pode ser cacheado por proxies |
| `Cache-Control: immutable` | Imutável | Arquivo nunca muda |

**Uso:** Arquivos estáticos com hash (ex: `app.abc123.js`)

---

## 6️⃣ Proxy Settings

### Headers Básicos
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

| Header | Variável | O que transporta |
|--------|----------|------------------|
| `Host` | `$host` | Hostname original |
| `X-Real-IP` | `$remote_addr` | IP real do cliente |
| `X-Forwarded-For` | `$proxy_add_x_forwarded_for` | Cadeia de proxies |
| `X-Forwarded-Proto` | `$scheme` | Protocolo (http/https) |

### SSL Verification
```nginx
proxy_ssl_verify off;
```

| Valor | Descrição |
|-------|-----------|
| `off` | Desabilita verificação SSL |
| `on` | Verifica certificados (produção) |

**Uso:**
- `off`: Certificados auto-assinados (desenvolvimento)
- `on`: Certificados Let's Encrypt (produção)

### Proxy Pass
```nginx
proxy_pass https://visionkrono;
```

| Valor | Significado |
|-------|-------------|
| `https://visionkrono` | Protocolo HTTPS para o serviço docker-compose |
| `visionkrono` | Nome do serviço no docker-compose |

---

## 7️⃣ WebSocket (Socket.IO)

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `proxy_http_version 1.1` | HTTP/1.1 | Necessário para WebSockets |
| `Upgrade $http_upgrade` | Preserva header | Header de upgrade do cliente |
| `Connection "upgrade"` | Indica upgrade | Conexão deve ser "upgraded" |

**Resultado:** Socket.IO e WebRTC funcionam corretamente

---

## 8️⃣ Timeouts

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

| Parâmetro | Valor | Significado |
|-----------|-------|-------------|
| `proxy_connect_timeout 60s` | 60 segundos | Tempo para conectar ao backend |
| `proxy_send_timeout 60s` | 60 segundos | Tempo para enviar request |
| `proxy_read_timeout 60s` | 60 segundos | Tempo para ler resposta |

**Fluxo de timeout:**
1. Cliente → Nginx: Infinito (via keep-alive)
2. Nginx → Backend: 60s connect, 60s send, 60s read

---

## 📊 Tabela Resumo de Configurações

| Categoria | Parâmetro | Valor | Impacto |
|-----------|-----------|-------|---------|
| **Segurança** | Rate Limit API | 10 req/s | Proteção DDoS |
| **Segurança** | Rate Limit Static | 30 req/s | Servir arquivos estáticos |
| **Segurança** | SSL Protocols | TLS 1.2+ | Protocolos modernos |
| **Segurança** | Security Headers | 4 headers | Múltiplas proteções |
| **Performance** | Gzip | 70% redução | Economia de banda |
| **Performance** | Cache | 1 ano | Reduz requisições |
| **Performance** | Worker Connections | 1024 | Capacidade |
| **Confiabilidade** | Timeouts | 60s | Evita hanging |

---

## 🎯 Fluxo de Requisição

```
1. Cliente faz requisição HTTPS
   ↓
2. Nginx recebe (porta 443)
   ↓
3. Verifica rate limiting
   ↓
4. Aplica SSL termination
   ↓
5. Comprime resposta (se aplicável)
   ↓
6. Adiciona security headers
   ↓
7. Faz proxy para VisionKrono:1144
   ↓
8. VisionKrono processa
   ↓
9. Nginx recebe resposta
   ↓
10. Cache headers (se static)
   ↓
11. Gzip (se aplicável)
   ↓
12. Retorna ao cliente
```

---

## 🔧 Ajustes Comuns

### Aumentar rate limiting para uso interno
```nginx
# De
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
# Para
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;
```

### Reduzir cache para desenvolvimento
```nginx
# De
expires 1y;
# Para
expires 0;
```

### Aumentar timeouts para operações longas
```nginx
# De
proxy_read_timeout 60s;
# Para
proxy_read_timeout 300s;  # 5 minutos
```

### Habilitar verificação SSL em produção
```nginx
# De
proxy_ssl_verify off;
# Para
proxy_ssl_verify on;
```

---

## 📚 Recursos Adicionais

- **Documentação completa:** `infra/README.md`
- **Guia de reestruturação:** `infra/RESTRUTURACAO-DOCKER.md`
- **Nginx Docs:** https://nginx.org/en/docs/
- **SSL Labs Test:** https://www.ssllabs.com/ssltest/

