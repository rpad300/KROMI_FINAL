/**
 * ============================================================================
 * KROMI - Field Type Specific Configurations
 * ============================================================================
 * Configurações específicas para cada tipo de campo
 * ============================================================================
 */

const FieldTypeConfigs = {
    /**
     * Obter configuração HTML específica para um tipo de campo
     */
    getTypeSpecificConfig(fieldType) {
        const configs = {
            // Numéricos
            number: `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Mínimo:</label>
                        <input type="number" id="config_min" class="form-input" placeholder="Ex: 0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Máximo:</label>
                        <input type="number" id="config_max" class="form-input" placeholder="Ex: 100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Step:</label>
                        <input type="number" id="config_step" class="form-input" placeholder="Ex: 1" value="1">
                    </div>
                </div>
            `,
            
            currency: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Moeda:</label>
                        <select id="config_currency" class="form-select">
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="BRL">BRL (R$)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Valor mínimo:</label>
                        <input type="number" id="config_min" class="form-input" step="0.01" placeholder="Ex: 0.00">
                    </div>
                </div>
            `,
            
            slider: `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Mínimo:</label>
                        <input type="number" id="config_min" class="form-input" value="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Máximo:</label>
                        <input type="number" id="config_max" class="form-input" value="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Step:</label>
                        <input type="number" id="config_step" class="form-input" value="1">
                    </div>
                </div>
            `,
            
            rating: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Máximo de Estrelas:</label>
                        <select id="config_max_stars" class="form-select">
                            <option value="3">3 estrelas</option>
                            <option value="5" selected>5 estrelas</option>
                            <option value="10">10 estrelas</option>
                        </select>
                    </div>
                </div>
            `,
            
            // Upload
            file: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Tipos permitidos:</label>
                        <input type="text" id="config_accept" class="form-input" placeholder="Ex: .pdf,.doc,.docx">
                        <small style="color: var(--text-secondary); font-size: 11px;">Separados por vírgula</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tamanho máximo (MB):</label>
                        <input type="number" id="config_max_size" class="form-input" value="10">
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_multiple">
                        <label for="config_multiple">Permitir múltiplos ficheiros</label>
                    </div>
                </div>
            `,
            
            image: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Formatos:</label>
                        <select id="config_image_format" class="form-select" multiple style="height: 100px;">
                            <option value="image/jpeg" selected>JPEG</option>
                            <option value="image/png" selected>PNG</option>
                            <option value="image/gif">GIF</option>
                            <option value="image/webp">WebP</option>
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label">Largura máx (px):</label>
                            <input type="number" id="config_max_width" class="form-input" value="1920">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Altura máx (px):</label>
                            <input type="number" id="config_max_height" class="form-input" value="1080">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tamanho máximo (MB):</label>
                        <input type="number" id="config_max_size" class="form-input" value="5">
                    </div>
                </div>
            `,
            
            // Contacto estruturado
            full_name: `
                <div style="margin-top: 16px;">
                    <div class="alert alert-info" style="padding: 12px; margin-bottom: 12px;">
                        ℹ️ Nome dividido em partes para melhor organização
                    </div>
                    <div class="form-group">
                        <label class="form-label">Partes do nome:</label>
                        <div style="display: grid; gap: 8px;">
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_has_first" checked disabled>
                                <label>Primeiro Nome (obrigatório)</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_has_middle">
                                <label>Nome(s) do Meio</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_has_last" checked>
                                <label>Apelido</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_has_prefix">
                                <label>Prefixo (Sr., Dra., etc)</label>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            address: `
                <div style="margin-top: 16px;">
                    <div class="alert alert-info" style="padding: 12px; margin-bottom: 12px;">
                        ℹ️ Morada estruturada em campos separados
                    </div>
                    <div class="form-group">
                        <label class="form-label">Campos da morada:</label>
                        <div style="display: grid; gap: 8px;">
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_street" checked>
                                <label>Rua/Avenida</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_number" checked>
                                <label>Número</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_complement">
                                <label>Complemento (andar, porta)</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_postal" checked>
                                <label>Código Postal</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_city" checked>
                                <label>Cidade</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_state">
                                <label>Estado/Região</label>
                            </div>
                            <div class="checkbox-group">
                                <input type="checkbox" id="config_addr_country" checked>
                                <label>País</label>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Formato código postal:</label>
                        <select id="config_postal_format" class="form-select">
                            <option value="PT">Portugal (0000-000)</option>
                            <option value="ES">Espanha (00000)</option>
                            <option value="BR">Brasil (00000-000)</option>
                            <option value="UK">Reino Unido</option>
                            <option value="US">EUA (00000-0000)</option>
                        </select>
                    </div>
                </div>
            `,
            
            // Texto
            textarea: `
                <div style="margin-top: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label">Mín caracteres:</label>
                            <input type="number" id="config_min_length" class="form-input" placeholder="Ex: 10">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Máx caracteres:</label>
                            <input type="number" id="config_max_length" class="form-input" placeholder="Ex: 500">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Número de linhas:</label>
                        <input type="number" id="config_rows" class="form-input" value="4">
                    </div>
                </div>
            `,
            
            // Data
            date: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Data mínima:</label>
                        <input type="date" id="config_min_date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data máxima:</label>
                        <input type="date" id="config_max_date" class="form-input">
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_disable_past">
                        <label for="config_disable_past">Desabilitar datas passadas</label>
                    </div>
                </div>
            `,
            
            date_range: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Máximo de dias no intervalo:</label>
                        <input type="number" id="config_max_days" class="form-input" placeholder="Ex: 30">
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_same_day_allowed">
                        <label for="config_same_day_allowed">Permitir mesmo dia</label>
                    </div>
                </div>
            `,
            
            // Documentação
            nif: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">País:</label>
                        <select id="config_country" class="form-select">
                            <option value="PT">Portugal (9 dígitos)</option>
                            <option value="ES">Espanha (DNI/NIE)</option>
                            <option value="BR">Brasil (CPF/CNPJ)</option>
                            <option value="INT">Internacional</option>
                        </select>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_validate_checksum" checked>
                        <label for="config_validate_checksum">Validar checksum</label>
                    </div>
                </div>
            `,
            
            phone: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Formato:</label>
                        <select id="config_phone_format" class="form-select">
                            <option value="PT">Portugal (+351)</option>
                            <option value="ES">Espanha (+34)</option>
                            <option value="BR">Brasil (+55)</option>
                            <option value="INT">Internacional</option>
                        </select>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_phone_mask" checked>
                        <label for="config_phone_mask">Aplicar máscara</label>
                    </div>
                </div>
            `,
            
            postal_code: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Formato:</label>
                        <select id="config_postal_format" class="form-select">
                            <option value="PT">Portugal (0000-000)</option>
                            <option value="ES">Espanha (00000)</option>
                            <option value="BR">Brasil (00000-000)</option>
                            <option value="UK">Reino Unido</option>
                            <option value="US">EUA (00000-0000)</option>
                        </select>
                    </div>
                </div>
            `,
            
            // Upload específico
            camera: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Resolução:</label>
                        <select id="config_resolution" class="form-select">
                            <option value="low">Baixa (640x480)</option>
                            <option value="medium" selected>Média (1280x720)</option>
                            <option value="high">Alta (1920x1080)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Câmara:</label>
                        <select id="config_camera" class="form-select">
                            <option value="user">Frontal</option>
                            <option value="environment">Traseira</option>
                            <option value="any">Qualquer</option>
                        </select>
                    </div>
                </div>
            `,
            
            signature: `
                <div style="margin-top: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label">Largura (px):</label>
                            <input type="number" id="config_width" class="form-input" value="400">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Altura (px):</label>
                            <input type="number" id="config_height" class="form-input" value="200">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cor da caneta:</label>
                        <input type="color" id="config_pen_color" class="form-input" value="#000000">
                    </div>
                </div>
            `,
            
            // Desportivo
            category: `
                <div style="margin-top: 16px;">
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_auto_category" checked onchange="toggleCategoryRules()">
                        <label for="config_auto_category">Calcular automaticamente por idade</label>
                    </div>
                    <div id="categoryRulesSection" style="margin-top: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 14px;">Regras de Escalão</h4>
                        <div id="categoryRulesList"></div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="addCategoryRule()" style="margin-top: 8px;">➕ Adicionar Escalão</button>
                    </div>
                </div>
            `,
            
            emergency_contact: `
                <div style="margin-top: 16px;">
                    <div class="alert alert-info" style="margin-bottom: 12px; padding: 12px;">
                        ℹ️ Campo estruturado: Nome + Telefone + Relação
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_require_relation" checked>
                        <label for="config_require_relation">Exigir grau de parentesco</label>
                    </div>
                </div>
            `,
            
            dorsal: `
                <div style="margin-top: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label class="form-label">Dorsal mínimo:</label>
                            <input type="number" id="config_min_dorsal" class="form-input" value="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Dorsal máximo:</label>
                            <input type="number" id="config_max_dorsal" class="form-input" value="9999">
                        </div>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_auto_assign">
                        <label for="config_auto_assign">Atribuir automaticamente</label>
                    </div>
                </div>
            `,
            
            // Geo
            location: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Centro do mapa (coords):</label>
                        <input type="text" id="config_center" class="form-input" placeholder="Ex: 38.7223,-9.1393">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Zoom inicial:</label>
                        <input type="number" id="config_zoom" class="form-input" value="12" min="1" max="20">
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_current_location">
                        <label for="config_current_location">Usar localização atual por padrão</label>
                    </div>
                </div>
            `,
            
            qr_scanner: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Tipo de código:</label>
                        <select id="config_code_type" class="form-select">
                            <option value="qr">QR Code</option>
                            <option value="barcode">Código de Barras</option>
                            <option value="both">Ambos</option>
                        </select>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="config_continuous_scan">
                        <label for="config_continuous_scan">Leitura contínua</label>
                    </div>
                </div>
            `,
            
            // Avançados
            matrix: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Escala:</label>
                        <select id="config_matrix_scale" class="form-select">
                            <option value="1-5">1 a 5</option>
                            <option value="1-10">1 a 10</option>
                            <option value="likert">Likert (Discordo Totalmente → Concordo Totalmente)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <h4 style="margin: 12px 0 8px 0; font-size: 14px;">Perguntas da Matriz</h4>
                        <div id="matrixQuestionsList"></div>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="addMatrixQuestion()" style="margin-top: 8px;">➕ Adicionar Pergunta</button>
                    </div>
                </div>
            `,
            
            repeater: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Mínimo de repetições:</label>
                        <input type="number" id="config_min_items" class="form-input" value="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Máximo de repetições:</label>
                        <input type="number" id="config_max_items" class="form-input" value="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Texto botão adicionar:</label>
                        <input type="text" id="config_add_label" class="form-input" value="➕ Adicionar">
                    </div>
                </div>
            `,
            
            calculated: `
                <div style="margin-top: 16px;">
                    <div class="alert alert-info" style="padding: 12px; margin-bottom: 16px;">
                        ℹ️ Este campo será calculado automaticamente baseado em outros campos do formulário
                    </div>
                    <div class="form-group">
                        <label class="form-label">Operação:</label>
                        <select id="config_calc_operation" class="form-select" onchange="updateFormulaPreview()">
                            <option value="sum">Soma (+)</option>
                            <option value="subtract">Subtração (-)</option>
                            <option value="multiply">Multiplicação (×)</option>
                            <option value="divide">Divisão (÷)</option>
                            <option value="custom">Fórmula Custom</option>
                        </select>
                    </div>
                    <div id="calcFieldsSection">
                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: end; margin-bottom: 12px;">
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 12px;">Campo 1:</label>
                                <input type="text" id="config_field1" class="form-input" placeholder="nome_do_campo" style="font-size: 13px;">
                            </div>
                            <div style="font-size: 20px; padding-bottom: 8px;" id="operatorSymbol">+</div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 12px;">Campo 2:</label>
                                <input type="text" id="config_field2" class="form-input" placeholder="nome_do_campo" style="font-size: 13px;">
                            </div>
                        </div>
                    </div>
                    <div id="customFormulaSection" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Fórmula Custom:</label>
                            <input type="text" id="config_formula" class="form-input" placeholder="{campo1} * {campo2} / 100">
                            <small style="color: var(--text-secondary); font-size: 11px;">Use {nome_campo} para referenciar</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Formato de saída:</label>
                        <select id="config_output_format" class="form-select">
                            <option value="number">Número</option>
                            <option value="currency">Moeda (€)</option>
                            <option value="percentage">Percentagem (%)</option>
                        </select>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 12px; border-radius: 8px; margin-top: 12px;">
                        <strong style="font-size: 12px; color: #22c55e;">Fórmula gerada:</strong>
                        <div id="formulaPreview" style="font-family: monospace; margin-top: 4px;">-</div>
                    </div>
                </div>
            `,
            
            html: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Conteúdo HTML:</label>
                        <textarea id="config_html_content" class="form-textarea" rows="5" placeholder='<div class="alert">Atenção: ...</div>'></textarea>
                    </div>
                </div>
            `,
            
            separator: `
                <div style="margin-top: 16px;">
                    <div class="form-group">
                        <label class="form-label">Título do separador:</label>
                        <input type="text" id="config_separator_title" class="form-input" placeholder="Ex: Dados Pessoais">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estilo:</label>
                        <select id="config_separator_style" class="form-select">
                            <option value="line">Linha simples</option>
                            <option value="thick">Linha grossa</option>
                            <option value="dashed">Linha tracejada</option>
                            <option value="dotted">Linha pontilhada</option>
                        </select>
                    </div>
                </div>
            `
        };
        
        return configs[fieldType] || '';
    },
    
    /**
     * Extrair configurações específicas do tipo
     */
    extractTypeSpecificConfig(fieldType) {
        const config = {};
        
        // Numéricos
        if (['number', 'currency', 'slider', 'range'].includes(fieldType)) {
            const min = document.getElementById('config_min')?.value;
            const max = document.getElementById('config_max')?.value;
            const step = document.getElementById('config_step')?.value;
            
            if (min) config.min = parseFloat(min);
            if (max) config.max = parseFloat(max);
            if (step) config.step = parseFloat(step);
        }
        
        if (fieldType === 'currency') {
            config.currency = document.getElementById('config_currency')?.value || 'EUR';
        }
        
        if (fieldType === 'rating') {
            config.max_stars = parseInt(document.getElementById('config_max_stars')?.value || 5);
        }
        
        // Campos estruturados
        if (fieldType === 'full_name') {
            config.parts = {
                first: true,  // Sempre obrigatório
                middle: document.getElementById('config_has_middle')?.checked || false,
                last: document.getElementById('config_has_last')?.checked || false,
                prefix: document.getElementById('config_has_prefix')?.checked || false
            };
        }
        
        if (fieldType === 'address') {
            config.fields = {
                street: document.getElementById('config_addr_street')?.checked || false,
                number: document.getElementById('config_addr_number')?.checked || false,
                complement: document.getElementById('config_addr_complement')?.checked || false,
                postal: document.getElementById('config_addr_postal')?.checked || false,
                city: document.getElementById('config_addr_city')?.checked || false,
                state: document.getElementById('config_addr_state')?.checked || false,
                country: document.getElementById('config_addr_country')?.checked || false
            };
            config.postal_format = document.getElementById('config_postal_format')?.value || 'PT';
        }
        
        // Upload
        if (['file', 'image', 'video', 'audio'].includes(fieldType)) {
            config.max_size_mb = parseInt(document.getElementById('config_max_size')?.value || 10);
            
            if (fieldType === 'file') {
                config.accept = document.getElementById('config_accept')?.value || '';
                config.multiple = document.getElementById('config_multiple')?.checked || false;
            }
            
            if (fieldType === 'image') {
                config.max_width = parseInt(document.getElementById('config_max_width')?.value || 1920);
                config.max_height = parseInt(document.getElementById('config_max_height')?.value || 1080);
            }
        }
        
        // Texto
        if (fieldType === 'textarea') {
            const minLen = document.getElementById('config_min_length')?.value;
            const maxLen = document.getElementById('config_max_length')?.value;
            
            if (minLen) config.min_length = parseInt(minLen);
            if (maxLen) config.max_length = parseInt(maxLen);
            config.rows = parseInt(document.getElementById('config_rows')?.value || 4);
        }
        
        // Data
        if (fieldType === 'date') {
            config.min_date = document.getElementById('config_min_date')?.value || null;
            config.max_date = document.getElementById('config_max_date')?.value || null;
            config.disable_past = document.getElementById('config_disable_past')?.checked || false;
        }
        
        if (fieldType === 'date_range') {
            config.max_days = parseInt(document.getElementById('config_max_days')?.value || 0);
            config.same_day_allowed = document.getElementById('config_same_day_allowed')?.checked || false;
        }
        
        // Documentação
        if (fieldType === 'nif') {
            config.country = document.getElementById('config_country')?.value || 'PT';
            config.validate_checksum = document.getElementById('config_validate_checksum')?.checked !== false;
        }
        
        if (fieldType === 'phone') {
            config.format = document.getElementById('config_phone_format')?.value || 'INT';
            config.mask = document.getElementById('config_phone_mask')?.checked !== false;
        }
        
        if (fieldType === 'postal_code') {
            config.format = document.getElementById('config_postal_format')?.value || 'PT';
        }
        
        // Geo
        if (fieldType === 'location') {
            config.center = document.getElementById('config_center')?.value || '';
            config.zoom = parseInt(document.getElementById('config_zoom')?.value || 12);
            config.current_location = document.getElementById('config_current_location')?.checked || false;
        }
        
        if (fieldType === 'qr_scanner') {
            config.code_type = document.getElementById('config_code_type')?.value || 'qr';
            config.continuous = document.getElementById('config_continuous_scan')?.checked || false;
        }
        
        // Avançados
        if (fieldType === 'matrix') {
            // Extrair perguntas da lista visual
            const container = document.getElementById('matrixQuestionsList');
            const questions = [];
            
            if (container) {
                Array.from(container.children).forEach((child, i) => {
                    const q = document.getElementById(`matrix_q_${i}`)?.value.trim();
                    if (q) questions.push(q);
                });
            }
            
            config.questions = questions;
            config.scale = document.getElementById('config_matrix_scale')?.value || '1-5';
        }
        
        if (fieldType === 'repeater') {
            config.min_items = parseInt(document.getElementById('config_min_items')?.value || 1);
            config.max_items = parseInt(document.getElementById('config_max_items')?.value || 10);
            config.add_label = document.getElementById('config_add_label')?.value || '➕ Adicionar';
        }
        
        if (fieldType === 'calculated') {
            const operation = document.getElementById('config_calc_operation')?.value;
            
            if (operation === 'custom') {
                config.formula = document.getElementById('config_formula')?.value || '';
            } else {
                const field1 = document.getElementById('config_field1')?.value || '';
                const field2 = document.getElementById('config_field2')?.value || '';
                const symbols = { sum: '+', subtract: '-', multiply: '*', divide: '/' };
                
                if (field1 && field2) {
                    config.formula = `{${field1}} ${symbols[operation]} {${field2}}`;
                }
            }
            
            config.output_format = document.getElementById('config_output_format')?.value || 'number';
        }
        
        if (fieldType === 'html') {
            config.content = document.getElementById('config_html_content')?.value || '';
        }
        
        if (fieldType === 'separator') {
            config.title = document.getElementById('config_separator_title')?.value || '';
            config.style = document.getElementById('config_separator_style')?.value || 'line';
        }
        
        if (fieldType === 'camera') {
            config.resolution = document.getElementById('config_resolution')?.value || 'medium';
            config.camera = document.getElementById('config_camera')?.value || 'any';
        }
        
        if (fieldType === 'signature') {
            config.width = parseInt(document.getElementById('config_width')?.value || 400);
            config.height = parseInt(document.getElementById('config_height')?.value || 200);
            config.pen_color = document.getElementById('config_pen_color')?.value || '#000000';
        }
        
        if (fieldType === 'category') {
            config.auto_category = document.getElementById('config_auto_category')?.checked !== false;
            
            // Extrair regras usando função global
            if (window.extractCategoryRules) {
                config.category_rules = window.extractCategoryRules();
            }
        }
        
        return Object.keys(config).length > 0 ? config : null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.FieldTypeConfigs = FieldTypeConfigs;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldTypeConfigs;
}

