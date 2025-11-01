# 🚀 Setup Completo - App Nativa Kromi

## 📋 Passo a Passo

### 1. Executar Scripts SQL no Supabase

Acesse o **Supabase Dashboard** → **SQL Editor** e execute **na ordem**:

#### Script 1: Sistema de QR Code
```sql
-- Copiar conteúdo de: sql/native-app-qr-code-system.sql
```
**O que faz:** Cria view `device_qr_info` e funções de login

#### Script 2: Tabela de Recolha de Dados
```sql
-- Copiar conteúdo de: sql/native-app-detections-table.sql
```
**O que faz:** Cria tabela `device_detections` e funções de processamento

#### Script 3: Preenchimento Automático
```sql
-- Copiar conteúdo de: sql/auto-fill-device-info-on-create.sql
```
**O que faz:** Garante que dispositivos têm todas as informações

### 2. Verificar Instalação

Execute o script de verificação:

```bash
node scripts/verify-native-app-setup.js
```

Deve mostrar:
```
✅ Tabela device_detections existe
✅ View device_qr_info existe
✅ Funções RPC existem
✅ Tudo configurado corretamente!
```

### 3. Reiniciar Servidor

```bash
node server.js
```

Procure por estas mensagens nos logs:
```
📱 Iniciando processador de device detections (app nativa)...
✅ Processador de device detections ativo
```

### 4. Testar (Opcional)

Execute o SQL de teste:
```sql
-- Copiar conteúdo de: scripts/test-native-app-flow.sql
```

Isso cria um dispositivo de teste e valida todo o fluxo.

---

## ✅ Checklist

- [ ] Script 1 executado (`native-app-qr-code-system.sql`)
- [ ] Script 2 executado (`native-app-detections-table.sql`)
- [ ] Script 3 executado (`auto-fill-device-info-on-create.sql`)
- [ ] Verificação passou (`verify-native-app-setup.js`)
- [ ] Servidor reiniciado
- [ ] Processador aparece nos logs

---

## 🐛 Troubleshooting

### "Função não existe"

**Problema:** Funções RPC não foram criadas
**Solução:** Execute novamente `sql/native-app-detections-table.sql`

### "Tabela não existe"

**Problema:** Tabela não foi criada
**Solução:** Execute novamente `sql/native-app-detections-table.sql`

### Processador não inicia

**Verificar:**
- Variáveis de ambiente configuradas (`.env`)
- Service Role Key válida
- Conexão com Supabase funcionando

**Logs úteis:**
```bash
# Verificar se há erros
grep -i "device.*detection" server.log

# Ou ver logs em tempo real
tail -f server.log
```

---

## 📚 Próximos Passos

1. **Enviar documentação para desenvolvedor:**
   - `docs/NATIVE-APP-DEVELOPER-GUIDE.md`

2. **Criar dispositivos para teste:**
   ```sql
   SELECT create_device_for_event(
       p_event_id := 'uuid-do-evento',
       p_device_name := 'Android Teste',
       ...
   );
   ```

3. **Monitorar processamento:**
   - Logs do servidor
   - Ou: `node scripts/process-device-detections.js check`

---

## 📞 Suporte

Se algo não funcionar:
1. Execute `verify-native-app-setup.js`
2. Verifique logs do servidor
3. Confirme que todos os SQL foram executados

---

**✅ Tudo pronto! O sistema está configurado para receber dados da app nativa.**

