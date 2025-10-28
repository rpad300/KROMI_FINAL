/**
 * AI Cost Stats - Frontend JavaScript
 * Gerencia interação com APIs e visualizações
 */

// Handler global de erros para prevenir redirects não intencionais
window.addEventListener('error', function(event) {
    console.error('[AI-COST] ❌ Erro global capturado:', event.error);
    event.preventDefault(); // Prevenir comportamento padrão
    return true;
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('[AI-COST] ❌ Promise rejection não tratada:', event.reason);
    event.preventDefault(); // Prevenir comportamento padrão
    return true;
});

// Estado global
let currentFilters = {
    start_date: null,
    end_date: null,
    service: null,
    model: null,
    event_id: null,
    region: null
};

let currentPage = 1;
let totalPages = 1;
let timelineChart = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[AI-COST] Inicializando AI Cost Stats...');
    
    try {
        // Aguardar sistema de autenticação estar pronto
        console.log('[AI-COST] Aguardando sistema de autenticação...');
        await waitForAuthClient();
        
        // Verificar se o utilizador está autenticado
        // Usar authSystem que é o padrão da plataforma
        const user = window.authSystem?.currentUser || window.AuthClient?.session?.user;
        const profile = window.authSystem?.userProfile || window.AuthClient?.userProfile;
        
        if (!user) {
            console.error('[AI-COST] Utilizador não autenticado');
            showError('Sessão não encontrada. A página será recarregada...');
            // NÃO redirecionar manualmente - deixar o sistema cuidar disso
            return;
        }
        
        console.log('[AI-COST] ✅ Utilizador autenticado:', user.email);
        console.log('[AI-COST] ✅ Perfil:', profile);

        // Configurar datas padrão (últimos 30 dias)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    document.getElementById('startDate').value = formatDateTimeLocal(thirtyDaysAgo);
    document.getElementById('endDate').value = formatDateTimeLocal(now);

    currentFilters.start_date = thirtyDaysAgo.toISOString();
    currentFilters.end_date = now.toISOString();

    // Carregar filtros disponíveis
    await loadFilterOptions();

    // Carregar apenas dados da primeira tab (timeline)
    // As outras tabs carregam quando forem clicadas
    await loadIndicators();
    await loadTimeline();

    console.log('[AI-COST] ✅ AI Cost Stats inicializado com sucesso');
    
    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao inicializar:', error);
        showError('Erro ao inicializar a página. Por favor, recarregue.');
    }
});

// Aguardar AuthClient estar pronto
async function waitForAuthClient() {
    console.log('[AI-COST] Aguardando AuthClient...');
    
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos máximo
        
        const checkAuth = () => {
            attempts++;
            
            // Verificar se authSystem está pronto (usado pelo universal-route-protection)
            // O authSystem é mais confiável que AuthClient.isReady
            if (window.authSystem && window.authSystem.currentUser) {
                console.log('[AI-COST] ✅ authSystem pronto');
                console.log('[AI-COST] ✅ Utilizador:', window.authSystem.currentUser.email);
                console.log('[AI-COST] ✅ Perfil:', window.authSystem.userProfile);
                resolve();
                return;
            }
            
            // Fallback: verificar AuthClient diretamente
            if (window.AuthClient && window.AuthClient.session && window.AuthClient.userProfile) {
                console.log('[AI-COST] ✅ AuthClient pronto (fallback)');
                resolve();
                return;
            }
            
            // Timeout
            if (attempts >= maxAttempts) {
                console.error('[AI-COST] ❌ Timeout aguardando AuthClient (tentativas:', attempts, ')');
                console.error('[AI-COST] window.authSystem:', window.authSystem);
                console.error('[AI-COST] window.AuthClient:', window.AuthClient);
                reject(new Error('Timeout aguardando sistema de autenticação'));
                return;
            }
            
            // Log a cada 20 tentativas para debug
            if (attempts % 20 === 0) {
                console.log('[AI-COST] Ainda aguardando... tentativa', attempts, '/', maxAttempts);
            }
            
            // Tentar novamente
            setTimeout(checkAuth, 100);
        };
        
        checkAuth();
    });
}

// Obter token de autenticação
function getAuthToken() {
    // Tentar várias fontes para o token
    
    // 1. authSystem (padrão da plataforma)
    if (window.authSystem) {
        // Tentar várias propriedades possíveis
        const token = window.authSystem.session?.access_token || 
                      window.authSystem.currentUser?.access_token ||
                      window.authSystem.accessToken;
        if (token) {
            console.log('[AI-COST] Token obtido de authSystem');
            return token;
        }
    }
    
    // 2. AuthClient
    if (window.AuthClient && window.AuthClient.session) {
        const token = window.AuthClient.session.access_token;
        if (token) {
            console.log('[AI-COST] Token obtido de AuthClient');
            return token;
        }
    }
    
    // 3. localStorage/sessionStorage
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
        console.log('[AI-COST] Token obtido de storage');
        return token;
    }
    
    console.error('[AI-COST] ❌ Nenhum token encontrado');
    return null;
}

// Fazer requisição autenticada
async function authenticatedFetch(url, options = {}) {
    console.log('[AI-COST] 📡 Fazendo requisição para:', url);
    
    // A plataforma usa autenticação por COOKIES, não Bearer tokens!
    // Importante: incluir credentials para enviar cookies
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'  // ✅ ESSENCIAL: Envia cookies de sessão
    });

    console.log('[AI-COST] 📡 Resposta:', response.status, response.statusText);

    // Se for 401/403, lançar erro mas NÃO redirecionar automaticamente
    // Deixar que a função que chamou decida o que fazer
    if (response.status === 401) {
        console.error('[AI-COST] ❌ Não autorizado (401)');
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    
    if (response.status === 403) {
        console.error('[AI-COST] ❌ Acesso negado (403)');
        throw new Error('Acesso negado. Apenas administradores podem aceder a esta funcionalidade.');
    }

    return response;
}

// Carregar indicadores
async function loadIndicators() {
    console.log('[AI-COST] 📊 Carregando indicadores...');
    
    try {
        const response = await authenticatedFetch('/api/ai-costs/indicators');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();

        console.log('[AI-COST] ✅ Indicadores recebidos:', data);

        const totalPeriod = document.getElementById('totalPeriod');
        const last24h = document.getElementById('last24h');
        const last72h = document.getElementById('last72h');
        const currentMonth = document.getElementById('currentMonth');

        if (totalPeriod) totalPeriod.textContent = formatCurrency(data.total_period);
        if (last24h) last24h.textContent = formatCurrency(data.last_24h);
        if (last72h) last72h.textContent = formatCurrency(data.last_72h);
        if (currentMonth) currentMonth.textContent = formatCurrency(data.current_month);

        // Mostrar última sincronização
        if (data.last_sync) {
            const syncAlert = document.getElementById('syncAlert');
            const lastSyncTime = document.getElementById('lastSyncTime');
            if (lastSyncTime) {
                lastSyncTime.textContent = formatDateTime(new Date(data.last_sync));
            }
            if (syncAlert) {
                syncAlert.style.display = 'flex';
            }
        }

        // Atualizar label do mês
        const monthLabel = document.getElementById('currentMonthLabel');
        if (monthLabel) {
            const now = new Date();
            monthLabel.textContent = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        }

        console.log('[AI-COST] ✅ Indicadores renderizados');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar indicadores:', error);
        // NÃO mostrar erro que pode causar redirect - apenas logar
        console.warn('[AI-COST] Indicadores não disponíveis -', error.message);
    }
}

// Carregar opções de filtros
async function loadFilterOptions() {
    console.log('[AI-COST] 🔍 Carregando opções de filtros...');
    
    try {
        const response = await authenticatedFetch('/api/ai-costs/filters');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('[AI-COST] ✅ Filtros recebidos:', data);

        // Popular select de serviços
        const serviceFilter = document.getElementById('serviceFilter');
        if (serviceFilter && data.services && Array.isArray(data.services)) {
            data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service;
                option.textContent = service;
                serviceFilter.appendChild(option);
            });
        }

        // Popular select de modelos
        const modelFilter = document.getElementById('modelFilter');
        if (modelFilter && data.models && Array.isArray(data.models)) {
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelFilter.appendChild(option);
            });
        }

        // Popular select de regiões
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter && data.regions && Array.isArray(data.regions)) {
            data.regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionFilter.appendChild(option);
            });
        }

        // Popular select de eventos
        const eventFilter = document.getElementById('eventFilter');
        if (eventFilter && data.events && Array.isArray(data.events)) {
            data.events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = event.name;
                eventFilter.appendChild(option);
            });
        }

        console.log('[AI-COST] ✅ Filtros carregados');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar filtros:', error);
        console.warn('[AI-COST] Filtros não disponíveis -', error.message);
    }
}

// Carregar timeline
async function loadTimeline() {
    console.log('[AI-COST] 📈 Carregando timeline...');
    
    try {
        const response = await authenticatedFetch('/api/ai-costs/aggregate', {
            method: 'POST',
            body: JSON.stringify({
                start_date: currentFilters.start_date,
                end_date: currentFilters.end_date,
                dimension: 'hour'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];
        
        console.log('[AI-COST] ✅ Dados timeline recebidos:', data.length, 'pontos');

        // Preparar dados para o gráfico
        const labels = data.map(item => item.dimension_value);
        const costs = data.map(item => parseFloat(item.total_cost) || 0);

        // Criar ou atualizar gráfico
        const ctx = document.getElementById('timelineChart').getContext('2d');

        if (timelineChart) {
            timelineChart.destroy();
        }

        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Custo (USD)',
                    data: costs,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Custo: $' + context.parsed.y.toFixed(4);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
        
        console.log('[AI-COST] ✅ Gráfico timeline renderizado');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar timeline:', error);
        // NÃO mostrar erro que pode causar problemas - apenas logar
        console.warn('[AI-COST] Timeline não disponível -', error.message);
    }
}

// Carregar dimensão específica
async function loadDimension(dimension, evt) {
    console.log('[AI-COST] 📊 Carregando dimensão:', dimension);
    
    // Prevenir comportamento padrão
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    const loading = document.getElementById('dimensionLoading');
    const tableBody = document.getElementById('dimensionTableBody');

    try {
        if (loading) loading.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';

        const response = await authenticatedFetch('/api/ai-costs/aggregate', {
            method: 'POST',
            body: JSON.stringify({
                start_date: currentFilters.start_date,
                end_date: currentFilters.end_date,
                dimension: dimension
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];

        console.log('[AI-COST] ✅ Dados da dimensão recebidos:', data.length);

        if (loading) loading.style.display = 'none';

        if (data.length === 0) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <div class="icon">📊</div>
                            <h3>Nenhum dado encontrado</h3>
                            <p>Não foram encontrados dados para esta dimensão no período selecionado</p>
                        </td>
                    </tr>
                `;
            }
            return false;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.dimension_value || 'N/A'}</strong></td>
                <td>${formatNumber(item.request_count)}</td>
                <td class="cost-value">$${formatCurrency(item.total_cost)}</td>
                <td>${formatNumber(item.total_tokens)}</td>
            `;
            if (tableBody) tableBody.appendChild(row);
        });

        console.log('[AI-COST] ✅ Dimensão renderizada');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar dimensão:', error);
        if (loading) loading.style.display = 'none';
        
        // Mostrar erro na tabela
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="icon">⚠️</div>
                        <h3>Erro ao carregar dados</h3>
                        <p>${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
    
    return false;
}

// Carregar custos por evento
async function loadEventCosts() {
    const loading = document.getElementById('eventLoading');
    const tableBody = document.getElementById('eventTableBody');

    console.log('[AI-COST] 📊 Carregando custos por evento...');

    try {
        if (loading) loading.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';

        const response = await authenticatedFetch('/api/ai-costs/aggregate', {
            method: 'POST',
            body: JSON.stringify({
                start_date: currentFilters.start_date,
                end_date: currentFilters.end_date,
                dimension: 'event'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];

        console.log('[AI-COST] ✅ Eventos recebidos:', data.length);

        if (loading) loading.style.display = 'none';

        if (data.length === 0) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <div class="icon">🎯</div>
                            <h3>Nenhum evento com custos</h3>
                            <p>Não foram encontrados eventos com custos de IA no período selecionado</p>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.dimension_value || 'Sem evento'}</strong></td>
                <td>${formatNumber(item.request_count)}</td>
                <td class="cost-value">$${formatCurrency(item.total_cost)}</td>
                <td>${formatNumber(item.total_tokens)}</td>
            `;
            if (tableBody) tableBody.appendChild(row);
        });

        console.log('[AI-COST] ✅ Eventos renderizados');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar eventos:', error);
        if (loading) loading.style.display = 'none';
        
        // NÃO chamar showError que pode causar redirect
        // Mostrar erro diretamente na tabela
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <div class="icon">⚠️</div>
                        <h3>Erro ao carregar dados</h3>
                        <p>${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Carregar pedidos detalhados
async function loadDetailedRequests(page = 1) {
    const loading = document.getElementById('detailLoading');
    const tableBody = document.getElementById('detailTableBody');
    const pagination = document.getElementById('detailPagination');

    console.log('[AI-COST] 📋 Carregando pedidos detalhados, página:', page);

    try {
        if (loading) loading.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';

        const requestBody = {
            start_date: currentFilters.start_date,
            end_date: currentFilters.end_date,
            page: page,
            page_size: 50
        };

        if (currentFilters.service) requestBody.service = currentFilters.service;
        if (currentFilters.model) requestBody.model = currentFilters.model;
        if (currentFilters.event_id) requestBody.event_id = currentFilters.event_id;
        if (currentFilters.region) requestBody.region = currentFilters.region;

        const response = await authenticatedFetch('/api/ai-costs/query', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];
        const paginationData = result.pagination || {};

        console.log('[AI-COST] ✅ Pedidos recebidos:', data.length);

        if (loading) loading.style.display = 'none';

        if (data.length === 0) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <div class="icon">📋</div>
                            <h3>Nenhum pedido encontrado</h3>
                            <p>Não foram encontrados pedidos no período selecionado</p>
                        </td>
                    </tr>
                `;
            }
            if (pagination) pagination.style.display = 'none';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(new Date(item.timestamp))}</td>
                <td><span class="badge badge-info">${item.service || 'N/A'}</span></td>
                <td>${item.model || 'N/A'}</td>
                <td>${item.region || 'N/A'}</td>
                <td>${formatNumber(item.tokens_total)}</td>
                <td>${item.request_duration_ms || '-'}</td>
                <td class="cost-value">$${formatCurrency(item.cost_amount)}</td>
            `;
            if (tableBody) tableBody.appendChild(row);
        });

        // Atualizar paginação
        currentPage = paginationData.page || 1;
        totalPages = paginationData.total_pages || 1;
        
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        }
        if (pagination) pagination.style.display = 'flex';

        console.log('[AI-COST] ✅ Pedidos renderizados');

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao carregar pedidos:', error);
        if (loading) loading.style.display = 'none';
        
        // Mostrar erro na tabela ao invés de alert
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="icon">⚠️</div>
                        <h3>Erro ao carregar dados</h3>
                        <p>${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Aplicar filtros
function applyFilters(evt) {
    console.log('[AI-COST] Aplicando filtros...');
    
    // Prevenir comportamento padrão
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            showError('Por favor, selecione o período de análise');
            return false;
        }

        currentFilters.start_date = new Date(startDate).toISOString();
        currentFilters.end_date = new Date(endDate).toISOString();
        currentFilters.service = document.getElementById('serviceFilter').value || null;
        currentFilters.model = document.getElementById('modelFilter').value || null;
        currentFilters.event_id = document.getElementById('eventFilter').value || null;
        currentFilters.region = document.getElementById('regionFilter').value || null;

        console.log('[AI-COST] Filtros aplicados:', currentFilters);

        // Recarregar apenas a tab ativa
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabName = activeTab.textContent.trim();
            console.log('[AI-COST] Recarregando tab ativa:', tabName);
            
            // Sempre recarregar indicadores e a tab atual
            loadIndicators().catch(err => console.error('[AI-COST] Erro ao carregar indicadores:', err));
            
            if (tabName.includes('Temporal')) {
                loadTimeline().catch(err => console.error('[AI-COST] Erro ao carregar timeline:', err));
            } else if (tabName.includes('Dimensão')) {
                // Dimensão carrega on-demand quando clica nos botões
            } else if (tabName.includes('Evento')) {
                loadEventCosts().catch(err => console.error('[AI-COST] Erro ao carregar eventos:', err));
            } else if (tabName.includes('Pedidos')) {
                loadDetailedRequests().catch(err => console.error('[AI-COST] Erro ao carregar pedidos:', err));
            }
        }
    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao aplicar filtros:', error);
    }
    
    return false;
}

// Resetar filtros
function resetFilters(evt) {
    console.log('[AI-COST] Resetando filtros...');
    
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        document.getElementById('startDate').value = formatDateTimeLocal(thirtyDaysAgo);
        document.getElementById('endDate').value = formatDateTimeLocal(now);
        document.getElementById('serviceFilter').value = '';
        document.getElementById('modelFilter').value = '';
        document.getElementById('eventFilter').value = '';
        document.getElementById('regionFilter').value = '';

        currentFilters = {
            start_date: thirtyDaysAgo.toISOString(),
            end_date: now.toISOString(),
            service: null,
            model: null,
            event_id: null,
            region: null
        };

        console.log('[AI-COST] ✅ Filtros resetados');
        applyFilters();
    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao resetar filtros:', error);
    }
    
    return false;
}

// Exportar dados
async function exportData(evt) {
    console.log('[AI-COST] Exportando dados...');
    
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    try {
        const exportType = confirm('Exportar detalhes? (OK) ou agregações? (Cancelar)') 
            ? 'detail' 
            : 'aggregate';

        const requestBody = {
            start_date: currentFilters.start_date,
            end_date: currentFilters.end_date,
            export_type: exportType
        };

        if (currentFilters.service) requestBody.service = currentFilters.service;
        if (currentFilters.model) requestBody.model = currentFilters.model;
        if (currentFilters.event_id) requestBody.event_id = currentFilters.event_id;
        if (currentFilters.region) requestBody.region = currentFilters.region;
        
        const response = await fetch('/api/ai-costs/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',  // ✅ Envia cookies de sessão
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Erro ao exportar dados');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-costs-${exportType}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Erro ao exportar:', error);
        showError('Erro ao exportar dados');
    }
}

// Sincronizar custos
async function syncCosts(evt) {
    console.log('[AI-COST] Sincronizando custos...');
    
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    const syncButton = document.getElementById('syncButton');
    
    try {
        if (syncButton) {
            syncButton.disabled = true;
            syncButton.textContent = '🔄 Sincronizando...';
        }

        const response = await authenticatedFetch('/api/ai-costs/sync', {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok) {
            console.log('[AI-COST] ✅ Sincronização iniciada');
            alert('Sincronização iniciada com sucesso!');
            // Recarregar dados após alguns segundos
            setTimeout(() => {
                loadIndicators().catch(err => console.error('[AI-COST] Erro ao recarregar:', err));
                applyFilters();
            }, 3000);
        } else {
            console.error('[AI-COST] ❌ Erro na sincronização:', result.error);
            showError(result.error || 'Erro ao sincronizar');
        }

    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao sincronizar:', error);
        showError('Erro ao iniciar sincronização: ' + error.message);
    } finally {
        if (syncButton) {
            syncButton.disabled = false;
            syncButton.textContent = '🔄 Sincronizar agora';
        }
    }
    
    return false;
}

// Navegação de tabs
function switchTab(tabName, evt) {
    console.log('[AI-COST] Mudando para tab:', tabName);
    
    // Prevenir comportamento padrão e propagação
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    try {
        // Remover classe active de todas as tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Adicionar classe active à tab clicada
        if (evt && evt.target) {
            evt.target.classList.add('active');
        } else {
            // Fallback: encontrar o botão da tab pelo data attribute ou texto
            const tabButton = document.querySelector(`.tab[onclick*="${tabName}"]`);
            if (tabButton) {
                tabButton.classList.add('active');
            }
        }
        
        // Mostrar conteúdo da tab
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        // Carregar dados específicos da tab se necessário (assíncrono)
        setTimeout(() => {
            try {
                if (tabName === 'events') {
                    loadEventCosts().catch(err => {
                        console.error('[AI-COST] Erro ao carregar eventos:', err);
                    });
                } else if (tabName === 'detail') {
                    loadDetailedRequests().catch(err => {
                        console.error('[AI-COST] Erro ao carregar detalhes:', err);
                    });
                } else if (tabName === 'timeline') {
                    loadTimeline().catch(err => {
                        console.error('[AI-COST] Erro ao carregar timeline:', err);
                    });
                }
            } catch (error) {
                console.error('[AI-COST] ❌ Erro ao carregar dados da tab:', error);
            }
        }, 100);
        
        console.log('[AI-COST] ✅ Tab carregada:', tabName);
        
    } catch (error) {
        console.error('[AI-COST] ❌ Erro ao trocar de tab:', error);
    }
    
    return false; // Prevenir qualquer ação padrão
}

// Paginação
function previousPage(evt) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    if (currentPage > 1) {
        loadDetailedRequests(currentPage - 1).catch(err => {
            console.error('[AI-COST] Erro ao navegar:', err);
        });
    }
    
    return false;
}

function nextPage(evt) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    
    if (currentPage < totalPages) {
        loadDetailedRequests(currentPage + 1).catch(err => {
            console.error('[AI-COST] Erro ao navegar:', err);
        });
    }
    
    return false;
}

// Utilitários de formatação
function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(4);
}

function formatNumber(value) {
    const num = parseInt(value) || 0;
    return num.toLocaleString('pt-PT');
}

function formatDateTime(date) {
    return date.toLocaleString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Mostrar erro
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorContainer.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

