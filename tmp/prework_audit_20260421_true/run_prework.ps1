$ErrorActionPreference = "Continue"
$root = "E:\sushank-projects\YojanaMitra"
Set-Location $root

$python = "e:/sushank-projects/YojanaMitra/.venv/Scripts/python.exe"
$logDir = Join-Path $root "tmp/prework_audit_20260421_true"
$logFile = Join-Path $logDir "prework_full_output.txt"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -Path $logFile -Value ""

function Write-Section {
    param(
        [string]$Section,
        [string]$Command,
        [string]$Output,
        [int]$ExitCode
    )

    $block = @"
================================================================================
SECTION: $Section
COMMAND: $Command
EXIT CODE: $ExitCode
--------------------------------------------------------------------------------
$Output
================================================================================

"@
    Add-Content -Path $logFile -Value $block
}

function Format-Matches {
    param(
        [array]$Matches
    )
    if (-not $Matches -or $Matches.Count -eq 0) {
        return "<no matches>"
    }
    return (($Matches | ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }) -join "`n")
}

# 1) Project structure snapshot
$backendFiles = Get-ChildItem -Path "backend" -Recurse -File -Filter "*.py" |
    Where-Object { $_.FullName -notmatch "__pycache__" -and $_.FullName -notmatch "\.pyc$" } |
    Sort-Object FullName |
    ForEach-Object { $_.FullName }
$frontendFiles = Get-ChildItem -Path "frontend/src" -Recurse -File |
    Sort-Object FullName |
    ForEach-Object { $_.FullName }
Write-Section "Project structure snapshot" "find . -type f -name '*.py' ...; find frontend/src -type f ..." (("BACKEND PY FILES`n" + ($backendFiles -join "`n") + "`n`nFRONTEND SRC FILES`n" + ($frontendFiles -join "`n"))) 0

# 2) Backend syntax errors
$compileErrors = @()
$pyFiles = Get-ChildItem -Path "backend/app" -Recurse -File -Filter "*.py"
foreach ($f in $pyFiles) {
    $out = & $python -m py_compile $f.FullName 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        $compileErrors += "FAIL: $($f.FullName)`n$out"
    }
}
if ($compileErrors.Count -eq 0) {
    Write-Section "Backend syntax errors" "find backend/app -name '*.py' | xargs python -m py_compile" "All backend/app Python files compiled successfully." 0
} else {
    Write-Section "Backend syntax errors" "find backend/app -name '*.py' | xargs python -m py_compile" ($compileErrors -join "`n") 1
}

# 3) All import errors
Push-Location backend
$importOut = & $python -c "from app.main import app; print('IMPORT_OK')" 2>&1 | Out-String
$importExit = $LASTEXITCODE
Pop-Location
Write-Section "All import errors" 'cd backend && python -c "from app.main import app"' $importOut $importExit

# 4) Wrong import paths
$routerPy = Get-ChildItem -Path "backend/app" -Recurse -File -Filter "*.py"
$m1 = $routerPy | Select-String -Pattern "from app\.core"
$m2 = $routerPy | Select-String -Pattern "from app\.auth import"
$m3 = $routerPy | Select-String -Pattern "from app\.utils import get_current"
$m4 = $routerPy | Select-String -Pattern "from app\.security import"
$wrongImportOutput = @(
    "Pattern: from app.core"
    (Format-Matches $m1)
    ""
    "Pattern: from app.auth import"
    (Format-Matches $m2)
    ""
    "Pattern: from app.utils import get_current"
    (Format-Matches $m3)
    ""
    "Pattern: from app.security import"
    (Format-Matches $m4)
) -join "`n"
$wrongImportCount = ($m1.Count + $m2.Count + $m3.Count + $m4.Count)
Write-Section "Wrong import paths" "grep -rn import patterns in backend/app" $wrongImportOutput $(if ($wrongImportCount -eq 0) { 0 } else { 1 })

# 5) Hardcoded secrets or URLs
$frontendJsx = Get-ChildItem -Path "frontend/src" -Recurse -File -Include "*.js","*.jsx"
$backendPy = Get-ChildItem -Path "backend/app" -Recurse -File -Filter "*.py"
$h1 = $frontendJsx | Select-String -Pattern "localhost:8000"
$h2 = $backendPy | Select-String -Pattern "SECRET_KEY\s*=" | Where-Object { $_.Line -notmatch "settings\." -and $_.Line -notmatch "os\.getenv" -and $_.Line -notmatch "config" }
$h3 = $backendPy | Select-String -Pattern 'password\s*=\s*[\"\''][^\"\'']{3,}[\"\'']'
$hardcodedOutput = @(
    "Pattern: localhost:8000 in frontend/src"
    (Format-Matches $h1)
    ""
    "Pattern: SECRET_KEY assignment in backend/app"
    (Format-Matches $h2)
    ""
    "Pattern: password assignment literal in backend/app"
    (Format-Matches $h3)
) -join "`n"
$hardcodedCount = ($h1.Count + $h2.Count + $h3.Count)
Write-Section "Hardcoded secrets or URLs" "grep -rn localhost:8000 | SECRET_KEY= | password='...'" $hardcodedOutput $(if ($hardcodedCount -eq 0) { 0 } else { 1 })

# 6) Console logs left in frontend
$c1 = $frontendJsx | Select-String -Pattern "console\.(log|warn|error)" | Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "logger" }
$consoleOutput = "Pattern: console.log/warn/error excluding comments/logger`n" + (Format-Matches $c1)
Write-Section "Console logs left in frontend" "grep -rn console.log|console.warn|console.error frontend/src" $consoleOutput $(if ($c1.Count -eq 0) { 0 } else { 1 })

# 7) Print statements left in backend
$p1 = $backendPy | Select-String -Pattern "^\s*print\("
$printOutput = "Pattern: ^\s*print( in backend/app`n" + (Format-Matches $p1)
Write-Section "Print statements left in backend" "grep -rn '^\s*print(' backend/app" $printOutput $(if ($p1.Count -eq 0) { 0 } else { 1 })

# 8) Database connection
$dbCheckScript = Join-Path $logDir "db_check.py"
@'
from app.database import engine
from sqlalchemy import text, inspect

try:
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    insp = inspect(engine)
    tables = insp.get_table_names()
    print("DB OK. Tables:", tables)
except Exception as e:
    print("DB FAILED:", e)
    raise
'@ | Set-Content -Path $dbCheckScript -Encoding UTF8
Push-Location backend
$dbOut = & $python $dbCheckScript 2>&1 | Out-String
$dbExit = $LASTEXITCODE
Pop-Location
Write-Section "Database connection" "cd backend && python db_check.py" $dbOut $dbExit

# 9) Missing DB tables
$missingScript = Join-Path $logDir "missing_tables.py"
@'
from app.database import engine, Base
from app import models
from sqlalchemy import inspect

insp = inspect(engine)
existing = set(insp.get_table_names())
defined = set(Base.metadata.tables.keys())
print("Missing from DB:", defined - existing)
print("Extra in DB:", existing - defined)
'@ | Set-Content -Path $missingScript -Encoding UTF8
Push-Location backend
$missingOut = & $python $missingScript 2>&1 | Out-String
$missingExit = $LASTEXITCODE
Pop-Location
Write-Section "Missing DB tables" "cd backend && python missing_tables.py" $missingOut $missingExit

# 10) Alembic status
Push-Location backend
$alembicCurrent = & $python -m alembic current 2>&1 | Out-String
$acExit = $LASTEXITCODE
$alembicHeads = & $python -m alembic heads 2>&1 | Out-String
$ahExit = $LASTEXITCODE
Pop-Location
Write-Section "Alembic status" "cd backend && alembic current && alembic heads" ("CURRENT`n$alembicCurrent`nHEADS`n$alembicHeads") ([Math]::Max($acExit, $ahExit))

# 11) Frontend build errors
Push-Location frontend
$buildOut = npm run build 2>&1 | Out-String
$buildExit = $LASTEXITCODE
Pop-Location
Write-Section "Frontend build errors" "cd frontend && npm run build" $buildOut $buildExit

# 12) ESLint errors
Push-Location frontend
$eslintRaw = npx eslint src/ --ext .js,.jsx 2>&1 | Out-String
$eslintExit = $LASTEXITCODE
$eslintFiltered = ($eslintRaw -split "`r?`n" | Where-Object { $_ -match "error" }) -join "`n"
Pop-Location
$eslintOutput = "FILTERED (lines containing 'error')`n$eslintFiltered`n`nFULL OUTPUT`n$eslintRaw"
Write-Section "ESLint errors" "cd frontend && npx eslint src/ --ext .js,.jsx | grep error" $eslintOutput $eslintExit

# 13) Missing i18n keys
$i18nScript = Join-Path $logDir "i18n_check.js"
@'
const fs = require('fs');

const flat = (obj, p = '') => Object.keys(obj).reduce((a, k) => {
  const key = p ? `${p}.${k}` : k;
  return typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])
    ? { ...a, ...flat(obj[k], key) }
    : { ...a, [key]: true };
}, {});

try {
  const en = JSON.parse(fs.readFileSync('src/locales/en.json'));
  const enFlat = flat(en);

  ['hi', 'ta', 'te', 'bn', 'kn', 'mr', 'es'].forEach((lang) => {
    try {
      const loc = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`));
      const locFlat = flat(loc);
      const missing = Object.keys(enFlat).filter((k) => !locFlat[k]);
      console.log(`${lang}: ${missing.length ? `${missing.length} missing keys` : 'complete'}`);
    } catch (e) {
      console.log(`${lang}: FILE ERROR - ${e.message}`);
    }
  });
} catch (e) {
  console.log(`en.json error: ${e.message}`);
  process.exit(1);
}
'@ | Set-Content -Path $i18nScript -Encoding UTF8
Push-Location frontend
$i18nOut = node $i18nScript 2>&1 | Out-String
$i18nExit = $LASTEXITCODE
Pop-Location
Write-Section "Missing i18n keys" "cd frontend && node i18n_check.js" $i18nOut $i18nExit

# 14) Unused imports in backend
$pipOut = & $python -m pip install autoflake -q 2>&1 | Out-String
$autoOut = & $python -m autoflake --check -r backend/app 2>&1 | Out-String
$autoHead = ($autoOut -split "`r?`n" | Select-Object -First 30) -join "`n"
Write-Section "Unused imports in backend" "pip install autoflake -q; autoflake --check -r backend/app | head -30" ("PIP INSTALL OUTPUT`n$pipOut`nAUTOFLAKE FIRST 30 LINES`n$autoHead") $LASTEXITCODE

# 15) Env vars present
$backendEnvExists = Test-Path "backend/.env"
$frontendEnvExists = Test-Path "frontend/.env"
$backendExampleExists = Test-Path "backend/.env.example"

function Get-EnvKeys([string]$path) {
    if (-not (Test-Path $path)) { return @() }
    return Get-Content $path |
        Where-Object { $_ -match "^[A-Z][A-Z0-9_]*=" } |
        ForEach-Object { ($_ -split "=", 2)[0] } |
        Sort-Object -Unique
}

$exampleKeys = Get-EnvKeys "backend/.env.example"
$envKeys = Get-EnvKeys "backend/.env"
$missingKeys = Compare-Object -ReferenceObject $exampleKeys -DifferenceObject $envKeys -PassThru |
    Where-Object { $_ -in $exampleKeys }

$envOutput = @(
    "backend/.env exists: $backendEnvExists"
    "frontend/.env exists: $frontendEnvExists"
    "backend/.env.example exists: $backendExampleExists"
    "Missing keys in backend/.env vs .env.example:"
    ($(if ($missingKeys) { $missingKeys -join ", " } else { "<none>" }))
) -join "`n"
$envExit = if ($backendEnvExists -and $frontendEnvExists -and $backendExampleExists -and -not $missingKeys) { 0 } else { 1 }
Write-Section "Env vars present" "check backend/.env, frontend/.env, diff backend/.env.example vs backend/.env" $envOutput $envExit

# 16) Tesseract available
$tessCmd = Get-Command tesseract -ErrorAction SilentlyContinue
if ($null -eq $tessCmd) {
    $tessVer = "tesseract command not found in PATH"
    $tessLang = "tesseract command not found in PATH"
    $tessVerExit = 1
    $tessLangExit = 1
} else {
    $tessVer = tesseract --version 2>&1 | Out-String
    $tessVerExit = $LASTEXITCODE
    $tessLang = tesseract --list-langs 2>&1 | Out-String
    $tessLangExit = $LASTEXITCODE
}
Write-Section "Tesseract available" "tesseract --version; tesseract --list-langs" ("VERSION`n$tessVer`nLANGS`n$tessLang") ([Math]::Max($tessVerExit, $tessLangExit))

Write-Output "Pre-work audit complete. Log: $logFile"