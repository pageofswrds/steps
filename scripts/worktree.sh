#!/usr/bin/env bash
#
# Cut a new worktree — a second copy of the app on its own branch, so two
# windows can work on two things without treading on each other.
#
#   ./scripts/worktree.sh new bar-colors     # → .worktrees/bar-colors on feat/bar-colors
#   ./scripts/worktree.sh rm  bar-colors     # → puts it away again
#
# The slow part of a new worktree is never git — it's the 2GB of node_modules.
# `npm ci` rebuilds all 50,000 files from scratch and takes minutes. This copies
# them from a worktree you already have instead, which on macOS takes about
# eight seconds and uses no extra disk at all: APFS shares the underlying blocks
# between the two copies until one of them changes. Same files, same result,
# roughly twenty times faster.
#
# It only does that when it's safe. If package.json's lockfile has changed since
# the copy you'd be cloning from, the dependencies genuinely differ and it falls
# back to a real `npm ci` rather than handing you a stale node_modules — which
# would fail later, confusingly, and look like your code was broken.

set -euo pipefail

# The MAIN checkout, not whichever worktree this script happens to be running
# from. `git rev-parse --show-toplevel` would answer "the worktree you're in",
# so running this from inside one worktree would nest the next one inside it.
# The first line of `worktree list` is always the main checkout.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && git worktree list --porcelain | head -1 | cut -d' ' -f2-)"
cd "$REPO"

CMD="${1:-}"
TOPIC="${2:-}"
BASE="${BASE:-origin/main}"

usage() {
  echo "usage: ./scripts/worktree.sh new <topic>   # BASE=<branch> to start somewhere else"
  echo "       ./scripts/worktree.sh rm  <topic>"
  exit 1
}

[ -n "$CMD" ] && [ -n "$TOPIC" ] || usage

DIR=".worktrees/$TOPIC"
BRANCH="feat/$TOPIC"

case "$CMD" in
  new)
    [ -e "$DIR" ] && { echo "✗ $DIR already exists"; exit 1; }

    echo "→ fetching"
    git fetch --prune --quiet

    echo "→ new worktree $DIR on $BRANCH (from $BASE)"
    git worktree add "$DIR" -b "$BRANCH" "$BASE"

    # Find a node_modules we can copy: any other worktree, or the main checkout.
    DONOR=""
    for candidate in "$REPO"/.worktrees/*/ "$REPO"/; do
      [ "$candidate" = "$REPO/$DIR/" ] && continue
      if [ -d "${candidate}node_modules" ] && [ -f "${candidate}package-lock.json" ]; then
        # Only reuse it if the lockfile matches — otherwise the deps really are
        # different and copying them would be a lie.
        if cmp -s "${candidate}package-lock.json" "$DIR/package-lock.json"; then
          DONOR="$candidate"
          break
        fi
      fi
    done

    if [ -n "$DONOR" ]; then
      echo "→ cloning dependencies from ${DONOR#$REPO/}node_modules"
      # -c asks APFS for a copy-on-write clone: instant, and no extra disk.
      # Falls back to a plain copy on filesystems that can't do it.
      cp -cR "${DONOR}node_modules" "$DIR/node_modules" 2>/dev/null \
        || cp -R "${DONOR}node_modules" "$DIR/node_modules"
    else
      echo "→ no matching node_modules to copy (lockfile differs, or none yet) — running npm ci"
      (cd "$DIR" && npm ci)
    fi

    echo
    echo "✓ ready:  cd $DIR && npx expo start --port $((8081 + RANDOM % 20 + 1))"
    echo "  (a different port than your other windows, so they don't feed each"
    echo "   other the wrong app)"
    ;;

  rm)
    [ -e "$DIR" ] || { echo "✗ no such worktree: $DIR"; exit 1; }
    # Only pass -f through when it was actually asked for — an empty argument
    # is not the same as no argument, and git rejects it.
    case "${3:-}" in
      -f|--force) git worktree remove --force "$DIR" ;;
      "")         git worktree remove "$DIR" ;;
      *)          echo "✗ unknown option: $3 (only -f / --force)"; exit 1 ;;
    esac
    echo "✓ removed $DIR"
    echo "  the branch $BRANCH is still there — delete it with:  git branch -d $BRANCH"
    echo "  (that refuses if it hasn't been merged yet, which is the point)"
    ;;

  *) usage ;;
esac
