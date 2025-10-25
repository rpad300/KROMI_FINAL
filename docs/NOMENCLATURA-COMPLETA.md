# Sistema de Nomenclatura Completo - VisionKrono

## Visão Geral

O sistema de nomenclatura do VisionKrono foi expandido para suportar configurações avançadas de prefixos e sufixos com separadores personalizáveis, permitindo máxima flexibilidade na detecção de dorsais.

## Tipos de Nomenclatura Suportados

### 1. 🔢 Numérico (Padrão)
- **Descrição**: Números simples sequenciais
- **Exemplos**: 1, 2, 3, ..., 9999
- **Configurações**:
  - Número mínimo e máximo
  - Usar zeros à esquerda (padding)
  - Número de dígitos com padding

### 2. 📝 Com Prefixo
- **Descrição**: Prefixo + número
- **Exemplos**: M-407, F-156, PRO-023
- **Configurações**:
  - Prefixos permitidos (separados por vírgula)
  - Separador entre prefixo e número (configurável)
  - Opção de usar ou não separador
  - Faixa numérica após prefixo

### 3. 📝 Com Sufixo
- **Descrição**: Número + sufixo
- **Exemplos**: 407-M, 156-F, 023-PRO
- **Configurações**:
  - Sufixos permitidos (separados por vírgula)
  - Separador entre número e sufixo (configurável)
  - Opção de usar ou não separador
  - Faixa numérica antes do sufixo

### 4. 📝 Prefixo + Sufixo
- **Descrição**: Prefixo + número + sufixo
- **Exemplos**: M-407-F, PRO-023-ELITE
- **Configurações**:
  - Prefixos e sufixos permitidos
  - Separadores independentes para prefixo e sufixo
  - Opção de usar ou não cada separador
  - Faixa numérica central

### 5. 🎨 Marcadores de Cor
- **Descrição**: Cores antes/depois do número
- **Exemplos**: 🟢407🔴
- **Configurações**:
  - Cor de início e fim
  - Nomes das cores
  - Tolerância de cor (%)

### 6. ⚙️ Personalizado (Regex)
- **Descrição**: Padrão customizado com expressão regular
- **Exemplos**: A123, B456, C789
- **Configurações**:
  - Expressão regular personalizada
  - Exemplos para teste

## Separadores Configuráveis

### Tipos de Separadores Suportados
- **Hífen**: `-` (padrão)
- **Underscore**: `_`
- **Ponto**: `.`
- **Espaço**: ` ` (não recomendado)
- **Personalizado**: Qualquer caractere

### Configuração de Separadores
- **Prefixo**: Separador entre prefixo e número
- **Sufixo**: Separador entre número e sufixo
- **Independentes**: Cada separador pode ser configurado independentemente
- **Opcionais**: Cada separador pode ser habilitado/desabilitado

## Exemplos de Configuração

### Exemplo 1: Corrida com Categorias
```
Tipo: Prefixo + Sufixo
Prefixos: M, F, PRO
Sufixos: ELITE, AMADOR, JUNIOR
Separador Prefixo: - (habilitado)
Separador Sufixo: - (habilitado)
Resultado: M-407-ELITE, F-156-AMADOR, PRO-023-JUNIOR
```

### Exemplo 2: Triatlo com Distâncias
```
Tipo: Prefixo
Prefixos: SPRINT, OLYMPIC, IRONMAN
Separador: _ (habilitado)
Resultado: SPRINT_001, OLYMPIC_002, IRONMAN_003
```

### Exemplo 3: Ciclismo com Equipes
```
Tipo: Sufixo
Sufixos: TEAM1, TEAM2, INDIVIDUAL
Separador: . (habilitado)
Resultado: 001.TEAM1, 002.TEAM2, 003.INDIVIDUAL
```

### Exemplo 4: Sem Separadores
```
Tipo: Prefixo
Prefixos: A, B, C
Separador: - (desabilitado)
Resultado: A001, B002, C003
```

## Interface de Configuração

### Passo 2: Nomenclatura dos Dorsais
1. **Seleção do Tipo**: Escolha entre os 6 tipos disponíveis
2. **Configuração Específica**: Preencha os campos conforme o tipo selecionado
3. **Preview em Tempo Real**: Veja exemplos atualizados conforme você digita
4. **Validação**: Teste regex personalizado se aplicável

### Campos de Configuração

#### Prefixo
- **Prefixo(s) Permitidos**: Lista separada por vírgula
- **Separador**: Caractere entre prefixo e número
- **Usar Separador**: Checkbox para habilitar/desabilitar
- **Faixa Numérica**: Mínimo e máximo

#### Sufixo
- **Sufixo(s) Permitidos**: Lista separada por vírgula
- **Separador**: Caractere entre número e sufixo
- **Usar Separador**: Checkbox para habilitar/desabilitar
- **Faixa Numérica**: Mínimo e máximo

#### Prefixo + Sufixo
- **Prefixo(s) Permitidos**: Lista separada por vírgula
- **Sufixo(s) Permitidos**: Lista separada por vírgula
- **Separador Prefixo**: Caractere entre prefixo e número
- **Separador Sufixo**: Caractere entre número e sufixo
- **Usar Separadores**: Checkboxes independentes
- **Faixa Numérica**: Mínimo e máximo

## Salvamento e Persistência

### LocalStorage
- Configurações salvas localmente para persistência entre sessões
- Chave: `visionkrono_nomenclature_config`

### Supabase (Evento Ativo)
- Configurações salvas na tabela `event_configurations`
- Tipo: `nomenclature`
- Escopo: Por evento

### Estrutura de Dados
```json
{
  "type": "prefix-suffix",
  "prefixes": ["M", "F", "PRO"],
  "suffixes": ["ELITE", "AMADOR"],
  "prefixSeparator": "-",
  "suffixSeparator": "-",
  "usePrefixSeparator": true,
  "useSuffixSeparator": true,
  "min": 1,
  "max": 999
}
```

## Integração com IA

### Detecção Inteligente
- A IA usa as configurações de nomenclatura para detectar dorsais
- Suporte a múltiplos padrões simultâneos
- Validação automática de formato

### Exemplos de Detecção
- **M-407**: Detectado como prefixo "M" + número "407"
- **407-M**: Detectado como número "407" + sufixo "M"
- **M-407-ELITE**: Detectado como prefixo "M" + número "407" + sufixo "ELITE"

## Validação e Testes

### Preview em Tempo Real
- Exemplos atualizados conforme configuração
- Validação visual de formato
- Feedback imediato de mudanças

### Teste de Regex
- Validação de expressões regulares
- Teste com exemplos fornecidos
- Feedback de correspondência

## Casos de Uso Comuns

### 1. Corridas de Rua
- **Tipo**: Numérico
- **Configuração**: 1-9999, sem padding

### 2. Triatlo com Categorias
- **Tipo**: Prefixo + Sufixo
- **Configuração**: M/F + número + ELITE/AMADOR

### 3. Ciclismo por Equipes
- **Tipo**: Sufixo
- **Configuração**: Número + nome da equipe

### 4. Eventos Corporativos
- **Tipo**: Prefixo
- **Configuração**: Departamento + número

### 5. Eventos Internacionais
- **Tipo**: Personalizado (Regex)
- **Configuração**: Padrão específico do país

## Melhores Práticas

### 1. Simplicidade
- Use o tipo mais simples que atenda às necessidades
- Evite configurações desnecessariamente complexas

### 2. Consistência
- Mantenha o mesmo padrão em todo o evento
- Documente as convenções escolhidas

### 3. Testes
- Teste com exemplos reais antes do evento
- Valide com diferentes tipos de dorsais

### 4. Backup
- Salve configurações importantes
- Mantenha cópias de segurança

## Troubleshooting

### Problemas Comuns

#### 1. Dorsais Não Detectados
- Verifique se o formato está correto
- Confirme separadores e espaçamento
- Teste com exemplos conhecidos

#### 2. Detecções Incorretas
- Ajuste tolerância de cor (marcadores)
- Verifique regex personalizado
- Confirme faixas numéricas

#### 3. Performance Lenta
- Simplifique regex complexos
- Reduza número de padrões
- Use tipos mais específicos

### Logs e Debug
- Console do navegador para erros
- Logs de detecção em tempo real
- Validação de configurações

## Conclusão

O sistema de nomenclatura completo do VisionKrono oferece máxima flexibilidade para diferentes tipos de eventos esportivos, permitindo configurações precisas e detecção inteligente de dorsais com prefixos, sufixos e separadores personalizáveis.
