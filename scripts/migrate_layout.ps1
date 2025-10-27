# PowerShell script for migrating project structure
# Preserves git history by using git mv

$ErrorActionPreference = "Continue"

Write-Host "Starting project structure migration..." -ForegroundColor Green

# Ensure target directories exist
$targetDirs = @("docs", "sql", "src", "notebooks", "config", "tests", "data", "scripts", "infra")
foreach ($dir in $targetDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# Get all tracked files
$files = git ls-files

$moved = 0
$skipped = 0

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        continue
    }

    $basename = [System.IO.Path]::GetFileName($file)
    $ext = [System.IO.Path]::GetExtension($file)
    $dirname = [System.IO.Path]::GetDirectoryName($file)
    $target = $null

    # Skip if already in target location or special files
    if ($file -match "^(docs|sql|src|notebooks|config|tests|data|scripts|infra)[\\/]" -or $file -eq "README.md") {
        $skipped++
        continue
    }

    # Determine target based on extension and content
    switch ($ext) {
        ".md" {
            $target = "docs\$basename"
        }
        ".sql" {
            $target = "sql\$basename"
        }
        ".ipynb" {
            $target = "notebooks\$basename"
        }
        {$_ -in ".py", ".ts", ".tsx", ".js", ".jsx", ".cs", ".java", ".go", ".rs"} {
            # Only move if in root or not in special directories
            if ($dirname -eq "" -or $dirname -notmatch "^(src|tests|scripts|auth|certs)") {
                $target = "src\$basename"
            }
        }
        {$_ -in ".yml", ".yaml", ".json", ".toml", ".env", ".ini"} {
            # Skip CI files
            if ($file -notmatch "^\.github|^\.gitlab|azure-pipelines|package\.json|package-lock\.json|manifest\.json") {
                $target = "config\$basename"
            }
        }
        ".html" {
            # Move HTML files to src
            if ($dirname -eq "" -or $dirname -notmatch "^(src|tests)") {
                $target = "src\$basename"
            }
        }
        ".css" {
            # Move CSS files to src
            if ($dirname -eq "" -or $dirname -notmatch "^(src|tests)") {
                $target = "src\$basename"
            }
        }
    }

    # Check for infrastructure files
    if ($file -match "docker|terraform|bicep|\.adf|Dockerfile|docker-compose") {
        $target = "infra\$basename"
    }

    # Execute move if target is set
    if ($target -and -not (Test-Path $target)) {
        try {
            git mv $file $target 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Moved: $file -> $target" -ForegroundColor Cyan
                $moved++
            } else {
                # Fallback to regular move
                Move-Item -Path $file -Destination $target -Force
                git add $target
                git rm $file 2>$null
                Write-Host "Moved (fallback): $file -> $target" -ForegroundColor Yellow
                $moved++
            }
        } catch {
            Write-Host "Error moving $file : $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nMigration summary:" -ForegroundColor Green
Write-Host "Files moved: $moved" -ForegroundColor Cyan
Write-Host "Files skipped: $skipped" -ForegroundColor Yellow

Write-Host "`nRunning path rewriter..." -ForegroundColor Green
python scripts\rewrite_paths.py

Write-Host "`nMigration completed!" -ForegroundColor Green

