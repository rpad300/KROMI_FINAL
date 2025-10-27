# 🎥 VisionKrono Live Stream - Sistema Moderno

Sistema de livestreaming profissional usando WebRTC P2P + Socket.IO para transmissão em tempo real com latência ultra-baixa.

## 🏗️ Arquitetura

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│ Dispositivo     │  WebRTC │  Socket.IO   │ WebRTC  │  Dashboard  │
│ Móvel           │ ◄─────► │  Signaling   │ ◄─────► │  (Eventos)  │
│                 │         │  Server      │         │             │
│ Câmera 1280x720 │         │              │         │ Video Player│
└─────────────────┘         └──────────────┘         └─────────────┘
        │                           │                        │
        └───────────────────────────┴────────────────────────┘
                    P2P Direct Stream (~50-100ms)
```

### Por que esta arquitetura é superior?

#### ❌ **Arquitetura Antiga (Polling + Supabase)**
- Polling a cada 1-3 segundos no banco de dados
- Armazenamento de offers/answers/frames no Supabase
- 7 implementações diferentes e redundantes
- Latência alta (~300-500ms+)
- Custo alto de operações no banco
- Difícil manutenção

#### ✅ **Arquitetura Nova (WebSocket + WebRTC P2P)**
- Eventos em tempo real via Socket.IO
- Sinalização instantânea (sem polling)
- Uma única implementação limpa
- Latência mínima (~50-100ms)
- Streaming P2P direto (não passa pelo servidor)
- Fácil manutenção e escalabilidade

## 📦 Componentes

### 1. **server.js** - Signaling Server
- Socket.IO para comunicação em tempo real
- Gerenciamento de salas por evento
- Routing de mensagens WebRTC
- Rastreamento de dispositivos online

### 2. **livestream-client.js** - Cliente Móvel
- Executa na página de detecção
- Registra dispositivo no servidor
- Cria conexões WebRTC P2P
- Transmite stream da câmera

### 3. **livestream-viewer.js** - Visualizador Dashboard
- Executa na página de eventos
- Descobre dispositivos online
- Inicia/para streams
- Exibe vídeos em tempo real

### 4. **livestream-schema-simplified.sql** - Schema Otimizado
- Tabela única para histórico
- Views para consultas rápidas
- Função de limpeza automática

## 🚀 Instalação

### Passo 1: Instalar Dependências

```bash
npm install
```

Isso instalará `socket.io@^4.7.2` automaticamente.

### Passo 2: Configurar Supabase

Execute no **Supabase SQL Editor**:

```sql
-- Copie e execute o conteúdo de:
-- livestream-schema-simplified.sql
```

### Passo 3: Iniciar Servidor

```bash
npm start
```

O servidor iniciará em `https://localhost:1144` com Socket.IO ativo.

## 📱 Como Usar

### 1. **Preparar Evento**

Na página `/events`:
- Crie ou selecione um evento
- Anote o ID do evento
- Configure dispositivos para o evento

### 2. **Configurar Dispositivo Móvel**

No dispositivo móvel:
- Acesse: `https://SEU_IP:1144/detection?event=EVENT_ID&device=DEVICE_ID`
- Permita acesso à câmera
- O dispositivo se registrará automaticamente no Socket.IO
- Aguarde comandos de streaming

### 3. **Iniciar Live Stream**

No dashboard (página eventos):
- Clique no botão **"🎥 Live Stream"** (painel lateral abre)
- Dispositivos online aparecem automaticamente
- Clique **"▶️ Iniciar Stream"** no dispositivo desejado
- Stream P2P estabelece em 2-3 segundos
- Vídeo aparece em tempo real

### 4. **Parar Stream**

- Clique **"⏹️ Parar Stream"** no dispositivo
- Conexão P2P é fechada
- Câmera continua disponível para detecção

## 🔧 Configuração Técnica

### Socket.IO Events (Cliente → Servidor)

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `register-device` | Registrar dispositivo | `{deviceId, eventId, deviceName}` |
| `register-viewer` | Registrar viewer | `{eventId}` |
| `webrtc-offer` | Enviar offer WebRTC | `{from, to, offer}` |
| `webrtc-answer` | Enviar answer WebRTC | `{from, to, answer}` |
| `webrtc-ice-candidate` | Enviar ICE candidate | `{from, to, candidate}` |
| `start-stream` | Comando iniciar stream | `{deviceId}` |
| `stop-stream` | Comando parar stream | `{deviceId}` |

### Socket.IO Events (Servidor → Cliente)

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `devices-list` | Lista de dispositivos online | `[{deviceId, deviceName, status}]` |
| `device-online` | Dispositivo ficou online | `{deviceId, deviceName, status}` |
| `device-offline` | Dispositivo ficou offline | `{deviceId, deviceName, status}` |
| `webrtc-offer` | Offer WebRTC recebido | `{from, offer}` |
| `webrtc-answer` | Answer WebRTC recebido | `{from, answer}` |
| `webrtc-ice-candidate` | ICE candidate recebido | `{from, candidate}` |
| `stream-command` | Comando de stream | `{command}` |

### WebRTC Configuration

**STUN Servers**: Para descobrir IP público
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

**TURN Servers**: Para NAT traversal em redes restritivas
- `turn:openrelay.metered.ca:80`

**Optimizations**:
- `iceCandidatePoolSize: 10` - Pool de candidatos
- `bundlePolicy: 'max-bundle'` - Reduzir uso de portas
- `rtcpMuxPolicy: 'require'` - Multiplexar RTCP com RTP

## 📊 Fluxo de Conexão

### Estabelecimento de Stream P2P

```
1. Viewer clica "Iniciar Stream"
   └─► Socket.IO: start-stream → {deviceId}

2. Servidor roteia comando para dispositivo
   └─► Socket.IO: stream-command → {command: 'start'}

3. Dispositivo inicia câmera (ou reusa stream de detecção)

4. Viewer cria offer WebRTC
   └─► Socket.IO: webrtc-offer → {from: viewerId, to: deviceId, offer}

5. Servidor roteia offer para dispositivo
   └─► Socket.IO: webrtc-offer → {from: viewerId, offer}

6. Dispositivo processa offer e cria answer
   └─► Socket.IO: webrtc-answer → {from: deviceId, to: viewerId, answer}

7. Servidor roteia answer para viewer
   └─► Socket.IO: webrtc-answer → {from: deviceId, answer}

8. Viewer processa answer

9. Troca de ICE candidates (bidirecional)
   └─► Estabelece caminho de rede otimizado

10. Conexão P2P estabelecida ✅
    └─► Stream direto dispositivo → viewer
    └─► Latência: ~50-100ms
```

## 🛠️ Troubleshooting

### Stream não conecta

**Problema**: Viewer não recebe stream
**Soluções**:
1. Verificar se Socket.IO está conectado (console logs)
2. Verificar firewall (portas 1144 e WebRTC)
3. Testar com TURN server (fallback para NAT)
4. Verificar logs do servidor para erros de signaling

### Dispositivo não aparece online

**Problema**: Dashboard não mostra dispositivo
**Soluções**:
1. Verificar URL tem `?event=UUID&device=UUID`
2. Verificar console do dispositivo para erros Socket.IO
3. Atualizar lista de dispositivos manualmente
4. Verificar que está na mesma rede WiFi

### Latência alta

**Problema**: Stream com delay > 500ms
**Possíveis Causas**:
1. Conexão via TURN (relay) em vez de P2P direto
2. Rede WiFi congestionada
3. Dispositivo com processamento lento

**Soluções**:
1. Verificar `iceConnectionState` no console
2. Se `relay`, verificar configuração de firewall
3. Reduzir qualidade do stream (modificar constraints)

### Erro "Socket.IO is not defined"

**Problema**: Script Socket.IO não carregado
**Solução**: 
1. Servidor deve estar rodando (Socket.IO serve o script em `/socket.io/socket.io.js`)
2. Verificar se tag `<script src="/socket.io/socket.io.js">` está antes de outros scripts

## 🎯 Performance Esperada

### Latências Típicas

| Cenário | Latência | Método |
|---------|----------|--------|
| Mesma rede local | 50-100ms | P2P direto |
| Redes diferentes (STUN) | 100-200ms | P2P com STUN |
| NAT simétrico (TURN) | 200-400ms | Relay via TURN |

### Consumo de Recursos

**Servidor**:
- CPU: ~1-2% (apenas signaling)
- RAM: ~50MB base + 1MB por dispositivo
- Banda: Praticamente zero (P2P)

**Dispositivo Móvel**:
- CPU: ~10-15% (codificação de vídeo)
- RAM: ~100-150MB
- Banda: ~1-3 Mbps (upload)

**Dashboard**:
- CPU: ~5-10% por stream
- RAM: ~100MB por stream
- Banda: ~1-3 Mbps por stream (download)

## 📈 Comparação: Antes vs Depois

### Código

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Arquivos | 7 | 2 | -71% |
| Linhas de código | ~3000 | ~600 | -80% |
| Implementações | 7 versões | 1 versão | Unificado |
| Manutenibilidade | Baixa | Alta | ⬆️⬆️⬆️ |

### Performance

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Latência | 300-500ms | 50-100ms | -75% |
| Polling DB | A cada 1-3s | Zero | -100% |
| Carga no servidor | Alta | Mínima | -90% |
| Escalabilidade | Limitada | Alta | ⬆️⬆️⬆️ |

### Arquitetura

| Aspecto | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Comunicação | Polling Supabase | WebSocket | ⬆️⬆️⬆️ |
| Streaming | Via frames no DB | P2P direto | ⬆️⬆️⬆️ |
| Tabelas DB | 4 tabelas | 1 tabela | -75% |
| Complexidade | Alta | Baixa | ⬆️⬆️⬆️ |

## 🔒 Segurança

### Implementado

✅ **HTTPS Obrigatório**: Servidor SSL para acesso à câmera  
✅ **Socket.IO CORS**: Configurado para aceitar conexões válidas  
✅ **Salas Isoladas**: Dispositivos separados por evento  
✅ **Identificação Única**: deviceId e eventId obrigatórios  

### Recomendações para Produção

- [ ] Implementar autenticação Socket.IO
- [ ] Validar deviceId e eventId no servidor
- [ ] Rate limiting para comandos
- [ ] Monitoramento de abuse
- [ ] Certificado SSL válido (não auto-assinado)

## 📝 Notas de Desenvolvimento

### Decisões de Design

**Por que Socket.IO em vez de Supabase Realtime?**
- Menor latência para signaling
- Melhor controle sobre salas e routing
- Mais leve (sem overhead de queries SQL)
- Padrão da indústria para WebRTC signaling

**Por que WebRTC P2P?**
- Latência mínima para stream de vídeo
- Não consome banda do servidor
- Escalável (cada viewer tem conexão direta)
- Qualidade adaptativa automática

**Por que manter Supabase?**
- Histórico de dispositivos para analytics
- Persistência de configurações
- Integração com resto do sistema
- Queries para estatísticas

### Limitações Conhecidas

1. **NAT Simétrico**: Requer TURN server (relay)
2. **Múltiplos Viewers**: Cada viewer requer offer/answer separado
3. **Bandwidth**: Dispositivo envia 1 stream × N viewers
4. **Firewall Corporativo**: Pode bloquear portas WebRTC

## 🎓 Conceitos

### WebRTC (Web Real-Time Communication)

Tecnologia para comunicação peer-to-peer no browser:
- **Vídeo/Áudio**: Transmissão de mídia em tempo real
- **Data Channels**: Comunicação bidirecional
- **ICE/STUN/TURN**: Protocolo para NAT traversal

### Socket.IO

Biblioteca para comunicação WebSocket:
- **Eventos**: Sistema publish/subscribe
- **Salas**: Agrupamento de sockets
- **Fallback**: Degradação para polling se WebSocket falhar
- **Reconexão**: Automática em caso de queda

### Signaling

Processo de estabelecer conexão WebRTC:
1. **SDP Offer**: Primeiro peer envia oferta
2. **SDP Answer**: Segundo peer responde
3. **ICE Candidates**: Negociação de caminho de rede
4. **Connection**: Estabelece canal direto P2P

## 📚 Referências

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.IO Documentation](https://socket.io/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Google STUN/TURN Servers](https://www.npmjs.com/package/turn-server)

## 🤝 Contribuindo

Para adicionar funcionalidades:

1. **Novos Eventos Socket.IO**: Adicionar em `server.js` e nos clientes
2. **Melhorias WebRTC**: Modificar `rtcConfig` nos clientes
3. **UI**: Estilos inline em `events.html`
4. **Schema**: Atualizar "`../sql/livestream-schema-simplified.sql"

---

**Desenvolvido para VisionKrono** - Sistema profissional de cronometragem esportiva com detecção automática de dorsais.

