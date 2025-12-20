# Fix GitHub Push Protection Error

## Problem

GitHub is blocking your push because commit `9d96c222b6117aae5ab5744b26fa67288128cd6f` contains a SendGrid API key.

**Error:**
```
remote: error: GH013: Repository rule violations found
remote: - Push cannot contain secrets
remote: - SendGrid API Key
remote:   locations:
remote:     - commit: 9d96c222b6117aae5ab5744b26fa67288128cd6f
remote:       path: docs/SENDGRID_API_KEY_TROUBLESHOOTING.md:15
```

---

## Quick Fix: Allow Secret (Push Now, Fix Later)

**Step 1: Allow the secret to unblock push**
1. Open: https://github.com/muragewanjohi/storeflow-website/security/secret-scanning/unblock-secret/376NdsvXFDAaWDIpyGSk47ShRim
2. Click **"Allow secret"**
3. Push your code:
   ```bash
   git push origin main
   ```

**Step 2: Rotate API Key IMMEDIATELY** ⚠️
1. Go to SendGrid: https://app.sendgrid.com/
2. Settings → API Keys
3. **Delete** the compromised key: `SG.ORN1zTwpR2KNUWFUQUTbug...`
4. Create a new API key
5. Update `.env.local` with the new key

**Step 3: Clean Git History (After Push)**
See "Permanent Fix" section below.

---

## Permanent Fix: Remove Secret from History

### Option 1: Use BFG Repo-Cleaner (Recommended - Fastest)

1. **Download BFG:**
   - Visit: https://rtyley.github.io/bfg-repo-cleaner/
   - Download `bfg-1.14.0.jar`
   - Save to: `c:\xampp\htdocs\storeflow\bfg.jar`

2. **Create secrets file:**
   ```powershell
   cd c:\xampp\htdocs\storeflow
   "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" | Out-File -Encoding utf8 secrets.txt
   ```

3. **Run BFG:**
   ```powershell
   java -jar bfg.jar --replace-text secrets.txt .git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force origin main
   ```

### Option 2: Manual Git Rebase

If BFG is not available:

```powershell
cd c:\xampp\htdocs\storeflow

# Find the commit before 9d96c22
git log --oneline | findstr /C:"894f42"

# Start interactive rebase (replace 894f425 with actual hash if different)
git rebase -i 894f425^
```

In the editor:
- Find line with `9d96c22`
- Change `pick` to `edit`
- Save and close

Then:
```powershell
# Edit the file
notepad docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
# Find: 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
# Replace with: SG.your-actual-api-key-here
# Save and close

git add docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
git commit --amend --no-edit
git rebase --continue

# Force push
git push --force-with-lease origin main
```

---

## Why This Happened

The file `docs/SENDGRID_API_KEY_TROUBLESHOOTING.md` was committed with a real API key in commit `9d96c222`. The current file has the placeholder `SG.your-actual-api-key-here`, but the secret is still in git history.

---

## Prevention

✅ **Current file:** Has placeholder (correct)  
❌ **Commit history:** Still has real secret  
⚠️ **Action:** Remove from history or allow secret temporarily

**Best Practices:**
- Never commit real API keys
- Always use placeholders in documentation
- Use `.env.local` for real keys (already in `.gitignore`)
- Use GitHub Secrets for CI/CD

---

## Summary

**Fastest Solution:**
1. Click allow link → Push → Rotate API key → Clean history later

**Best Solution:**
1. Download BFG → Clean history → Push → Rotate API key

**Current Status:**
- Working directory: ✅ Safe (has placeholder)
- Commit `9d96c222`: ❌ Contains secret
- GitHub: ⛔ Blocking push
