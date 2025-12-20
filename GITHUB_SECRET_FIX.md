# Fix GitHub Push Protection Error

## Error Message

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - GITHUB PUSH PROTECTION
remote: - Push cannot contain secrets
remote: - SendGrid API Key
remote:   locations:
remote:     - commit: 9d96c222b6117aae5ab5744b26fa67288128cd6f
remote:       path: docs/SENDGRID_API_KEY_TROUBLESHOOTING.md:15
```

## Immediate Solution: Allow Secret (Then Fix)

**Step 1: Allow the secret to push**
1. Click: https://github.com/muragewanjohi/storeflow-website/security/secret-scanning/unblock-secret/376NdsvXFDAaWDIpyGSk47ShRim
2. Click "Allow secret"
3. Push your code:
   ```bash
   git push origin main
   ```

**Step 2: Rotate API Key IMMEDIATELY**
1. Go to: https://app.sendgrid.com/
2. Settings → API Keys
3. **Delete** the key: `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`
4. Create a new API key
5. Update `.env.local` with the new key

**Step 3: Clean Git History (After Push)**

The secret is still in commit `9d96c222`. You need to remove it from history.

### Option A: Use BFG Repo-Cleaner (Best)

1. **Download BFG:**
   - https://rtyley.github.io/bfg-repo-cleaner/
   - Save as `bfg.jar` in your project

2. **Create replacement file:**
   ```bash
   cd c:\xampp\htdocs\storeflow
   echo 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 > secrets.txt
   ```

3. **Run BFG:**
   ```bash
   java -jar bfg.jar --replace-text secrets.txt .git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force origin main
   ```

### Option B: Manual Rebase (If no Java/BFG)

```bash
cd c:\xampp\htdocs\storeflow

# Find commits
git log --oneline --all | findstr "9d96c22"

# If found, rebase to edit
git rebase -i <commit-before-9d96c22>^
# Change 'pick' to 'edit' for 9d96c22
# When it stops, edit the file, then:
git add docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
git commit --amend --no-edit
git rebase --continue
git push --force-with-lease origin main
```

---

## Why This Happened

The file `docs/SENDGRID_API_KEY_TROUBLESHOOTING.md` was committed with a real API key instead of a placeholder. The current file has the placeholder, but the secret is still in git history.

---

## Prevention

1. **Never commit real API keys**
2. **Use placeholders:** `SG.your-actual-api-key-here`
3. **Use `.env.local`** (already in `.gitignore`)
4. **Use GitHub Secrets** for CI/CD

---

## Current Status

✅ File in working directory: Has placeholder  
❌ Commit `9d96c222`: Still has real secret  
⚠️ Action needed: Remove from history or allow secret temporarily
