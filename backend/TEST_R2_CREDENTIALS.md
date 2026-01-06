# Tester for R2 Credentials

Be Replit Agent om å kjøre disse testene for å verifisere at R2 credentials fungerer:

## Test 1: Verifiser at credentials er satt
```bash
cd /home/runner/workspace/backend && python3 -c "
import os
access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '')
secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '')
print(f'CLOUDFLARE_R2_ACCESS_KEY_ID: {\"SET\" if access_key else \"NOT SET\"} ({len(access_key)} chars)')
print(f'CLOUDFLARE_R2_SECRET_ACCESS_KEY: {\"SET\" if secret_key else \"NOT SET\"} ({len(secret_key)} chars)')
"
```

## Test 2: Test R2 tilkobling og nedlasting av DECA model
```bash
cd /home/runner/workspace/backend && python3 -c "
import os
import boto3
from botocore.config import Config
from pathlib import Path

R2_ENDPOINT = 'https://bbda9f467577de94fefbc4f2954db032.r2.cloudflarestorage.com'
R2_BUCKET_NAME = 'ml-models'

access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') or os.environ.get('R2_ACCESS_KEY_ID', '')
access_key = access_key.strip()[:32]
secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') or os.environ.get('R2_SECRET_ACCESS_KEY', '')
secret_key = secret_key.strip()

print('Testing R2 connection...')
client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

try:
    # Test file existence
    response = client.head_object(Bucket=R2_BUCKET_NAME, Key='deca_model.tar')
    file_size_mb = response['ContentLength'] / (1024 * 1024)
    print(f'✅ deca_model.tar found! Size: {file_size_mb:.2f} MB')
    
    # Test download
    test_path = Path('/tmp/test_deca_download.tar')
    print('Testing download...')
    client.download_file(R2_BUCKET_NAME, 'deca_model.tar', str(test_path))
    if test_path.exists():
        downloaded_size = test_path.stat().st_size / (1024 * 1024)
        print(f'✅ Download successful! Downloaded: {downloaded_size:.2f} MB')
        test_path.unlink()
        print('✅✅✅ All tests passed! ✅✅✅')
    else:
        print('❌ Download failed - file not created')
except Exception as e:
    print(f'❌ Error: {type(e).__name__}: {str(e)[:200]}')
"
```

## Test 3: Test DECA service direkte
```bash
cd /home/runner/workspace/backend && python3 -c "
import asyncio
from deca_service import deca_service

async def test():
    print('Testing DECA service...')
    print(f'DECA enabled: {deca_service.is_enabled()}')
    print(f'Model loaded: {deca_service.is_model_loaded()}')
    print()
    print('Attempting to load model (will download from R2 if needed)...')
    loaded = await deca_service.ensure_model_loaded()
    if loaded:
        print('✅ Model loaded successfully!')
    else:
        print('❌ Model loading failed')

asyncio.run(test())
"
```

## Test 4: Test SAM3D service (skal også fungere)
```bash
cd /home/runner/workspace/backend && python3 -c "
import os
import boto3
from botocore.config import Config

from sam3d_service import get_r2_client, R2_BUCKET_NAME

print('Testing SAM3D R2 client...')
try:
    client = get_r2_client()
    response = client.head_object(Bucket=R2_BUCKET_NAME, Key='Sam-3D/sam-3d-body-dinov3/model.ckpt')
    file_size_mb = response['ContentLength'] / (1024 * 1024)
    print(f'✅ SAM3D model found! Size: {file_size_mb:.2f} MB')
except Exception as e:
    print(f'❌ Error: {type(e).__name__}: {str(e)[:200]}')
"
```

## Test 5: Test hele systemet (server startup test)
```bash
cd /home/runner/workspace/backend && python3 -c "
# Quick import test to verify all services can initialize
try:
    from sam3d_service import sam3d_service
    from deca_service import deca_service
    from facexformer_service import facexformer_service
    print('✅ All services imported successfully')
    print(f'  - SAM3D service initialized')
    print(f'  - DECA service initialized (enabled: {deca_service.is_enabled()})')
    print(f'  - FaceXFormer service initialized')
except Exception as e:
    print(f'❌ Import failed: {e}')
    import traceback
    traceback.print_exc()
"
```


