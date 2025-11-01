# ⚠️ Execução Manual Necessária

## Problema

O script SQL é muito grande e pode ter problemas de sintaxe ao executar via linha de comando.

## ✅ Solução Recomendada

**Execute manualmente no Supabase Dashboard:**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo: `sql/SETUP-COMPLETO-APP-NATIVA.sql`
5. Copie **TODO o conteúdo**
6. Cole no editor SQL
7. Execute (Run ou Ctrl+Enter)

## 📋 O que o Script Cria

- ✅ Tabela `device_detections`
- ✅ View `device_qr_info`
- ✅ Funções RPC (save_device_detection, get_device_info_by_qr, process_device_detection, process_pending_detections)
- ✅ Triggers automáticos
- ✅ Índices de performance

## ✅ Verificar se Funcionou

Após executar, rode:

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

## 🚀 Depois de Executar

1. Reiniciar servidor:
   ```bash
   node server.js
   ```

2. Verificar logs:
   Procure por:
   ```
   📱 Iniciando processador de device detections (app nativa)...
   ✅ Processador de device detections ativo
   ```

---

**Nota:** O Supabase Dashboard SQL Editor é mais robusto para scripts grandes e mostra erros mais detalhados.

