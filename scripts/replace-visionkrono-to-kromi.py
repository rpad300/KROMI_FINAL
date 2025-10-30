#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================
SCRIPT: Substituir VisionKrono por Kromi.online
==========================================
Substitui todas as ocorrências de "VisionKrono" por "Kromi.online" 
em todos os arquivos do projeto
==========================================
"""

import os
import re
import sys
from pathlib import Path

def replace_visionkrono_to_kromi():
    """Substitui VisionKrono por Kromi.online em todos os arquivos"""
    
    print("🔄 Iniciando substituição de VisionKrono por Kromi.online...")
    
    # Diretório raiz do projeto
    project_root = Path.cwd()
    src_path = project_root / "src"
    
    # Contadores
    files_processed = 0
    total_replacements = 0
    errors = []
    
    # Tipos de arquivos para processar
    file_extensions = ['.html', '.js', '.css', '.md', '.json', '.sql']
    
    print(f"📁 Processando arquivos em: {src_path}")
    
    # Processar arquivos na pasta src
    if src_path.exists():
        for file_path in src_path.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in file_extensions:
                try:
                    print(f"📄 Processando: {file_path.name}")
                    
                    # Ler conteúdo do arquivo
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Contar ocorrências antes da substituição
                    before_count = len(re.findall(r'VisionKrono', content))
                    
                    if before_count > 0:
                        # Fazer a substituição
                        new_content = re.sub(r'VisionKrono', 'Kromi.online', content)
                        
                        # Contar ocorrências após a substituição
                        after_count = len(re.findall(r'VisionKrono', new_content))
                        replacements = before_count - after_count
                        
                        if replacements > 0:
                            # Salvar arquivo modificado
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            
                            print(f"  ✅ {replacements} substituições em {file_path.name}")
                            total_replacements += replacements
                    
                    files_processed += 1
                    
                except Exception as e:
                    error_msg = f"Erro ao processar {file_path}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    errors.append(error_msg)
    
    # Processar arquivos na raiz do projeto
    print("📁 Processando arquivos na raiz do projeto...")
    
    for file_path in project_root.glob('*.md'):
        try:
            print(f"📄 Processando: {file_path.name}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            before_count = len(re.findall(r'VisionKrono', content))
            
            if before_count > 0:
                new_content = re.sub(r'VisionKrono', 'Kromi.online', content)
                after_count = len(re.findall(r'VisionKrono', new_content))
                replacements = before_count - after_count
                
                if replacements > 0:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    print(f"  ✅ {replacements} substituições em {file_path.name}")
                    total_replacements += replacements
            
            files_processed += 1
            
        except Exception as e:
            error_msg = f"Erro ao processar {file_path}: {str(e)}"
            print(f"  ❌ {error_msg}")
            errors.append(error_msg)
    
    # Resumo
    print("\n📊 RESUMO DA SUBSTITUIÇÃO:")
    print(f"  📁 Arquivos processados: {files_processed}")
    print(f"  🔄 Total de substituições: {total_replacements}")
    
    if errors:
        print(f"  ❌ Erros encontrados: {len(errors)}")
        for error in errors:
            print(f"    - {error}")
    else:
        print("  ✅ Nenhum erro encontrado!")
    
    print("\n🎉 Substituição concluída!")
    print("💡 Recomendação: Faça commit das alterações e teste o sistema.")

if __name__ == "__main__":
    replace_visionkrono_to_kromi()
