/**
 * ==========================================
 * FORM PUBLIC - Renderização de Formulários Públicos
 * ==========================================
 * Carrega e renderiza formulários dinâmicos publicamente
 * Versão: 1.0
 * ==========================================
 */

(function() {
    'use strict';

    /**
     * Renderiza um campo no formulário
     */
    function renderField(field, container) {
        const fieldCatalog = field.field_catalog || {};
        const lang = document.documentElement.lang || 'pt';
        
        // Obter traduções (field-specific primeiro, depois catalog)
        const label = field.label_override?.[lang] || 
                     field.label_translations?.[lang] || 
                     fieldCatalog.label_translations?.[lang] || 
                     field.field_key;
        
        const placeholder = field.placeholder_override?.[lang] ||
                           field.placeholder_translations?.[lang] || 
                           fieldCatalog.placeholder_translations?.[lang] || '';
        
        const description = field.description_translations?.[lang] || 
                           fieldCatalog.description_translations?.[lang] || '';
        
        const helpText = field.help_text_override?.[lang] ||
                        field.help_text_translations?.[lang] || 
                        fieldCatalog.help_text_translations?.[lang] || '';
        
        const options = field.options_override || field.options || fieldCatalog.options || null;
        
        // Obter tipo de campo (custom ou catalog)
        const fieldType = field.field_type || fieldCatalog.field_type || 'text';
        
        // Criar grupo de campo
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';
        fieldGroup.dataset.fieldId = field.id;
        fieldGroup.dataset.fieldKey = field.field_key;
        
        // Label
        const labelEl = document.createElement('label');
        labelEl.className = 'form-label';
        labelEl.htmlFor = `field_${field.id}`;
        labelEl.textContent = label;
        
        if (field.is_required) {
            const requiredMark = document.createElement('span');
            requiredMark.className = 'required-mark';
            requiredMark.textContent = ' *';
            labelEl.appendChild(requiredMark);
        }
        
        // Input baseado no tipo
        let input;
        
        switch (fieldType) {
            case 'text':
            case 'email':
            case 'phone':
            case 'number':
            case 'club':
            case 'country':
            case 'license':
            case 'nif':
            case 'iban':
            case 'id_card':
            case 'postal_code':
            case 'url':
            case 'dorsal':
            case 'duration':
            case 'password':
            case 'city':
            case 'language':
                input = document.createElement('input');
                input.type = fieldType === 'email' ? 'email' : 
                            (fieldType === 'number' || fieldType === 'dorsal') ? 'number' :
                            fieldType === 'url' ? 'url' :
                            fieldType === 'password' ? 'password' :
                            'text';
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-input';
                input.placeholder = placeholder;
                input.value = field.default_value || '';
                
                // Validações
                if (field.is_required) input.required = true;
                if (field.validation_rules?.minLength) input.minLength = field.validation_rules.minLength;
                if (field.validation_rules?.maxLength) input.maxLength = field.validation_rules.maxLength;
                if (field.validation_rules?.min) input.min = field.validation_rules.min;
                if (field.validation_rules?.max) input.max = field.validation_rules.max;
                if (field.validation_rules?.pattern) input.pattern = field.validation_rules.pattern;
                break;
                
            case 'textarea':
                input = document.createElement('textarea');
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-textarea';
                input.placeholder = placeholder;
                input.value = field.default_value || '';
                
                if (field.is_required) input.required = true;
                if (field.validation_rules?.minLength) input.minLength = field.validation_rules.minLength;
                if (field.validation_rules?.maxLength) input.maxLength = field.validation_rules.maxLength;
                if (field.validation_rules?.rows) input.rows = field.validation_rules.rows;
                break;
                
            case 'date':
            case 'time':
            case 'datetime':
            case 'month':
            case 'week':
            case 'color':
                input = document.createElement('input');
                input.type = fieldType === 'datetime' ? 'datetime-local' : fieldType;
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-input';
                input.value = field.default_value || '';
                
                if (field.is_required) input.required = true;
                break;
            
            case 'select':
            case 'tshirt_size':
            case 'category':
                input = document.createElement('select');
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-select';
                
                // Adicionar opção vazia se não for obrigatório
                if (!field.is_required) {
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = placeholder || '-- Selecione --';
                    input.appendChild(emptyOption);
                }
                
                // Adicionar opções
                if (options) {
                    const optionsList = options[lang] || options.pt || [];
                    optionsList.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = typeof opt === 'string' ? opt : opt.value;
                        option.textContent = typeof opt === 'string' ? opt : opt.label;
                        input.appendChild(option);
                    });
                }
                
                if (field.is_required) input.required = true;
                break;
                
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-checkbox';
                input.checked = field.default_value === 'true' || field.default_value === true;
                
                if (field.is_required) input.required = true;
                break;
                
            case 'date':
                input = document.createElement('input');
                input.type = 'date';
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-input';
                input.value = field.default_value || '';
                
                if (field.is_required) input.required = true;
                if (field.validation_rules?.min) input.min = field.validation_rules.min;
                if (field.validation_rules?.max) input.max = field.validation_rules.max;
                break;
                
            default:
                console.warn('⚠️ Tipo de campo desconhecido:', field.field_type);
                input = document.createElement('input');
                input.type = 'text';
                input.id = `field_${field.id}`;
                input.name = field.field_key;
                input.className = 'form-input';
        }
        
        // Descrição
        let descriptionEl = null;
        if (description) {
            descriptionEl = document.createElement('div');
            descriptionEl.className = 'form-description';
            descriptionEl.textContent = description;
        }
        
        // Help text
        let helpEl = null;
        if (helpText) {
            helpEl = document.createElement('div');
            helpEl.className = 'form-help';
            helpEl.textContent = helpText;
        }
        
        // Montar estrutura
        fieldGroup.appendChild(labelEl);
        if (descriptionEl) fieldGroup.appendChild(descriptionEl);
        fieldGroup.appendChild(input);
        if (helpEl) fieldGroup.appendChild(helpEl);
        
        container.appendChild(fieldGroup);
    }

    /**
     * Valida o formulário antes de submeter
     */
    function validateForm(form) {
        let isValid = true;
        const fields = form.querySelectorAll('.form-group');
        
        fields.forEach(field => {
            const input = field.querySelector('input, select, textarea');
            if (!input) return;
            
            // Verificar campo obrigatório
            if (input.hasAttribute('required') && !input.value.trim()) {
                isValid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
            
            // Validações custom
            if (input.value && input.pattern) {
                const regex = new RegExp(input.pattern);
                if (!regex.test(input.value)) {
                    isValid = false;
                    input.classList.add('error');
                }
            }
            
            // Validação de email
            if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
                isValid = false;
                input.classList.add('error');
            }
        });
        
        return isValid;
    }

    /**
     * Valida formato de email
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Exibe mensagem ao usuário
     */
    function showMessage(message, type = 'error') {
        const container = document.getElementById('messageContainer');
        if (!container) return;
        
        container.innerHTML = `<div class="${type}-message">${message}</div>`;
        
        // Remover após 5 segundos
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
        
        // Scroll para mensagem
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Coleta dados do formulário
     */
    function collectFormData(form) {
        const data = {};
        const fields = form.querySelectorAll('.form-group');
        
        fields.forEach(field => {
            const input = field.querySelector('input, select, textarea');
            if (!input) return;
            
            const fieldKey = field.dataset.fieldKey;
            
            if (input.type === 'checkbox') {
                data[fieldKey] = input.checked;
            } else if (input.type === 'file') {
                // TODO: Implementar upload de ficheiros
                console.warn('Upload de ficheiros ainda não implementado');
            } else {
                data[fieldKey] = input.value;
            }
        });
        
        return data;
    }

    /**
     * Submete o formulário
     */
    async function submitForm(form) {
        const formId = form.dataset.formId;
        const submitBtn = document.getElementById('submitBtn');
        
        if (!formId) {
            showMessage('Erro: Formulário inválido');
            return;
        }
        
        // Validar
        if (!validateForm(form)) {
            showMessage('Por favor, corrija os erros no formulário', 'error');
            return;
        }
        
        // Desabilitar botão
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        // Coletar dados
        const submissionData = collectFormData(form);
        const language = document.documentElement.lang || 'pt';
        
        try {
            const response = await fetch(`/api/forms/${formId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    submission_data: submissionData,
                    language
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Sucesso
                form.style.display = 'none';
                showMessage(
                    language === 'en' 
                        ? 'Your submission was successful! Thank you.' 
                        : 'Sua submissão foi realizada com sucesso! Obrigado.',
                    'success'
                );
            } else {
                // Erro
                showMessage(result.error || 'Erro ao submeter formulário', 'error');
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        } catch (error) {
            console.error('❌ Erro ao submeter formulário:', error);
            showMessage('Erro de conexão. Tente novamente.', 'error');
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // Inicialização quando DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 Form Public JS carregado');
        
        // Binding do submit
        const form = document.getElementById('dynamicForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                submitForm(this);
            });
        }
    });

    // Exportar funções globalmente se necessário
    window.renderField = renderField;
    window.validateForm = validateForm;
    window.submitForm = submitForm;

})();

