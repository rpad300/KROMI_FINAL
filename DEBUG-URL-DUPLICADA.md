# 🔍 DEBUG - PROBLEMA DE URL DUPLICADA

## 🎯 **Problema Identificado**

### **URL Corrompida**:
```
❌ https://192.168.1.219:1144/participants?event=a6301479-56c8-4269-a42d-aa8a7650a575?event=a6301479-56c8-4269-a42d-aa8a7650a575&eventName=Evento
```

### **Erro Supabase**:
```
❌ invalid input syntax for type uuid: "a6301479-56c8…0a575?event=a6301479-56c8-4269-a42d-aa8a7650a575"
```

---

## 🔧 **Debug Adicionado**

### **Logs de Debug**:
```javascript
console.log('🔍 DEBUG - URL atual:', window.location.href);
console.log('🔍 DEBUG - eventId extraído:', eventId);
console.log('🔍 DEBUG - eventName extraído:', eventName);
```

---

## 🚀 **Próximos Passos**

### **1. Teste a página**:
```
https://192.168.1.219:1144/participants?event=a6301479-56c8-4269-a42d-aa8a7650a575&eventName=Evento
```

### **2. Verifique o console**:
- ✅ **URL atual** - deve mostrar a URL completa
- ✅ **eventId extraído** - deve mostrar apenas o UUID limpo
- ✅ **eventName extraído** - deve mostrar "Evento"

### **3. Se ainda houver problema**:
- 🔍 **Verificar** de onde vem a URL duplicada
- 🔍 **Corrigir** a origem do problema

---

## 🎯 **Objetivo**

**Identificar exatamente onde a URL está sendo duplicada para corrigir definitivamente!**

**Teste e me informe o que aparece no console!** 🔍
