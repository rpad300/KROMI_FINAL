# VisionKrono - Detector de Dorsais

Uma webapp que utiliza o Vertex AI Vision do Google para detectar números de dorsais em tempo real através da câmera, registrando automaticamente o número, hora de passagem e coordenadas GPS.

## Funcionalidades

- 🎥 **Acesso à câmera em tempo real** - A câmera ocupa toda a área da tela
- 🔍 **Detecção automática de dorsais** - Usando Vertex AI Vision do Google
- 📍 **Registro de GPS** - Captura coordenadas de localização
- ⏰ **Timestamp preciso** - Hora exata da detecção
- 📱 **Interface responsiva** - Funciona em desktop, tablet e mobile
- 💾 **Export de dados** - Download dos registros em formato TXT
- 🎨 **Interface overlay** - Todos os controles são sobrepostos à câmera

## Como usar

1. **Configuração inicial:**
   - Copie `env.example` para `.env`
   - Configure sua API Key do Google Vertex AI
   - Configure seu Project ID do Google Cloud

2. **Executar a aplicação:**
   - Abra `index.html` em um navegador
   - Permita acesso à câmera quando solicitado
   - Permita acesso à localização GPS

3. **Operação:**
   - Clique em "Iniciar Detecção" para começar
   - Aponte a câmera para os dorsais
   - Os números detectados aparecerão no painel lateral
   - Use "Download Registros" para baixar os dados

## Configuração do Google Cloud

1. **Acesse o Google Cloud Console**
2. **Ative a Vision API**
3. **Crie uma API Key**
4. **Configure no arquivo .env**

## Configuração do Supabase (Opcional)

O Supabase permite dashboard em tempo real e sincronização entre dispositivos:

1. **Crie um projeto no Supabase:**
   - Acesse https://supabase.com
   - Crie um novo projeto
   - Anote a URL e ANON KEY

2. **Configure a base de dados:**
   - Execute o script `supabase-setup.sql` no SQL Editor
   - Isso criará a tabela `detections` e políticas necessárias

3. **Configure no arquivo .env:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

4. **Funcionalidades com Supabase:**
   - Dashboard em tempo real no desktop
   - Sincronização entre dispositivos
   - Histórico persistente de detecções
   - Estatísticas avançadas

## Estrutura do projeto

```
visionkrono/
├── index.html          # Interface principal
├── styles.css          # Estilos responsivos
├── app.js             # Lógica da aplicação
├── env.example        # Exemplo de configuração
└── README.md          # Este arquivo
```

## Tecnologias utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **APIs:** MediaStream API, Geolocation API
- **IA:** Google Vertex AI Vision
- **Responsividade:** CSS Grid/Flexbox

## Formato dos registros

Os registros são salvos em formato TXT com as seguintes informações:

```
Registro 1:
Dorsal: 1234
Data/Hora: 22/10/2025 14:30:25
GPS: -23.550520, -46.633309
Precisão: 5m
```

## Requisitos

- Navegador moderno com suporte a MediaStream API
- Conexão com internet para API do Google
- Permissões de câmera e localização
- API Key válida do Google Vertex AI

## Compatibilidade

- ✅ Chrome/Chromium 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Desenvolvimento

Para desenvolvimento local, você pode usar a simulação de detecção que está implementada como fallback quando a API não está disponível.

## Licença

MIT License
