# Publishing Guide for Ultraflow v1.4.0

## Overview

Ultraflow v1.4.0 is ready for publishing to npm and GitHub. This release adds major new features:
- Graphify integration (knowledge graphs for code)
- MemPalace integration (conversation memory)
- GitNexus code intelligence
- 40+ additional MCP tools
- Comprehensive skill documentation

## Pre-Publishing Checklist

- [x] README.md updated with new features
- [x] CHANGELOG.md created with version notes
- [x] package.json version bumped (1.3.1 → 1.4.0)
- [x] Keywords updated in package.json
- [x] Description updated to reflect new tools
- [x] Skill files created (8 files in .claude/skills/)
- [x] CLAUDE.md updated
- [x] AGENTS.md updated
- [x] GitHub package name set: `@s-nikk/ultraflow`

## Publishing to npm

### Option 1: Automated Publishing (Recommended)

If you have GitHub Actions configured:

```bash
# Create git tag and push
git tag v1.4.0
git push origin v1.4.0

# GitHub Actions will automatically:
# 1. Run tests
# 2. Publish to npm
# 3. Create GitHub release
```

### Option 2: Manual Publishing

#### Step 1: Authenticate with npm

```bash
npm login
# Enter your npm username and password
```

#### Step 2: Publish to npm

```bash
# From the ultraflow directory
cd /path/to/ultraflow

# Publish the package
npm publish

# Or for scoped package (@s-nikk/ultraflow)
npm publish --access public
```

#### Step 3: Verify Publication

```bash
# Check npm registry
npm info @s-nikk/ultraflow

# Should show:
# @s-nikk/ultraflow@1.4.0
# ultraflow@1.4.0 | MIT | deps: 5 | versions: 8
```

## Publishing to GitHub

### Step 1: Create Git Tag

```bash
# Navigate to repository
cd /path/to/ultraflow

# Create annotated tag
git tag -a v1.4.0 -m "Release v1.4.0: Graphify, MemPalace, GitNexus integration"

# Push to GitHub
git push origin v1.4.0
```

### Step 2: Create GitHub Release

Option A: Using gh CLI

```bash
gh release create v1.4.0 --title "Ultraflow v1.4.0" --notes-file CHANGELOG.md
```

Option B: Manually on GitHub.com

1. Go to https://github.com/S-Nikk/ultraflow/releases
2. Click "Draft a new release"
3. Tag: v1.4.0
4. Title: "Ultraflow v1.4.0"
5. Description: (copy from CHANGELOG.md)
6. Click "Publish release"

## Verifying Publication

### Check npm Package

```bash
# View on npm
npm view @s-nikk/ultraflow

# Install latest version
npm install @s-nikk/ultraflow@latest

# Verify version
npm ls @s-nikk/ultraflow
```

### Check GitHub Release

1. Visit: https://github.com/S-Nikk/ultraflow/releases
2. Verify v1.4.0 appears in releases list
3. Check CHANGELOG is displayed correctly

## Post-Publishing Steps

1. **Update documentation sites** (if any)
2. **Announce on channels:**
   - GitHub Discussions
   - Dev.to
   - Twitter/X
   - Relevant communities

3. **Monitor issues:**
   - Watch for bug reports
   - Respond to questions

4. **Prepare for next release:**
   - Create development branch for v1.5.0
   - Update CHANGELOG with "Unreleased" section

## Release Notes Template

**For announcements:**

```markdown
## Ultraflow v1.4.0 — Major Tools Integration

Ultraflow now integrates three powerful code intelligence and memory tools:

### ✨ What's New

**Graphify** — Knowledge graph builder
- Transforms code into queryable graphs
- 25+ language support via tree-sitter
- Multimodal: code, docs, PDFs, images, video
- Auto-analyzes on git commits

**MemPalace** — Conversation memory system
- Store and search session history
- 29 MCP tools for full integration
- Semantic search, no API calls
- Hierarchical memory organization

**GitNexus** — Code intelligence
- Impact analysis before changes
- Execution flow mapping
- Safe refactoring tools

### 📊 Stats

- 58+ MCP tools (up from 18)
- 4 new AI systems fully supported
- 71.5x fewer tokens per query (Graphify)
- 96.6% R@5 retrieval accuracy (MemPalace)

### 📖 Get Started

```bash
npm install @s-nikk/ultraflow@latest
npx ultraflow init
npx ultraflow start
```

See [README.md](https://github.com/S-Nikk/ultraflow#readme) for details.
```

## Troubleshooting

### npm Publish Fails

**Problem:** "You do not have permission to publish this package"

**Solution:** 
- Verify npm login: `npm whoami`
- Check package.json `name` field
- Verify npm account has access to @s-nikk namespace

**Problem:** "Package version already exists"

**Solution:**
- Ensure version in package.json is unique
- Bump version if publishing same content

### GitHub Release Not Showing

**Problem:** Release created but not appearing

**Solution:**
1. Verify tag was pushed: `git push origin v1.4.0`
2. Check release visibility: releases page settings
3. Refresh GitHub page

## Rollback (If Needed)

### Unpublish from npm

```bash
npm unpublish @s-nikk/ultraflow@1.4.0
```

⚠️ **Warning:** Can only unpublish within 72 hours of publication

### Delete GitHub Release

1. Go to releases page
2. Click release
3. Click "Delete" button
4. Confirm deletion

## Files Changed in v1.4.0

```
.claude/skills/graphify/
├── graphify-cli/SKILL.md
├── graphify-guide/SKILL.md
├── graphify-analysis/SKILL.md
└── graphify-integration/SKILL.md

.claude/skills/mempalace/
├── mempalace-cli/SKILL.md
├── mempalace-guide/SKILL.md
├── mempalace-retrieval/SKILL.md
└── mempalace-integration/SKILL.md

Modified:
- README.md (updated features, tools, architecture)
- package.json (version, keywords, description)
- CLAUDE.md (added tool sections)
- AGENTS.md (added tool sections)

New:
- CHANGELOG.md
- PUBLISHING.md (this file)
```

## Next Steps

1. ✅ Review all changes
2. ✅ Commit: `git add -A && git commit -m "release: v1.4.0"`
3. ✅ Tag: `git tag -a v1.4.0`
4. ✅ Push: `git push origin main && git push origin v1.4.0`
5. ✅ Publish to npm: `npm publish`
6. ✅ Create GitHub release
7. ✅ Monitor for issues

---

**Ready to publish!** Follow the steps above to release v1.4.0 to npm and GitHub.
