$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

# Restore known-good CSS.
git checkout 1362e57 -- app/globals.css
if ($LASTEXITCODE -ne 0) {
    throw "Could not restore app/globals.css from commit 1362e57."
}

# Remove the separate override stylesheet if present.
$overridePath = Join-Path $repo "app\layout-overrides.css"
if (Test-Path $overridePath) {
    Remove-Item $overridePath -Force
}

# Remove the import from layout.tsx.
$layoutPath = Join-Path $repo "app\layout.tsx"
$layout = Get-Content $layoutPath -Raw
$layout = $layout.Replace("import `"./layout-overrides.css`";`r`n", "")
$layout = $layout.Replace("import `"./layout-overrides.css`";`n", "")
$layout = $layout.Replace("import './layout-overrides.css';`r`n", "")
$layout = $layout.Replace("import './layout-overrides.css';`n", "")
Set-Content -Path $layoutPath -Value $layout -Encoding utf8

# Clear Next/Turbopack cache.
$nextPath = Join-Path $repo ".next"
if (Test-Path $nextPath) {
    Remove-Item $nextPath -Recurse -Force
}

Write-Host ""
Write-Host "CSS setup restored and Next.js cache cleared." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host ""
Write-Host "If that passes, the visual refinements will be applied only through React/Tailwind classes."