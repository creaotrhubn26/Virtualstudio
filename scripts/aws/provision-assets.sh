#!/usr/bin/env bash
#
# Provision the Virtualstudio asset store: a private S3 bucket behind a
# CloudFront distribution, plus the IAM policy a deploy job needs.
#
# The bucket is never public. CloudFront reaches it through an Origin Access
# Control, so the only way in is the distribution, and the only way to write is
# the deploy policy. Run it as often as you like: every step checks first.
#
#   aws login --profile tidsflyt          # or whatever gets you a session
#   scripts/aws/provision-assets.sh
#
set -euo pipefail

PROFILE="${AWS_PROFILE:-tidsflyt}"
REGION="${AWS_REGION:-eu-north-1}"
PROJECT="virtualstudio"
DEPLOY_POLICY_NAME="${PROJECT}-assets-deploy"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${ASSET_BUCKET:-${PROJECT}-assets-${ACCOUNT}}"
echo "Account $ACCOUNT, region $REGION, bucket $BUCKET"

# ---- Bucket ---------------------------------------------------------------
# Bucket names are global, so the account id keeps this one ours.
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket exists"
else
  echo "Creating bucket"
  aws s3api create-bucket --bucket "$BUCKET" \
    --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
fi

# Nothing here is public directly; CloudFront is the only reader.
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

# A bad upload should be recoverable: keep old versions, but not forever.
aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules": [
      {"ID":"expire-old-versions","Status":"Enabled","Filter":{},
       "NoncurrentVersionExpiration":{"NoncurrentDays":90}},
      {"ID":"abort-incomplete-uploads","Status":"Enabled","Filter":{},
       "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}
    ]}'

# The studio fetches GLBs and JSON with fetch(); without CORS the browser
# refuses them even though CloudFront served them happily.
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedMethods": ["GET","HEAD"],
    "AllowedOrigins": ["*"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag","Content-Length"],
    "MaxAgeSeconds": 86400
  }]}'

# ---- Folder structure -----------------------------------------------------
# S3 has no folders, but the prefixes are the contract the app resolves against
# and the boundary the cache policies are written on:
#
#   assets/   content addressed by path, cached hard
#   system/   manifests and catalogues that change, cached briefly
#   releases/ immutable snapshots of a whole asset set, kept for rollback
for prefix in \
  assets/models assets/audio assets/images assets/textures assets/pattern-thumbnails \
  system/characters system/scenes releases; do
  aws s3api put-object --bucket "$BUCKET" --key "$prefix/" --content-length 0 >/dev/null
done
echo "Prefixes in place"

# ---- CloudFront -----------------------------------------------------------
OAC_NAME="${PROJECT}-assets-oac"
OAC_ID="$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id | [0]" --output text 2>/dev/null || echo None)"
if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  echo "Creating origin access control"
  OAC_ID="$(aws cloudfront create-origin-access-control --origin-access-control-config "{
      \"Name\":\"$OAC_NAME\",
      \"Description\":\"Virtualstudio assets\",
      \"SigningProtocol\":\"sigv4\",
      \"SigningBehavior\":\"always\",
      \"OriginAccessControlOriginType\":\"s3\"}" \
    --query 'OriginAccessControl.Id' --output text)"
fi
echo "Origin access control $OAC_ID"

DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$PROJECT-assets'].Id | [0]" --output text 2>/dev/null || echo None)"
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  echo "Creating distribution (this takes a few minutes to deploy)"
  # CachingOptimized for everything, with a shorter policy on system/ so a
  # republished manifest is picked up without an invalidation.
  CACHE_OPTIMIZED="658327ea-f89d-4fab-a63d-7e88639e58f6"
  CACHE_SHORT="b2884449-e4de-46a7-ac36-70bc7f1ddd6d"   # CachingOptimizedForUncompressedObjects
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "{
    \"CallerReference\":\"$PROJECT-assets-$(date +%s)\",
    \"Comment\":\"$PROJECT-assets\",
    \"Enabled\":true,
    \"Origins\":{\"Quantity\":1,\"Items\":[{
      \"Id\":\"s3-$BUCKET\",
      \"DomainName\":\"$BUCKET.s3.$REGION.amazonaws.com\",
      \"OriginAccessControlId\":\"$OAC_ID\",
      \"S3OriginConfig\":{\"OriginAccessIdentity\":\"\"}}]},
    \"DefaultCacheBehavior\":{
      \"TargetOriginId\":\"s3-$BUCKET\",
      \"ViewerProtocolPolicy\":\"redirect-to-https\",
      \"AllowedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"],
        \"CachedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"]}},
      \"Compress\":true,
      \"CachePolicyId\":\"$CACHE_OPTIMIZED\"},
    \"CacheBehaviors\":{\"Quantity\":1,\"Items\":[{
      \"PathPattern\":\"system/*\",
      \"TargetOriginId\":\"s3-$BUCKET\",
      \"ViewerProtocolPolicy\":\"redirect-to-https\",
      \"AllowedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"],
        \"CachedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"]}},
      \"Compress\":true,
      \"CachePolicyId\":\"$CACHE_SHORT\"}]},
    \"PriceClass\":\"PriceClass_100\"}" \
    --query 'Distribution.Id' --output text)"
fi
DOMAIN="$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)"
echo "Distribution $DIST_ID at https://$DOMAIN"

# Only that distribution may read the bucket.
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Sid\":\"AllowCloudFrontRead\",
    \"Effect\":\"Allow\",
    \"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},
    \"Action\":\"s3:GetObject\",
    \"Resource\":\"arn:aws:s3:::$BUCKET/*\",
    \"Condition\":{\"StringEquals\":{
      \"AWS:SourceArn\":\"arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID\"}}}]}"

# ---- Deploy permissions ---------------------------------------------------
# Enough to publish an asset set and invalidate the manifests, and nothing else.
POLICY_ARN="arn:aws:iam::$ACCOUNT:policy/$DEPLOY_POLICY_NAME"
POLICY_DOCUMENT="{
  \"Version\":\"2012-10-17\",
  \"Statement\":[
    {\"Effect\":\"Allow\",\"Action\":[\"s3:ListBucket\",\"s3:GetBucketLocation\"],
     \"Resource\":\"arn:aws:s3:::$BUCKET\"},
    {\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],
     \"Resource\":\"arn:aws:s3:::$BUCKET/*\"},
    {\"Effect\":\"Allow\",\"Action\":[\"cloudfront:CreateInvalidation\"],
     \"Resource\":\"arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID\"}]}"

if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  echo "Updating deploy policy"
  aws iam create-policy-version --policy-arn "$POLICY_ARN" \
    --policy-document "$POLICY_DOCUMENT" --set-as-default >/dev/null
  # Only five versions are allowed; drop the oldest non-default.
  OLD="$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" \
    --query 'Versions[?!IsDefaultVersion] | sort_by(@, &CreateDate) | [0].VersionId' --output text)"
  if [ "$OLD" != "None" ] && [ "$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" \
      --query 'length(Versions)' --output text)" -ge 5 ]; then
    aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$OLD"
  fi
else
  echo "Creating deploy policy"
  aws iam create-policy --policy-name "$DEPLOY_POLICY_NAME" \
    --policy-document "$POLICY_DOCUMENT" >/dev/null
fi

cat <<SUMMARY

Done.

  Bucket        s3://$BUCKET            (private, versioned, encrypted)
  Distribution  $DIST_ID
  CDN           https://$DOMAIN
  Deploy policy $POLICY_ARN

Put this in the app's environment so it resolves assets from the CDN:

  VITE_ASSET_CDN_BASE=https://$DOMAIN

Then publish an asset set with scripts/aws/sync-assets.sh.
SUMMARY
