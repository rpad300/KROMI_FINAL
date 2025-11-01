/**
 * Configurar UIs do GPS Tracking com credenciais reais do .env
 */

const fs = require('fs');
const path = require('path');

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não encontrados no .env');
    process.exit(1);
}

console.log('\n📝 Configurando UIs do GPS Tracking...\n');

const files = [
    'src/event-gps-tracking.html',
    'src/tracking/track-routes-manager.html',
    'src/tracking/track-qr-manager.html',
    'src/tracking/track-live-map.html',
    'src/tracking/track-rankings.html'
];

let configured = 0;

files.forEach(file => {
    const filepath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filepath)) {
        console.log(`⚠️  ${file} - Não encontrado, pulando...`);
        return;
    }
    
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Substituir placeholders
    content = content.replace(/const SUPABASE_URL = ['"]YOUR_SUPABASE_URL['"];?/g, 
        `const SUPABASE_URL = '${SUPABASE_URL}';`);
    content = content.replace(/const SUPABASE_KEY = ['"]YOUR_SUPABASE_ANON_KEY['"];?/g,
        `const SUPABASE_KEY = '${SUPABASE_KEY}';`);
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ${file}`);
    configured++;
});

console.log(`\n✅ ${configured}/${files.length} ficheiros configurados!\n`);
console.log('Próximo passo: Abrir src/event-gps-tracking.html no navegador!\n');

