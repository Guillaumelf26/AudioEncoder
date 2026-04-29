param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$cargoExe = Join-Path $cargoBin "cargo.exe"
$vsDevShell = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\Launch-VsDevShell.ps1"

if (-not (Test-Path $cargoExe)) {
  throw "cargo introuvable. Installe Rustup puis reessaie."
}

$env:Path = "$cargoBin;$env:Path"

if (Test-Path $vsDevShell) {
  & $vsDevShell -Arch amd64 -HostArch amd64 | Out-Null
} else {
  Write-Warning "VsDevShell introuvable. La compilation Tauri peut echouer sans Build Tools."
}

if ($CheckOnly) {
  & $cargoExe --version
  npx tauri --version
  Write-Host "Environnement Tauri OK"
  exit 0
}

npx tauri dev
