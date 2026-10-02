# Starts Keystone locally without Docker: PostgreSQL (port 5434), backend (8080), frontend (5173).
# Usage, from the project root:  powershell -ExecutionPolicy Bypass -File .\start-local.ps1
# Reads POSTGRES_*, JWT_SECRET and DEMO_MODE from .env. Logs go to data\*.log.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$data = Join-Path $root 'data'
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
$dbPort = 5434

$env:PATH = "C:\Windows\System32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0;" + $env:PATH
New-Item -ItemType Directory -Force (Join-Path $data 'tmp') | Out-Null

$vars = @{}
Get-Content (Join-Path $root '.env') | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim() }
}
$dbName = $vars['POSTGRES_DB']; $dbUser = $vars['POSTGRES_USER']; $dbPassword = $vars['POSTGRES_PASSWORD']

function Test-Port($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }

# 1. Database
$pgData = Join-Path $data 'pg'
if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) {
    Write-Host 'Creating project database cluster...'
    $pwFile = Join-Path $data 'pwfile.txt'
    [IO.File]::WriteAllText($pwFile, $dbPassword)
    & "$pgBin\initdb.exe" -D $pgData -U $dbUser --pwfile=$pwFile -A scram-sha-256 -E UTF8 --locale=C | Out-Null
    [IO.File]::Delete($pwFile)
}
if (-not (Test-Port $dbPort)) {
    Write-Host "Starting PostgreSQL on $dbPort..."
    Start-Process -FilePath "$pgBin\pg_ctl.exe" -ArgumentList '-D', "`"$pgData`"", '-o', "`"-p $dbPort`"", '-l', "`"$data\pg.log`"", 'start' -WindowStyle Hidden
    foreach ($i in 1..30) { if (Test-Port $dbPort) { break }; Start-Sleep 1 }
}
$env:PGPASSWORD = $dbPassword
$exists = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d postgres -At -c "select 1 from pg_database where datname = '$dbName'"
if ($exists -ne '1') { & "$pgBin\createdb.exe" -h localhost -p $dbPort -U $dbUser $dbName }
Write-Host "Database ready on port $dbPort"

# 2. Backend
if (-not (Test-Port 8080)) {
    $jar = Join-Path $root 'target\deliveryservice-0.0.1-SNAPSHOT.jar'
    if (-not (Test-Path $jar)) {
        Write-Host 'Building backend jar...'
        $env:MAVEN_OPTS = '-Xmx384m'
        & cmd.exe /c "`"$root\mvnw.cmd`" -o -B -q -f `"$root\pom.xml`" package -DskipTests"
    }
    $env:DB_URL = "jdbc:postgresql://localhost:$dbPort/$dbName"
    $env:DB_USERNAME = $dbUser
    $env:DB_PASSWORD = $dbPassword
    $env:JWT_SECRET = $vars['JWT_SECRET']
    $env:DEMO_MODE = if ($vars['DEMO_MODE']) { $vars['DEMO_MODE'] } else { 'false' }
    $env:MAIL_ENABLED = 'false'
    Write-Host 'Starting backend on 8080 (takes 1-2 minutes)...'
    Start-Process -FilePath java -WorkingDirectory $root -WindowStyle Hidden `
        -ArgumentList '-Xmx384m', "-Djava.io.tmpdir=$data\tmp", '-jar', "`"$jar`"" `
        -RedirectStandardOutput "$data\backend.log" -RedirectStandardError "$data\backend.err.log"
}
$up = $false
foreach ($i in 1..60) {
    try { if ((Invoke-RestMethod http://localhost:8080/actuator/health -TimeoutSec 3).status -eq 'UP') { $up = $true; break } } catch {}
    Start-Sleep 5
}
if (-not $up) { throw "Backend did not become healthy; see $data\backend.log" }
Write-Host 'Backend ready on 8080'

# 3. Frontend
if (-not (Test-Port 5173)) {
    Start-Process -FilePath cmd.exe -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden `
        -ArgumentList '/c', "npm run dev > `"$data\frontend.log`" 2>&1"
    foreach ($i in 1..30) { if (Test-Port 5173) { break }; Start-Sleep 2 }
}
Write-Host 'Frontend ready: open http://localhost:5173'
