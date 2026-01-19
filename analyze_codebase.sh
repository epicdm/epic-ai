#!/usr/bin/env bash
# analyze_codebase.sh
# Creates a repo brief in ./_ai_brief you can paste into an AI.

set -euo pipefail

OUTDIR="_ai_brief"
mkdir -p "$OUTDIR"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

log "Starting codebase analysis in: $(pwd)"
log "Writing outputs to: $OUTDIR"

# 1B) Basic project snapshot (structure + key files)
pwd | tee "$OUTDIR/00_pwd.txt"
ls -la | tee "$OUTDIR/01_root_ls.txt"

# tree (if installed) otherwise fallback
if command -v tree >/dev/null 2>&1; then
  tree -L 4 -a 2>/dev/null | tee "$OUTDIR/02_tree_L4.txt"
else
  echo "tree not installed" | tee "$OUTDIR/02_tree_L4.txt"
  find . -maxdepth 4 -print | sed 's|[^/]*/|  |g' | tee "$OUTDIR/02_tree_like.txt"
fi

# 1C) Git + status
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status | tee "$OUTDIR/03_git_status.txt"
  git remote -v | tee "$OUTDIR/04_git_remote.txt" || true
  git log -n 15 --oneline | tee "$OUTDIR/05_git_log.txt" || true
else
  echo "not a git repo" | tee "$OUTDIR/03_git_status.txt"
  : > "$OUTDIR/04_git_remote.txt"
  : > "$OUTDIR/05_git_log.txt"
fi

# 1D) Detect tech stack (quick signals)
# Note: ls will error if files are missing; we avoid that by checking file existence.
{
  for f in package.json pnpm-lock.yaml yarn.lock bun.lockb requirements.txt pyproject.toml Pipfile composer.json Gemfile go.mod Cargo.toml pubspec.yaml pom.xml build.gradle settings.gradle; do
    if [ -e "$f" ]; then
      ls -la "$f"
    fi
  done
} | tee "$OUTDIR/06_stack_files.txt"

# 1E) Pull dependencies + scripts (auto)
# Node
if [ -f package.json ]; then
  cat package.json | tee "$OUTDIR/10_package.json.txt"
fi

# Python
if [ -f requirements.txt ]; then
  cat requirements.txt | tee "$OUTDIR/10_requirements.txt"
fi
if [ -f pyproject.toml ]; then
  cat pyproject.toml | tee "$OUTDIR/11_pyproject.toml.txt"
fi

# PHP/Laravel
if [ -f composer.json ]; then
  cat composer.json | tee "$OUTDIR/10_composer.json.txt"
fi

# Flutter
if [ -f pubspec.yaml ]; then
  cat pubspec.yaml | tee "$OUTDIR/10_pubspec.yaml.txt"
fi

# 1F) Find routes/pages/controllers (framework-agnostic)
find . -maxdepth 6 -type d \( -name "pages" -o -name "app" -o -name "routes" -o -name "router" -o -name "controllers" -o -name "views" \) \
  2>/dev/null | tee "$OUTDIR/20_route_folders.txt"

# 1G) Find API endpoints (common patterns)
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  -E 'app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(|@app\.(get|post|put|delete|patch)|FastAPI\(|APIRouter\(|Route\(' \
  . 2>/dev/null | head -n 300 | tee "$OUTDIR/21_api_endpoints_snippet.txt"

# 1H) Find environment variables used (very important for production)
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  -E 'process\.env\.|os\.environ|getenv\(|ENV\[|System\.getenv\(' \
  . 2>/dev/null | head -n 300 | tee "$OUTDIR/30_env_usage_snippet.txt"

# List .env files (root only)
if ls -la .env* >/dev/null 2>&1; then
  ls -la .env* 2>/dev/null | tee "$OUTDIR/31_env_files.txt"
else
  echo "no .env files in root" | tee "$OUTDIR/31_env_files.txt"
fi

# 1I) Find auth/security hints
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  -E 'auth|jwt|session|cookie|passport|next-auth|clerk|supabase|firebase|oauth|bcrypt|argon2' \
  . 2>/dev/null | head -n 300 | tee "$OUTDIR/40_auth_security_snippet.txt"

# 1J) Find database + migrations/schema
find . -maxdepth 7 -type d \( -iname "*migration*" -o -iname "*migrations*" -o -iname "prisma" -o -iname "schema" -o -iname "models" \) \
  2>/dev/null | tee "$OUTDIR/50_db_folders.txt"

find . -maxdepth 7 -type f \( -iname "*schema*.sql" -o -iname "schema.prisma" -o -iname "*migration*.sql" \) \
  2>/dev/null | head -n 200 | tee "$OUTDIR/51_db_files.txt"

# 1K) Find tests + CI + Docker
find . -maxdepth 6 -type d \( -name "__tests__" -o -name "test" -o -name "tests" \) \
  2>/dev/null | tee "$OUTDIR/60_test_folders.txt"

find . -maxdepth 6 -type f \( -name "Dockerfile" -o -name "docker-compose.yml" -o -name "docker-compose.yaml" \) \
  2>/dev/null | tee "$OUTDIR/61_docker_files.txt"

find . -maxdepth 6 -type d -name ".github" \
  2>/dev/null | tee "$OUTDIR/62_github_ci.txt"

# 1L) Make one “single file” you can paste to the AI
cat "$OUTDIR"/*.txt > "$OUTDIR/ALL_AI_BRIEF.txt"
log "Wrote $OUTDIR/ALL_AI_BRIEF.txt"
log "Done."
