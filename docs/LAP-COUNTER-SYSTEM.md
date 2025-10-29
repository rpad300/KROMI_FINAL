# 🔄 Sistema de Contador de Voltas - VisionKrono

## 📋 Visão Geral

O sistema de contador de voltas permite cronometrar eventos com múltiplas voltas, calculando automaticamente estatísticas detalhadas de cada volta completada.

## 🎯 Funcionalidades Implementadas

### ✅ **1. Configuração de Modalidades**
- Campo `has_lap_counter` na tabela `event_modalities`
- Modalidades como Ciclismo, Triatlo e Atletismo já configuradas com contador de voltas

### ✅ **2. Tipos de Checkpoints**
- Novo tipo `lap_counter` (Contador de Voltas) criado
- Ícone: 🔄, Cor: Roxo (#8b5cf6)
- Configurado como checkpoint intermediário que gera splits

### ✅ **3. Interface de Configuração**
- Seção dedicada para configuração de contador de voltas
- Campos para:
  - Ativar/desativar contador de voltas
  - Distância por volta (km)
  - Total de voltas esperadas
  - Mínimo de voltas para classificar
- Validação em tempo real dos dispositivos necessários

### ✅ **4. Sistema de Classificações Dinâmico**
- **Com voltas**: Ordenação por número de voltas (desc) + tempo total (asc)
- **Sem voltas**: Ordenação apenas por tempo total
- Coluna adicional de voltas quando ativado
- Estatísticas por volta: melhor volta, velocidade média

### ✅ **5. Validação de Dispositivos**
- Mínimo 1 dispositivo com checkpoint "Contador de Voltas"
- Mínimo 1 dispositivo com checkpoint "Meta"
- Validação automática na interface

## 🗄️ Estrutura da Base de Dados

### **Tabelas Criadas:**

#### `lap_data`
```sql
- id (UUID)
- event_id (UUID) - Referência ao evento
- dorsal_number (INTEGER) - Número do dorsal
- lap_number (INTEGER) - Número da volta
- lap_time (INTERVAL) - Tempo da volta
- lap_speed_kmh (DECIMAL) - Velocidade da volta
- checkpoint_time (TIMESTAMPTZ) - Momento da passagem
- device_id (UUID) - Dispositivo que detectou
- detection_id (UUID) - Detecção associada
```

#### `event_lap_config`
```sql
- id (UUID)
- event_id (UUID) - Referência ao evento
- modality_id (UUID) - Modalidade (opcional)
- has_lap_counter (BOOLEAN) - Se tem contador
- lap_distance_km (DECIMAL) - Distância por volta
- total_laps (INTEGER) - Total esperado
- min_laps_for_classification (INTEGER) - Mínimo para classificar
```

### **Funções SQL:**

#### `calculate_lap_statistics(event_id, dorsal_number)`
Retorna estatísticas de voltas para um participante:
- Total de voltas
- Volta mais rápida/lenta
- Tempo médio por volta
- Velocidade média e máxima

#### `validate_lap_counter_setup(event_id)`
Valida se a configuração de voltas está correta:
- Verifica dispositivos necessários
- Retorna true/false

#### `configure_lap_counter(...)`
Configura o sistema de voltas para um evento:
- Atualiza configurações
- Valida automaticamente
- Retorna sucesso/erro

## 🚀 Como Usar

### **1. Configurar Evento com Voltas**

1. Acesse a página de configurações do evento
2. Na seção "Configuração de Contador de Voltas":
   - Selecione "Ativado" no campo "Contador de Voltas"
   - Defina a distância por volta (ex: 2.5 km)
   - Defina total de voltas esperadas (ex: 10)
   - Defina mínimo para classificar (ex: 1)
3. Salve as configurações

### **2. Configurar Dispositivos**

1. Configure pelo menos 1 dispositivo com checkpoint tipo "Contador de Voltas"
2. Configure pelo menos 1 dispositivo com checkpoint tipo "Meta"
3. A validação mostrará se a configuração está correta

### **3. Visualizar Classificações**

- **Sem voltas**: Tabela normal com tempo total
- **Com voltas**: Coluna adicional "Voltas" mostrando:
  - Número total de voltas
  - Melhor volta (tempo)
  - Velocidade média por volta

## 📊 Exemplo de Classificação com Voltas

| Pos | Dorsal | Nome | Tempo | Diferença | Velocidade | Voltas | Status |
|-----|--------|------|-------|-----------|------------|--------|--------|
| 1 | 101 | João Silva | 1:25:30 | -- | 28.5 km/h | **8**<br/>Melhor: 10:15<br/>Vel: 28.5 km/h | FINISHED |
| 2 | 102 | Maria Santos | 1:26:45 | +1:15 | 28.1 km/h | **8**<br/>Melhor: 10:20<br/>Vel: 28.1 km/h | FINISHED |
| 3 | 103 | Pedro Costa | 1:28:20 | +2:50 | 27.8 km/h | **7**<br/>Melhor: 11:30<br/>Vel: 27.8 km/h | FINISHED |

## 🔧 Processamento Automático

### **Trigger Automático**
Quando uma detecção é feita em um dispositivo com checkpoint "Contador de Voltas":
1. Sistema identifica automaticamente o evento tem voltas
2. Calcula número da volta atual
3. Calcula tempo da volta (desde última passagem)
4. Calcula velocidade da volta (se distância configurada)
5. Armazena dados na tabela `lap_data`

### **Ordenação Inteligente**
- **Com voltas**: Primeiro por número de voltas (mais voltas = melhor), depois por tempo total
- **Sem voltas**: Apenas por tempo total
- Penalidades sempre ficam por último

## ⚠️ Validações e Regras

### **Validações Automáticas:**
1. Eventos com contador de voltas precisam de pelo menos 1 dispositivo contador + 1 meta
2. Sistema valida configuração antes de salvar
3. Interface mostra status da validação em tempo real

### **Regras de Negócio:**
1. Cada volta é contada automaticamente
2. Tempo de volta = tempo desde última passagem pelo contador
3. Velocidade calculada apenas se distância configurada
4. Classificação considera número de voltas + tempo total

## 🎨 Interface Responsiva

- **Desktop**: Coluna de voltas sempre visível quando ativada
- **Mobile**: Coluna de voltas se adapta ao espaço disponível
- **Dados de voltas**: Mostrados de forma compacta com informações essenciais

## 🔄 Próximos Passos Sugeridos

1. **Testes**: Criar evento de teste com voltas
2. **Relatórios**: Adicionar relatórios específicos de voltas
3. **Exportação**: Incluir dados de voltas em exportações
4. **Notificações**: Alertas quando participantes completam voltas
5. **Dashboard**: Gráficos de evolução de voltas por participante

---

## 📝 Notas Técnicas

- Sistema totalmente integrado com arquitetura existente
- Compatível com todos os tipos de eventos
- Performance otimizada com índices adequados
- Validações robustas para evitar configurações inválidas
- Interface dinâmica que se adapta à configuração do evento

**Status**: ✅ **IMPLEMENTADO E FUNCIONAL**



