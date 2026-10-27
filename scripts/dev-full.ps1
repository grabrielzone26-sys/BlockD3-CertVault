param(
  [string]$WslDistro = "Ubuntu",
  [string]$WslUser = "root",
  [string]$DfxVersion = "0.30.2",
  [string]$IcpProjectPath = "",
  [string]$BackendEnvPath = "backend\\.env"
)

$ErrorActionPreference = "Stop"

function Invoke-Wsl {
  param([string]$Command, [int]$TimeoutSec = 60)
  $timeoutMs = $TimeoutSec * 1000
  $cmd = "wsl -d $WslDistro -u $WslUser -- bash -lc `"$Command`""
  Write-Host $cmd
  $result = & cmd /c $cmd
  return $result
}

function Update-EnvValue {
  param([string]$FilePath, [string]$Key, [string]$Value)
  if (-not (Test-Path $FilePath)) {
    throw "Env file not found: $FilePath"
  }
  $lines = Get-Content $FilePath
  $found = $false
  $updated = $lines | ForEach-Object {
    if ($_ -match "^\s*$Key=") {
      $found = $true
      return "$Key=$Value"
    }
    return $_
  }
  if (-not $found) {
    $updated += "$Key=$Value"
  }
  $updated | Set-Content $FilePath
}

try {
  if (-not $IcpProjectPath) {
    $localIcpPath = Join-Path (Get-Location).Path "blockchain\icp"
    $IcpProjectPath = (& wsl wslpath -a $localIcpPath).Trim()
    if (-not $IcpProjectPath) {
      throw "Failed to convert ICP project path for WSL."
    }
  }

  $utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")
  Invoke-Wsl "timedatectl set-ntp false; date -u -s '$utc'"

  $dfxPath = "/root/.cache/dfinity/versions/$DfxVersion/dfx"
  Invoke-Wsl "if [ ! -x $dfxPath ]; then echo 'dfx not found at $dfxPath' >&2; exit 1; fi"

  Invoke-Wsl "systemctl start mongod"

  $wslIp = Invoke-Wsl "hostname -I | awk '{print \$1}'"
  $wslIp = $wslIp.Trim()
  if (-not $wslIp) {
    throw "Failed to determine WSL IP."
  }
  Update-EnvValue -FilePath $BackendEnvPath -Key "MONGODB_URI" -Value "mongodb://${wslIp}:27017/certificate-verification"

  Invoke-Wsl "export PATH=/root/.cache/dfinity/versions/${DfxVersion}:/usr/bin:/bin:`$PATH; cd '$IcpProjectPath'; $dfxPath start --background || true"

  $principal = Invoke-Wsl "$dfxPath identity get-principal"
  $principal = $principal.Trim()
  if (-not $principal) {
    throw "Failed to get dfx principal."
  }

  $arg = "(principal `"$principal`")"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($arg))
  Invoke-Wsl "echo $b64 | base64 -d > /tmp/cert_registry_init.arg"

  Invoke-Wsl "export PATH=/root/.cache/dfinity/versions/${DfxVersion}:/usr/bin:/bin:`$PATH; cd '$IcpProjectPath'; $dfxPath deploy cert_registry --argument-file /tmp/cert_registry_init.arg --argument-type idl"

  Start-Process cmd.exe -ArgumentList '/c','npm run dev:backend' -WorkingDirectory (Get-Location).Path
  Start-Process cmd.exe -ArgumentList '/c','npm run dev:frontend' -WorkingDirectory (Get-Location).Path

  Write-Host "Dev stack started. MongoDB at ${wslIp}:27017"
} catch {
  Write-Error $_
  exit 1
}
