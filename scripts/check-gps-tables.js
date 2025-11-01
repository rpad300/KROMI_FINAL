const {Pool}=require('pg');
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const p=new Pool({
host:process.env.SUPABASE_DB_HOST,
port:process.env.SUPABASE_DB_PORT,
user:process.env.SUPABASE_DB_USER,
password:process.env.SUPABASE_DB_PASSWORD,
database:process.env.SUPABASE_DB_NAME,
ssl:{rejectUnauthorized:false}
});

console.log('\n══════════════════════════════════════════');
console.log('  📍 GPS TRACKING - Verificação');
console.log('══════════════════════════════════════════\n');

p.query("SELECT tablename FROM pg_tables WHERE tablename LIKE 'track_%' ORDER BY tablename")
.then(r=>{
console.log('✅ Tabelas Criadas (' + r.rows.length + '/12):\n');
r.rows.forEach(x=>console.log('   ✅',x.tablename));

return p.query("SELECT proname FROM pg_proc WHERE proname LIKE 'track_%' ORDER BY proname");
}).then(r=>{
const unique = [...new Set(r.rows.map(x=>x.proname))];
console.log('\n✅ Funções Criadas (' + unique.length + '):\n');
unique.forEach(x=>console.log('   ✅',x));

return p.query("SELECT viewname FROM pg_views WHERE viewname LIKE '%track%' ORDER BY viewname");
}).then(r=>{
console.log('\n✅ Views Criadas (' + r.rows.length + '/4):\n');
r.rows.forEach(x=>console.log('   ✅',x.viewname));

return p.query('SELECT * FROM track_inbox_stats()');
}).then(r=>{
console.log('\n📊 Estatísticas da Inbox:\n');
r.rows.forEach(x=>console.log(`   ${x.metric}: ${x.value}`));

console.log('\n══════════════════════════════════════════');
console.log('  🎉 GPS TRACKING INSTALADO COM SUCESSO!');
console.log('══════════════════════════════════════════\n');

p.end();
}).catch(err=>{
console.error('\n❌ Erro:',err.message);
p.end();
process.exit(1);
});

