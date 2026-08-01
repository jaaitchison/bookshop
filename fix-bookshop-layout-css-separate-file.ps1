$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

# 1. Restore the exact known-good global stylesheet.
git checkout 1362e57 -- app/globals.css
if ($LASTEXITCODE -ne 0) {
    throw "Could not restore app/globals.css from commit 1362e57."
}

# 2. Put layout refinements in their own stylesheet.
$overridePath = Join-Path $repo "app\layout-overrides.css"

$overrideCss = @'
/*
 * Bookshop layout refinements.
 * Kept separate from globals.css so Tailwind's core stylesheet is not rewritten.
 */

@media (min-width: 1024px) {
  .bookshop-shell {
    width: 80%;
    max-width: 1280px;
    margin-inline: auto;
    padding-inline: 0;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .bookshop-shell {
    width: 90%;
    margin-inline: auto;
    padding-inline: 0;
  }
}

@media (max-width: 639px) {
  .bookshop-shell {
    width: 92%;
    margin-inline: auto;
    padding-inline: 0;
  }
}

.bookshop-page-header {
  margin-top: 0.5rem;
}

.bookshop-page-header::before {
  width: 0.8rem;
}

.bookshop-display-section {
  margin-bottom: 2rem;
}

.bookshop-display-section:last-child {
  margin-bottom: 0;
}
'@

Set-Content -Path $overridePath -Value $overrideCss -Encoding utf8

# 3. Import the separate stylesheet after globals.css.
$layoutPath = Join-Path $repo "app\layout.tsx"
$layout = Get-Content $layoutPath -Raw

if ($layout -notmatch 'layout-overrides\.css') {
    $layout = $layout.Replace('import "./globals.css";', 'import "./globals.css";' + "`r`n" + 'import "./layout-overrides.css";')
    $layout = $layout.Replace("import './globals.css';", "import './globals.css';" + "`r`n" + "import './layout-overrides.css';")
}

Set-Content -Path $layoutPath -Value $layout -Encoding utf8

Write-Host ""
Write-Host "Tailwind-safe layout fix applied." -ForegroundColor Green
Write-Host ""
Write-Host "Restored:"
Write-Host "  app/globals.css"
Write-Host ""
Write-Host "Created:"
Write-Host "  app/layout-overrides.css"
Write-Host ""
Write-Host "Updated:"
Write-Host "  app/layout.tsx"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"