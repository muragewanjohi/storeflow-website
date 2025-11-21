# Clear Next.js build cache
Write-Host "Clearing Next.js build cache..." -ForegroundColor Yellow

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Deleted .next folder" -ForegroundColor Green
} else {
    Write-Host "✓ .next folder doesn't exist" -ForegroundColor Green
}

Write-Host "`nCache cleared! You can now run 'npm run dev' again." -ForegroundColor Green

