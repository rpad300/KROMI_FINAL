# Exemplo de Prompt Enviado ao Gemini para Geração de Metadados

Este documento mostra um exemplo real do prompt completo enviado ao Gemini quando se gera metadados para a página `ai-cost-stats.html`.

---

## Exemplo Completo do Prompt

```
Prompt para geração de metadados SEO em JSON, com qualidade de marketing

Objetivo
Gerar um único objeto JSON válido, em português, com metadados SEO e social, totalmente coerentes com o HTML fornecido. O foco é precisão, relevância e limites de caracteres.

Entrada
INFORMAÇÕES DA PÁGINA:
- Rota: /ai-cost-stats.html
- Nome/Label: AI Cost Stats

CONTEXTO DA PLATAFORMA (usa esta informação para adaptar todos os metadados):
- Objetivo: Revolucionar a cronometragem desportiva com inteligência artificial e visão computacional, oferecendo soluções automatizadas de gestão de eventos desportivos
- Descrição: O que é a Kromi.online
Plataforma SaaS de gestão e análise de eventos desportivos com tecnologia de visão computacional e IA. A Kromi.online oferece detecção automática de dorsais, análise de tempos em tempo real, classificação automática de resultados, relatórios estatísticos detalhados e dashboards interativos para organizadores de eventos desportivos. A plataforma permite integrar sistemas de cronometragem existentes, processar grandes volumes de dados de forma eficiente e publicar resultados de forma contínua.
- Público-Alvo: Para quem

Organizadores de corridas, maratonas, triatlos e outros eventos desportivos que precisam de soluções automatizadas de gestão e análise. Federações desportivas, clubes, entidades organizadoras e empresas de gestão de eventos que querem reduzir custos com cronometragem manual e melhorar a experiência dos participantes
- Características Principais: Detecção Automática de Dorsais, Análise de Tempos em Tempo Real, Classificação Automática de Resultados, Relatórios Estatísticos Detalhados, Dashboards Interativos, Integração com Sistemas Existentes, Processamento de Grandes Volumes de Dados, Publicação Contínua de Resultados
- Tom/Voz da Marca: Profissional, tecnológica e direta. Explica o técnico de forma acessível, foca em resultados e ROI, mantém um tom acessível e colaborativo.
- Personalidade da Marca: Tecnológica, precisa, eficiente
- Setor/Indústria: Gestão de Eventos Desportivos, Tecnologia Desportiva
- Casos de Uso: Maratonas e Corridas de Rua, Triatlos, Provas de Ciclismo, Eventos de Atletismo, Competições Escolares, Eventos Corporativos

IMPORTANTE: Considera este contexto ao gerar todos os metadados. Adapta os textos para refletir o objetivo, público-alvo, tom e personalidade da plataforma. Usa o contexto para criar mensagens mais precisas e alinhadas com a identidade da marca em cada plataforma social.

[COLE AQUI O CONTEÚDO HTML COMPLETO DA PÁGINA]
```html
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Cost Stats - VisionKrono</title>
    <!-- ... resto do HTML da página ai-cost-stats.html ... -->
    <!-- Exemplo: contém tabelas de custos de IA, gráficos, filtros por modelo, por serviço, etc. -->
</head>
<body>
    <!-- Conteúdo real da página com estatísticas de custos de IA -->
</body>
</html>
```

Instruções de qualidade

Analisa o HTML e identifica, de forma factual, o tema principal, intenção da página, público e proposta de valor.

Usa apenas informação presente no HTML. Não inventes atributos, números, benefícios ou ofertas.

Segue os limites de caracteres. Se necessário, reescreve e reduz.

Português pt-PT, tom profissional, claro e orientado a ação.

Evita duplicação entre title, description e OG/Twitter. Cada campo deve acrescentar.

Inclui palavras-chave reais do HTML. Prioriza termos com evidência de foco semântico, headings, âncoras e texto próximo de CTAs.

Mantém coerência de marca. Usa "kromi.online" como og_site_name.

Não inclui blocos de código nem qualquer texto fora do JSON.

Regras de conteúdo
• Title: 50 a 60 caracteres. Focado em benefício e intenção de pesquisa. Sem ponto final.
• Description: 140 a 160 caracteres. Benefício claro, diferenciação e CTA curto.
• Keywords: 6 a 10 termos, ordem por relevância, todos existentes no HTML, minúsculas, sem repetições, sem stopwords.
• Canonical: usa domínio https://kromi.online e infere a rota a partir de <link rel="canonical">, <meta property="og:url"> ou URL internas. Se não houver, usa a rota mais curta plausível com base no HTML.
• Robots: "index,follow", exceto se o HTML indicar página vazia, filtrada, privada ou duplicada. Nesses casos usa "noindex,nofollow".
• OG e Redes Sociais: Gera conteúdo ÚNICO e ADAPTADO para cada plataforma, respeitando limites mas criando mensagens diferentes conforme o público e características de cada rede:

  - Facebook (og_title, og_description): Tom profissional mas amigável, foco em comunidade e relacionamentos. Público: 25-65 anos, mix pessoal/profissional.
  
  - Instagram (instagram_title, instagram_description): Tom inspirador e visual, uso de hashtags implícitas, foco em estética e estilo de vida. Público: 18-34 anos, criativo, focado em imagem.
  
  - LinkedIn (linkedin_title, linkedin_description): Tom profissional e empresarial, foco em valor profissional, networking e carreira. Público: 25-55 anos, executivos e profissionais.
  
  - Twitter (twitter_title, twitter_description): Tom direto, conciso e urgente, pode usar emojis, foco em trending e notícias. Público: 18-49 anos, informado e engajado.
  
  - Google (google_title, google_description): Tom neutro e informativo, foco em palavras-chave relevantes e intenção de busca. Público: Todos, contexto de pesquisa.
  
  - TikTok (tiktok_title, tiktok_description): Tom jovem, dinâmico e casual, uso de linguagem atual, foco em entretenimento e tendências. Público: 16-24 anos, Gen Z, nativos digitais.
  
  - WhatsApp (whatsapp_title, whatsapp_description): Tom pessoal e conversacional, mensagem clara e direta para partilha entre contactos. Público: Todos os grupos etários, comunicação pessoal/profissional informal.
  
  - Telegram (telegram_title, telegram_description): Tom tecnológico e informativo, foco em privacidade e funcionalidade, público tech-savvy. Público: 18-45 anos, interessados em tecnologia e privacidade.

IMPORTANTE: Cada plataforma deve ter uma versão ÚNICA do título e descrição, adaptada ao seu público e características. Não uses o mesmo texto para todas.
• Structured data: usa Schema.org adequado ao tipo de página identificado no HTML.

Event: inclui pelo menos name, description, startDate, endDate, location.name, addressLocality, url.

Product: inclui name, description, sku se houver, brand se houver, offers.price e offers.priceCurrency se houver.

Article ou WebPage: mantém name e description, e inclui headline quando fizer sentido.

Só adiciona propriedades que existam no HTML.
• Normalização: remove espaços duplos solid, aspas tortas, emojis e UTM da canonical. Escapa aspas dentro de strings.

Validação antes de responder
• Confirma contagem de caracteres de TODOS os campos de título e descrição:
  - title, description (padrão)
  - og_title, og_description (Open Graph)
  - facebook_title, facebook_description (se diferentes de OG)
  - instagram_title, instagram_description (se diferentes de OG)
  - linkedin_title, linkedin_description (se diferentes de OG)
  - twitter_title, twitter_description (Twitter)
  - google_title, google_description (se diferentes do padrão)
  - tiktok_title, tiktok_description (se diferentes de OG)
  - whatsapp_title, whatsapp_description (se diferentes de OG)
  - telegram_title, telegram_description (se diferentes de OG)
• Garante JSON estrito, com aspas duplas, sem vírgulas finais e sem quebras de formato.
• Se faltar informação essencial, prioriza clareza e veracidade, mantendo limites e sem inventar.
• Para campos de plataformas sociais (Facebook, Instagram, LinkedIn, Twitter, Google, TikTok, WhatsApp, Telegram), deves SEMPRE gerar conteúdo ÚNICO e ADAPTADO para cada uma.

Esquema e output obrigatório
Responde apenas com um único JSON válido, com TODAS estas chaves preenchidas com conteúdo ÚNICO para cada plataforma. Cada plataforma tem público, tom e contexto diferentes - aproveita essas diferenças para criar mensagens mais efetivas.

IMPORTANTE: 
• Deves SEMPRE incluir TODAS as chaves abaixo preenchidas com conteúdo ÚNICO para cada plataforma.
• Cada plataforma (Facebook, Instagram, LinkedIn, Twitter, Google, TikTok, WhatsApp, Telegram) deve ter título e descrição ÚNICOS e ADAPTADOS ao seu público e estilo.
• NÃO uses o mesmo texto para todas as plataformas - adapta conforme as características descritas acima.
• Se uma plataforma precisa de tom mais formal, usa tom formal. Se precisa de tom mais casual, usa tom casual.
• Considera o contexto: LinkedIn = profissional, TikTok = jovem e dinâmico, WhatsApp = pessoal, etc.

{
  "title": "... 50-60 caracteres ...",
  "description": "... 140-160 caracteres com CTA ...",
  "keywords": ["termo1", "termo2", "termo3", "termo4", "termo5", "termo6"],
  "robots_directives": "index,follow",
  "canonical_url": "https://kromi.online/ai-cost-stats.html",
  "og_title": "... 55-60 caracteres ...",
  "og_description": "... 155-160 caracteres ...",
  "og_type": "website",
  "og_site_name": "kromi.online",
  "twitter_title": "... 55-60 caracteres - TOM DIRETO E CONCISO, pode usar emojis, foco em trending ...",
  "twitter_description": "... 155-160 caracteres - Descrição adaptada ao público Twitter (18-49 anos, informado, engajado, contexto de notícias) ...",
  "twitter_card": "summary_large_image",
  "facebook_title": "... 55-60 caracteres - TOM PROFISSIONAL AMIGÁVEL, foco em comunidade ...",
  "facebook_description": "... 155-160 caracteres - Descrição adaptada ao público Facebook (25-65 anos, mix pessoal/profissional) ...",
  "instagram_title": "... 55-60 caracteres - TOM INSPIRADOR E VISUAL, pode sugerir hashtags ...",
  "instagram_description": "... 155-160 caracteres - Descrição adaptada ao público Instagram (18-34 anos, criativo, focado em estética) ...",
  "linkedin_title": "... 55-60 caracteres - TOM PROFISSIONAL E EMPRESARIAL, valor para carreira ...",
  "linkedin_description": "... 155-160 caracteres - Descrição adaptada ao público LinkedIn (25-55 anos, executivos, foco em networking) ...",
  "google_title": "... 50-60 caracteres - TOM NEUTRO E INFORMATIVO, otimizado para busca ...",
  "google_description": "... 140-160 caracteres - Descrição otimizada para resultados de pesquisa (público geral, contexto de busca) ...",
  "tiktok_title": "... 55-60 caracteres - TOM JOVEM E DINÂMICO, linguagem atual e tendências ...",
  "tiktok_description": "... 155-160 caracteres - Descrição adaptada ao público TikTok (16-24 anos, Gen Z, entretenimento) ...",
  "whatsapp_title": "... 55-60 caracteres - TOM PESSOAL E CONVERSACIONAL, mensagem clara para partilha ...",
  "whatsapp_description": "... 155-160 caracteres - Descrição adaptada para WhatsApp (público geral, comunicação pessoal/informal) ...",
  "telegram_title": "... 55-60 caracteres - TOM TECNOLÓGICO E INFORMATIVO, foco em funcionalidade ...",
  "telegram_description": "... 155-160 caracteres - Descrição adaptada ao público Telegram (18-45 anos, tech-savvy, privacidade) ...",
  "structured_data_json": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "AI Cost Stats",
    "description": "Descrição baseada no conteúdo",
    "url": "https://kromi.online/ai-cost-stats.html"
  }
}

Notas finais
• Não incluas exemplos, explicações ou markdown.
• A resposta tem de ser apenas o JSON, pronto a colar.
• TODAS as chaves devem estar presentes no JSON, todas PREENCHIDAS (não vazias).
• Cada plataforma DEVE ter conteúdo ÚNICO adaptado ao seu público e características.
• Usa a informação do HTML para entender o tema e adapta o tom conforme a plataforma:
  * LinkedIn: formal, profissional, valor empresarial
  * Facebook: amigável, comunitário, acessível
  * Instagram: inspirador, visual, estético
  * Twitter: direto, atual, envolvido
  * TikTok: jovem, dinâmico, tendências
  * WhatsApp: pessoal, conversacional, claro
  * Telegram: tecnológico, informativo, funcional
  * Google: neutro, otimizado para busca, informativo
```

---

## Observações Importantes

### 1. **Contexto da Plataforma**
O contexto é incluído automaticamente quando:
- Existe um contexto publicado na tabela `platform_context` com `status = 'published'`
- O contexto inclui:
  - Objetivo da plataforma
  - Descrição detalhada
  - Público-alvo
  - Características principais
  - Tom/Voz da marca
  - Personalidade da marca
  - Setor/Indústria
  - Casos de uso

### 2. **HTML da Página**
O prompt inclui o **conteúdo HTML COMPLETO** da página (até 2MB, incluindo scripts, estilos e tudo), que permite ao Gemini analisar:
- Títulos e headings
- Conteúdo principal
- Palavras-chave presentes
- Contexto e propósito da página

### 3. **Adaptação por Plataforma**
O Gemini recebe instruções claras para criar conteúdo ÚNICO para cada plataforma social, adaptando:
- **Tom de voz** (profissional, casual, inspirador, etc.)
- **Público-alvo** específico de cada rede
- **Linguagem e estilo** apropriados

### 4. **Resposta Esperada**
O Gemini deve retornar **apenas um JSON válido** com todos os campos preenchidos, sem explicações ou markdown adicional.

---

## Como Funciona no Código

O prompt é construído em `src/branding-routes.js` na rota `POST /api/branding/generate-full-metadata/:pageId`:

1. **Busca os dados da página** da tabela `page_registry`
2. **Lê o ficheiro HTML** completo do disco
3. **Busca o contexto publicado** da plataforma
4. **Constrói o prompt** com todas as informações
5. **Envia ao Gemini** usando a biblioteca `@google/generative-ai`
6. **Tenta múltiplos modelos** em ordem de preferência (2.5 → 2.0 → 1.5 Pro → 1.5 Flash → Pro)
7. **Extrai e valida o JSON** da resposta
8. **Garante que todos os campos** estão presentes (preenche com vazios se necessário)

---

## Exemplo de Resposta JSON (Esperado)

```json
{
  "title": "AI Cost Stats: Analise e Otimize Seus Gastos com IA",
  "description": "Descubra as estatísticas de custos de IA e aprenda a otimizar seus gastos. Análise detalhada e estratégias eficazes. Saiba mais agora!",
  "keywords": ["ia", "custos", "estatísticas", "análise", "otimização", "gastos"],
  "robots_directives": "index,follow",
  "canonical_url": "https://kromi.online/ai-cost-stats.html",
  "og_title": "AI Cost Stats: Analise e Otimize Seus Gastos com IA",
  "og_description": "Descubra as estatísticas de custos de IA e aprenda a otimizar seus gastos na plataforma Kromi. Análise detalhada, relatórios e estratégias eficazes.",
  "og_type": "website",
  "og_site_name": "kromi.online",
  "twitter_title": "💰 AI Cost Stats: Analise Gastos com IA",
  "twitter_description": "Estatísticas de custos de IA na Kromi 📊 Aprenda a otimizar seus gastos com análise detalhada e estratégias eficazes! #IA #Custos",
  "twitter_card": "summary_large_image",
  "facebook_title": "AI Cost Stats: Analise e Otimize Seus Gastos",
  "facebook_description": "Descubra como analisar e otimizar os custos de IA na plataforma Kromi. Conecte-se com outros utilizadores e compartilhe estratégias para reduzir gastos.",
  "instagram_title": "AI Cost Stats 💫 Otimize Seus Gastos",
  "instagram_description": "Explore estatísticas visuais de custos de IA ✨ Aprenda estratégias para otimizar gastos e maximizar eficiência na plataforma Kromi.",
  "linkedin_title": "AI Cost Stats: Análise Profissional de Gastos",
  "linkedin_description": "Análise empresarial de custos de IA para profissionais. Descubra insights estratégicos para otimizar investimentos em inteligência artificial na Kromi.",
  "google_title": "AI Cost Stats - Análise de Custos de IA",
  "google_description": "Página de estatísticas e análise de custos de IA. Visualize gastos, compare modelos e otimize seus investimentos em inteligência artificial.",
  "tiktok_title": "💰 Gastos com IA Explicados",
  "tiktok_description": "Descobre quanto custa IA na prática! 📊 Análise de custos, dicas para economizar e comparação de modelos. Aprende tudo aqui!",
  "whatsapp_title": "AI Cost Stats: Veja Seus Gastos",
  "whatsapp_description": "Olha esta página sobre custos de IA! Mostra quanto gastas e como otimizar. Vale a pena ver 👀",
  "telegram_title": "AI Cost Stats - Análise Técnica",
  "telegram_description": "Análise técnica detalhada de custos de IA. Estatísticas, métricas e otimizações para desenvolvedores e técnicos na plataforma Kromi.",
  "structured_data_json": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "AI Cost Stats",
    "description": "Página de análise e estatísticas de custos de inteligência artificial",
    "url": "https://kromi.online/ai-cost-stats.html"
  }
}
```

---

## Notas Técnicas

- **Limite de HTML**: O HTML é enviado **COMPLETO SEM LIMPEZA** (incluindo scripts, estilos, comentários) e truncado em 2MB se exceder este tamanho (aproveitando o limite de 1 milhão de tokens do Gemini 1.5/2.0/2.5, que permite ~4MB de texto total. Mantemos 2MB de HTML para deixar espaço generoso para o prompt e resposta)
- **Modelos Gemini**: O sistema tenta automaticamente múltiplos modelos caso um falhe
- **Validação**: Todos os campos são validados e preenchidos com valores padrão se necessário
- **Encoding**: O prompt e resposta são em português (pt-PT)

