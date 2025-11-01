# 🚀 LEIA-ME PRIMEIRO - Setup App Nativa

## ⚡ Execução Rápida (1 MINUTO)

### Execute este arquivo SQL no Supabase:

**`sql/SETUP-COMPLETO-APP-NATIVA.sql`**

Este arquivo contém **TUDO** em um único script:
- ✅ Tabela `device_detections`
- ✅ View `device_qr_info`  
- ✅ Funções RPC
- ✅ Triggers automáticos
- ✅ Índices

---

## 📋 Como Executar

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor**
4. Abra o arquivo: `sql/SETUP-COMPLETO-APP-NATIVA.sql`
5. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
6. **Cole no Supabase** (Ctrl+V)
7. Clique em **Run** (ou Ctrl+Enter)
8. Aguarde (alguns segundos)

**Pronto! ✅**

---

## ✅ Verificar se Funcionou

Após executar, você verá no final:
```
✅ SETUP COMPLETO! Tudo criado com sucesso.
```

Ou execute:
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

---

## 🔄 Depois de Executar

### 1. Reiniciar Servidor
```bash
node server.js
```

### 2. Verificar Logs
Procure por:
```
📱 Iniciando processador de device detections (app nativa)...
✅ Processador de device detections ativo
```

---

## 📤 Para Qual Tabela a App Envia?

**Resposta:** A app envia para a função RPC `save_device_detection()`, que salva na tabela **`device_detections`**.

**Fluxo:**
```
App → save_device_detection() → device_detections (pending)
                                  ↓
                         Processamento automático
                                  ↓
                    ┌─────────────┴─────────────┐
                    │                           │
            Se tem dorsal              Se não tem dorsal
                    │                           │
                    ▼                           ▼
            detections                  image_buffer
```

**Tudo é associado automaticamente:**
- ✅ `event_id` - Do `access_code`
- ✅ `device_id` - Do `access_code`
- ✅ `device_order` (checkpoint) - Do `access_code`

---

## 📚 Documentação

- **Guia do Desenvolvedor:** `docs/NATIVE-APP-DEVELOPER-GUIDE.md`
- **Onde Envia Dados:** `docs/WHERE-APP-SENDS-DATA.md`
- **Associação de Dispositivo:** `docs/DEVICE-ASSOCIATION-FLOW.md`

---

**Execute o SQL e está pronto! 🎉**

