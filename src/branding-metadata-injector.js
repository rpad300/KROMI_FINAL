/**
 * ==========================================
 * BRANDING METADATA INJECTOR - Kromi.online
 * ==========================================
 * Injeta metadados SEO dinamicamente nas páginas HTML
 * baseado nos dados do page_meta publicado
 * ==========================================
 */

const fs = require('fs');
const path = require('path');

/**
 * Função para injetar metadados SEO no HTML
 */
async function injectPageMetadata(htmlContent, route, supabaseAdmin) {
    try {
        // Buscar página no registo
        const { data: pageData, error: pageError } = await supabaseAdmin
            .from('page_registry')
            .select('id, route')
            .eq('route', route)
            .is('deleted_at', null)
            .single();
        
        if (pageError || !pageData) {
            // Página não encontrada no registo, retornar original
            return htmlContent;
        }
        
        // Buscar metadados publicados
        const { data: metaData, error: metaError } = await supabaseAdmin
            .from('page_meta')
            .select('*')
            .eq('page_id', pageData.id)
            .eq('status', 'published')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (metaError || !metaData) {
            // Sem metadados publicados, retornar original
            return htmlContent;
        }
        
        // Buscar thumbnails publicados
        const { data: thumbnails } = await supabaseAdmin
            .from('page_thumbnails')
            .select('usage, file_path')
            .eq('page_id', pageData.id)
            .eq('status', 'published')
            .is('deleted_at', null);
        
        // Buscar também dados da página para canonical URL
        const { data: pageInfo } = await supabaseAdmin
            .from('page_registry')
            .select('route')
            .eq('id', pageData.id)
            .single();
        
        // Combinar dados
        const meta = {
            ...metaData,
            og_image: thumbnails?.find(t => t.usage === 'og_image')?.file_path || metaData.og_image,
            twitter_image: thumbnails?.find(t => t.usage === 'twitter_image')?.file_path || metaData.twitter_image
        };
        
        // Adicionar info da página para uso no processMetadata
        meta.pageRoute = pageInfo?.route;
        
        return processMetadata(htmlContent, meta);
        
    } catch (error) {
        console.warn('Erro ao buscar metadados para rota', route, ':', error.message);
        return htmlContent; // Retornar original em caso de erro
    }
}

/**
 * Processar e injetar metadados no HTML
 */
function processMetadata(htmlContent, meta) {
    try {
        // Construir meta tags
        let metaTags = '';
        
        // Title
        if (meta.title) {
            metaTags += `    <title>${escapeHtml(meta.title)}</title>\n`;
        }
        
        // Meta Description
        if (meta.description) {
            metaTags += `    <meta name="description" content="${escapeHtml(meta.description)}">\n`;
        }
        
        // Keywords
        if (meta.keywords && Array.isArray(meta.keywords) && meta.keywords.length > 0) {
            metaTags += `    <meta name="keywords" content="${escapeHtml(meta.keywords.join(', '))}">\n`;
        }
        
        // Robots
        if (meta.robots_directives) {
            metaTags += `    <meta name="robots" content="${escapeHtml(meta.robots_directives)}">\n`;
        }
        
        // Canonical URL
        if (meta.canonical_url) {
            metaTags += `    <link rel="canonical" href="${escapeHtml(meta.canonical_url)}">\n`;
        }
        
        // Open Graph (Facebook, Instagram, LinkedIn, TikTok, WhatsApp, Telegram)
        // Determinar títulos e descrições específicos ou usar OG como fallback
        const facebookTitle = meta.facebook_title || meta.og_title || meta.title;
        const facebookDesc = meta.facebook_description || meta.og_description || meta.description;
        const instagramTitle = meta.instagram_title || meta.og_title || meta.title;
        const instagramDesc = meta.instagram_description || meta.og_description || meta.description;
        const linkedinTitle = meta.linkedin_title || meta.og_title || meta.title;
        const linkedinDesc = meta.linkedin_description || meta.og_description || meta.description;
        const whatsappTitle = meta.whatsapp_title || meta.og_title || meta.title;
        const whatsappDesc = meta.whatsapp_description || meta.og_description || meta.description;
        const telegramTitle = meta.telegram_title || meta.og_title || meta.title;
        const telegramDesc = meta.telegram_description || meta.og_description || meta.description;
        
        if (meta.og_title || meta.og_description || meta.og_image || facebookTitle || instagramTitle || linkedinTitle || whatsappTitle || telegramTitle) {
            metaTags += '\n    <!-- Open Graph (Facebook, Instagram, LinkedIn, TikTok, WhatsApp, Telegram) -->\n';
            metaTags += `    <meta property="og:type" content="${meta.og_type || 'website'}">\n`;
            
            // Usar título mais específico disponível (prioridade: Facebook > Instagram > LinkedIn > WhatsApp > Telegram > OG > Title)
            const ogTitle = facebookTitle || instagramTitle || linkedinTitle || whatsappTitle || telegramTitle || meta.og_title || meta.title;
            if (ogTitle) {
                metaTags += `    <meta property="og:title" content="${escapeHtml(ogTitle)}">\n`;
            }
            
            // Descrição (mesma lógica)
            const ogDesc = facebookDesc || instagramDesc || linkedinDesc || whatsappDesc || telegramDesc || meta.og_description || meta.description;
            if (ogDesc) {
                metaTags += `    <meta property="og:description" content="${escapeHtml(ogDesc)}">\n`;
            }
            
            // URL
            const canonicalUrl = meta.canonical_url || (meta.pageRoute ? `https://kromi.online${meta.pageRoute}` : '');
            if (canonicalUrl) {
                metaTags += `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">\n`;
            }
            
            if (meta.og_image) {
                let imageUrl = meta.og_image;
                if (!imageUrl.startsWith('http')) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    imageUrl = `${supabaseUrl}/storage/v1/object/public/media-originals/${meta.og_image}`;
                }
                metaTags += `    <meta property="og:image" content="${escapeHtml(imageUrl)}">\n`;
                metaTags += `    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">\n`;
                metaTags += `    <meta property="og:image:type" content="image/jpeg">\n`;
            }
            if (meta.og_site_name) {
                metaTags += `    <meta property="og:site_name" content="${escapeHtml(meta.og_site_name)}">\n`;
            }
        }
        
        // Twitter Card
        if (meta.twitter_title || meta.twitter_description || meta.twitter_image) {
            metaTags += '\n    <!-- Twitter Card -->\n';
            metaTags += `    <meta name="twitter:card" content="${meta.twitter_card || 'summary_large_image'}">\n`;
            const twitterTitle = meta.twitter_title || meta.og_title || meta.title;
            const twitterDesc = meta.twitter_description || meta.og_description || meta.description;
            if (twitterTitle) {
                metaTags += `    <meta name="twitter:title" content="${escapeHtml(twitterTitle)}">\n`;
            }
            if (twitterDesc) {
                metaTags += `    <meta name="twitter:description" content="${escapeHtml(twitterDesc)}">\n`;
            }
            if (meta.twitter_image) {
                let imageUrl = meta.twitter_image;
                if (!imageUrl.startsWith('http')) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    imageUrl = `${supabaseUrl}/storage/v1/object/public/media-originals/${meta.twitter_image}`;
                }
                metaTags += `    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">\n`;
            }
        }
        
        // Google - usa title/description padrão, mas podemos usar campos específicos no structured data
        // (Google não tem meta tags específicas, usa <title> e <meta name="description"> já incluídos acima)
        if (meta.google_title && meta.google_title !== meta.title) {
            // Se houver título específico para Google diferente do principal, pode ser usado no structured data
            // Mas Google sempre usa o <title> principal, então apenas documentamos
        }
        if (meta.google_description && meta.google_description !== meta.description) {
            // Google sempre usa meta description padrão, mas podemos documentar
        }
        
        // TikTok, WhatsApp e Telegram - usam Open Graph (já coberto acima)
        // Estas plataformas não têm meta tags específicas próprias, usam Open Graph para previews quando links são partilhados
        
        // Structured Data (JSON-LD)
        if (meta.structured_data_json) {
            metaTags += '\n    <!-- Structured Data -->\n';
            metaTags += `    <script type="application/ld+json">\n${JSON.stringify(meta.structured_data_json, null, 8)}\n    </script>\n`;
        }
        
        // Se não há meta tags para injetar, retornar original
        if (!metaTags) {
            return htmlContent;
        }
        
        // Procurar por <head> e injetar antes do fechamento ou após abertura
        // Estratégia: procurar por </head> ou <title> existente e substituir/injetar
        
        // Estratégia de injeção: substituir <title> existente e adicionar outros meta tags antes de </head>
        if (metaTags.includes('<title>')) {
            // Extrair apenas o <title> para substituição
            const titleMatch = metaTags.match(/<title>.*?<\/title>/s);
            if (titleMatch && htmlContent.includes('<title>')) {
                // Substituir title existente
                htmlContent = htmlContent.replace(/<title>.*?<\/title>/is, titleMatch[0]);
                // Remover title dos metaTags para não duplicar
                metaTags = metaTags.replace(/<title>.*?<\/title>\s*/is, '');
            }
        }
        
        // Injetar todos os outros meta tags antes de </head>
        if (metaTags.trim()) {
            // Verificar se já não foi injetado (por segurança)
            const firstTag = metaTags.trim().split('\n')[0];
            if (!htmlContent.includes(firstTag)) {
                htmlContent = htmlContent.replace(/<\/head>/i, `    ${metaTags.trim()}\n</head>`);
            }
        }
        
        return htmlContent;
        
    } catch (error) {
        console.error('Erro ao processar metadados:', error);
        return htmlContent; // Retornar original em caso de erro
    }
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Função helper para servir HTML com metadados injetados
 */
async function sendFileWithMetadata(filePath, route, res, supabaseAdmin) {
    try {
        // Ler ficheiro HTML
        let htmlContent = fs.readFileSync(filePath, 'utf8');
        
        // Tentar várias variações da rota
        const possibleRoutes = [
            route,
            route === '/' ? '/' : route,
            route.endsWith('.html') ? route : `${route}.html`,
            route.endsWith('.html') ? route.replace('.html', '') : route,
            `/${path.basename(filePath)}` // Nome do ficheiro como rota
        ];
        
        // Remover duplicados
        const uniqueRoutes = [...new Set(possibleRoutes)];
        
        // Tentar injetar metadados (tentar todas as rotas possíveis)
        for (const tryRoute of uniqueRoutes) {
            htmlContent = await injectPageMetadata(htmlContent, tryRoute, supabaseAdmin);
        }
        
        // Enviar HTML com metadados injetados
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
        
    } catch (error) {
        console.error('Erro ao processar HTML com metadados:', error);
        // Fallback: enviar ficheiro original
        res.sendFile(filePath);
    }
}

/**
 * Middleware para injetar metadados automaticamente em todas as respostas HTML
 */
function createHtmlMetadataMiddleware(supabaseAdmin) {
    return async function(req, res, next) {
        // Guardar método original sendFile
        const originalSendFile = res.sendFile.bind(res);
        const originalSend = res.send.bind(res);
        const originalEnd = res.end.bind(res);
        
        // Interceptar sendFile
        res.sendFile = function(filePath, options, callback) {
            // Verificar se é HTML
            if (filePath && typeof filePath === 'string' && filePath.endsWith('.html')) {
                const route = req.path || req.originalUrl || req.url;
                return sendFileWithMetadata(filePath, route, res, supabaseAdmin);
            }
            
            // Não é HTML: comportamento normal
            return originalSendFile(filePath, options, callback);
        };
        
        // Interceptar res.send para HTML em string
        res.send = function(body) {
            // Verificar se é HTML string
            if (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE html>')) {
                const route = req.path || req.originalUrl || req.url;
                // Processar HTML string
                injectPageMetadata(body, route, supabaseAdmin).then(html => {
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    originalSend(html);
                }).catch(() => {
                    originalSend(body);
                });
                return res;
            }
            
            // Não é HTML: comportamento normal
            return originalSend(body);
        };
        
        next();
    };
}

module.exports = {
    injectPageMetadata,
    createHtmlMetadataMiddleware,
    sendFileWithMetadata,
    escapeHtml
};

