param(
    [int]$Port = 8000,
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $RepoRoot

Write-Host "Serving $RepoRoot"
Write-Host "Open http://$HostName`:$Port/"

$py = Get-Command py -ErrorAction SilentlyContinue
if ($py) {
    & py -3 -m http.server $Port --bind $HostName
    exit $LASTEXITCODE
}

$python3 = Get-Command python3 -ErrorAction SilentlyContinue
if ($python3) {
    & python3 -m http.server $Port --bind $HostName
    exit $LASTEXITCODE
}

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    & python -m http.server $Port --bind $HostName
    exit $LASTEXITCODE
}

throw "Python 3 is required. Install Python or run from an environment that provides python3."
