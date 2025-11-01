#!/bin/bash

# ============================================================================
# KROMI - Script de Setup Completo para App Nativa
# ============================================================================
# Este script executa todos os SQL necessários para suportar a app nativa
# ============================================================================

echo "🚀 Kromi - Setup App Nativa"
echo "=================================="
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Crie um arquivo .env com as variáveis necessárias"
    exit 1
fi

# Carregar variáveis do .env
source .env

# Verificar variáveis necessárias
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    echo "❌ Variável SUPABASE_URL não encontrada no .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Variável SUPABASE_SERVICE_ROLE_KEY não encontrada no .env"
    exit 1
fi

SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}

echo "✅ Variáveis de ambiente carregadas"
echo "   Supabase URL: ${SUPABASE_URL:0:30}..."
echo ""

# Verificar se psql está disponível (para executar SQL)
if ! command -v psql &> /dev/null; then
    echo "⚠️ psql não encontrado. Você precisará executar os SQL manualmente."
    echo ""
    echo "📋 Execute estes arquivos SQL no Supabase Dashboard → SQL Editor:"
    echo "   1. sql/native-app-qr-code-system.sql"
    echo "   2. sql/native-app-detections-table.sql"
    echo "   3. sql/auto-fill-device-info-on-create.sql"
    echo ""
    exit 0
fi

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️ DATABASE_URL não configurada. Execute os SQL manualmente no Supabase."
    echo ""
    echo "📋 Execute estes arquivos SQL no Supabase Dashboard → SQL Editor:"
    echo "   1. sql/native-app-qr-code-system.sql"
    echo "   2. sql/native-app-detections-table.sql"
    echo "   3. sql/auto-fill-device-info-on-create.sql"
    echo ""
    exit 0
fi

DB_URL=${DATABASE_URL:-$SUPABASE_DB_URL}

echo "📊 Executando scripts SQL..."
echo ""

# Executar scripts SQL na ordem correta
SCRIPTS=(
    "sql/native-app-qr-code-system.sql"
    "sql/native-app-detections-table.sql"
    "sql/auto-fill-device-info-on-create.sql"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "▶️  Executando: $script"
        psql "$DB_URL" -f "$script" -q
        if [ $? -eq 0 ]; then
            echo "   ✅ Sucesso"
        else
            echo "   ❌ Erro ao executar"
        fi
        echo ""
    else
        echo "⚠️  Arquivo não encontrado: $script"
    fi
done

echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Reiniciar o servidor: node server.js"
echo "   2. Verificar logs para confirmar processador ativo"
echo "   3. Testar criação de dispositivo"
echo ""

