/**
 * ==========================================
 * BRANDING PAGES SCANNER - Kromi.online
 * ==========================================
 * Escaneia automaticamente todas as páginas do projeto
 * e sincroniza com o page_registry
 * ==========================================
 */

const fs = require('fs');
const path = require('path');

/**
 * Escanear todas as rotas do server.js e ficheiros HTML
 */
function scanProjectPages() {
    const pages = [];
    const srcDir = path.join(__dirname, '..', 'src');
    
    // Páginas conhecidas baseadas nas rotas do server.js e estrutura do projeto
    const knownPages = [
        // Páginas principais
        { route: '/', label: 'Home', priority: 1.0, changefreq: 'daily' },
        { route: '/index-kromi.html', label: 'Dashboard', priority: 0.9, changefreq: 'daily' },
        
        // Administração
        { route: '/usuarios.html', label: 'Utilizadores', priority: 0.8, changefreq: 'weekly' },
        { route: '/perfis-permissoes.html', label: 'Perfis & Permissões', priority: 0.7, changefreq: 'monthly' },
        { route: '/configuracoes.html', label: 'Configurações', priority: 0.8, changefreq: 'weekly' },
        { route: '/logs-auditoria.html', label: 'Logs de Auditoria', priority: 0.7, changefreq: 'daily' },
        { route: '/ai-cost-stats.html', label: 'AI Cost Stats', priority: 0.6, changefreq: 'weekly' },
        { route: '/branding-seo', label: 'Branding e SEO', priority: 0.7, changefreq: 'weekly' },
        { route: '/database-management-kromi.html', label: 'Gestão BD', priority: 0.6, changefreq: 'monthly' },
        { route: '/meu-perfil.html', label: 'Meu Perfil', priority: 0.7, changefreq: 'weekly' },
        
        // Eventos
        { route: '/events-kromi.html', label: 'Eventos', priority: 0.9, changefreq: 'daily' },
        { route: '/config-kromi.html', label: 'Configuração Evento', priority: 0.8, changefreq: 'weekly' },
        { route: '/participants-kromi.html', label: 'Participantes', priority: 0.8, changefreq: 'daily' },
        { route: '/classifications-kromi.html', label: 'Classificações', priority: 0.9, changefreq: 'hourly' },
        { route: '/category-rankings-kromi.html', label: 'Rankings por Escalão', priority: 0.8, changefreq: 'hourly' },
        { route: '/detection-kromi.html', label: 'Deteção', priority: 0.8, changefreq: 'always' },
        { route: '/detections-kromi.html', label: 'Deteções', priority: 0.7, changefreq: 'always' },
        { route: '/devices-kromi.html', label: 'Dispositivos', priority: 0.7, changefreq: 'weekly' },
        { route: '/image-processor-kromi.html', label: 'Processador IA', priority: 0.7, changefreq: 'weekly' },
        { route: '/calibration-kromi.html', label: 'Calibração', priority: 0.6, changefreq: 'monthly' },
        { route: '/checkpoint-order-kromi.html', label: 'Ordem Checkpoints', priority: 0.6, changefreq: 'monthly' },
        { route: '/live-stream.html', label: 'Live Stream', priority: 0.7, changefreq: 'always' },
        
        // Templates de Email
        { route: '/email-templates-platform.html', label: 'Templates Email Plataforma', priority: 0.6, changefreq: 'monthly' },
        { route: '/email-templates-event.html', label: 'Templates Email Evento', priority: 0.6, changefreq: 'monthly' },
    ];
    
    // Nota: Páginas são também automaticamente detectadas ao escanear ficheiros HTML
    
    // Escanear ficheiros HTML na pasta src
    try {
        if (fs.existsSync(srcDir)) {
            const files = fs.readdirSync(srcDir);
            files.forEach(file => {
                if (file.endsWith('.html') && 
                    !file.startsWith('_') && 
                    !file.includes('template') && 
                    !file.includes('test') &&
                    !file.includes('debug') &&
                    !file.includes('mockup') &&
                    !file.includes('example') &&
                    !file.includes('snippet')) {
                    
                    const route = `/${file}`;
                    
                    // Extrair label do nome do ficheiro
                    let label = file.replace('.html', '')
                        .replace(/-/g, ' ')
                        .replace(/kromi/gi, '')
                        .replace(/\bhtml\b/gi, '')
                        .trim();
                    
                    // Capitalizar primeira letra de cada palavra
                    label = label.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    // Verificar se já está na lista conhecida
                    if (!knownPages.find(p => p.route === route)) {
                        knownPages.push({
                            route,
                            label: label || file.replace('.html', ''),
                            priority: 0.5,
                            changefreq: 'weekly'
                        });
                    }
                }
            });
        }
    } catch (error) {
        console.warn('Erro ao escanear ficheiros HTML:', error.message);
    }
    
    return knownPages;
}

/**
 * Sincronizar páginas com o page_registry
 */
async function syncPagesWithRegistry(supabase) {
    try {
        const scannedPages = scanProjectPages();
        const existingPages = await supabase
            .from('page_registry')
            .select('route')
            .is('deleted_at', null);
        
        const existingRoutes = new Set((existingPages.data || []).map(p => p.route));
        
        const newPages = scannedPages.filter(p => !existingRoutes.has(p.route));
        
        if (newPages.length > 0) {
            console.log(`📄 Encontradas ${newPages.length} novas páginas para registar:`, newPages.map(p => p.route));
            
            const pagesToInsert = newPages.map(page => ({
                route: page.route,
                label: page.label,
                is_indexable: true,
                sitemap_priority: page.priority,
                changefreq: page.changefreq
            }));
            
            // Inserir em batches para evitar problemas
            const batchSize = 10;
            for (let i = 0; i < pagesToInsert.length; i += batchSize) {
                const batch = pagesToInsert.slice(i, i + batchSize);
                
                const { data, error } = await supabase
                    .from('page_registry')
                    .insert(batch)
                    .select();
                
                if (error) {
                    // Se erro de duplicado, ignorar
                    if (error.code !== '23505') {
                        console.error('Erro ao inserir batch de páginas:', error);
                    }
                } else if (data) {
                    console.log(`✅ ${data.length} páginas registadas no batch ${Math.floor(i/batchSize) + 1}`);
                }
            }
        } else {
            console.log('✅ Todas as páginas já estão registadas');
        }
        
        // Retornar todas as páginas (existentes + novas)
        const allPages = await supabase
            .from('page_registry')
            .select('*')
            .is('deleted_at', null)
            .order('route');
        
        return allPages.data || [];
    } catch (error) {
        console.error('Erro ao sincronizar páginas:', error);
        return [];
    }
}

module.exports = {
    scanProjectPages,
    syncPagesWithRegistry
};

