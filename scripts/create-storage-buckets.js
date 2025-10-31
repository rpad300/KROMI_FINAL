/**
 * Script para criar os buckets de Storage necessários para o sistema de Branding & SEO
 * 
 * Uso: node scripts/create-storage-buckets.js
 * 
 * Requer variáveis de ambiente:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY como fallback)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

// Tentar diferentes variáveis de ambiente comuns do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     process.env.REACT_APP_SUPABASE_URL ||
                     process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                              process.env.SUPABASE_SERVICE_KEY ||
                              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                              process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
    console.error('❌ URL do Supabase não encontrada!');
    console.error('   Procurou por: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, REACT_APP_SUPABASE_URL, VITE_SUPABASE_URL');
    console.error('   Por favor, adicione uma dessas variáveis ao arquivo .env');
    process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Service Role Key do Supabase não encontrada!');
    console.error('   Procurou por: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY');
    console.error('   Por favor, adicione SUPABASE_SERVICE_ROLE_KEY ao arquivo .env');
    console.error('   (Obter em: Supabase Dashboard → Settings → API → service_role key)');
    process.exit(1);
}

// Buckets a criar
const buckets = [
    {
        name: 'media-originals',
        public: false,
        file_size_limit: 5242880, // 5 MB
        allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/svg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']
    },
    {
        name: 'media-processed',
        public: true, // Ficheiros processados podem ser públicos
        file_size_limit: 5242880,
        allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    },
    {
        name: 'favicons-and-manifest',
        public: true, // Favicons devem ser públicos
        file_size_limit: 1048576, // 1 MB
        allowed_mime_types: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'application/json']
    }
];

function makeRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const protocol = urlObj.protocol === 'https:' ? https : require('http');
        
        const req = protocol.request(requestOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: parsed });
                    } else {
                        reject({ status: res.statusCode, error: parsed, body });
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, data: body });
                    } else {
                        reject({ status: res.statusCode, error: { message: body }, body });
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject({ status: 0, error: { message: error.message }, networkError: true });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function checkBucketExists(bucketName) {
    try {
        const url = `${SUPABASE_URL}/storage/v1/bucket/${bucketName}`;
        await makeRequest(url, { method: 'GET' });
        return true;
    } catch (error) {
        // 404 significa que o bucket não existe, o que é normal
        if (error.status === 404 || (error.error && error.error.message && error.error.message.includes('not found'))) {
            return false;
        }
        // Outros erros são reais erros
        console.warn(`⚠️ Erro ao verificar bucket "${bucketName}":`, error.error?.message || error.message);
        return false;
    }
}

async function createBucket(bucket) {
    try {
        // Verificar se já existe
        console.log(`🔍 Verificando se bucket "${bucket.name}" existe...`);
        const exists = await checkBucketExists(bucket.name);
        if (exists) {
            console.log(`✅ Bucket "${bucket.name}" já existe, ignorando...`);
            return true;
        }

        console.log(`📦 Criando bucket "${bucket.name}"...`);
        const url = `${SUPABASE_URL}/storage/v1/bucket`;
        
        console.log(`   URL: ${url}`);
        console.log(`   Config: ${JSON.stringify({
            name: bucket.name,
            public: bucket.public,
            file_size_limit: bucket.file_size_limit,
            allowed_mime_types: bucket.allowed_mime_types
        }, null, 2)}`);
        
        const result = await makeRequest(url, { method: 'POST' }, {
            name: bucket.name,
            public: bucket.public,
            file_size_limit: bucket.file_size_limit,
            allowed_mime_types: bucket.allowed_mime_types
        });

        console.log(`✅ Bucket "${bucket.name}" criado com sucesso!`);
        return true;
    } catch (error) {
        if (error.networkError) {
            console.error(`❌ Erro de rede ao criar bucket "${bucket.name}":`, error.error.message);
            console.error(`   Verifique se a URL do Supabase está correta e se está acessível`);
            return false;
        }
        
        if (error.status === 404 && error.error && error.error.message && error.error.message.includes('not found')) {
            console.error(`❌ Endpoint não encontrado. Verifique se a URL do Supabase está correta.`);
            console.error(`   URL usada: ${SUPABASE_URL}/storage/v1/bucket`);
            return false;
        }
        
        if (error.error && error.error.message) {
            if (error.error.message.includes('already exists') || error.error.message.includes('duplicate')) {
                console.log(`✅ Bucket "${bucket.name}" já existe`);
                return true;
            }
            console.error(`❌ Erro ao criar bucket "${bucket.name}":`, error.error.message);
            if (error.body) {
                console.error(`   Detalhes: ${error.body}`);
            }
        } else {
            console.error(`❌ Erro ao criar bucket "${bucket.name}":`, error);
        }
        return false;
    }
}

async function main() {
    console.log('🚀 Iniciando criação de buckets de Storage...\n');
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...${SUPABASE_SERVICE_KEY.substring(SUPABASE_SERVICE_KEY.length - 10)} (${SUPABASE_SERVICE_KEY.length} chars)\n`);

    let successCount = 0;
    let failCount = 0;

    for (const bucket of buckets) {
        const success = await createBucket(bucket);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        console.log(''); // Linha em branco entre buckets
    }

    console.log('═══════════════════════════════════════');
    console.log(`✅ Sucesso: ${successCount}/${buckets.length}`);
    if (failCount > 0) {
        console.log(`❌ Falhas: ${failCount}/${buckets.length}`);
    }
    console.log('═══════════════════════════════════════\n');

    if (failCount > 0) {
        console.log('⚠️  Alguns buckets não foram criados. Verifique os erros acima.');
        console.log('💡 Você pode criar os buckets manualmente no Supabase Dashboard:');
        console.log('   Storage > New Bucket\n');
        process.exit(1);
    } else {
        console.log('🎉 Todos os buckets criados com sucesso!');
    }
}

main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});

