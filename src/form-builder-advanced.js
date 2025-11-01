/**
 * ============================================================================
 * KROMI - Form Builder Advanced Features
 * ============================================================================
 * Validações configuráveis e lógica condicional
 * ============================================================================
 */

class FormBuilderAdvanced {
    constructor() {
        this.selectFieldTypes = ['select', 'radio', 'checkbox', 'multiple_choice'];
        
        this.validationTypes = [
            { key: 'required', label: 'Campo obrigatório', type: 'boolean' },
            { key: 'minLength', label: 'Comprimento mínimo', type: 'number' },
            { key: 'maxLength', label: 'Comprimento máximo', type: 'number' },
            { key: 'min', label: 'Valor mínimo', type: 'number' },
            { key: 'max', label: 'Valor máximo', type: 'number' },
            { key: 'pattern', label: 'Padrão regex', type: 'text' },
            { key: 'email', label: 'Validar como email', type: 'boolean' },
            { key: 'phone', label: 'Validar como telefone', type: 'boolean' },
            { key: 'url', label: 'Validar como URL', type: 'boolean' }
        ];
        
        this.conditionalOperators = [
            { key: 'equals', label: 'Igual a', types: ['text', 'select', 'number'] },
            { key: 'not_equals', label: 'Diferente de', types: ['text', 'select', 'number'] },
            { key: 'contains', label: 'Contém', types: ['text'] },
            { key: 'greater_than', label: 'Maior que', types: ['number'] },
            { key: 'less_than', label: 'Menor que', types: ['number'] },
            { key: 'is_empty', label: 'Está vazio', types: ['text', 'select'] },
            { key: 'is_not_empty', label: 'Não está vazio', types: ['text', 'select'] }
        ];
    }
    
    /**
     * Renderizar editor de opções (para select, radio, etc)
     */
    renderOptionsEditor(field, catalogField) {
        const fieldType = field.field_type || catalogField?.field_type;
        
        if (!this.selectFieldTypes.includes(fieldType)) {
            return ''; // Não é campo de seleção
        }
        
        const currentOptions = field.options || catalogField?.options || { pt: [], en: [] };
        const optionsPt = Array.isArray(currentOptions.pt) ? currentOptions.pt : [];
        
        let html = '<div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border-color);">';
        html += '<h4 style="margin: 0 0 16px 0;">📝 Opções</h4>';
        html += '<div id="optionsList">';
        
        optionsPt.forEach((opt, i) => {
            html += `
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-input" id="option_pt_${i}" value="${opt}" placeholder="Opção ${i+1} (PT)" style="flex: 1;">
                    <button class="btn btn-sm btn-danger" onclick="removeOption(${i})">🗑️</button>
                </div>
            `;
        });
        
        html += '</div>';
        html += '<button class="btn btn-sm btn-secondary" onclick="addOption()" style="margin-top: 8px;">➕ Adicionar Opção</button>';
        html += '</div>';
        
        return html;
    }
    
    /**
     * Extrair opções do modal
     */
    extractOptions() {
        const options = { pt: [], en: [] };
        let i = 0;
        
        while (document.getElementById(`option_pt_${i}`)) {
            const value = document.getElementById(`option_pt_${i}`).value;
            if (value.trim()) {
                options.pt.push(value.trim());
                options.en.push(value.trim()); // Por enquanto, mesma opção em EN
            }
            i++;
        }
        
        return options.pt.length > 0 ? options : null;
    }
    
    /**
     * Renderizar editor de validações no modal
     */
    renderValidationEditor(field, catalogField) {
        const currentRules = field.validation_rules || catalogField?.validation_rules || {};
        
        let html = '<div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border-color);">';
        html += '<h4 style="margin: 0 0 16px 0;">✅ Validações</h4>';
        
        this.validationTypes.forEach(validation => {
            const value = currentRules[validation.key];
            
            if (validation.type === 'boolean') {
                html += `
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="val_${validation.key}" ${value ? 'checked' : ''}>
                        <label for="val_${validation.key}">${validation.label}</label>
                    </div>
                `;
            } else if (validation.type === 'number') {
                html += `
                    <div class="form-group">
                        <label class="form-label">${validation.label}:</label>
                        <input type="number" id="val_${validation.key}" class="form-input" value="${value || ''}" placeholder="Ex: 10">
                    </div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        <label class="form-label">${validation.label}:</label>
                        <input type="text" id="val_${validation.key}" class="form-input" value="${value || ''}" placeholder="Ex: ^[A-Za-z]+$">
                    </div>
                `;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Extrair regras de validação do modal
     */
    extractValidationRules() {
        const rules = {};
        
        this.validationTypes.forEach(validation => {
            const el = document.getElementById(`val_${validation.key}`);
            if (!el) return;
            
            if (validation.type === 'boolean') {
                if (el.checked) rules[validation.key] = true;
            } else if (validation.type === 'number') {
                if (el.value) rules[validation.key] = parseInt(el.value);
            } else {
                if (el.value) rules[validation.key] = el.value;
            }
        });
        
        return Object.keys(rules).length > 0 ? rules : null;
    }
    
    /**
     * Renderizar editor de lógica condicional
     */
    renderConditionalLogicEditor(field, allFields) {
        const currentConditions = field.conditional_logic || [];
        
        let html = '<div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border-color);">';
        html += '<h4 style="margin: 0 0 16px 0;">🔗 Lógica Condicional</h4>';
        html += '<p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Mostrar este campo apenas quando:</p>';
        
        html += '<div id="conditionalRules">';
        
        if (currentConditions.length === 0) {
            html += '<p style="color: var(--text-secondary); font-size: 14px;">Nenhuma condição definida</p>';
        } else {
            currentConditions.forEach((condition, i) => {
                html += this.renderConditionalRule(condition, i, allFields);
            });
        }
        
        html += '</div>';
        
        html += '<button class="btn btn-sm btn-secondary" onclick="formBuilderAdvanced.addConditionalRule()" style="margin-top: 12px;">➕ Adicionar Condição</button>';
        html += '</div>';
        
        return html;
    }
    
    renderConditionalRule(condition, index, allFields) {
        const fieldOptions = allFields.map(f => {
            const label = f.label_override?.pt || f.field_key;
            return `<option value="${f.field_key}" ${condition.field_key === f.field_key ? 'selected' : ''}>${label}</option>`;
        }).join('');
        
        const operatorOptions = this.conditionalOperators.map(op => 
            `<option value="${op.key}" ${condition.operator === op.key ? 'selected' : ''}>${op.label}</option>`
        ).join('');
        
        return `
            <div class="conditional-rule" style="background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end;">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 12px;">Campo:</label>
                        <select class="form-select" id="cond_field_${index}" style="font-size: 13px;">
                            <option value="">Selecione...</option>
                            ${fieldOptions}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 12px;">Operador:</label>
                        <select class="form-select" id="cond_op_${index}" style="font-size: 13px;">
                            ${operatorOptions}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="font-size: 12px;">Valor:</label>
                        <input type="text" class="form-input" id="cond_val_${index}" value="${condition.value || ''}" style="font-size: 13px;">
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="formBuilderAdvanced.removeConditionalRule(${index})">🗑️</button>
                </div>
            </div>
        `;
    }
    
    addConditionalRule() {
        // Placeholder - será implementado no modal
        alert('Adicione condições no modal de configuração do campo');
    }
    
    removeConditionalRule(index) {
        // Será implementado
        alert('Remover condição ' + index);
    }
    
    /**
     * Extrair lógica condicional do modal
     */
    extractConditionalLogic() {
        // Por enquanto retorna vazio - será implementado quando necessário
        return null;
    }
}

// Singleton global
const formBuilderAdvanced = new FormBuilderAdvanced();

if (typeof window !== 'undefined') {
    window.formBuilderAdvanced = formBuilderAdvanced;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormBuilderAdvanced;
}

