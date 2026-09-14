"""Offline structural/skin validation for the shipped GLBs. Python standard library only."""
import hashlib, json, math, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'public/models/avatars/studio'
manifest = json.loads((ROOT / 'manifest.json').read_text())
TYPES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
COMPONENTS = {5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
for model in manifest['models']:
    raw = (ROOT / model['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == model['sha256']
    magic, version, length = struct.unpack_from('<III', raw)
    assert (magic, version, length) == (0x46546c67, 2, len(raw))
    json_size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20+json_size])
    offset = 20+json_size
    bin_size, kind = struct.unpack_from('<II', raw, offset)
    assert kind == 0x004e4942
    binary = raw[offset+8:offset+8+bin_size]
    assert len(binary) >= doc['buffers'][0]['byteLength']
    for view in doc['bufferViews']:
        assert view.get('byteOffset', 0) + view['byteLength'] <= len(binary)
    def accessor(index):
        a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
        code, size = COMPONENTS[a['componentType']]; width = TYPES[a['type']]
        start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = view.get('byteStride', width*size)
        assert a.get('byteOffset', 0) + (a['count']-1)*stride + width*size <= view['byteLength']
        result = [struct.unpack_from('<'+code*width, binary, start+i*stride) for i in range(a['count'])]
        assert all(math.isfinite(v) for row in result for v in row)
        return result
    skin = doc['skins'][0]
    assert len(skin['joints']) == model['joints'] == 53
    assert len(accessor(skin['inverseBindMatrices'])) == 53
    assert len(set(skin['joints'])) == 53
    assert all(0 <= j < len(doc['nodes']) for j in skin['joints'])
    assert len(doc['meshes']) == model['surfaces'] == 5
    triangles = 0
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            a = primitive['attributes']; positions = accessor(a['POSITION'])
            indices = accessor(primitive['indices']); triangles += len(indices)//3
            assert all(i[0] < len(positions) for i in indices)
            assert len(accessor(a['TEXCOORD_0'])) == len(positions)
            for weights in accessor(a['WEIGHTS_0']):
                assert abs(sum(weights)-1) < 1e-5 and min(weights) >= 0
            assert all(j < 53 for row in accessor(a['JOINTS_0']) for j in row)
            assert primitive['material'] < len(doc['materials'])
    assert triangles == model['triangles'] and 20000 < triangles < 35000
    assert [clip['name'] for clip in doc['animations']] == model['poses']
    for clip in doc['animations']:
        assert len(clip['channels']) == 53
        for channel in clip['channels']:
            assert channel['target']['node'] in skin['joints']
            sampler = clip['samplers'][channel['sampler']]
            assert len(accessor(sampler['input'])) == len(accessor(sampler['output']))
            assert all(abs(sum(v*v for v in q)-1) < 1e-5 for q in accessor(sampler['output']))
    for image in doc['images']:
        assert 'uri' not in image and image['mimeType'] in ['image/png','image/jpeg']
        view = doc['bufferViews'][image['bufferView']]
        assert view['byteLength'] > 100
    assert len(doc['images']) == model['textures']
    hair = next(m for m in doc['materials'] if m['name']=='Hair')
    assert hair['alphaMode'] == 'MASK' and hair['doubleSided']
    print(f"PASS {model['file']}: {triangles} triangles, 53 joints, 5 surfaces, 3 poses, embedded textures, normalized skin weights")
