param(
    [Parameter(Mandatory=$true)]
    [string]$AppPath
)

$ErrorActionPreference = "Stop"

Write-Host "=== Package Validation ===" -ForegroundColor Cyan
Write-Host "App path: $AppPath"
Write-Host "Platform: Windows"
Write-Host "Architecture: x64"
Write-Host ""

# Strip system Node from PATH to simulate clean environment
$env:PATH = "C:\Windows\System32;C:\Windows"
Write-Host "Stripped PATH to: $env:PATH"
Write-Host ""

$ResourcesDir = "$AppPath\resources"
$NodeDir = "$ResourcesDir\nodejs\x64"
$NodeBin = "$NodeDir\node.exe"
$SkillsDir = "$ResourcesDir\app\skills"

# === Check 1: Bundled Node exists ===
Write-Host "=== Check 1: Bundled Node exists ===" -ForegroundColor Yellow
if (-not (Test-Path $NodeBin)) {
    Write-Host "ERROR: Bundled Node not found" -ForegroundColor Red
    Write-Host "  Expected: $NodeBin"
    Write-Host "  Platform: win32-x64"
    Write-Host "  Contents of nodejs dir:"
    Get-ChildItem "$ResourcesDir\nodejs" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
    exit 1
}
Write-Host "OK: Found $NodeBin" -ForegroundColor Green
Write-Host ""

# === Check 2: Bundled Node runs ===
Write-Host "=== Check 2: Bundled Node runs ===" -ForegroundColor Yellow
$env:PATH = "$NodeDir;$env:PATH"
try {
    $NodeVersion = & $NodeBin --version 2>&1
    Write-Host "OK: Node $NodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Bundled Node failed to run" -ForegroundColor Red
    Write-Host "  Path: $NodeBin"
    Write-Host "  Error: $_"
    exit 1
}
Write-Host ""

# === Check 3: Node path structure correct ===
Write-Host "=== Check 3: Node path structure correct ===" -ForegroundColor Yellow
foreach ($bin in @("node.exe", "npm.cmd", "npx.cmd")) {
    $binPath = "$NodeDir\$bin"
    if (-not (Test-Path $binPath)) {
        Write-Host "ERROR: Expected binary missing: $bin" -ForegroundColor Red
        Write-Host "  Expected: $binPath"
        Write-Host "  Contents of node dir:"
        Get-ChildItem $NodeDir -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
        exit 1
    }
}
Write-Host "OK: All expected binaries present (node.exe, npm.cmd, npx.cmd)" -ForegroundColor Green
Write-Host ""

# === Check 4: MCP servers can spawn ===
Write-Host "=== Check 4: MCP servers spawn ===" -ForegroundColor Yellow
if (-not (Test-Path $SkillsDir)) {
    Write-Host "ERROR: Skills directory not found" -ForegroundColor Red
    Write-Host "  Expected: $SkillsDir"
    exit 1
}

Get-ChildItem $SkillsDir -Directory | ForEach-Object {
    $McpName = $_.Name
    $McpEntry = "$($_.FullName)\dist\index.mjs"

    if (-not (Test-Path $McpEntry)) {
        Write-Host "ERROR: MCP entry point missing" -ForegroundColor Red
        Write-Host "  MCP: $McpName"
        Write-Host "  Expected: $McpEntry"
        Write-Host "  Contents of MCP dir:"
        Get-ChildItem $_.FullName -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
        exit 1
    }

    Write-Host "Spawning $McpName..."
    $process = Start-Process -FilePath $NodeBin -ArgumentList $McpEntry -PassThru -NoNewWindow -RedirectStandardError "NUL"
    Start-Sleep -Seconds 2

    if ($process.HasExited) {
        Write-Host "ERROR: MCP crashed on startup" -ForegroundColor Red
        Write-Host "  MCP: $McpName"
        Write-Host "  Entry: $McpEntry"
        Write-Host "  Exit code: $($process.ExitCode)"
        Write-Host "  Node path: $NodeBin"
        Write-Host "  PATH: $env:PATH"
        exit 1
    }

    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Write-Host "OK: $McpName started successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== All validations passed ===" -ForegroundColor Green
