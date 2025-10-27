# 📊 Status das Páginas KROMI - Sidebar Unificado

## ✅ PÁGINAS OK (Já Têm NavigationComponent)

| Página | CSS | Scripts | Sidebar | Status |
|--------|-----|---------|---------|--------|
| `index-kromi.html` | ✅ | ✅ | ✅ | ✅ REFERÊNCIA |
| `calibration-kromi.html` | ✅ | ✅ | ✅ | ✅ ATUALIZADO |
| `config-kromi.html` | ✅ | ✅ | ✅ | ✅ ATUALIZADO |
| `events-kromi.html` | ✅ | ✅ | ✅ | ✅ ATUALIZADO |
| `participants-kromi.html` | ✅ | ✅ | ✅ | ✅ ATUALIZADO |

## ⚠️ PÁGINAS A ATUALIZAR (Estrutura Antiga)

| Página | Problema | Prioridade |
|--------|----------|------------|
| `classifications-kromi.html` | Sidebar manual + scripts duplicados | 🔴 Alta |
| `detection-kromi.html` | CSS diferente (kromi-layout.css) + sem NavigationComponent | 🔴 Alta |
| `checkpoint-order-kromi.html` | Sidebar manual + kromi-sidebar-toggle.js | 🟡 Média |
| `category-rankings-kromi.html` | A verificar | 🟡 Média |
| `image-processor-kromi.html` | A verificar | 🟢 Baixa |
| `database-management-kromi.html` | A verificar | 🟢 Baixa |
| `devices-kromi.html` | A verificar | 🟢 Baixa |

---

## 🔧 AÇÕES NECESSÁRIAS POR PÁGINA

### **classifications-kromi.html**
- [ ] Remover `<script src="kromi-sidebar-toggle.js"></script>` duplicado
- [ ] Adicionar `navigation-component.css` e `unified-sidebar-styles.css`
- [ ] Substituir sidebar manual por `<div class="sidebar" id="sidebar"></div>`
- [ ] Adicionar scripts do NavigationComponent
- [ ] Adicionar `waitForNavigation()`

### **detection-kromi.html**  
- [ ] Verificar se precisa dos CSS móveis específicos
- [ ] Adicionar `navigation-component.css` e `unified-sidebar-styles.css`  
- [ ] Adicionar NavigationComponent (se apropriado para detecção)
- [ ] **Nota:** Esta página pode ser especial (dispositivo de captura)

### **checkpoint-order-kromi.html**
- [ ] Remover `<script src="kromi-sidebar-toggle.js"></script>`
- [ ] Adicionar `navigation-component.css` e `unified-sidebar-styles.css`
- [ ] Substituir sidebar manual
- [ ] Adicionar scripts do NavigationComponent
- [ ] Adicionar `waitForNavigation()`

### **Restantes Páginas**
- [ ] Análise individual necessária
- [ ] Aplicar padrão conforme estrutura

---

## 🎯 PRIORIZAÇÃO

### **Fase 1 (URGENTE - Páginas Principais)** ✅ CONCLUÍDO
- [x] index-kromi.html
- [x] calibration-kromi.html  
- [x] config-kromi.html
- [x] events-kromi.html
- [x] participants-kromi.html

### **Fase 2 (IMPORTANTE - Gestão de Eventos)**
- [ ] classifications-kromi.html
- [ ] checkpoint-order-kromi.html
- [ ] category-rankings-kromi.html

### **Fase 3 (NORMAL - Funcionalidades Avançadas)**
- [ ] image-processor-kromi.html
- [ ] database-management-kromi.html
- [ ] devices-kromi.html

### **Fase 4 (ESPECIAL - Pode Precisar de Abordagem Diferente)**
- [ ] detection-kromi.html (dispositivo de captura, pode não precisar de sidebar completo)

---

## 📝 TEMPLATE DE ATUALIZAÇÃO

Para cada página na Fase 2 e 3, aplicar:

### **1. CSS (no `<head>`)**
```html
<!-- Adicionar depois de kromi-layout-fixes.css -->
<link rel="stylesheet" href="navigation-component.css?v=2025102601">
<link rel="stylesheet" href="unified-sidebar-styles.css?v=2025102601">
```

### **2. HTML (substituir sidebar)**
```html
<!-- ANTES -->
<nav class="sidebar" id="sidebar">
    <!-- ... 20+ linhas de conteúdo manual ... -->
</nav>

<!-- DEPOIS -->
<div class="sidebar" id="sidebar"></div>
```

### **3. Scripts (antes de `</body>`)**
```html
<!-- Adicionar depois dos scripts de auth -->
<script src="navigation-config.js?v=2025102601" defer></script>
<script src="navigation-service.js?v=2025102601" defer></script>
<script src="navigation-component.js?v=2025102601" defer></script>
<script src="navigation-init.js?v=2025102601" defer></script>
```

### **4. JavaScript (no DOMContentLoaded)**
```javascript
// Adicionar no topo
await waitForNavigation();

// Adicionar a função
async function waitForNavigation() {
    return new Promise((resolve) => {
        if (window.NavigationUtils) {
            resolve();
        } else {
            window.addEventListener('navigationReady', resolve);
        }
    });
}
```

---

## 🧪 TESTE RÁPIDO

Após atualizar cada página:

```javascript
// Abrir DevTools console
console.log('NavigationUtils:', window.NavigationUtils);
console.log('Sidebar:', document.getElementById('sidebar')?.innerHTML);
```

Deve mostrar:
```
✅ NavigationUtils: {navigateTo: ƒ, ...}
✅ Sidebar: <div class="sidebar-header">...</div>
```

---

**Atualizado em:** 2025-10-27 
**Progresso:** 5/13 páginas concluídas (38%)

