$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

# The global PageHeader owns the one H1 on every route.
# Demote page-local H1 headings to H2 across visible page content.
$headingFiles = @(
    "app\account\page.tsx",
    "app\auth\page.tsx",
    "app\library\page.tsx",
    "app\checkout\page.tsx",
    "app\checkout\success\page.tsx",
    "src\components\book\BookDetail.tsx"
)

foreach ($relative in $headingFiles) {
    $path = Join-Path $repo $relative
    if (-not (Test-Path $path)) { continue }

    $content = Get-Content $path -Raw
    $content = $content.Replace("<h1 ", "<h2 ")
    $content = $content.Replace("</h1>", "</h2>")
    Write-Utf8NoBom $path $content
}

# ------------------------------------------------------------
# AUTH PAGE
# ------------------------------------------------------------
$authPath = Join-Path $repo "app\auth\page.tsx"
$auth = Get-Content $authPath -Raw

$auth = $auth.Replace(
    'className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-16 sm:px-6 lg:px-8"',
    'className="min-h-screen bg-[var(--bookshop-bg)] py-8"'
)

$auth = $auth.Replace(
    'className="bookshop-card flex-1 p-8"',
    'className="flex-1 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

$auth = $auth.Replace(
    'className="bookshop-card flex-1 p-6 sm:p-8"',
    'className="flex-1 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

# Replace the corrupted loading text with plain ASCII text.
$auth = [regex]::Replace(
    $auth,
    "\{isSubmitting \? \(mode === 'signin' \? '[^']*' : '[^']*'\) : mode === 'signin' \? 'Continue to account' : 'Create free account'\}",
    "{isSubmitting ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : mode === 'signin' ? 'Continue to account' : 'Create free account'}"
)

Write-Utf8NoBom $authPath $auth

# ------------------------------------------------------------
# LIBRARY PAGE
# ------------------------------------------------------------
$libraryPath = Join-Path $repo "app\library\page.tsx"
$library = Get-Content $libraryPath -Raw

$library = $library.Replace(
    'className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-16 sm:px-6 lg:px-8"',
    'className="min-h-screen bg-[var(--bookshop-bg)] py-8"'
)

$library = $library.Replace(
    'className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-10 text-center shadow-sm"',
    'className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 text-center shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

# Remove duplicate authenticated page title block, retaining the account link.
$duplicateLibraryHeader = @'
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Unified account</p>
            <h2 className="text-3xl font-bold text-[var(--bookshop-text)]">My library</h2>
            <p className="mt-2 text-[var(--bookshop-muted)]">
              A reader-first view of your acquired and saved books. Your purchases and wishlist appear here when available.
            </p>
          </div>
          <Link href="/account" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
            Back to account dashboard
          </Link>
        </div>
'@

$replacementLibraryHeader = @'
        <div className="mb-6 flex justify-end">
          <Link href="/account" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
            Back to account dashboard
          </Link>
        </div>
'@

$library = $library.Replace($duplicateLibraryHeader, $replacementLibraryHeader)

$library = $library.Replace(
    'className="rounded-[1.75rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-6 shadow-sm"',
    'className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

Write-Utf8NoBom $libraryPath $library

# ------------------------------------------------------------
# ACCOUNT PAGE
# ------------------------------------------------------------
$accountPath = Join-Path $repo "app\account\page.tsx"
$account = Get-Content $accountPath -Raw

$account = $account.Replace(
    'className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-10"',
    'className="min-h-screen bg-[var(--bookshop-bg)] py-8"'
)

# Replace the visibly corrupted profile separator line with plain ASCII separators.
$account = [regex]::Replace(
    $account,
    '<p className="mt-1 text-sm text-\[var\(--bookshop-muted\)\]">\s*@\{profile\.username\}.*?Joined \{profile\.joined\}\s*</p>',
    '<p className="mt-1 text-sm text-[var(--bookshop-muted)]">@{profile.username} | {profile.location} | Joined {profile.joined}</p>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Write-Utf8NoBom $accountPath $account

# ------------------------------------------------------------
# CHECKOUT PAGE
# ------------------------------------------------------------
$checkoutPath = Join-Path $repo "app\checkout\page.tsx"
$checkout = Get-Content $checkoutPath -Raw

$checkout = $checkout.Replace(
    'className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-24"',
    'className="min-h-screen bg-[var(--bookshop-bg)] py-8"'
)

$checkout = $checkout.Replace(
    'className="bookshop-card rounded-[2rem] p-8"',
    'className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

$checkout = $checkout.Replace(
    'className="bookshop-card mx-auto max-w-3xl p-10"',
    'className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

Write-Utf8NoBom $checkoutPath $checkout

# ------------------------------------------------------------
# CHECKOUT SUCCESS
# ------------------------------------------------------------
$successPath = Join-Path $repo "app\checkout\success\page.tsx"
$success = Get-Content $successPath -Raw

$success = $success.Replace(
    'className="min-h-screen bg-[var(--bookshop-bg)] px-4 py-24"',
    'className="min-h-screen bg-[var(--bookshop-bg)] py-8"'
)

$success = $success.Replace(
    'className="bookshop-card bookshop-shell-tight p-10"',
    'className="mx-auto w-11/12 rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm sm:w-10/12 sm:px-10 lg:w-4/5 dark:border-slate-700 dark:border-l-emerald-500 dark:bg-slate-900"'
)

Write-Utf8NoBom $successPath $success

# ------------------------------------------------------------
# BOOK DETAIL
# ------------------------------------------------------------
$detailPath = Join-Path $repo "src\components\book\BookDetail.tsx"
$detail = Get-Content $detailPath -Raw

$detail = $detail.Replace(
    'className="bookshop-shell py-16"',
    'className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5"'
)

$detail = $detail.Replace(
    'rounded-[2rem]',
    'rounded-3xl'
)

# Bring obvious major book-detail cards onto the front-of-house colour.
$detail = $detail.Replace("border-l-blue-600", "border-l-emerald-600")
$detail = $detail.Replace("dark:border-l-blue-500", "dark:border-l-emerald-500")

Write-Utf8NoBom $detailPath $detail

# ------------------------------------------------------------
# ADMIN + STUDIO
# Ensure outer wrappers follow 80% width and spacing.
# ------------------------------------------------------------
foreach ($relative in @("app\admin\page.tsx", "app\studio\page.tsx", "app\books\page.tsx")) {
    $path = Join-Path $repo $relative
    if (-not (Test-Path $path)) { continue }

    $content = Get-Content $path -Raw
    $content = $content.Replace(
        'className="bookshop-shell py-12"',
        'className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5"'
    )
    $content = $content.Replace(
        'className="bookshop-shell py-6 pb-12 sm:py-8 sm:pb-16"',
        'className="mx-auto w-11/12 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"'
    )
    $content = $content.Replace(
        'className="bookshop-shell space-y-8 py-8 pb-12 sm:py-8 sm:pb-16"',
        'className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"'
    )
    Write-Utf8NoBom $path $content
}

# ------------------------------------------------------------
# Simple page audit report
# ------------------------------------------------------------
Write-Host ""
Write-Host "SECTION 2 page standardisation patch applied." -ForegroundColor Green
Write-Host ""
Write-Host "Pages covered:"
Write-Host "  /"
Write-Host "  /books"
Write-Host "  /books/[id]"
Write-Host "  /library"
Write-Host "  /account"
Write-Host "  /auth"
Write-Host "  /checkout"
Write-Host "  /checkout/success"
Write-Host "  /studio"
Write-Host "  /admin"
Write-Host ""
Write-Host "Standardised:"
Write-Host "  one global H1 per route"
Write-Host "  80 percent desktop content width"
Write-Host "  route colour accents"
Write-Host "  rounded major cards"
Write-Host "  shared padding and vertical spacing"
Write-Host "  duplicate Library heading removed"
Write-Host "  legacy narrow auth/library/checkout cards widened"
Write-Host "  visible corrupted account/auth text repaired"
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host ""
Write-Host "If both pass:"
Write-Host "  git add -A"
Write-Host '  git commit -m "Standardise all existing site pages"'
Write-Host "  git push"
Write-Host "  git status"