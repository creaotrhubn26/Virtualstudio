"""Offline structural/skin validation for the shipped GLBs. Python standard library only."""
import hashlib, json, math, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'public/models/avatars/studio'
manifest = json.loads((ROOT / 'manifest.json').read_text())
wardrobe = json.loads((ROOT / 'wardrobe.json').read_text())
TYPES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
COMPONENTS = {5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}


def read(path, expected_sha):
    """Parse a GLB, checking the container, the buffer bounds and every accessor."""
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected_sha, path
    magic, version, length = struct.unpack_from('<III', raw)
    assert (magic, version, length) == (0x46546c67, 2, len(raw))
    json_size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20 + json_size])
    offset = 20 + json_size
    bin_size, kind = struct.unpack_from('<II', raw, offset)
    assert kind == 0x004e4942
    binary = raw[offset + 8:offset + 8 + bin_size]
    assert len(binary) >= doc['buffers'][0]['byteLength']
    for view in doc['bufferViews']:
        assert view.get('byteOffset', 0) + view['byteLength'] <= len(binary)

    def accessor(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        code, size = COMPONENTS[a['componentType']]
        width = TYPES[a['type']]
        start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = view.get('byteStride', width * size)
        assert a.get('byteOffset', 0) + (a['count'] - 1) * stride + width * size <= view['byteLength']
        result = [struct.unpack_from('<' + code * width, binary, start + i * stride) for i in range(a['count'])]
        assert all(math.isfinite(v) for row in result for v in row)
        return result

    return doc, accessor


def check_rig(doc, accessor, joints):
    """The 53-joint rig, identical in every file so a garment fits any body."""
    skin = doc['skins'][0]
    assert len(skin['joints']) == joints == 53
    assert len(accessor(skin['inverseBindMatrices'])) == 53
    assert len(set(skin['joints'])) == 53
    assert all(0 <= j < len(doc['nodes']) for j in skin['joints'])
    return [doc['nodes'][j]['name'] for j in skin['joints']]


def check_surfaces(doc, accessor):
    """Every surface indexes inside its own vertices and carries usable skin weights."""
    counts = {}
    for mesh in doc['meshes']:
        triangles = 0
        for primitive in mesh['primitives']:
            attributes = primitive['attributes']
            positions = accessor(attributes['POSITION'])
            indices = accessor(primitive['indices'])
            triangles += len(indices) // 3
            assert all(i[0] < len(positions) for i in indices)
            assert len(accessor(attributes['TEXCOORD_0'])) == len(positions)
            for weights in accessor(attributes['WEIGHTS_0']):
                assert abs(sum(weights) - 1) < 1e-5 and min(weights) >= 0
            assert all(j < 53 for row in accessor(attributes['JOINTS_0']) for j in row)
            assert primitive['material'] < len(doc['materials'])
        counts[mesh['name']] = triangles
    return counts


def check_textures(doc, expected):
    for image in doc['images']:
        assert 'uri' not in image and image['mimeType'] in ['image/png', 'image/jpeg']
        assert doc['bufferViews'][image['bufferView']]['byteLength'] > 100
    assert len(doc['images']) == expected


joint_order = None
for model in manifest['models']:
    doc, accessor = read(ROOT / model['file'], model['sha256'])
    order = check_rig(doc, accessor, model['joints'])
    assert joint_order is None or order == joint_order, 'joint order must match across files'
    joint_order = order

    counts = check_surfaces(doc, accessor)
    assert len(doc['meshes']) == model['surfaces'] == 3, 'skin, eyes and hair; clothes ship separately'
    assert set(counts) == {'Skin', 'Eyes', 'Hair'}
    # The body keeps every face. Garment coverage indexes straight into this
    # triangle list, so a mismatch here would cut holes in the wrong places.
    assert counts['Skin'] == model['bodyTriangles'] == 26756
    triangles = sum(counts.values())
    assert triangles == model['triangles'] and 25000 < triangles < 40000
    check_textures(doc, model['textures'])

    assert [clip['name'] for clip in doc['animations']] == model['poses']
    for clip in doc['animations']:
        assert len(clip['channels']) == 53
        for channel in clip['channels']:
            assert channel['target']['node'] in doc['skins'][0]['joints']
            sampler = clip['samplers'][channel['sampler']]
            assert len(accessor(sampler['input'])) == len(accessor(sampler['output']))
            assert all(abs(sum(v * v for v in q) - 1) < 1e-5 for q in accessor(sampler['output']))

    hair = next(m for m in doc['materials'] if m['name'] == 'Hair')
    assert hair['alphaMode'] == 'MASK' and hair['doubleSided']
    print(f"PASS {model['file']}: {triangles} triangles, {counts['Skin']} of them body, "
          f"53 joints, 3 surfaces, 3 poses, embedded textures, normalized skin weights")

bodies = {model['file'].removesuffix('.glb'): model for model in manifest['models']}
by_body = {}
for garment in wardrobe['garments']:
    path = ROOT / 'wardrobe' / garment['body'] / garment['file']
    doc, accessor = read(path, garment['sha256'])
    assert check_rig(doc, accessor, garment['joints']) == joint_order
    counts = check_surfaces(doc, accessor)
    assert len(counts) == 1 and sum(counts.values()) == garment['triangles']
    check_textures(doc, garment['textures'])
    assert not doc['animations'], 'a garment is worn on the body\'s skeleton and carries no clips'
    assert garment['slot'] in ('outfit', 'shoes')

    # Coverage must describe the body it is worn on, and stay inside it.
    body = bodies[garment['body']]
    assert garment['bodyTriangles'] == body['bodyTriangles']
    covered = 0
    previous = 0
    for start, end in garment['hidesBodyTriangles']:
        assert 0 <= start < end <= garment['bodyTriangles']
        assert start >= previous, 'ranges must be sorted and disjoint'
        previous = end
        covered += end - start
    # A garment that covers nothing would leave skin through it; one that covers
    # most of the body would leave a figure with nothing left to render.
    assert 0.05 < covered / garment['bodyTriangles'] < 0.5, (garment['id'], covered)
    by_body.setdefault(garment['body'], set()).add(garment['id'])
    print(f"PASS {garment['body']}/{garment['file']}: {garment['triangles']} triangles, "
          f"53 joints, covers {covered} body triangles ({100 * covered / garment['bodyTriangles']:.0f}%)")

for body, items in wardrobe['defaults'].items():
    assert body in bodies, body
    assert set(items) <= by_body[body], (body, items)
    slots = [g['slot'] for g in wardrobe['garments'] if g['body'] == body and g['id'] in items]
    # A figure has to open dressed: something on the body and something on the feet.
    assert sorted(slots) == ['outfit', 'shoes'], (body, slots)
    print(f"PASS {body}: opens wearing {', '.join(items)}")
