# Script to push to GitHub
Set-Location "c:\Users\patid\project_backup\1_Project\experiments\clothing\clothing9-gemini-app"

Write-Host "=== Checking Git Configuration ===" -ForegroundColor Cyan
$email = git config user.email
$name = git config user.name
Write-Host "Email: $email" -ForegroundColor Yellow
Write-Host "Name: $name" -ForegroundColor Yellow

if (-not $email -or -not $name) {
    Write-Host "`nGit user not configured. Setting up..." -ForegroundColor Yellow
    git config user.email "vaibhavpatidar0079@users.noreply.github.com"
    git config user.name "vaibhavpatidar0079"
    Write-Host "Git user configured!" -ForegroundColor Green
}

Write-Host "`n=== Checking for commits ===" -ForegroundColor Cyan
$commitCount = (git rev-list --count HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or $commitCount -eq 0) {
    Write-Host "No commits found. Creating initial commit..." -ForegroundColor Yellow
    git add .
    git commit -m "Initial commit: Clothing e-commerce app with Django backend and React frontend"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Commit failed! Check the error above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Found $commitCount commit(s)" -ForegroundColor Green
}

Write-Host "`n=== Setting branch to main ===" -ForegroundColor Cyan
git branch -M main

Write-Host "`n=== Checking remote ===" -ForegroundColor Cyan
$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/vaibhavpatidar0079/clothing.git
} else {
    Write-Host "Remote already configured: $remote" -ForegroundColor Green
}

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
Write-Host "You may be prompted for GitHub credentials..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "Your code has been pushed to: https://github.com/vaibhavpatidar0079/clothing" -ForegroundColor Green
} else {
    Write-Host "`n=== Push failed ===" -ForegroundColor Red
    Write-Host "You may need to authenticate. Try running: git push -u origin main" -ForegroundColor Yellow
}
