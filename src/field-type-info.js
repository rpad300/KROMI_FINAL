/**
 * ============================================================================
 * KROMI - Field Type Information & Previews
 * ============================================================================
 * Descrições e previews para cada tipo de campo
 * ============================================================================
 */

const FieldTypeInfo = {
    descriptions: {
        // Texto
        text: 'Campo de texto curto ideal para nomes, títulos e informações breves. Limite típico de 255 caracteres.',
        textarea: 'Área de texto multilinha para comentários, descrições longas ou qualquer conteúdo extenso.',
        wysiwyg: 'Editor de texto rico com formatação (negrito, itálico, listas). Ideal para conteúdo HTML.',
        password: 'Campo de senha com caracteres mascarados. Nunca exibido em logs ou interfaces.',
        tags: 'Campo que permite adicionar múltiplas tags/palavras-chave separadas por vírgula ou enter.',
        
        // Contacto
        email: 'Campo de email com validação automática de formato RFC 5322. Previne emails inválidos.',
        phone: 'Campo de telefone com máscara e validação internacional. Suporta formatos PT, ES, BR, etc.',
        full_name: 'Campo estruturado que divide o nome em partes (primeiro, meio, último) para melhor organização.',
        address: 'Morada completa estruturada em campos separados: rua, número, código postal, cidade, país.',
        
        // Numérico
        number: 'Campo numérico simples com validação de valor. Permite definir mínimo, máximo e incremento.',
        currency: 'Campo de moeda formatado com símbolo (€, $, £) e validação de valor monetário com decimais.',
        percentage: 'Campo de percentagem com símbolo % e validação 0-100. Formatação automática.',
        range: 'Intervalo numérico com dois valores (mínimo e máximo). Útil para faixas de preço, idade, etc.',
        slider: 'Barra deslizante visual para seleção de valor numérico dentro de um intervalo definido.',
        rating: 'Sistema de classificação com estrelas (⭐). Configurável entre 3, 5 ou 10 estrelas.',
        nps: 'Net Promoter Score: escala 0-10 para medir satisfação. Usado em questionários de feedback.',
        
        // Data/Tempo
        date: 'Seletor de data com calendário visual. Pode limitar datas passadas/futuras e definir intervalos.',
        time: 'Seletor de hora formato 24h (HH:MM). Ideal para horários de chegada, preferências, etc.',
        datetime: 'Combinação de data e hora. Captura timestamp completo para eventos com hora específica.',
        date_range: 'Seleção de intervalo entre duas datas. Útil para períodos, estadias, disponibilidade.',
        month: 'Seletor de mês e ano (MM/YYYY). Para informações mensais ou períodos.',
        week: 'Seletor de semana ISO. Retorna número da semana e ano (W52/2024).',
        duration: 'Campo de duração em formato HH:MM. Para tempos de prova, duração de atividades.',
        
        // Seleção
        select: 'Lista dropdown com opções pré-definidas. Seleção única de uma lista.',
        multi_select: 'Lista dropdown permitindo seleção múltipla. Útil para múltiplas escolhas de lista.',
        radio: 'Botões de rádio para seleção única. Visual mais direto que dropdown.',
        checkbox: 'Caixa de seleção única para confirmações (aceito termos, newsletter, etc).',
        multiple_choice: 'Múltiplas checkboxes para seleção de várias opções simultaneamente.',
        autocomplete: 'Campo com sugestões automáticas conforme digita. Busca em lista ou API.',
        country: 'Seletor de país com lista completa e flags. Autocomplete por nome.',
        city: 'Seletor de cidade com autocomplete. Pode ser dependente do país selecionado.',
        language: 'Seletor de idioma preferido. Lista de idiomas ISO 639-1.',
        
        // Upload
        file: 'Upload de ficheiro genérico. Configurável para tipos específicos (PDF, DOC, etc).',
        image: 'Upload de imagem com preview. Valida formatos (JPEG, PNG) e redimensiona se necessário.',
        video: 'Upload de vídeo com preview. Suporta MP4, WebM, etc. Limite de tamanho configurável.',
        audio: 'Upload de áudio (MP3, WAV, etc). Para gravações, músicas, podcasts.',
        camera: 'Captura de foto diretamente da câmara do dispositivo. Escolhe frontal ou traseira.',
        signature: 'Canvas para assinatura digital desenhada com dedo ou mouse. Salva como imagem.',
        drawing: 'Canvas livre para desenhos, esboços, diagramas. Ferramentas de desenho.',
        
        // Geo/Sensores
        location: 'Mapa interativo para selecionar localização. Retorna coordenadas lat/long.',
        gps: 'Captura coordenadas GPS automáticas do dispositivo. Pede permissão de localização.',
        qr_scanner: 'Abre câmara para ler QR Code ou código de barras. Valida formato.',
        
        // Desportivo
        dorsal: 'Número de dorsal do participante. Pode ser manual ou atribuído automaticamente.',
        tshirt_size: 'Tamanho de camisola com opções padrão (XS, S, M, L, XL, XXL).',
        club: 'Nome do clube ou equipa do participante. Texto livre ou lista pré-definida.',
        category: 'Categoria/escalão calculado automaticamente pela idade ou seleção manual.',
        license: 'Número de licença federativa para competições oficiais. Validação opcional.',
        emergency_contact: 'Contacto de emergência estruturado: nome, telefone e relação familiar.',
        
        // Documentação
        nif: 'NIF/VAT com validação por país (PT, ES, BR). Verifica checksum automaticamente.',
        iban: 'IBAN com validação internacional. Verifica formato e dígitos de controlo.',
        id_card: 'Número de cartão de cidadão ou passaporte com máscara e validação.',
        postal_code: 'Código postal formatado por país. Máscaras automáticas (PT: 0000-000).',
        
        // Outros
        url: 'Campo de URL com validação de formato. Aceita http://, https://, etc.',
        color: 'Seletor visual de cor. Retorna código hexadecimal (#FF0000).',
        matrix: 'Matriz Likert para questionários. Múltiplas perguntas com mesma escala.',
        table: 'Tabela editável com linhas e colunas. Para dados estruturados.',
        repeater: 'Grupo de campos que pode ser repetido. Botão "Adicionar" cria novas instâncias.',
        calculated: 'Campo auto-calculado por fórmula. Referencia outros campos (preço x quantidade).',
        hidden: 'Campo oculto não visível para o usuário. Para dados técnicos (UTM, referrer).',
        html: 'Bloco HTML estático. Para instruções, avisos ou formatação especial.',
        separator: 'Separador visual entre secções. Melhora organização do formulário.'
    },
    
    previews: {
        text: '<input type="text" class="form-input" placeholder="Digite aqui..." style="width: 100%;">',
        textarea: '<textarea class="form-textarea" rows="3" placeholder="Digite seu texto..." style="width: 100%;"></textarea>',
        wysiwyg: '<div style="border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; background: white; color: #333;"><p><strong>Texto</strong> <em>formatado</em> com <u>estilos</u></p></div>',
        password: '<input type="password" class="form-input" placeholder="••••••••" style="width: 100%;">',
        tags: '<div style="display: flex; gap: 4px; flex-wrap: wrap;"><span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">Tag 1</span><span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">Tag 2</span></div>',
        
        email: '<input type="email" class="form-input" placeholder="exemplo@email.com" style="width: 100%;">',
        phone: '<input type="tel" class="form-input" placeholder="+351 912 345 678" style="width: 100%;">',
        full_name: '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;"><input type="text" class="form-input" placeholder="Nome" style="width: 100%;"><input type="text" class="form-input" placeholder="Apelido" style="width: 100%;"></div>',
        address: '<div style="display: grid; gap: 8px;"><input class="form-input" placeholder="Rua"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;"><input class="form-input" placeholder="Código Postal"><input class="form-input" placeholder="Cidade"></div></div>',
        
        number: '<input type="number" class="form-input" placeholder="0" style="width: 100%;">',
        currency: '<div style="display: flex; align-items: center; gap: 8px;"><input type="number" class="form-input" placeholder="0.00" step="0.01" style="flex: 1;"><span style="font-weight: 600;">€</span></div>',
        percentage: '<div style="display: flex; align-items: center; gap: 8px;"><input type="number" class="form-input" placeholder="0" min="0" max="100" style="flex: 1;"><span style="font-weight: 600;">%</span></div>',
        slider: '<input type="range" min="0" max="100" value="50" style="width: 100%; accent-color: var(--primary);"><div style="text-align: center; margin-top: 4px; font-size: 12px;">50</div>',
        rating: '<div style="font-size: 24px; color: #fbbf24;">⭐⭐⭐⭐⭐</div>',
        nps: '<div style="display: flex; gap: 4px; justify-content: space-between;">' + Array.from({length: 11}, (_, i) => `<button style="width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary);">${i}</button>`).join('') + '</div>',
        
        date: '<input type="date" class="form-input" style="width: 100%;">',
        time: '<input type="time" class="form-input" style="width: 100%;">',
        datetime: '<input type="datetime-local" class="form-input" style="width: 100%;">',
        month: '<input type="month" class="form-input" style="width: 100%;">',
        week: '<input type="week" class="form-input" style="width: 100%;">',
        
        select: '<select class="form-select" style="width: 100%;"><option>Selecione...</option><option>Opção 1</option><option>Opção 2</option></select>',
        radio: '<div><label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><input type="radio" name="demo">Opção 1</label><label style="display: flex; align-items: center; gap: 8px;"><input type="radio" name="demo">Opção 2</label></div>',
        checkbox: '<label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox">Aceito os termos</label>',
        multiple_choice: '<div><label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><input type="checkbox">Opção 1</label><label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox">Opção 2</label></div>',
        
        file: '<div style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 20px; text-align: center; color: var(--text-secondary);">📎 Arrastar ficheiro ou clicar para selecionar</div>',
        image: '<div style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 20px; text-align: center; color: var(--text-secondary);">🖼️ Arrastar imagem aqui<br><small>JPEG, PNG (máx 5MB)</small></div>',
        camera: '<div style="border: 2px solid var(--primary); border-radius: 8px; padding: 20px; text-align: center; background: var(--bg-primary);"><div style="font-size: 48px;">📷</div><div style="margin-top: 8px; color: var(--text-secondary);">Abrir Câmara</div></div>',
        signature: '<canvas width="300" height="120" style="border: 1px solid var(--border-color); border-radius: 8px; background: white; width: 100%;"></canvas>',
        
        location: '<div style="border: 1px solid var(--border-color); border-radius: 8px; height: 150px; background: #e5e5e5; position: relative; overflow: hidden;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px;">🗺️</div></div>',
        qr_scanner: '<div style="border: 2px dashed var(--primary); border-radius: 8px; padding: 30px; text-align: center;"><div style="font-size: 48px;">📱</div><div style="margin-top: 8px; color: var(--text-secondary);">Ler QR Code</div></div>',
        
        dorsal: '<input type="number" class="form-input" placeholder="123" style="width: 100%; font-weight: 600; font-size: 20px; text-align: center;">',
        tshirt_size: '<select class="form-select" style="width: 100%;"><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select>',
        
        nif: '<input type="text" class="form-input" placeholder="123456789" maxlength="9" style="width: 100%;">',
        iban: '<input type="text" class="form-input" placeholder="PT50 0000 0000 0000 0000 0000 0" style="width: 100%;">',
        postal_code: '<input type="text" class="form-input" placeholder="0000-000" style="width: 100%;">',
        
        color: '<input type="color" value="#fc6b03" style="width: 100%; height: 48px; border-radius: 8px; border: 1px solid var(--border-color);">',
        matrix: '<table style="width: 100%; border-collapse: collapse; font-size: 12px;"><tr><th></th><th>1</th><th>2</th><th>3</th></tr><tr><td>Item 1</td><td>○</td><td>○</td><td>○</td></tr><tr><td>Item 2</td><td>○</td><td>○</td><td>○</td></tr></table>',
        separator: '<div style="border-bottom: 3px solid var(--primary); padding-bottom: 8px; font-weight: 600; font-size: 16px;">Secção</div>',
        html: '<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 8px; color: #856404;"><strong>⚠️ Aviso:</strong> Informação importante</div>'
    },
    
    /**
     * Obter descrição de um tipo
     */
    getDescription(fieldType) {
        return this.descriptions[fieldType] || 'Campo personalizado. Configure conforme necessário.';
    },
    
    /**
     * Obter preview HTML de um tipo
     */
    getPreview(fieldType) {
        return this.previews[fieldType] || '<input type="text" class="form-input" placeholder="Campo personalizado" style="width: 100%;">';
    },
    
    /**
     * Renderizar informação completa (descrição + preview)
     */
    renderFieldInfo(fieldType) {
        const description = this.getDescription(fieldType);
        const preview = this.getPreview(fieldType);
        
        document.getElementById('fieldTypeDescription').innerHTML = description;
        document.getElementById('fieldTypePreview').innerHTML = preview;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.FieldTypeInfo = FieldTypeInfo;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldTypeInfo;
}

