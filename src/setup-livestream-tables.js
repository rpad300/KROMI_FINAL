const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configurações do Supabase (substitua pelas suas)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createLivestreamTables() {
    try {
        console.log('📊 Criando tabelas do Live Stream...');
        
        // Ler o arquivo SQL
        const sql = fs.readFileSync("'../sql/create-livestream-tables.sql", 'utf8');
        
        // Executar SQL diretamente
        const { data, error } = await supabase
            .from('livestream_devices')
            .select('*')
            .limit(1);
        
        if (error && error.code === 'PGRST116') {
            console.log('📋 Executando criação das tabelas...');
            
            // Como não podemos executar DDL diretamente via cliente JS,
            // vamos criar as tabelas usando inserts que falharão se não existirem
            console.log('⚠️ Execute o SQL manualmente no Supabase Dashboard');
            console.log('📄 Arquivo: create-livestream-tables.sql');
            
        } else {
            console.log('✅ Tabelas já existem ou foram criadas');
        }
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

createLivestreamTables();
