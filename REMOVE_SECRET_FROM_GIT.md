# Remove SendGrid API Key from Git History

GitHub is blocking your push because a SendGrid API key was committed in commit `9d96c222b6117aae5ab5744b26fa67288128cd6f`.

## Solution: Use BFG Repo-Cleaner (Recommended)

BFG Repo-Cleaner is the fastest and safest way to remove secrets from git history.

### Step 1: Install BFG Repo-Cleaner

**Option A: Download JAR file**
1. Download from: https://rtyley.github.io/bfg-repo-cleaner/
2. Save as `bfg.jar` in your project directory

**Option B: Using Homebrew (if on Mac/Linux)**
```bash
brew install bfg
```

### Step 2: Create a file with the secret to remove

Create a file `secrets.txt` in your project root with the actual API key that was exposed:
```
SG.your-actual-api-key-here
```

### Step 3: Run BFG

```bash
cd c:\xampp\htdocs\storeflow

# Clone a fresh copy (BFG needs this)
git clone --mirror . ../storeflow-backup.git

# Run BFG to remove the secret
java -jar bfg.jar --replace-text secrets.txt ../storeflow-backup.git

# Clean up and force push
cd ../storeflow-backup.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Step 4: Update your local repository

```bash
cd c:\xampp\htdocs\storeflow
git fetch origin
git reset --hard origin/main
```

---

## Alternative: Manual Git Rebase (If BFG not available)

If you can't use BFG, you can manually edit the commit:

### Step 1: Find the commit

```bash
cd c:\xampp\htdocs\storeflow
git log --oneline --all | findstr "9d96c22"
```

### Step 2: Interactive rebase to edit

```bash
# Find the commit hash before 9d96c22
git rebase -i <commit-before-9d96c22>^
```

In the editor, change `pick` to `edit` for commit `9d96c22`.

### Step 3: Fix the file

```bash
# When rebase stops at that commit
# Edit docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
# Replace the secret with: SG.your-actual-api-key-here
git add docs/SENDGRID_API_KEY_TROUBLESHOOTING.md
git commit --amend --no-edit
git rebase --continue
```

### Step 4: Force push

```bash
git push --force-with-lease origin main
```

---

## Quick Fix: Allow the Secret (NOT RECOMMENDED)

If you need to push immediately and the API key is already compromised, you can temporarily allow it:

1. Go to: https://github.com/muragewanjohi/storeflow-website/security/secret-scanning/unblock-secret/376NdsvXFDAaWDIpyGSk47ShRim
2. Click "Allow secret"
3. **Then immediately rotate the API key in SendGrid Dashboard**

**⚠️ WARNING:** This allows the push but the secret is still in git history. You MUST:
- Rotate the SendGrid API key immediately
- Remove the secret from history using BFG or rebase
- Never use that API key again

---

## Recommended: Use BFG Repo-Cleaner

BFG is the safest and fastest method. It's specifically designed for removing secrets from git history.
