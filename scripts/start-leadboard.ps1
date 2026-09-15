# ============================================================
#  LeadBoard - khoi dong BACKEND + FRONTEND (khong Docker)
#  - Kiem tra tien trinh dang chay truoc, neu da OK thi bo qua.
#  - Neu port bi chiem boi tien trinh cu/loi thi tu dong tat
#    roi khoi dong lai, tranh xung dot port (5173 -> 5174 -> ...).
#  - Chay backend truoc, doi healthy roi moi chay frontend.
# ============================================================

$root = Split-Path -Parent $PSScriptRoot
$backendUrl = "http://localhost:8000/docs"
$frontendUrl = "http://localhost:5173/"
$backendPort = 8000
$frontendPort = 5173
# Cac port frontend "du" co the sinh ra do chay trung lap truoc do
$staleFrontendPorts = 5174, 5175, 5176

function Test-Url($url, [int]$timeoutSec = 3) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Stop-Port([int]$port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $procId = $conn.OwningProcess
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  - Tat tien trinh cu tren port $port : $($proc.ProcessName) (PID $procId)" -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Wait-Healthy($url, [int]$maxSeconds = 40) {
    $elapsed = 0
    while ($elapsed -lt $maxSeconds) {
        if (Test-Url $url) { return $true }
        Start-Sleep -Seconds 1
        $elapsed += 1
    }
    return $false
}

Write-Host "=== LeadBoard: kiem tra & khoi dong ===" -ForegroundColor Cyan

# ------------------- BACKEND -------------------
Write-Host ""
Write-Host "[1/2] Backend (http://localhost:8000)" -ForegroundColor Cyan
if (Test-Url $backendUrl) {
    Write-Host "  Da chay va phan hoi tot -> bo qua khoi tao lai." -ForegroundColor Green
} else {
    Stop-Port $backendPort
    Start-Sleep -Milliseconds 500
    Write-Host "  Dang khoi dong backend (cua so moi)..." -ForegroundColor Yellow
    Start-Process -FilePath (Join-Path $root "start-backend.bat") -WorkingDirectory $root | Out-Null
    if (Wait-Healthy $backendUrl 40) {
        Write-Host "  Backend da san sang: $backendUrl" -ForegroundColor Green
    } else {
        Write-Host "  !!! Backend chua phan hoi sau 40s. Kiem tra cua so terminal backend de xem loi." -ForegroundColor Red
    }
}

# ------------------- FRONTEND -------------------
Write-Host ""
Write-Host "[2/2] Frontend (http://localhost:5173)" -ForegroundColor Cyan
if (Test-Url $frontendUrl) {
    Write-Host "  Da chay va phan hoi tot -> bo qua khoi tao lai." -ForegroundColor Green
} else {
    # Tat ca port 5173 va cac port du (5174, 5175, ...) de dam bao
    # lan nay bind dung vao 5173, khong bi day sang port khac.
    Stop-Port $frontendPort
    foreach ($p in $staleFrontendPorts) { Stop-Port $p }
    Start-Sleep -Milliseconds 500
    Write-Host "  Dang khoi dong frontend (cua so moi)..." -ForegroundColor Yellow
    Start-Process -FilePath (Join-Path $root "start-frontend.bat") -WorkingDirectory $root | Out-Null
    if (Wait-Healthy $frontendUrl 40) {
        Write-Host "  Frontend da san sang: $frontendUrl" -ForegroundColor Green
    } else {
        Write-Host "  !!! Frontend chua phan hoi sau 40s. Kiem tra cua so terminal frontend de xem loi." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Hoan tat ===" -ForegroundColor Cyan
Write-Host "Backend : $backendUrl"
Write-Host "Frontend: $frontendUrl"
