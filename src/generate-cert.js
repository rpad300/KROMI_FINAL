const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

console.log('🔐 Gerando certificado SSL auto-assinado...');

// Criar diretório certs se não existir
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
}

try {
    // Configurar atributos do certificado
    const attrs = [
        { name: 'countryName', value: 'PT' },
        { name: 'stateOrProvinceName', value: 'Lisboa' },
        { name: 'localityName', value: 'Lisboa' },
        { name: 'organizationName', value: 'VisionKrono' },
        { name: 'commonName', value: 'localhost' }
    ];

    // Configurar opções do certificado
    const options = {
        keySize: 2048,
        days: 365,
        algorithm: 'sha256',
        extensions: [
            {
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 2, value: '127.0.0.1' },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: '::1' }
                ]
            }
        ]
    };

    // Gerar certificado auto-assinado
    const pems = selfsigned.generate(attrs, options);

    // Salvar arquivos
    fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);

    console.log('✅ Certificado SSL gerado com sucesso!');
    console.log('📁 Arquivos criados:');
    console.log('   - certs/key.pem (chave privada)');
    console.log('   - certs/cert.pem (certificado)');

} catch (error) {
    console.error('❌ Erro ao gerar certificado:', error.message);
    process.exit(1);
}

console.log('\n🚀 Agora execute: npm start');
console.log('🌐 Acesse: https://localhost:1144');
console.log('📱 No telemóvel, aceite o certificado auto-assinado quando solicitado');
