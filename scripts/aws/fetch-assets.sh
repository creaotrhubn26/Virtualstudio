#!/usr/bin/env bash
#
# Bring the asset set down into public/ for local work.
#
# The models are not in git — they live in the bucket — so a fresh clone needs
# this once before the studio will show a figure, and before the Playwright
# suites will run. It is incremental: only what changed comes down.
#
#   scripts/aws/fetch-assets.sh              # everything
#   scripts/aws/fetch-assets.sh models       # just the models
#
set -euo pipefail

PROFILE="${AWS_PROFILE:-tidsflyt}"
REGION="${AWS_REGION:-eu-north-1}"
PROJECT="virtualstudio"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLIC="$REPO/public"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${ASSET_BUCKET:-${PROJECT}-assets-${ACCOUNT}}"

WANTED=("$@")
[ ${#WANTED[@]} -eq 0 ] && WANTED=(models audio images textures pattern-thumbnails)

for kind in "${WANTED[@]}"; do
  echo "Fetching $kind"
  mkdir -p "$PUBLIC/$kind"
  aws s3 sync "s3://$BUCKET/assets/$kind" "$PUBLIC/$kind" --only-show-errors
done

echo "Assets are in $PUBLIC"
