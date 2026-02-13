#!/usr/bin/env python3
"""
R2 Asset Migration Script
Upload local public assets to Cloudflare R2 for CDN delivery

Usage:
    python scripts/migrate_assets_to_r2.py --dry-run    # Preview what would be uploaded
    python scripts/migrate_assets_to_r2.py              # Actually upload
    python scripts/migrate_assets_to_r2.py --delete-local  # Upload and remove local files
"""

import os
import sys
import argparse
import mimetypes
from pathlib import Path
from typing import List, Tuple, Optional
import hashlib

# Add backend to path for r2_client
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("Error: boto3 is required. Install with: pip install boto3")
    sys.exit(1)

# Configuration
R2_ENDPOINT = "https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com"
R2_BUCKET = "ml-models"  # Main bucket for all assets

# Asset directories to migrate
ASSET_DIRS = {
    'public/models': ('assets/models', R2_BUCKET),
    'public/audio': ('assets/audio', R2_BUCKET),
    'public/images': ('assets/images', R2_BUCKET),
    'public/textures': ('assets/textures', R2_BUCKET),
    'public/pattern-thumbnails': ('assets/pattern-thumbnails', R2_BUCKET),
    'backend/rodin_models': ('models/rodin', R2_BUCKET),
}

# File extensions to upload
ALLOWED_EXTENSIONS = {
    '.glb', '.gltf', '.fbx', '.obj',  # 3D models
    '.wav', '.mp3', '.ogg', '.m4a',   # Audio
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',  # Images
    '.json', '.bin',                   # Data files
    '.hdr', '.exr',                    # HDR textures
}

# Files/folders to skip
SKIP_PATTERNS = {
    '.DS_Store',
    'Thumbs.db',
    '.gitkeep',
    '__pycache__',
    'node_modules',
}


def get_r2_client():
    """Get S3-compatible client for Cloudflare R2."""
    access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
    secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
    
    if not access_key or not secret_key:
        raise ValueError(
            "R2 credentials not set. Please set:\n"
            "  CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY"
        )
    
    # Trim access key to 32 chars if needed
    access_key = access_key.strip()[:32]
    secret_key = secret_key.strip()
    
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


def get_content_type(file_path: Path) -> str:
    """Get MIME type for a file."""
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    # Custom mappings for common types
    ext_to_mime = {
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.hdr': 'image/vnd.radiance',
    }
    
    return ext_to_mime.get(file_path.suffix.lower(), mime_type or 'application/octet-stream')


def get_file_hash(file_path: Path) -> str:
    """Calculate MD5 hash of file for change detection."""
    hash_md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def should_skip(path: Path) -> bool:
    """Check if a file/folder should be skipped."""
    return any(pattern in str(path) for pattern in SKIP_PATTERNS)


def collect_files(local_dir: Path) -> List[Path]:
    """Recursively collect all files to upload."""
    files = []
    
    if not local_dir.exists():
        print(f"  Warning: Directory {local_dir} does not exist, skipping")
        return files
    
    for item in local_dir.rglob('*'):
        if item.is_file() and not should_skip(item):
            if item.suffix.lower() in ALLOWED_EXTENSIONS:
                files.append(item)
            else:
                print(f"  Skipping unsupported extension: {item}")
    
    return files


def check_file_exists(client, bucket: str, key: str) -> Tuple[bool, Optional[str]]:
    """Check if file exists in R2 and return its ETag."""
    try:
        response = client.head_object(Bucket=bucket, Key=key)
        return True, response.get('ETag', '').strip('"')
    except:
        return False, None


def upload_file(client, file_path: Path, bucket: str, r2_key: str, dry_run: bool = False) -> bool:
    """Upload a file to R2."""
    content_type = get_content_type(file_path)
    file_size = file_path.stat().st_size
    
    # Check if file already exists with same hash
    exists, remote_hash = check_file_exists(client, bucket, r2_key)
    local_hash = get_file_hash(file_path)
    
    if exists and remote_hash == local_hash:
        print(f"  ⏭️  Skip (unchanged): {r2_key}")
        return False
    
    action = "Would upload" if dry_run else "Uploading"
    size_mb = file_size / (1024 * 1024)
    print(f"  {'📤' if not dry_run else '🔍'} {action}: {r2_key} ({size_mb:.2f} MB)")
    
    if not dry_run:
        try:
            with open(file_path, 'rb') as f:
                client.put_object(
                    Bucket=bucket,
                    Key=r2_key,
                    Body=f,
                    ContentType=content_type,
                    # Make public bucket files publicly readable
                    # Note: Bucket policy must allow public access
                )
            print(f"  ✅ Uploaded: {r2_key}")
            return True
        except Exception as e:
            print(f"  ❌ Failed: {r2_key} - {e}")
            return False
    
    return True


def migrate_directory(
    client,
    local_dir: str,
    r2_prefix: str,
    bucket: str,
    workspace_root: Path,
    dry_run: bool = False,
    delete_local: bool = False
) -> Tuple[int, int, int]:
    """Migrate a directory to R2."""
    local_path = workspace_root / local_dir
    
    print(f"\n📁 Processing: {local_dir} → r2://{bucket}/{r2_prefix}")
    
    files = collect_files(local_path)
    uploaded = 0
    skipped = 0
    failed = 0
    total_size = 0
    
    for file_path in files:
        # Calculate R2 key
        relative_path = file_path.relative_to(local_path)
        r2_key = f"{r2_prefix}/{relative_path}".replace('\\', '/')
        
        result = upload_file(client, file_path, bucket, r2_key, dry_run)
        
        if result:
            uploaded += 1
            total_size += file_path.stat().st_size
            
            # Optionally delete local file after successful upload
            if delete_local and not dry_run:
                print(f"  🗑️  Deleting local: {file_path}")
                file_path.unlink()
        else:
            skipped += 1
    
    print(f"  Summary: {uploaded} uploaded, {skipped} skipped, {failed} failed")
    print(f"  Total size: {total_size / (1024 * 1024):.2f} MB")
    
    return uploaded, skipped, failed


def main():
    parser = argparse.ArgumentParser(description='Migrate assets to Cloudflare R2')
    parser.add_argument('--dry-run', action='store_true', help='Preview without uploading')
    parser.add_argument('--delete-local', action='store_true', help='Delete local files after upload')
    parser.add_argument('--dir', type=str, help='Only migrate specific directory')
    args = parser.parse_args()
    
    # Find workspace root
    workspace_root = Path(__file__).parent.parent
    
    print("=" * 60)
    print("🚀 R2 Asset Migration")
    print("=" * 60)
    print(f"Workspace: {workspace_root}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'UPLOAD'}")
    print(f"Delete local: {args.delete_local}")
    
    try:
        client = get_r2_client()
        print("✅ R2 connection established")
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    total_uploaded = 0
    total_skipped = 0
    total_failed = 0
    
    for local_dir, (r2_prefix, bucket) in ASSET_DIRS.items():
        if args.dir and args.dir not in local_dir:
            continue
            
        uploaded, skipped, failed = migrate_directory(
            client,
            local_dir,
            r2_prefix,
            bucket,
            workspace_root,
            dry_run=args.dry_run,
            delete_local=args.delete_local
        )
        
        total_uploaded += uploaded
        total_skipped += skipped
        total_failed += failed
    
    print("\n" + "=" * 60)
    print("📊 Migration Complete")
    print("=" * 60)
    print(f"Total uploaded: {total_uploaded}")
    print(f"Total skipped:  {total_skipped}")
    print(f"Total failed:   {total_failed}")
    
    if args.dry_run:
        print("\n⚠️  This was a dry run. Run without --dry-run to actually upload.")
    
    if total_uploaded > 0 and not args.dry_run:
        print("\n📋 Next Steps:")
        print("1. Set VITE_USE_R2_ASSETS=true in your .env file")
        print("2. Update code to use resolveAssetPath() from src/config/assetConfig.ts")
        print("3. Test that assets load from R2 CDN")
        print(f"4. Public assets URL: https://pub-casting.r2.dev/assets/...")


if __name__ == '__main__':
    main()
