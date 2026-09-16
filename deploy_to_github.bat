@echo off
echo 🚀 Starting Deployment to GitHub...

:: Change to the root directory
cd /d e:\restaurants

:: Add all changes
echo 📝 Adding changes...
git add .

:: Commit with a descriptive message
echo 💾 Committing changes...
git commit -m "Implement General Settings (Singleton), Zustand Store, and definitive 401 Auth fix"

:: Push to main (or current branch)
echo 📤 Pushing to GitHub...
git push origin HEAD

echo ✅ Deployment Complete!
pause
