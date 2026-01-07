#!/bin/bash
# Script for optimizing git repository by removing large files from history

set -e

echo "=== Git Repository Optimization ==="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Create backup branch first
echo "1. Creating backup branch..."
git branch backup-before-cleanup 2>/dev/null || echo "Backup branch already exists or not needed"

# List of paths to remove from history
PATHS_TO_REMOVE=(
    "backend/models/"
    "backend/rodin_models/"
    "backend/humaniflow/model_files/"
    "backend/downloads/"
    "backend/test_images/"
    "backend/outputs/"
    "attached_assets/"
)

echo ""
echo "2. Removing large files from git history..."
echo "   This may take a while..."

# Use git filter-branch to remove files
for path in "${PATHS_TO_REMOVE[@]}"; do
    echo "   Removing: $path"
    git filter-branch --force --index-filter \
        "git rm -rf --cached --ignore-unmatch '$path'" \
        --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true
done

echo ""
echo "3. Cleaning up refs..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

echo ""
echo "4. Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "5. Checking repository size..."
du -sh .git

echo ""
echo "=== Optimization Complete ==="
echo "If something went wrong, you can restore from: backup-before-cleanup"


