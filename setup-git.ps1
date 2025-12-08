# Git Setup Script for Clothing App
Set-Location "c:\Users\patid\project_backup\1_Project\experiments\clothing\clothing9-gemini-app"

Write-Host "Initializing git repository..." -ForegroundColor Green
git init

Write-Host "Adding all files..." -ForegroundColor Green
git add .

Write-Host "Creating initial commit..." -ForegroundColor Green
git commit -m "Initial commit: Clothing e-commerce app with Django backend and React frontend"

Write-Host "Setting branch to main..." -ForegroundColor Green
git branch -M main

Write-Host "Adding remote repository..." -ForegroundColor Green
git remote add origin https://github.com/vaibhavpatidar0079/clothing.git

Write-Host "Pushing to GitHub..." -ForegroundColor Green
Write-Host "Note: You may need to authenticate with GitHub credentials" -ForegroundColor Yellow
git push -u origin main

Write-Host "Done! Check your repository at https://github.com/vaibhavpatidar0079/clothing" -ForegroundColor Green
