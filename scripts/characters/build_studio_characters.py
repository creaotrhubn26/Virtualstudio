"""Pinned CC0 human data, adapted from Campfire Games' character builder.
Only MakeHuman DATA is consumed. No MakeHuman/MPFB application code is imported.
Rebuild: Blender --background --factory-startup --python scripts/characters/build_studio_characters.py
"""
import gzip, hashlib, json, math, os, struct, urllib.request, zipfile, re, tempfile
from pathlib import Path
from collections import defaultdict
import numpy as np
REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public/models/avatars/studio"
CACHE = Path(os.environ.get("STUDIO_CHARACTER_CACHE", str(Path(tempfile.gettempdir()) / "virtualstudio-character-source")))
REV = "437dd513888a92399d1d3200d2e80859fae55abc"
BASE_URL = f"https://raw.githubusercontent.com/makehumancommunity/mpfb2/{REV}/src/mpfb/data/"
SYSTEM_URL = "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
OUT.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
sources = {}

def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        print("Download", url, flush=True)
        urllib.request.urlretrieve(url, path)
    sources[str(path.relative_to(CACHE))] = dict(url=url, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    return path


def data(path):
    return download(BASE_URL + path, CACHE / path)


archive = CACHE / "system-assets.zip"
if not archive.exists() and Path("/tmp/campfire-mh-system.zip").exists():
    import shutil
    shutil.copyfile("/tmp/campfire-mh-system.zip", archive)
download(SYSTEM_URL, archive)
assert hashlib.sha256(archive.read_bytes()).hexdigest() == "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107", "System asset archive changed; review licence and content before rebuilding."
system = zipfile.ZipFile(archive)


def system_file(path):
    result = CACHE / "system" / path
    if not result.exists():
        result.parent.mkdir(parents=True, exist_ok=True)
        result.write_bytes(system.read(path))
    sources["system/" + path] = dict(archive=SYSTEM_URL, sha256=hashlib.sha256(result.read_bytes()).hexdigest())
    return result


def obj(path):
    vertices, uv, faces, groups = [], [], [], {}
    group = "body"
    for line in path.read_text().splitlines():
        t = line.split()
        if not t:
            continue
        if t[0] == "v":
            vertices.append(list(map(float, t[1:4])))
        elif t[0] == "vt":
            uv.append(list(map(float, t[1:3])))
        elif t[0] == "g":
            group = t[1]
        elif t[0] == "f":
            face = [(int(v.split("/")[0]) - 1, int(v.split("/")[1]) - 1 if "/" in v else 0) for v in t[1:]]
            faces.append((group, face))
            groups.setdefault(group, set()).update(v[0] for v in face)
    return np.array(vertices), uv, faces, groups


base, base_uv, base_faces, groups = obj(data("3dobjs/base.obj"))
rig = json.loads(data("rigs/standard/rig.game_engine.json").read_text())
weights = json.loads(data("rigs/standard/weights.game_engine.json").read_text())["weights"]
skin_weights = [[] for _ in base]
for bone, entries in weights.items():
    for index, weight in entries:
        if weight > 0:
            skin_weights[index].append((bone, weight))


def morphed(male=False, oval=0, age="young"):
    v = base.copy()
    gender = "male" if male else "female"
    for target, amount in [(f"macrodetails/caucasian-{gender}-{age}", 1),
                           (f"macrodetails/universal-{gender}-{age}-averagemuscle-averageweight", 1),
                           ("head/head-oval", oval)]:
        if not amount:
            continue
        with gzip.open(data("targets/" + target + ".target.gz"), "rt") as f:
            for line in f:
                t = line.split()
                if len(t) == 4 and t[0].isdigit():
                    v[int(t[0])] += np.array(list(map(float, t[1:]))) * amount
    return v


def point(spec, v):
    indices = spec.get("vertex_indices") or list(groups[spec["cube_name"]])
    return np.mean(v[indices], axis=0)


def fit_asset(kind, name, vertices):
    prefix = f"{kind}/{name}/{name}"
    original, uv, faces, _ = obj(system_file(prefix + ".obj"))
    fitted, scales, reading = [], np.ones(3), False
    for line in system_file(prefix + ".mhclo").read_text().splitlines():
        t = line.split()
        if not t or t[0].startswith("#"):
            continue
        if t[0] in ["x_scale", "y_scale", "z_scale"]:
            axis = "xyz".index(t[0][0])
            scales[axis] = abs(vertices[int(t[1]), axis] - vertices[int(t[2]), axis]) / float(t[3])
        elif t[0] == "verts":
            reading = True
        elif reading and t[0].isdigit():
            if len(t) == 1:
                fitted.append(vertices[int(t[0])])
            elif len(t) >= 9:
                p = sum(vertices[int(t[i])] * float(t[i + 3]) for i in range(3))
                fitted.append(p + np.array(list(map(float, t[6:9]))) * scales)
        elif reading and fitted:
            break
    assert len(fitted) == len(original), (name, len(fitted), len(original))
    return np.array(fitted), uv, faces




def asset_bindings(kind, name):
    """Transfer the author's barycentric fitting weights to the anatomical skeleton."""
    reading = False
    bindings = []
    hidden = set()
    lines = system_file(f"{kind}/{name}/{name}.mhclo").read_text().splitlines()
    for line in lines:
        t = line.split()
        if not t or t[0].startswith('#'): continue
        if t[0] == 'verts': reading = True; continue
        if reading and t[0].isdigit():
            refs = [(int(t[0]), 1)] if len(t) == 1 else [(int(t[i]), float(t[i+3])) for i in range(3)]
            combined = defaultdict(float)
            for index, influence in refs:
                for bone, weight in skin_weights[index]:
                    combined[bone] += weight * max(0, influence)
            bindings.append(list(combined.items()))
        elif reading:
            reading = False
        if t[0] == 'delete_verts':
            tail = '\n'.join(lines[lines.index(line)+1:])
            for match in re.finditer(r'(\d+)\s*-\s*(\d+)|(\d+)', tail):
                if match.group(3): hidden.add(int(match.group(3)))
                else: hidden.update(range(int(match.group(1)), int(match.group(2))+1))
            break
    return bindings, hidden


BONE_NAMES = {
    'Root':'StudioRoot', 'pelvis':'mixamorigHips', 'spine_01':'mixamorigSpine',
    'spine_02':'mixamorigSpine1', 'spine_03':'mixamorigSpine2', 'neck_01':'mixamorigNeck', 'head':'mixamorigHead',
}
for side, label in [('l','Left'),('r','Right')]:
    for key, target in [('clavicle','Shoulder'),('upperarm','Arm'),('lowerarm','ForeArm'),('hand','Hand'),
                        ('thigh','UpLeg'),('calf','Leg'),('foot','Foot'),('ball','ToeBase')]:
        BONE_NAMES[f'{key}_{side}'] = f'mixamorig{label}{target}'
    for finger in ['thumb','index','middle','ring','pinky']:
        for n in range(1,4): BONE_NAMES[f'{finger}_0{n}_{side}'] = f'mixamorig{label}Hand{finger.title()}{n}'


class GLB:
    def __init__(self):
        self.doc = {'asset': {'version':'2.0', 'generator':'Virtualstudio anatomical character builder',
                             'copyright':'MakeHuman Community CC0 data; studio assembly by CreatorHub'},
                    'scene':0, 'scenes':[{'nodes':[]}], 'nodes':[], 'meshes':[], 'skins':[],
                    'materials':[], 'textures':[], 'images':[], 'accessors':[], 'bufferViews':[],
                    'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],
                    'animations':[]}
        self.binary = bytearray()
        self.images = {}

    def view(self, raw, target=None):
        self.binary.extend(b'\0' * (-len(self.binary) % 4))
        v = {'buffer':0, 'byteOffset':len(self.binary), 'byteLength':len(raw)}
        if target: v['target'] = target
        self.binary.extend(raw); self.doc['bufferViews'].append(v)
        return len(self.doc['bufferViews'])-1

    def accessor(self, data, kind, component=5126, target=None, bounds=False):
        dtype = {5126:'<f4',5125:'<u4',5123:'<u2'}[component]
        data = np.asarray(data, dtype=dtype)
        a = {'bufferView':self.view(data.tobytes(), target), 'componentType':component,'type':kind,'count':len(data)}
        if bounds:
            a['min'] = np.atleast_1d(data.min(axis=0)).tolist()
            a['max'] = np.atleast_1d(data.max(axis=0)).tolist()
        self.doc['accessors'].append(a)
        return len(self.doc['accessors'])-1

    def texture(self, path):
        key = str(path)
        if key in self.images: return self.images[key]
        raw = path.read_bytes()
        mime = 'image/png' if raw.startswith(b'\x89PNG') else 'image/jpeg'
        self.doc['images'].append({'bufferView':self.view(raw),'mimeType':mime,'name':path.name})
        self.doc['textures'].append({'sampler':0,'source':len(self.doc['images'])-1})
        self.images[key] = len(self.doc['textures'])-1
        return self.images[key]

    def material(self, name, diffuse, roughness, normal=None, ao=None, alpha=False):
        m = {'name':name, 'pbrMetallicRoughness': {'baseColorTexture':{'index':self.texture(diffuse)},
               'metallicFactor':0,'roughnessFactor':roughness}, 'doubleSided':bool(alpha)}
        if normal: m['normalTexture'] = {'index':self.texture(normal)}
        if ao: m['occlusionTexture'] = {'index':self.texture(ao), 'strength':0.65}
        if alpha: m.update(alphaMode='MASK', alphaCutoff=0.45)
        self.doc['materials'].append(m)
        return len(self.doc['materials'])-1

    def add_mesh(self, name, positions, faces, uvs, bindings, material, joint_names):
        # Split only UV seams; preserve smooth anatomical normals across seams.
        normals = np.zeros_like(positions)
        triangles = []
        for face in faces:
            for i in range(1,len(face)-1):
                tri = [face[0],face[i],face[i+1]]; triangles.append(tri)
                a,b,c = [p[0] for p in tri]
                n = np.cross(positions[b]-positions[a],positions[c]-positions[a])
                normals[[a,b,c]] += n
        normals /= np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-10)
        keys={}; vs=[]; ns=[]; ts=[]; js=[]; ws=[]; indices=[]
        for tri in triangles:
            for key in tri:
                key=tuple(key)
                if key not in keys:
                    keys[key]=len(vs); index,uv=key
                    vs.append(positions[index]); ns.append(normals[index]); ts.append([uvs[uv][0],1-uvs[uv][1]])
                    influence=sorted([(n,w) for n,w in bindings[index] if w>0],key=lambda p:-p[1])[:4] or [('Root',1)]
                    total=sum(w for _,w in influence)
                    js.append([joint_names.index(n) for n,_ in influence]+[0]*(4-len(influence)))
                    ws.append([w/total for _,w in influence]+[0]*(4-len(influence)))
                indices.append(keys[key])
        assert np.isfinite(vs).all() and np.isfinite(ws).all()
        attrs={'POSITION':self.accessor(vs,'VEC3',target=34962,bounds=True),
               'NORMAL':self.accessor(ns,'VEC3',target=34962), 'TEXCOORD_0':self.accessor(ts,'VEC2',target=34962),
               'JOINTS_0':self.accessor(js,'VEC4',5123,34962), 'WEIGHTS_0':self.accessor(ws,'VEC4',target=34962)}
        self.doc['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':self.accessor(indices,'SCALAR',5125,34963),'material':material}]})
        self.doc['nodes'].append({'name':name,'mesh':len(self.doc['meshes'])-1,'skin':0})
        self.doc['scenes'][0]['nodes'].append(len(self.doc['nodes'])-1)

    def write(self, path):
        self.doc['buffers']=[{'byteLength':len(self.binary)}]
        document=json.dumps(self.doc,separators=(',',':')).encode()
        document+=b' '*(-len(document)%4); self.binary+=b'\0'*(-len(self.binary)%4)
        data=struct.pack('<III',0x46546c67,2,28+len(document)+len(self.binary))
        data+=struct.pack('<II',len(document),0x4e4f534a)+document
        data+=struct.pack('<II',len(self.binary),0x004e4942)+self.binary
        path.write_bytes(data)


def build(name, male, height, outfit, shoes, hair):
    g = GLB(); raw = morphed(male, oval=0.15 if not male else -0.12)
    body_ids=list(groups['body']); floor=min(raw[body_ids,1]); scale=height/(max(raw[body_ids,1])-floor)
    def convert(v):
        v=np.array(v).copy();v[...,1]-=floor;return v*scale
    positions=convert(raw)
    joints={k:convert(point(spec['head'],raw)) for k,spec in rig.items()}
    joints['Root']=np.zeros(3)
    names=[]
    def add(k):
        p=rig[k]['parent']
        if p and p not in names: add(p)
        if k not in names: names.append(k)
    for k in rig: add(k)
    for k in names:
        parent=rig[k]['parent']; t=joints[k]-(joints[parent] if parent else 0)
        node={'name':BONE_NAMES[k],'translation':t.tolist()}
        children=[names.index(n) for n in names if rig[n]['parent']==k]
        if children: node['children']=children
        g.doc['nodes'].append(node)
    g.doc['scenes'][0]['nodes'].append(names.index('Root'))
    inverse=[]
    for k in names:
        m=np.eye(4);m[:3,3]=-joints[k];inverse.append(m.T.ravel())
    g.doc['skins'].append({'joints':list(range(len(names))),'skeleton':names.index('Root'),
                          'inverseBindMatrices':g.accessor(inverse,'MAT4'),'name':name+'Rig'})
    garments=[]; hidden=set()
    for item in [outfit,shoes]:
        v,uv,faces=fit_asset('clothes',item,raw); bind,deleted=asset_bindings('clothes',item)
        assert len(bind)==len(v)
        hidden|=deleted
        garments.append((item,convert(v),[f for _,f in faces],uv,bind))
    body_faces=[f for group,f in base_faces if group=='body' and not any(i in hidden for i,_ in f)]
    skin='skins/young_caucasian_male/young_lightskinned_male_diffuse.png' if male else 'skins/young_caucasian_female2/young_lightskinned_female_diffuse2.png'
    g.add_mesh('Skin',positions,body_faces,base_uv,skin_weights,g.material('Skin',system_file(skin),0.58),names)
    for item,v,faces,uv,bind in garments:
        prefix=f'clothes/{item}/'
        props={t[0]:t[1:] for line in system_file(prefix+item+'.mhmat').read_text().splitlines() if (t:=line.split()) and not t[0].startswith('#')}
        def tex(key): return system_file(prefix+props[key][0]) if key in props else None
        mat=g.material('Clothing' if item==outfit else 'Shoes',tex('diffuseTexture'),0.84 if item==outfit else 0.55,tex('normalmapTexture'),tex('aomapTexture'))
        g.add_mesh(item,v,faces,uv,bind,mat,names)
    for kind,item,label in [('eyes','low-poly','Eyes'),('hair',hair,'Hair')]:
        v,uv,faces=fit_asset(kind,item,raw)
        texture=system_file('eyes/materials/brown_eye.png' if kind=='eyes' else f'hair/{item}/{item}_diffuse.png')
        mat=g.material(label,texture,0.17 if kind=='eyes' else 0.72,alpha=kind=='hair')
        g.add_mesh(label,convert(v),[f for _,f in faces],uv,[[('head',1)] for _ in v],mat,names)
    # Frozen studio poses; each clip carries ALL joint rotations so switching resets cleanly.
    def quat(axis,angle):
        q=[0.,0.,0.,math.cos(angle/2)];q[axis]=math.sin(angle/2);return q
    poses={
        'StudioStand': {'upperarm_l':(2,-0.40),'upperarm_r':(2,0.40),'lowerarm_l':(0,-0.08),'lowerarm_r':(0,-0.08)},
        'StudioPortrait': {'upperarm_l':(2,-0.40),'upperarm_r':(2,0.40),'lowerarm_l':(0,-0.18),'lowerarm_r':(0,-0.08),'head':(1,0.22),'spine_03':(1,-0.12)},
        'StudioSeated': {'upperarm_l':(2,-0.30),'upperarm_r':(2,0.30),'lowerarm_l':(0,-1.0),'lowerarm_r':(0,-1.0),
                         'thigh_l':(0,-1.35),'thigh_r':(0,-1.35),'calf_l':(0,1.35),'calf_r':(0,1.35)},
    }
    # Solve both arms onto the thighs using the actual limb lengths. A single
    # elbow angle leaves different bodies gesturing in mid-air.
    def qmul(a,b):
        av,bv=np.array(a[:3]),np.array(b[:3]);aw,bw=a[3],b[3]
        return np.r_[aw*bv+bw*av+np.cross(av,bv),aw*bw-np.dot(av,bv)]
    def inverse(q): return np.r_[-np.array(q[:3]),q[3]]
    def rotate(q,v): return qmul(qmul(q,np.r_[v,0]),inverse(q))[:3]
    def between(a,b):
        a=a/np.linalg.norm(a);b=b/np.linalg.norm(b)
        q=np.r_[np.cross(a,b),1+np.dot(a,b)]
        return q/np.linalg.norm(q)
    seated_quats={}
    for side,sign in [('l',1),('r',-1)]:
        a,b,c=[joints[f'{part}_{side}'] for part in ['upperarm','lowerarm','hand']]
        target=np.array([joints[f'thigh_{side}'][0]*1.55,joints['pelvis'][1]+.055,joints['pelvis'][2]+.28])
        direction=target-a;distance=np.linalg.norm(direction);direction/=distance
        upper=np.linalg.norm(b-a);lower=np.linalg.norm(c-b)
        distance=min(distance,(upper+lower)*.985);target=a+direction*distance
        along=(upper*upper-lower*lower+distance*distance)/(2*distance)
        pole=np.array([sign*.5,-.15,-.45]);pole-=direction*np.dot(pole,direction);pole/=np.linalg.norm(pole)
        elbow=a+direction*along+pole*math.sqrt(max(0,upper*upper-along*along))
        shoulder_q=between(b-a,elbow-a)
        forearm_world=qmul(between(rotate(shoulder_q,c-b),target-elbow),shoulder_q)
        seated_quats[f'upperarm_{side}']=shoulder_q.tolist()
        seated_quats[f'lowerarm_{side}']=qmul(inverse(shoulder_q),forearm_world).tolist()
        # Fingers point towards the knees instead of retaining the spread rest orientation.
        palm_world=between(joints[f'middle_01_{side}']-c,np.array([sign*.035,-.14,1.]))
        seated_quats[f'hand_{side}']=qmul(inverse(forearm_world),palm_world).tolist()
    times=g.accessor([0,1],'SCALAR',bounds=True)
    for pose,rotations in poses.items():
        animation={'name':pose,'channels':[],'samplers':[]}
        for k in names:
            q=quat(*rotations[k]) if k in rotations else [0,0,0,1]
            if pose=='StudioSeated' and k in seated_quats: q=seated_quats[k]
            if pose=='StudioStand':g.doc['nodes'][names.index(k)]['rotation']=q
            output=g.accessor([q,q],'VEC4')
            animation['samplers'].append({'input':times,'output':output,'interpolation':'LINEAR'})
            animation['channels'].append({'sampler':len(animation['samplers'])-1,'target':{'node':names.index(k),'path':'rotation'}})
        g.doc['animations'].append(animation)
    path=OUT/(name+'.glb');g.write(path)
    summary={'file':path.name,'heightMeters':height,'joints':len(names),'surfaces':len(g.doc['meshes']),
             'triangles':sum(g.doc['accessors'][m['primitives'][0]['indices']]['count']//3 for m in g.doc['meshes']),
             'textures':len(g.doc['images']),'poses':list(poses),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    print(json.dumps(summary),flush=True)
    return summary

if __name__ == '__main__':
    models=[build('studio-woman',False,1.72,'female_casualsuit01','shoes01','ponytail01'),
            build('studio-man',True,1.82,'male_casualsuit02','shoes01','short02')]
    (OUT/'manifest.json').write_text(json.dumps({'revision':REV,'license':'CC0-1.0','sources':sources,'models':models},indent=2)+'\n')
