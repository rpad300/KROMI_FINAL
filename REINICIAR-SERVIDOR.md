# ⚠️ REINICIAR SERVIDOR

O servidor está a usar o processador antigo (com RPC PostgreSQL que dá erro de UUID).

## Solução

### 1. Parar o servidor atual
Pressiona `Ctrl+C` no terminal onde o servidor está a correr

### 2. Iniciar novamente
```bash
node server.js
```

### 3. Verificar que está a usar a versão nova
Deves ver nos logs:
```
✅ DeviceDetectionProcessor: Monitoramento ativo a cada 5s
```

E quando processar registros, NÃO deve aparecer mais o erro de UUID.

## ✅ Confirmação
Após reiniciar, novos registros devem ser processados sem erro de UUID.

## Nota
A versão nova processa tudo no **servidor Node.js**, não usa mais RPC PostgreSQL.

