import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
INCLUDE_EXT = {".py",".ts",".tsx",".js",".jsx",".cs",".java",".go",".rs",".sql",".md",".yml",".yaml",".json",".toml"}
EXCLUDE_DIRS = {"venv",".venv","node_modules",".git","dist","build","out",".idea",".vscode",".pytest_cache","__pycache__"}

# Mapeamentos de exemplo. Ajustar se encontrares padrões específicos.
REPLACEMENTS = [
    # SQL moved to sql/
    (r"""(["'`])(\.\/)?(queries|sql)\/""", r"\1../sql/"),
    (r"""(["'`])(\.\/)?([A-Za-z0-9_\-\/]+\.sql)\1""", r'"\1../sql/\3"'),
    # Markdown moved to docs/
    (r"""\((\.\/)?([A-Za-z0-9_\-\/]+\.md)\)""", r"(docs/\2)"),
]

def should_skip(p: pathlib.Path) -> bool:
    parts = set(p.parts)
    return any(d in parts for d in EXCLUDE_DIRS)

def rewrite_text(text: str) -> str:
    new = text
    for pattern, repl in REPLACEMENTS:
        new = re.sub(pattern, repl, new)
    return new

def main():
    changed = 0
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix in INCLUDE_EXT and not should_skip(path):
            try:
                old = path.read_text(encoding="utf-8", errors="ignore")
                new = rewrite_text(old)
                if new != old:
                    path.write_text(new, encoding="utf-8")
                    changed += 1
                    print(f"Updated: {path.relative_to(ROOT)}")
            except Exception as e:
                print(f"Error processing {path}: {e}", file=sys.stderr)
    print(f"\nTotal updated files: {changed}")

if __name__ == "__main__":
    main()

