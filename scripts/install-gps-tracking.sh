#!/bin/bash

# ============================================================================
# VisionKrono - Instalador Automático GPS Tracking
# ============================================================================
# Executa todos os scripts SQL na ordem correta usando psql
# 
# USO:
#   chmod +x scripts/install-gps-tracking.sh
#   ./scripts/install-gps-tracking.sh
#
# REQUISITOS:
#   - psql instalado
#   - DATABASE_URL configurado (ou passar como argumento)
# ============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

# Obter DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL não definido.${NC}"
    echo "Obter de: Supabase Dashboard → Settings → Database → Connection string"
    echo ""
    read -p "Cole a DATABASE_URL aqui: " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL é obrigatório!${NC}"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  VisionKrono - Instalador GPS Tracking Módulo"
echo "═══════════════════════════════════════════════════════"
echo ""

# ============================================================================
# EXECUTAR SCRIPTS SQL
# ============================================================================

execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${BLUE}📄 $description${NC}"
    echo "   Ficheiro: $file"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Ficheiro não encontrado: $file${NC}"
        return 1
    fi
    
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Sucesso!${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Erro ao executar $file${NC}"
        echo "   Executar manualmente ou verificar logs"
        echo ""
        return 1
    fi
}

# Contador de sucessos/falhas
SUCCESS=0
FAILED=0

# 1. Schema
if execute_sql "sql/track_module_schema.sql" "1/7 Criando schema (tabelas, índices, constraints)..."; then
    ((SUCCESS++))
else
    ((FAILED++))
fi

# 2. RLS
if execute_sql "sql/track_module_rls.sql" "2/7 Configurando RLS (Row Level Security)..."; then
    ((SUCCESS++))
else
    ((FAILED++))
fi

# 3. Funções
if execute_sql "sql/track_module_functions.sql" "3/7 Criando funções e RPCs..."; then
    ((SUCCESS++))
else
    ((FAILED++))
fi

# 4. Inbox (App Móvel)
if execute_sql "sql/track_module_mobile_inbox.sql" "4/7 ⭐ Criando tabelas para App Móvel (Inbox Pattern)..."; then
    ((SUCCESS++))
else
    ((FAILED++))
fi

# 5. Processador
if execute_sql "sql/track_module_inbox_processor.sql" "5/7 ⭐ Criando processador da Inbox..."; then
    ((SUCCESS++))
else
    ((FAILED++))
fi

# 6. Migrar QRs (se houver)
echo -e "${BLUE}📄 6/7 Migrando QRs existentes...${NC}"
if psql "$DATABASE_URL" -c "SELECT track_migrate_existing_qrs();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Migração executada${NC}"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️  Sem QRs para migrar (normal se primeira instalação)${NC}"
    ((SUCCESS++))
fi
echo ""

# 7. Seeds (Opcional)
echo -e "${YELLOW}📄 7/7 Seeds de demonstração (opcional)${NC}"
read -p "Carregar dados demo? (s/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    if execute_sql "sql/track_module_seeds.sql" "Carregando seeds..."; then
        ((SUCCESS++))
    else
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  Seeds pulados${NC}"
    echo ""
fi

# ============================================================================
# RESUMO
# ============================================================================

echo "═══════════════════════════════════════════════════════"
echo "  INSTALAÇÃO CONCLUÍDA"
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Sucesso: $SUCCESS${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Falhas:  $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Módulo GPS Tracking instalado com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Configurar scheduler para processar inbox"
    echo "   SELECT cron.schedule('process-gps-inbox', '*/10 * * * * *', \$\$SELECT track_process_inbox_messages(100);\$\$);"
    echo ""
    echo "2. Verificar instalação:"
    echo "   psql \$DATABASE_URL -c \"SELECT * FROM track_inbox_stats();\""
    echo ""
    echo "3. Consultar documentação:"
    echo "   - MOBILE_APP_INBOX_README.md (para app móvel)"
    echo "   - GPS_TRACKING_MODULE_README.md (completa)"
    echo ""
else
    echo -e "${YELLOW}⚠️  Algumas partes falharam.${NC}"
    echo "Execute manualmente via Supabase Dashboard → SQL Editor"
    echo ""
fi

