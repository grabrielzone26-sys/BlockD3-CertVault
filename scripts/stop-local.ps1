param(
  [string]$WslDistro = "Ubuntu-24.04",
  [string]$WslUser = "phiri",
  [string]$AppUser = "",
  [switch]$StopInfrastructure,
  [switch]$StopFabric,
  [switch]$StopMongo
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot ".runtime"
$backendPidFile = Join-Path $runtimeDir "backend-shell.pid"
$frontendPidFile = Join-Path $runtimeDir "frontend-shell.pid"

function Stop-RepoListener {
  param(
    [string]$Name,
    [int]$Port
  )

  $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $connection) {
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
  $commandLine = if ($processInfo) { $processInfo.CommandLine } else { "" }
  $isRepoProcess = $commandLine -like "*$repoRoot*" -or
                   ($Name -eq "backend" -and $commandLine -like "*src/index.js*") -or
                   ($Name -eq "frontend" -and $commandLine -like "*craco*start.js*")

  if ($isRepoProcess) {
    Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host ("Stopped {0} listener PID {1} on port {2}" -f $Name, $connection.OwningProcess, $Port)
  }
}

function Stop-ShellFromPidFile {
  param([string]$Name, [string]$PidFile)
  if (-not (Test-Path $PidFile)) {
    return
  }

  $processId = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if (-not $processId) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    return
  }

  try {
    Stop-Process -Id ([int]$processId) -Force -ErrorAction Stop
    Write-Host ("Stopped {0} shell PID {1}" -f $Name, $processId)
  } catch {
    Write-Host ("{0} shell PID {1} was not running" -f $Name, $processId)
  }

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

function Get-WslDefaultUser {
  $user = & wsl -d $WslDistro -- bash -lc "id -un"
  if ($LASTEXITCODE -ne 0 -or -not $user) {
    throw "Failed to determine the default WSL user for distro: $WslDistro"
  }
  return $user.Trim()
}

Stop-ShellFromPidFile -Name "backend" -PidFile $backendPidFile
Stop-ShellFromPidFile -Name "frontend" -PidFile $frontendPidFile
Stop-RepoListener -Name "backend" -Port 5000
Stop-RepoListener -Name "frontend" -Port 3000

if ($StopInfrastructure -or $StopFabric -or $StopMongo) {
  if (-not $AppUser) {
    $AppUser = Get-WslDefaultUser
  }

  $wslScript = (& wsl wslpath -a (Join-Path $PSScriptRoot "stop-local.sh")).Trim()
  if (-not $wslScript) {
    throw "Failed to convert stop-local.sh path for WSL."
  }

  $arguments = @()
  if ($StopFabric) {
    $arguments += "--with-fabric"
  }
  if ($StopMongo) {
    $arguments += "--with-mongo"
  }

  $escapedArgs = ($arguments | ForEach-Object { "'$_'" }) -join " "
  & wsl -d $WslDistro -u $WslUser -- env LOCAL_APP_USER=$AppUser bash -lc "'$wslScript' $escapedArgs"
  if ($LASTEXITCODE -ne 0) {
    throw "WSL infrastructure shutdown failed."
  }
}

Write-Host "Local stack stop sequence completed."
