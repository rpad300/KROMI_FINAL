# 📄 Diferença Entre Arquivos de Configuração

## 🔍 Dois Arquivos Diferentes

### **1. `/configuracoes.html` → Rota `/platform-config`**
**Propósito**: Configurações globais da plataforma
- ✅ Configurações de API keys (Gemini, OpenAI, Google Vision, Supabase)
- ✅ Tipo de processador padrão
- ✅ Velocidade padrão
- ✅ Confiança padrão
- ✅ Configurações de email
- ✅ Configurações de sessão
- ✅ Estatísticas do sistema

### **2. `/config-kromi.html` → Rota `/config`**
**Propósito**: Configurações específicas por evento
- ✅ Seleção de processador para um evento específico
- ✅ Seleção de modelo OpenAI para o evento
- ✅ Velocidade específica do evento
- ✅ Confiança específica do evento
- ✅ Cards informativos de cada processador
- ✅ Interface mais visual e interativa

## 🤔 Qual Usar?

### **Use `/config` (config-kromi.html)** se:
- ✅ Quer configurar um evento específico
- ✅ Precisa escolher qual modelo OpenAI usar
- ✅ Quer configurações diferentes por evento

### **Use `/platform-config` (configuracoes.html)** se:
- ✅ Quer configurar API keys globais
- ✅ Quer definir configurações padrão para todos os eventos
- ✅ Quer ver estatísticas gerais do sistema

## ✅ Recomendação

**MANTENHA AMBOS!** Eles têm propósitos diferentes:
- `configuracoes.html` = Configurações gerais/globais
- `config-kromi.html` = Configurações por evento

Se você **REALMENTE** não usa configurações por evento, posso apagar o `config-kromi.html` e ajustar o código.

