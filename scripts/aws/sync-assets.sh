#!/usr/bin/env bash
#
# Publish the local asset tree to the Virtualstudio bucket.
#
# Content under assets/ is addressed by path and cached for a year; manifests
# under system/ change when a set is rebuilt and are cached for a minute, so a
# new wardrobe is picked up without waiting on an invalidation.
#
#   scripts/aws/sync-assets.sh            # publish everything
#   scripts/aws/sync-assets.sh --dry-run  # show what would change
#
set -euo pipefail

PROFILE="${AWS_PROFILE:-tidsflyt}"
REGION="${AWS_REGION:-eu-north-1}"
PROJECT="virtualstudio"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLIC="$REPO/public"
# A scalar, not an array: macOS ships bash 3.2, where `set -u` rejects an
# empty array expansion and the whole publish dies before it starts.
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dryrun"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${ASSET_BUCKET:-${PROJECT}-assets-${ACCOUNT}}"
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$PROJECT-assets'].Id | [0]" --output text)"
echo "Publishing to s3://$BUCKET (distribution $DIST_ID)"

# A year, because a changed model gets a changed path rather than a new body at
# the same one.
LONG="public,max-age=31536000,immutable"
# A minute, because these say what the current asset set is.
SHORT="public,max-age=60"

sync() {
  local source="$1" destination="$2" cache="$3"
  [ -d "$source" ] || { echo "skip $source (not present)"; return; }
  aws s3 sync "$source" "s3://$BUCKET/$destination" $DRY \
    --delete --cache-control "$cache" --only-show-errors
  echo "synced $destination"
}

sync "$PUBLIC/models"             "assets/models"             "$LONG"
sync "$PUBLIC/audio"              "assets/audio"              "$LONG"
sync "$PUBLIC/images"             "assets/images"             "$LONG"
sync "$PUBLIC/textures"           "assets/textures"           "$LONG"
sync "$PUBLIC/pattern-thumbnails" "assets/pattern-thumbnails" "$LONG"

# The character manifests live under system/ as well as beside their models, so
# a client can ask what exists without downloading anything heavy.
STUDIO="$PUBLIC/models/avatars/studio"
if [ -d "$STUDIO" ]; then
  for file in manifest.json wardrobe.json PROVENANCE.md; do
    [ -f "$STUDIO/$file" ] || continue
    aws s3 cp "$STUDIO/$file" "s3://$BUCKET/system/characters/$file" $DRY \
      --cache-control "$SHORT" --only-show-errors
  done
  echo "synced system/characters"
fi

if [ -z "$DRY" ] && [ "$DIST_ID" != "None" ]; then
  echo "Invalidating manifests"
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
    --paths '/system/*' --query 'Invalidation.Id' --output text
fi
echo "Done"
