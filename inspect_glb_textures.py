#!/usr/bin/env python3
"""
Inspect embedded textures in GLB files to determine what textures are already available.
Helps identify which avatars have embedded textures vs which need external textures.
"""

import json
import struct
import sys
from pathlib import Path

def read_glb_header(filepath):
    """Read GLB file header to extract metadata."""
    try:
        with open(filepath, 'rb') as f:
            # GLB header format: magic (4 bytes), version (4), length (4)
            magic = f.read(4)
            if magic != b'glTF':
                return None
            
            version = struct.unpack('<I', f.read(4))[0]
            total_length = struct.unpack('<I', f.read(4))[0]
            
            # Read JSON chunk header
            json_length = struct.unpack('<I', f.read(4))[0]
            json_type = f.read(4)
            
            if json_type != b'JSON':
                return None
            
            # Read JSON metadata
            json_data = f.read(json_length)
            metadata = json.loads(json_data)
            
            return {
                'version': version,
                'total_length': total_length,
                'file_size_mb': total_length / (1024 * 1024),
                'metadata': metadata
            }
    except Exception as e:
        print(f"  Error reading GLB: {e}")
        return None

def inspect_glb_content(filepath):
    """Inspect GLB file for embedded textures and materials."""
    result = read_glb_header(filepath)
    
    if not result:
        return None
    
    metadata = result['metadata']
    
    # Extract texture information
    textures = metadata.get('textures', [])
    images = metadata.get('images', [])
    materials = metadata.get('materials', [])
    meshes = metadata.get('meshes', [])
    
    texture_info = []
    for idx, texture in enumerate(textures):
        source_idx = texture.get('source', None)
        if source_idx is not None and source_idx < len(images):
            image = images[source_idx]
            uri = image.get('uri', 'embedded')
            mime_type = image.get('mimeType', 'unknown')
            texture_info.append({
                'index': idx,
                'uri': uri,
                'mime_type': mime_type,
                'is_embedded': not uri.startswith('data:') and uri != 'embedded'
            })
    
    # Check material properties
    material_info = []
    for mat_idx, material in enumerate(materials):
        mat_data = {
            'index': mat_idx,
            'name': material.get('name', f'Material_{mat_idx}'),
            'has_base_texture': False,
            'has_normal_texture': False,
            'has_orm_texture': False,
            'pbr_metallic_roughness': material.get('pbrMetallicRoughness', {})
        }
        
        pbr = material.get('pbrMetallicRoughness', {})
        if 'baseColorTexture' in pbr:
            mat_data['has_base_texture'] = True
        if 'metallicRoughnessTexture' in pbr:
            mat_data['has_orm_texture'] = True
        
        if 'normalTexture' in material:
            mat_data['has_normal_texture'] = True
        
        material_info.append(mat_data)
    
    return {
        'file_size_mb': result['file_size_mb'],
        'mesh_count': len(meshes),
        'material_count': len(materials),
        'texture_count': len(textures),
        'image_count': len(images),
        'textures': texture_info,
        'materials': material_info
    }

def main():
    avatar_dir = Path('/workspaces/Virtualstudio/public/models/avatars')
    
    print("=" * 80)
    print("GLB EMBEDDED TEXTURE INSPECTION REPORT")
    print("=" * 80)
    
    glb_files = sorted(avatar_dir.glob('**/*.glb'))
    
    summary = {
        'total_avatars': 0,
        'with_textures': [],
        'without_textures': [],
        'texture_types': {}
    }
    
    for glb_file in glb_files:
        print(f"\n📦 {glb_file.relative_to(avatar_dir)}")
        print("-" * 80)
        
        info = inspect_glb_content(str(glb_file))
        
        if not info:
            print("  ⚠️  Could not read GLB file")
            continue
        
        summary['total_avatars'] += 1
        
        # File info
        print(f"  File Size: {info['file_size_mb']:.2f} MB")
        print(f"  Meshes: {info['mesh_count']} | Materials: {info['material_count']} | Textures: {info['texture_count']}")
        
        # Texture details
        if info['textures']:
            print(f"\n  📸 Embedded Textures:")
            for tex in info['textures']:
                print(f"    - [{tex['index']}] {tex['uri']} ({tex['mime_type']})")
        else:
            print(f"\n  📸 Embedded Textures: None")
        
        # Material texture usage
        print(f"\n  🎨 Material Texture Usage:")
        has_any_texture = False
        for mat in info['materials']:
            status = []
            if mat['has_base_texture']:
                status.append("✓ Albedo")
                has_any_texture = True
            if mat['has_normal_texture']:
                status.append("✓ Normal")
                has_any_texture = True
            if mat['has_orm_texture']:
                status.append("✓ ORM")
                has_any_texture = True
            
            if status:
                print(f"    - {mat['name']}: {', '.join(status)}")
            else:
                print(f"    - {mat['name']}: [No textures]")
        
        # Categorize
        relative_name = glb_file.relative_to(avatar_dir)
        if has_any_texture:
            summary['with_textures'].append(str(relative_name))
        else:
            summary['without_textures'].append(str(relative_name))
    
    # Summary report
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"\nTotal Avatars Scanned: {summary['total_avatars']}")
    print(f"\nAvatars WITH Embedded Textures ({len(summary['with_textures'])}):")
    for avatar in summary['with_textures']:
        print(f"  ✓ {avatar}")
    
    print(f"\nAvatars WITHOUT Embedded Textures ({len(summary['without_textures'])}):")
    for avatar in summary['without_textures']:
        print(f"  ✗ {avatar}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATIONS")
    print("=" * 80)
    if summary['with_textures']:
        print("\n✓ Avatars with embedded textures can skip external texture loading")
        print("  Action: Use detectEmbeddedTextures() to leverage existing textures")
    
    if summary['without_textures']:
        print(f"\n✗ {len(summary['without_textures'])} avatars need external textures or texture generation")
        print("  Action: Create external texture library or generate during avatar creation")
    
    print("\nTexture Strategy:")
    print("  1. For avatars WITH textures: Extract and use embedded textures (fallback to definitions)")
    print("  2. For avatars WITHOUT textures: Generate or load from external library")
    print("  3. Normal maps are critical for surface detail - prioritize generation/creation")

if __name__ == '__main__':
    main()
