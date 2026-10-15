#!/bin/sh
# Compile le site et le publie sur la branche « production », que l'outil Git de cPanel récupère et déploie.
# Le code source reste sur « main » ; « production » ne contient que le site compilé et .cpanel.yml.
set -e
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Des modifications ne sont pas commitées : commitez-les avant de publier." >&2
  exit 1
fi

npm test
npm run build
cp deploy/.cpanel.yml dist/.cpanel.yml

# Commit du contenu de dist/ sur « production », sans toucher au dossier de travail ni à l'index
TMPDIR_INDEX=$(mktemp -d)
INDEX="$TMPDIR_INDEX/index"
trap 'rm -rf "$TMPDIR_INDEX"' EXIT
GIT_INDEX_FILE="$INDEX" git --work-tree=dist add -A -f .
TREE=$(GIT_INDEX_FILE="$INDEX" git write-tree)
PARENT=$(git rev-parse -q --verify refs/heads/production || true)
if [ -n "$PARENT" ] && [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then
  echo "Le site compilé n'a pas changé : rien à publier."
else
  COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "Site compilé depuis $(git rev-parse --short HEAD)")
  git update-ref refs/heads/production "$COMMIT"
  echo "Branche production : $(git rev-parse --short production)"
fi

git push origin main production
echo "Publié. Dans cPanel › Git Version Control › Manage › Pull or Deploy : « Update from Remote » puis « Deploy HEAD Commit »."
