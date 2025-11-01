# VisionKrono - Checklist de Testes GPS Tracking

## 1. Testes de Schema e Database

### 1.1. Criação de Tabelas
- [ ] Executar `sql/track_module_schema.sql` sem erros
- [ ] Verificar todas as tabelas foram criadas:
  - [ ] `track_routes`
  - [ ] `track_participant_qr`
  - [ ] `track_activities`
  - [ ] `track_gps_live`
  - [ ] `track_device_session`
  - [ ] `track_checks`
  - [ ] `track_activity_checkpass`
  - [ ] `track_audit_log`
- [ ] Verificar índices foram criados corretamente
- [ ] Verificar constraints estão ativas
- [ ] Verificar triggers foram criados

### 1.2. RLS Policies
- [ ] Executar `sql/track_module_rls.sql` sem erros
- [ ] RLS habilitado em todas as tabelas
- [ ] Policies criadas para cada role (admin, staff, organizer, participant, public)
- [ ] Testar isolamento entre eventos diferentes
- [ ] Testar isolamento entre participantes

### 1.3. Funções e RPCs
- [ ] Executar `sql/track_module_functions.sql` sem erros
- [ ] Todas as funções compilam sem erros
- [ ] Funções auxiliares de RLS funcionam

### 1.4. Seeds e Views
- [ ] Executar `sql/track_module_seeds.sql` sem erros
- [ ] Dados de demonstração criados
- [ ] Views auxiliares funcionam:
  - [ ] `v_track_activities_summary`
  - [ ] `v_track_active_qrs`
  - [ ] `v_track_route_stats`

---

## 2. Testes Funcionais (RPCs)

### 2.1. Emissão de QR (`track_issue_qr`)

**Setup:**
- Evento válido criado
- Participante válido inscrito no evento

**Testes:**
- [ ] ✅ Emitir primeiro QR para participante
  - [ ] QR retornado no formato correto
  - [ ] QR marcado como `active`
  - [ ] Registro em `track_audit_log`
  
- [ ] ✅ Reemitir QR (deve revogar anterior)
  - [ ] Novo QR criado
  - [ ] QR anterior marcado como `revoked`
  - [ ] `revoked_at` e `revoked_by` preenchidos
  - [ ] Retorna `revoked_previous: true`
  
- [ ] ❌ Emitir QR para evento inexistente
  - [ ] Erro: "Event not found"
  
- [ ] ❌ Emitir QR para participante de outro evento
  - [ ] Erro: "Participant does not belong to event"
  
- [ ] 🔒 Permissões
  - [ ] Admin pode emitir
  - [ ] Staff pode emitir
  - [ ] Organizador do evento pode emitir
  - [ ] Organizador de outro evento NÃO pode emitir
  - [ ] Participante NÃO pode emitir para si mesmo

---

### 2.2. Validação de QR (`track_validate_qr`)

**Setup:**
- QR ativo emitido

**Testes:**
- [ ] ✅ Validar QR ativo
  - [ ] Retorna `valid: true`
  - [ ] Dados do evento corretos
  - [ ] Dados do participante corretos
  
- [ ] ❌ Validar QR inexistente
  - [ ] Retorna `valid: false`
  - [ ] `error: "QR code not found"`
  
- [ ] ❌ Validar QR revogado
  - [ ] Retorna `valid: false`
  - [ ] `error: "QR code has been revoked"`

---

### 2.3. Armar Atividade (`track_arm_activity`)

**Setup:**
- QR ativo
- Rota ativa criada para o evento

**Testes:**
- [ ] ✅ Armar atividade com QR e rota válidos
  - [ ] Atividade criada com `status = 'armed'`
  - [ ] `activity_id` retornado
  - [ ] Registro em `track_audit_log`
  
- [ ] ❌ Armar com QR inexistente
  - [ ] Erro: "QR code not found"
  
- [ ] ❌ Armar com QR revogado
  - [ ] Erro: "QR code is not active"
  
- [ ] ❌ Armar com rota de outro evento
  - [ ] Erro: "Route does not belong to the same event"
  
- [ ] ❌ Armar quando participante já tem atividade ativa
  - [ ] Erro: "Participant already has an active activity"
  - [ ] Mensagem inclui ID da atividade existente
  
- [ ] ✅ Armar após finalizar atividade anterior
  - [ ] Permitido (anterior está `finished`)
  
- [ ] 🔒 Permissões
  - [ ] Admin pode armar
  - [ ] Staff pode armar
  - [ ] Organizador do evento pode armar
  - [ ] Participante NÃO pode armar diretamente

---

### 2.4. Submeter Batch GPS (`track_submit_gps_batch`)

**Setup:**
- Atividade armada
- Participante autenticado (dono da atividade)

**Testes:**

#### Primeiro Batch (armed → running)
- [ ] ✅ Enviar primeiro batch de pontos válidos
  - [ ] Pontos inseridos em `track_gps_live`
  - [ ] Status muda de `armed` para `running`
  - [ ] `start_time` preenchido
  - [ ] Retorna `first_batch: true`
  - [ ] Audit log registrado
  
#### Batches Subsequentes
- [ ] ✅ Enviar batch com pontos válidos
  - [ ] Todos os pontos inseridos
  - [ ] `is_valid = true`
  - [ ] Contadores atualizados em `track_activities`
  
- [ ] ⚠️ Enviar batch com pontos mistos (válidos e inválidos)
  - [ ] Pontos válidos: `is_valid = true`
  - [ ] Pontos com velocidade excessiva: `is_valid = false`, flag `speed_exceeded`
  - [ ] Pontos com accuracy ruim: `is_valid = false`, flag `accuracy_poor`
  - [ ] Retorna contagem correta de inseridos vs. rejeitados
  
- [ ] ❌ Enviar com coordenadas inválidas
  - [ ] lat > 90 ou < -90: rejeitado, flag `lat_invalid`
  - [ ] lng > 180 ou < -180: rejeitado, flag `lng_invalid`
  
- [ ] ❌ Enviar para atividade de outro participante
  - [ ] Erro: "Not authorized"
  
- [ ] ❌ Enviar para atividade `finished`
  - [ ] Erro: "Activity status does not allow GPS submission"
  
- [ ] ❌ Enviar para atividade `discarded`
  - [ ] Erro: "Activity status does not allow GPS submission"
  
#### Device Session
- [ ] ✅ Batch com `device_id` fornecido
  - [ ] Device session criada/atualizada
  - [ ] Contadores incrementados
  - [ ] `last_activity_at` atualizado

---

### 2.5. Pausar/Retomar (`track_pause_activity`, `track_resume_activity`)

**Setup:**
- Atividade em `running`

**Testes:**
- [ ] ✅ Pausar atividade running
  - [ ] Status muda para `paused`
  - [ ] Retorna sucesso
  
- [ ] ✅ Retomar atividade paused
  - [ ] Status volta para `running`
  - [ ] Retorna sucesso
  
- [ ] ❌ Pausar atividade armed
  - [ ] Erro: "Can only pause running activities"
  
- [ ] ❌ Retomar atividade running
  - [ ] Erro: "Can only resume paused activities"
  
- [ ] 🔒 Permissões
  - [ ] Participante dono pode pausar/retomar
  - [ ] Outro participante NÃO pode

---

### 2.6. Finalizar Atividade (`track_finish_activity`)

**Setup:**
- Atividade em `running` com pontos GPS

**Testes:**
- [ ] ✅ Finalizar atividade running com pontos
  - [ ] Status muda para `finished`
  - [ ] `end_time` preenchido
  - [ ] `total_time_sec` calculado
  - [ ] `total_points` e `valid_points` corretos
  - [ ] `avg_accuracy_m` calculada
  - [ ] `max_speed_kmh` calculada
  - [ ] `summary_points` (polyline) gerada
  - [ ] Audit log registrado
  
- [ ] ✅ Finalizar atividade paused
  - [ ] Sucesso (mesmo comportamento)
  
- [ ] ✅ Finalizar atividade armed (sem pontos)
  - [ ] Finaliza com métricas nulas/zero
  
- [ ] ❌ Finalizar atividade já finished
  - [ ] Erro (sem `p_force`)
  
- [ ] ✅ Forçar finalizar (p_force = true)
  - [ ] Sucesso mesmo se já finished
  
- [ ] 🔒 Permissões
  - [ ] Participante dono pode finalizar
  - [ ] Admin pode finalizar
  - [ ] Staff pode finalizar
  - [ ] Organizador do evento pode finalizar

---

### 2.7. Descartar Atividade (`track_discard_activity`)

**Setup:**
- Atividade em qualquer status

**Testes:**
- [ ] ✅ Descartar atividade
  - [ ] Status muda para `discarded`
  - [ ] `reason` salvo em `metadata`
  - [ ] Audit log registrado
  
- [ ] ✅ Descartar libera slot para nova atividade
  - [ ] Participante pode criar nova atividade armed

---

### 2.8. Posições Live (`track_get_live_positions`)

**Setup:**
- 3 atividades: 2 running, 1 paused, 1 finished
- Pontos GPS recentes para as ativas

**Testes:**
- [ ] ✅ Buscar posições de um evento
  - [ ] Retorna apenas running e paused
  - [ ] NÃO retorna finished/discarded
  - [ ] Cada atividade tem último ponto GPS
  - [ ] `elapsed_sec` calculado corretamente
  
- [ ] ✅ Filtrar por rota
  - [ ] Retorna apenas atividades da rota especificada
  
- [ ] 🔒 Permissões
  - [ ] Admin vê todas
  - [ ] Organizador vê do seu evento
  - [ ] Público vê se evento permitir live tracking

---

### 2.9. Rankings (`track_get_rankings`)

**Setup:**
- 5 atividades finished com tempos diferentes
- Participantes de categorias variadas

**Testes:**
- [ ] ✅ Ranking geral de um evento
  - [ ] Ordenado por tempo (menor primeiro)
  - [ ] `rank` correto (1, 2, 3...)
  - [ ] `formatted_time` no formato HH:MM:SS
  
- [ ] ✅ Filtrar por rota
  - [ ] Apenas atividades da rota
  - [ ] Ranks independentes por rota
  
- [ ] ✅ Limitar resultados
  - [ ] Respeita `p_limit`
  
- [ ] ❌ Atividades não-finished não aparecem
  - [ ] armed, running, paused, discarded excluídos

---

## 3. Testes de Integridade e Constraints

### 3.1. Unicidade
- [ ] ❌ Dois QRs ativos para mesmo participante/evento
  - [ ] Violação de unique index
  
- [ ] ❌ Duas atividades ativas (armed/running/paused) para mesmo participante/evento
  - [ ] Violação de unique index
  
- [ ] ❌ Dois checkpoints com mesmo order_index na mesma rota
  - [ ] Violação de unique index
  
- [ ] ❌ Duas passagens no mesmo checkpoint para mesma atividade
  - [ ] Violação de unique index

### 3.2. Foreign Keys
- [ ] ❌ Criar rota com event_id inexistente
  - [ ] Violação de FK
  
- [ ] ❌ Criar atividade com route_id inexistente
  - [ ] Violação de FK
  
- [ ] ✅ Deletar evento em cascata
  - [ ] Rotas deletadas
  - [ ] QRs deletados
  - [ ] Atividades deletadas
  - [ ] Pontos GPS deletados (via cascade da atividade)

### 3.3. Check Constraints
- [ ] ❌ Rota com distance_km negativa
  - [ ] Violação de check
  
- [ ] ❌ Ponto GPS com lat > 90
  - [ ] Violação de check
  
- [ ] ❌ Checkpoint com radius_m <= 0
  - [ ] Violação de check

---

## 4. Testes de Performance

### 4.1. Ingestão de Pontos GPS
- [ ] Inserir 1.000 pontos (10 batches de 100)
  - [ ] Tempo < 5 segundos total
  - [ ] Sem bloqueios
  
- [ ] Inserir pontos de 10 atividades simultâneas
  - [ ] Sem race conditions
  - [ ] Contadores corretos em todas

### 4.2. Queries de Ranking
- [ ] Ranking com 1.000 atividades finished
  - [ ] Query < 1 segundo
  
- [ ] Live positions com 100 atividades ativas
  - [ ] Query < 500ms

### 4.3. Índices
- [ ] Verificar uso de índices nas queries principais
  - [ ] `EXPLAIN ANALYZE` em rankings
  - [ ] `EXPLAIN ANALYZE` em live positions
  - [ ] `EXPLAIN ANALYZE` em busca de pontos por atividade

---

## 5. Testes de Realtime (Supabase)

### 5.1. Subscrições
- [ ] Subscrever a `track_gps_live` (INSERT)
  - [ ] Recebe eventos em tempo real
  - [ ] Payload correto
  
- [ ] Subscrever a `track_activities` (UPDATE)
  - [ ] Recebe mudanças de status
  
- [ ] Filtros de subscrição funcionam
  - [ ] Por `participant_id`
  - [ ] Por `event_id` (via join)

---

## 6. Testes de Segurança (RLS)

### 6.1. Isolamento entre Eventos
- [ ] Organizador A NÃO vê rotas do evento B
- [ ] Organizador A NÃO vê atividades do evento B
- [ ] Organizador A NÃO pode armar atividade no evento B

### 6.2. Isolamento entre Participantes
- [ ] Participante A NÃO vê pontos GPS do participante B
- [ ] Participante A NÃO pode enviar pontos para atividade do B
- [ ] Participante A NÃO pode pausar/finalizar atividade do B

### 6.3. Público
- [ ] Usuário não-autenticado NÃO vê nada (se RLS requer autenticação)
- [ ] Usuário autenticado comum vê apenas:
  - [ ] Rotas de eventos públicos
  - [ ] Atividades finished de eventos públicos
  - [ ] Rankings de eventos públicos

### 6.4. Admin Override
- [ ] Admin pode:
  - [ ] Ver todas as tabelas
  - [ ] Emitir QR para qualquer evento
  - [ ] Armar/finalizar qualquer atividade
  - [ ] Ver audit logs

---

## 7. Testes de Validação de Dados

### 7.1. Validação GPS
- [ ] Ponto com velocidade = 100 km/h e max = 50
  - [ ] Rejeitado, flag `speed_exceeded`
  
- [ ] Ponto com accuracy = 80m e max = 30m
  - [ ] Rejeitado, flag `accuracy_poor`
  
- [ ] Ponto com coordenadas válidas mas próximas do limite
  - [ ] lat = 89.9, lng = 179.9 → aceito

### 7.2. Monotonia Temporal
- [ ] Enviar pontos fora de ordem (device_ts anterior ao último)
  - [ ] Aceito (apenas alerta ou flag opcional)
  
- [ ] Enviar ponto com device_ts no futuro
  - [ ] Aceito (validação opcional)

---

## 8. Testes de Edge Cases

### 8.1. Atividade sem Pontos GPS
- [ ] Armar e finalizar sem enviar pontos
  - [ ] Finaliza com métricas zero/nulas
  - [ ] Não aparece em rankings (sem tempo)

### 8.2. Batches Vazios
- [ ] Enviar batch com array vazio `[]`
  - [ ] Retorna `points_inserted: 0`, sem erro

### 8.3. Rota Desativada
- [ ] Tentar armar atividade com rota `is_active = false`
  - [ ] Erro: "Route is not active"

### 8.4. QR de Outro Evento
- [ ] Validar QR do evento A
- [ ] Tentar armar atividade com rota do evento B
  - [ ] Erro: "Route does not belong to the same event"

### 8.5. Múltiplas Finalizações
- [ ] Finalizar atividade duas vezes
  - [ ] Segunda chamada: erro (sem force)
  - [ ] Com `p_force = true`: sucesso, recalcula

---

## 9. Testes de Auditoria

### 9.1. Registro de Eventos
- [ ] Emitir QR → audit log com action = 'qr_issued'
- [ ] Revogar QR → audit log (na reemissão)
- [ ] Armar atividade → audit log com action = 'activity_armed'
- [ ] Iniciar tracking → audit log com action = 'activity_started'
- [ ] Finalizar → audit log com action = 'activity_finished'
- [ ] Descartar → audit log com action = 'activity_discarded'

### 9.2. Campos de Auditoria
- [ ] `actor_id` preenchido (auth.uid())
- [ ] `details` JSONB com contexto relevante
- [ ] `created_at` correto

---

## 10. Testes End-to-End (Fluxo Completo)

### Cenário 1: Atleta Completa Prova
1. [ ] Backoffice: criar evento e rota
2. [ ] Backoffice: inscrever participante
3. [ ] Backoffice: emitir QR
4. [ ] Backoffice: no dia, armar atividade (scan QR)
5. [ ] App: participante inicia tracking
   - [ ] Status muda para running
6. [ ] App: enviar batches periódicos (simular 10 min de prova)
   - [ ] Pontos aparecem em live map
7. [ ] App: finalizar
   - [ ] Métricas calculadas
8. [ ] Dashboard: verificar no ranking
   - [ ] Posição correta
9. [ ] Público: ver resultado
   - [ ] Visível em rankings públicos

### Cenário 2: Atleta Abandona (Discarded)
1. [ ] Armar atividade
2. [ ] Iniciar tracking
3. [ ] Enviar alguns pontos
4. [ ] Backoffice: descartar atividade ("Atleta desistiu")
5. [ ] Verificar NÃO aparece em rankings
6. [ ] Participante pode criar nova atividade (slot liberado)

### Cenário 3: Reemissão de QR
1. [ ] Emitir QR1
2. [ ] Atleta perde QR
3. [ ] Backoffice: reemitir → QR2
4. [ ] QR1 revogado
5. [ ] Tentar validar QR1 → erro "revoked"
6. [ ] Validar QR2 → sucesso
7. [ ] Armar com QR2 → sucesso

### Cenário 4: Múltiplas Rotas no Evento
1. [ ] Criar rota 10K e rota 21K
2. [ ] Participante A armado para 10K
3. [ ] Participante B armado para 21K
4. [ ] Ambos enviam pontos
5. [ ] Live map mostra ambos (filtrar por rota funciona)
6. [ ] Rankings separados por rota

---

## 11. Testes de Queries Auxiliares

Executar queries de `sql/track_module_queries.sql`:

### Verificação de Integridade
- [ ] Rotas órfãs (sem evento)
- [ ] QRs órfãos
- [ ] Atividades órfãs
- [ ] Pontos GPS órfãos

### Dashboard de Evento
- [ ] Resumo geral funciona
- [ ] Valores corretos

### Monitoramento em Tempo Real
- [ ] Atividades ativas agora
- [ ] Últimas posições
- [ ] Estatísticas de ingestão

### Rankings
- [ ] Top 10 por rota
- [ ] Estatísticas por categoria

### Qualidade de Dados
- [ ] Qualidade GPS por atividade
- [ ] Estatísticas de rejeição

### Checkpoints (se implementado)
- [ ] Splits por checkpoint
- [ ] Comparação entre participantes

### Auditoria
- [ ] Histórico de QRs
- [ ] Atividades armadas não iniciadas
- [ ] Sessões suspeitas

### Performance
- [ ] Tamanho das tabelas
- [ ] Contagem de registros
- [ ] Uso de índices

---

## 12. Testes de Limpeza e Manutenção

- [ ] Identificar pontos GPS antigos (>90 dias)
- [ ] Script de arquivamento funciona (se implementado)
- [ ] Vacuum/analyze após grande inserção

---

## 13. Testes de Compatibilidade

### Navegadores (UI)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile (App de Tracking)
- [ ] Android (GPS nativo)
- [ ] iOS (GPS nativo)
- [ ] Precisão GPS aceitável
- [ ] Funciona em background
- [ ] Resiliência a perda de rede

---

## 14. Testes de Stress

- [ ] 100 participantes simultâneos enviando pontos
- [ ] 1.000 atividades finished (ranking)
- [ ] 100.000 pontos GPS em uma atividade
- [ ] 10 eventos simultâneos ativos

---

## Relatório de Testes

Ao completar, preencher:

**Data:** ___________  
**Testador:** ___________  
**Ambiente:** [ ] Desenvolvimento [ ] Staging [ ] Produção

**Resumo:**
- Total de testes: ___
- Passou: ___
- Falhou: ___
- Pulado: ___

**Bugs Encontrados:**
1. _________________________________
2. _________________________________
3. _________________________________

**Observações:**
_________________________________________________
_________________________________________________

---

## Critérios de Aceitação (Do Requisito Original)

✅ **Implementado:**
- [x] Criar rota com GPX e ativá-la
- [x] Emitir QR por participante sem tocar em `participants`
- [x] Armar atividade a partir do QR
- [x] Iniciar tracking com app
- [x] Ver pontos em dashboard tempo real
- [x] Finalizar e ver resultado em rankings
- [x] Reemissão de QR invalida anterior
- [x] Bloqueio de múltiplas atividades ativas
- [x] Filtros de outliers GPS
- [x] Zero alterações em `eventos` e `participants`

---

**Sucesso:** Módulo GPS Tracking completo e pronto para produção! 🎉

