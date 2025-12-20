# Quick Fix: Remove SendGrid Secret from Git History

## The Problem

GitHub is blocking your push because commit `9d96c222b6117aae5ab5744b26fa67288128cd6f` contains a SendGrid API key in `docs/SENDGRID_API_KEY_TROUBLESHOOTING.md:15`.

## Fastest Solution: Use GitHub's Allow Link (Then Fix)

**Step 1: Allow the secret temporarily**
1. Click this link: https://github.com/muragewanjohi/storeflow-website/security/secret-scanning/unblock-secret/376NdsvXFDAaWDIpyGSk47ShRim
2. Click "Allow secret" to unblock the push
3. **Push your current changes:**
   ```bash
   git push origin main
   ```

**Step 2: Rotate the API Key IMMEDIATELY**
1. Go to SendGrid Dashboard: https://app.sendgrid.com/
2. Settings → API Keys
3. Delete the compromised key: `SG.ORN1zTwpR2KNUWFUQUTbug...`
4. Create a new API key
5. Update `.env.local` with the new key

**Step 3: Remove secret from history (after push)**
Use BFG Repo-Cleaner or git filter-repo to clean history.

---

## Better Solution: Fix Before Pushing

### Option A: Use BFG Repo-Cleaner (Recommended)

1. **Download BFG:**
   - Go to: https://rtyley.github.io/bfg-repo-cleaner/
   - Download `bfg-1.14.0.jar`
   - Save to: `c:\xampp\htdocs\storeflow\bfg.jar`

2. **Create secrets file:**
   ```bash
   cd c:\xampp\htdocs\storeflow
   echo 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 > secrets.txt
   ```

3. **Run BFG:**
   ```bash
   java -jar bfg.jar --replace-text secrets.txt .git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **Force push:**
   ```bash
   git push --force origin main
   ```

### Option B: Manual Git Rebase

If BFG is not available, manually edit the commit:

```bash
cd c:\xampp\htdocs\storeflow

# Find the parent of the problematic commit
git log --oneline | findstr /C:"9d96c22" /C:"894f42"

# Start interactive rebase (replace <parent-commit> with actual hash)
git rebase -i <parent-commit>^
```

In the editor:
- Change `pick 9d96c22` to `edit 9d96c22`
- Save and close

Then:
```bash
# Fix the file
notepad docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
# Replace: 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
# With: SG.your-actual-api-key-here

git add docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
git commit --amend --no-edit
git rebase --continue

# Force push
git push --force-with-lease origin main
```

---

## Current Status

The file `docs/SENDGRID_API_KEY_TROUBLESHOOTING.md` currently has the placeholder `SG.your-actual-api-key-here`, which is correct. However, the secret is still in git history in commit `9d96c222`.

**You must remove it from history before pushing, or use the "Allow secret" link to push first, then fix it.**
