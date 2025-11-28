#!/bin/sh
# Setup script to install git hooks
# This will copy the hooks from .githooks to .git/hooks

echo "🔧 Setting up git hooks..."

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Error: .git directory not found. Are you in a git repository?"
  exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-push hook
if [ -f ".githooks/pre-push" ]; then
  cp .githooks/pre-push .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  echo "✅ Installed pre-push hook"
else
  echo "⚠️  Warning: .githooks/pre-push not found"
fi

echo ""
echo "✅ Git hooks setup complete!"
echo ""
echo "The pre-push hook will now run type checking before you push to remote."
echo "To skip the hook (not recommended), use: git push --no-verify"

