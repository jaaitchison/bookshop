$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

$cssPath = Join-Path $repo "app\globals.css"

# Back up the current stylesheet before changing the Tailwind v4 entry point.
Copy-Item $cssPath "$cssPath.before-tailwind-v4-fix" -Force

$css = Get-Content $cssPath -Raw

$old = "@tailwind base;`r`n@tailwind components;`r`n@tailwind utilities;"
if (-not $css.Contains($old)) {
    $old = "@tailwind base;`n@tailwind components;`n@tailwind utilities;"
}

if (-not $css.Contains($old)) {
    throw "Could not find the old Tailwind directives at the top of app\globals.css."
}

$css = $css.Replace($old, '@import "tailwindcss";')

# Use UTF-8 without BOM to avoid changing the source encoding unexpectedly.
[System.IO.File]::WriteAllText(
    $cssPath,
    $css,
    [System.Text.UTF8Encoding]::new($false)
)

# Remove any stale Next.js/Turbopack build cache.
$nextPath = Join-Path $repo ".next"
if (Test-Path $nextPath) {
    try {
        Remove-Item $nextPath -Recurse -Force
    }
    catch {
        Write-Warning "Could not fully remove .next. If the dev server is running, stop it and rerun this script."
    }
}

Write-Host ""
Write-Host "Tailwind CSS v4 entry point fixed." -ForegroundColor Green
Write-Host ""
Write-Host "globals.css now starts with:"
Get-Content $cssPath -TotalCount 5
Write-Host ""
Write-Host "Backup created:"
Write-Host "  app\globals.css.before-tailwind-v4-fix"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"