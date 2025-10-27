# ⚡ Como Adicionar Service Role Key

## Passo 1: Obter a Key

1. Ir para **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecionar o projeto VisionKrono
3. Ir para **Settings** → **API**
4. Na secção **Project API keys**, procurar:
   - ❌ `anon` `public` - NÃO é esta!
   - ✅ **`service_role`** **`secret`** - É ESTA!
5. Clicar em **Reveal** e copiar a key completa

**A key começa com:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Passo 2: Adicionar ao .env

Abrir o arquivo `.env` no editor e adicionar:

```env
# Service Role Key (bypassa RLS no servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.COLAR_AQUI_A_KEY_COMPLETA
```

**IMPORTANTE:** 
- ⚠️ Esta key é SECRETA! Nunca commitar no git!
- ⚠️ Apenas usar no servidor, NUNCA no browser!
- ⚠️ Tem poderes de admin total no Supabase!

## Passo 3: Reiniciar Servidor

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm start
```

Ou se estiver usando pm2/nodemon, apenas:
```bash
pm2 restart app
# ou
# O nodemon reinicia automaticamente
```

## Passo 4: Verificar Logs

Ao iniciar, deve mostrar:
```
✅ Cliente Supabase (service role) inicializado - RLS bypassed
```

**NÃO deve mostrar:**
```
⚠️ Cliente Supabase (anon key) inicializado - RLS ATIVO
```

## Passo 5: Testar

Recarregar página:
```
https://192.168.1.219:1144/events-kromi.html
```

No console, deve mostrar:
```
📊 [loadEvents] Payload completo: {
  success: true, 
  events: [
    { id: "a6301479...", name: "teste1", ... }
  ], 
  count: 1, 
  scope: "all"
}
✅ [loadEvents] 1 evento(s) carregado(s)
```

**E o card do evento deve aparecer!** ✅

---

**Tempo total:** ~2-3 minutos

