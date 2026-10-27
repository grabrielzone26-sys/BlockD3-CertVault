param(
  [string]$WslDistro = "Ubuntu-24.04",
  [string]$WslUser = "phiri",
  [string]$AppUser = "",
  [switch]$SkipBackend,
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot ".runtime"
$backendPidFile = Join-Path $runtimeDir "backend-shell.pid"
$frontendPidFile = Join-Path $runtimeDir "frontend-shell.pid"

function Test-PortOpen {
  param([int]$Port)
  try {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
  } catch {
    return $false
  }
}

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

  if (-not $isRepoProcess) {
    throw "$Name port $Port is already in use by another process: $commandLine"
  }

  Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
  Write-Host ("Stopped stale {0} listener PID {1} on port {2}" -f $Name, $connection.OwningProcess, $Port)
}

function Get-WslPath {
  param([string]$WindowsPath)
  $converted = & wsl wslpath -a $WindowsPath
  if ($LASTEXITCODE -ne 0 -or -not $converted) {
    throw "Failed to convert path for WSL: $WindowsPath"
  }
  return $converted.Trim()
}

function Get-WslDefaultUser {
  $user = & wsl -d $WslDistro -- bash -lc "id -un"
  if ($LASTEXITCODE -ne 0 -or -not $user) {
    throw "Failed to determine the default WSL user for distro: $WslDistro"
  }
  return $user.Trim()
}

function Start-WindowedProcess {
  param(
    [string]$Name,
    [string]$Command,
    [string]$PidFile
  )

  if ($Name -eq "backend") {
    Stop-RepoListener -Name $Name -Port 5000
  }

  if ($Name -eq "frontend") {
    Stop-RepoListener -Name $Name -Port 3000
  }

  $batFile = Join-Path $runtimeDir "$Name.bat"
  $batContent = "@echo off`r`ncd /d `"$repoRoot`"`r`n$Command`r`npause"
  Set-Content -Path $batFile -Value $batContent -Encoding ASCII

  # In Windows 11, launching new terminals is very buggy unless explicitly calling wt.exe
  # We use a relative path to the bat file to avoid cmd.exe quote-stripping bugs with spaces in the absolute path.
  $process = Start-Process wt.exe -ArgumentList "new-tab", "-d", "`"$repoRoot`"", "cmd.exe", "/c", ".runtime\$Name.bat" -PassThru

  if ($process) {
    $process.Id | Set-Content $PidFile
    Write-Host ("Started {0} shell tab" -f $Name)
  }
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (-not $AppUser) {
  $AppUser = Get-WslDefaultUser
}

# Ensure WSL2 system clock is synchronized with Windows host UTC to prevent clock skew with Fabric and ICP
$utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")
try {
  & wsl -d $WslDistro -u root -- date -u -s $utc | Out-Null
} catch {
  Write-Warning "Could not synchronize WSL clock: $($_.Exception.Message)"
}

$wslScript = Get-WslPath (Join-Path $PSScriptRoot "start-local.sh")
& wsl -d $WslDistro -u $WslUser -- env LOCAL_APP_USER=$AppUser bash -lc "'$wslScript'"
if ($LASTEXITCODE -ne 0) {
  $dfxLog = Join-Path $runtimeDir "dfx-start.log"
  if (Test-Path $dfxLog) {
    Write-Host "`nLast dfx startup output:" -ForegroundColor Yellow
    Get-Content $dfxLog | Select-Object -Last 80
  }
  throw "Local infrastructure startup failed inside WSL. The most likely failing stage is the ICP/dfx startup path."
}

if (-not $SkipBackend) {
  # Run the backend natively on Windows (like the frontend), NOT inside WSL.
  # Launching it through WSL made Node read node_modules from the Windows drive
  # over the 9p mount, where requiring heavy packages (ipfs-http-client, etc.)
  # took 20+ seconds and made the server look like it never started. Natively it
  # starts in a few seconds and reaches the WSL services over localhost.
  Start-WindowedProcess -Name "backend" -Command "npm run dev:backend" -PidFile $backendPidFile
}

if (-not $SkipFrontend) {
  Start-WindowedProcess -Name "frontend" -Command "npm run dev:frontend" -PidFile $frontendPidFile
}

Write-Host "Local stack start sequence completed."
