# ============================================================
#  LeadBoard - tat triet de moi tien trinh backend/frontend cu
#  Dung khi muon "reset" hoan toan truoc khi khoi dong lai.
# ============================================================

$ports = 8000, 5173, 5174, 5175, 5176

Write-Host "=== LeadBoard: dang tim va tat tien trinh cu ===" -ForegroundColor Cyan

$killedAny = $false

# 1) Tat theo port dang lang nghe (chinh xac nhat)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $procId = $conn.OwningProcess
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  - Port $port : tat process $($proc.ProcessName) (PID $procId)" -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $killedAny = $true
        }
    }
}

# 2) Don them cac tien trinh node/python mo coi (chua kip bind port,
#    hoac la tien trinh con) nhung ro rang thuoc project nay.
$patterns = @("tinhplanning.*vite", "tinhplanning.*uvicorn", "tinhplanning\\backend\\.venv")
$candidates = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='python.exe'" -ErrorAction SilentlyContinue
foreach ($c in $candidates) {
    if (-not $c.CommandLine) { continue }
    foreach ($p in $patterns) {
        if ($c.CommandLine -match $p) {
            $already = -not (Get-Process -Id $c.ProcessId -ErrorAction SilentlyContinue)
            if (-not $already) {
                Write-Host "  - Don them: $($c.Name) (PID $($c.ProcessId))" -ForegroundColor Yellow
                Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue
                $killedAny = $true
            }
            break
        }
    }
}

Start-Sleep -Milliseconds 500

if ($killedAny) {
    Write-Host "=== Da tat xong cac tien trinh cu. ===" -ForegroundColor Green
} else {
    Write-Host "=== Khong co tien trinh nao dang chay. ===" -ForegroundColor Green
}

# Xac nhan lai cac port da trong
$stillBusy = @()
foreach ($port in $ports) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        $stillBusy += $port
    }
}
if ($stillBusy.Count -gt 0) {
    Write-Host "!!! Canh bao: cac port van con bi chiem: $($stillBusy -join ', ')" -ForegroundColor Red
} else {
    Write-Host "Tat ca port (8000, 5173-5176) hien dang trong." -ForegroundColor Green
}
