# ArthMitra backend dev server — correct reload config.
# Reload excludes matter: writing models/CSVs/chat data while the server runs
# must NOT restart it mid-request (was the source of long ASGI tracebacks).
$killed = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($killed) {
    $killed | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    "Killed stale process on port 8000."
}

$uvicornArgs = @(
    "-m", "uvicorn", "main:app",
    "--reload", "--port", "8000",
    "--reload-exclude", "ml_engine/models",
    "--reload-exclude", "scripts/data",
    "--reload-exclude", "*.joblib",
    "--reload-exclude", "*.csv",
    "--reload-exclude", "*.db",
    "--reload-exclude", "data",
    "--reload-exclude", "__pycache__"
)
& python @uvicornArgs
