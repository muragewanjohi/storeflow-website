# Setup script to install git hooks (PowerShell version for Windows)
# This will copy the hooks from .githooks to .git/hooks

Write-Host "Setting up git hooks..." -ForegroundColor Cyan

# Check if .git directory exists
if (-not (Test-Path ".git")) {
    Write-Host "Error: .git directory not found. Are you in a git repository?" -ForegroundColor Red
    exit 1
}

# Create .git/hooks directory if it doesn't exist
if (-not (Test-Path ".git/hooks")) {
    New-Item -ItemType Directory -Path ".git/hooks" | Out-Null
}

# Copy pre-push hook
if (Test-Path ".githooks/pre-push") {
    Copy-Item ".githooks/pre-push" ".git/hooks/pre-push" -Force
    Write-Host "Installed pre-push hook" -ForegroundColor Green
} else {
    Write-Host "Warning: .githooks/pre-push not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Git hooks setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "The pre-push hook will now run type checking before you push to remote."
Write-Host "To skip the hook (not recommended), use: git push --no-verify"
