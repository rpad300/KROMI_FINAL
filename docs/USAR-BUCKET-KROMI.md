# 📦 Usar Bucket KROMI Existente

## 🎯 Opção: Usar Bucket Único KROMI

Se você já tem um bucket chamado **KROMI** no Supabase Storage e quer usar esse bucket único para todos os ficheiros de branding (em vez dos buckets separados `media-originals`, `media-processed`, `favicons-and-manifest`), pode configurar via variável de ambiente.

## ✅ Configuração

### Opção 1: Variável de Ambiente (Recomendado)

Adicionar ao arquivo `.env`:

```env
# Usar bucket KROMI único para todos os ficheiros de branding
BRANDING_USE_KROMI_BUCKET=true
```

Ou especificar o nome do bucket:

```env
# Especificar bucket customizado
BRANDING_STORAGE_BUCKET=KROMI
```

### Opção 2: Usar Buckets Específicos (Padrão)

Se **NÃO** definir strings variáveis acima, o sistema usa automaticamente:
- `media-originals` - para logos e thumbnails
- `media-processed` - para variantes processadas
- `favicons-and-manifest` - para favicons e app icons

## 📋 Comportamento

### Com `BRANDING_USE_KROMI_BUCKET=true` ou `BRANDING_STORAGE_BUCKET=KROMI`:
- ✅ Todos os logos → bucket `KROMI`
- ✅ Todos os favicons → bucket `KROMI`
- ✅ Todas as variantes → bucket `KROMI`
- ✅ Todos os thumbnails → bucket `KROMI`

### Sem configuração (padrão):
- ✅ Logos → `media-originals`
- ✅ Favicons → `favicons-and-manifest`
- ✅ Variantes processadas → `media-processed`

## 🔄 Reiniciar Servidor

Após alterar o `.env`, **reiniciar o servidor Node.js**:

```bash
# Parar servidor (Ctrl+C)
# Iniciar novamente
npm start
```

## ⚙️ Verificação

Após configurar e reiniciar, ao fazer upload de logos:
1. Verificar logs do servidor - devem mostrar:
   ```
   📤 Uploadando logo: ... para bucket KROMI (... bytes)
   ```
2. Verificar no Supabase Dashboard → Storage → KROMI
3. Deve ver os ficheiros sendo carregados no bucket KROMI

## 📝 Notas

- O bucket KROMI deve existir no Supabase Storage antes de usar esta opção
- As permissões (público/privado) do bucket KROMI serão aplicadas a todos os ficheiros
- Se preferir separar ficheiros por tipo, use a opção padrão (sem variáveis de ambiente)

