$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

$cssPath = Join-Path $repo "app\globals.css"
$css = Get-Content $cssPath -Raw

$startMarker = "/* BOOKSHOP-LAYOUT-WIDTH-REFINEMENTS-START */"
$endMarker = "/* BOOKSHOP-LAYOUT-WIDTH-REFINEMENTS-END */"

# Remove an older copy of these overrides if the script is run again.
$pattern = [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker)
$css = [regex]::Replace(
    $css,
    $pattern,
    "",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$overrides = @'

/* BOOKSHOP-LAYOUT-WIDTH-REFINEMENTS-START */

/* Wider page/display area: approximately 80% on desktop. */
@media (min-width: 1024px) {
  .bookshop-shell {
    width: 80%;
    max-width: 1280px;
    margin-inline: auto;
    padding-inline: 0;
  }
}

/* Comfortable intermediate width for tablets/smaller laptops. */
@media (min-width: 640px) and (max-width: 1023px) {
  .bookshop-shell {
    width: 90%;
    margin-inline: auto;
    padding-inline: 0;
  }
}

/* Keep useful margins on phones. */
@media (max-width: 639px) {
  .bookshop-shell {
    width: 92%;
    margin-inline: auto;
    padding-inline: 0;
  }
}

/* Double the left page-section accent from 0.4rem to 0.8rem. */
.bookshop-page-header::before {
  width: 0.8rem;
}

/* More separation between the navigation/header and first page display. */
.bookshop-page-header {
  margin-top: 0.5rem;
}

/* More breathing room between reusable display boxes. */
.bookshop-display-section {
  margin-bottom: 2rem;
}

.bookshop-display-section:last-child {
  margin-bottom: 0;
}

/* BOOKSHOP-LAYOUT-WIDTH-REFINEMENTS-END */
'@

Set-Content -Path $cssPath -Value ($css.TrimEnd() + $overrides + "`r`n") -Encoding utf8

Write-Host ""
Write-Host "Safe layout-width refinements applied." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host ""
Write-Host "If both pass, refresh http://localhost:3000/ and check the appearance."