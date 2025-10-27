import re
from pathlib import Path

# Diretório com os ficheiros HTML
SRC_DIR = Path(__file__).parent.parent / 'src'

# Padrões para substituir caminhos relativos por absolutos
PATTERNS = [
    # CSS files
    (r'href="(?!https?://|/|#)([^"]+\.css[^"]*)"', r'href="/\1"'),
    # JS files
    (r'src="(?!https?://|/|#)([^"]+\.js[^"]*)"', r'src="/\1"'),
    # Manifest
    (r'href="(?!https?://|/)manifest\.json"', r'href="/manifest.json"'),
    # Favicon
    (r'href="(?!https?://|/)favicon\.ico"', r'href="/favicon.ico"'),
]

def fix_file(filepath):
    """Fix paths in a single HTML file"""
    try:
        content = filepath.read_text(encoding='utf-8')
        original = content
        
        for pattern, replacement in PATTERNS:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            filepath.write_text(content, encoding='utf-8')
            return True
    except Exception as e:
        print(f"Erro em {filepath}: {e}")
    return False

def main():
    fixed = 0
    for html_file in SRC_DIR.glob('*.html'):
        if fix_file(html_file):
            print(f"✅ {html_file.name}")
            fixed += 1
    
    print(f"\n📊 {fixed} ficheiros atualizados")

if __name__ == '__main__':
    main()

