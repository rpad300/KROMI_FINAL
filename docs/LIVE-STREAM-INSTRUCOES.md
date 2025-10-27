# 🌐 LIVE STREAM VIA INTERNET - INSTRUÇÕES

## 📋 PASSO 1: Criar Tabelas no Supabase

1. **Abra o Supabase Dashboard**
2. **Vá em SQL Editor**
3. **Execute este SQL:**

```sql
-- Tabela para dispositivos conectados
CREATE TABLE IF NOT EXISTS livestream_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'online',
    capabilities TEXT[] DEFAULT ARRAY['livestream', 'detection'],
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para comandos entre dispositivos
CREATE TABLE IF NOT EXISTS livestream_commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    command TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 seconds')
);

-- Tabela para ofertas WebRTC
CREATE TABLE IF NOT EXISTS livestream_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    offer_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    answer_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '60 seconds')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_livestream_devices_device_id ON livestream_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_event_id ON livestream_devices(event_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_status ON livestream_devices(status);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_last_seen ON livestream_devices(last_seen);

CREATE INDEX IF NOT EXISTS idx_livestream_commands_device_id ON livestream_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_commands_status ON livestream_commands(status);

CREATE INDEX IF NOT EXISTS idx_livestream_offers_device_id ON livestream_offers(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_offers_status ON livestream_offers(status);

-- RLS Policies (permitir acesso público para comunicação)
ALTER TABLE livestream_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on livestream_devices" ON livestream_devices FOR ALL USING (true);
CREATE POLICY "Allow all operations on livestream_commands" ON livestream_commands FOR ALL USING (true);
CREATE POLICY "Allow all operations on livestream_offers" ON livestream_offers FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_livestream_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_livestream_devices_updated_at
    BEFORE UPDATE ON livestream_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_livestream_devices_updated_at();
```

## 📋 PASSO 2: Testar o Sistema

1. **Dispositivo Móvel**: Acesse a página de detecção
2. **Computador**: Acesse a página de eventos
3. **Clique no botão**: "🌐 Live Stream Internet" (canto superior direito)
4. **Aguarde**: O sistema deve detectar dispositivos reais

## 🔍 O que você deve ver:

### No Console do Dispositivo:
```
🌐 Inicializando Live Stream via Internet...
⏳ Aguardando Supabase... (tentativa 1/10)
✅ Supabase conectado para Live Stream
📢 Presença anunciada no Supabase
```

### No Console do Painel:
```
🌐 Inicializando Painel Live Stream via Internet...
⏳ Aguardando Supabase... (tentativa 1/10)
✅ Supabase conectado para Painel Live Stream
📱 1 dispositivo(s) real(is) detectado(s)
```

### No Painel:
- Dispositivos aparecem como "🔴 REAL"
- Botão "▶ Stream" funcional
- Stream de vídeo real aparece

## ❌ Se der erro:

1. **Verifique se executou o SQL** no Supabase
2. **Verifique se as tabelas foram criadas** (Table Editor)
3. **Verifique se as políticas RLS estão ativas**
4. **Me envie os logs do console** para debug

## 🎯 Resultado Esperado:

**Stream de vídeo real funcionando via internet entre dispositivos!** 🚀
