"""
5-character cast smoke — exercises the full Meshy character pipeline
through the public /resolve-cast route.

Expects the backend on :8000. First prompt ("cinematic humanoid man in
dark suit, standing") is already in R2 cache from earlier rigging
test — it should come back in <1s with provider=cache. The other four
are fresh — each costs ~$0.05 and takes ~90s.

Total expected spend: ~$0.20, wall time ~8–10 min.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BACKEND = "http://127.0.0.1:8000"

# Deliberate variety — age/gender/style/occupation spread. Description
# phrasing is what gets fingerprinted; rewording = new generation.
CAST = [
    "cinematic humanoid man in dark suit, standing",     # cached
    "cinematic woman in red evening dress, elegant pose",
    "cinematic man with beard, leather jacket, arms crossed",
    "cinematic woman detective, trench coat, holding coffee",
    "cinematic elderly man, worn cardigan, reading glasses",
]


def pretty(d: dict) -> str:
    return json.dumps(d, indent=2, ensure_ascii=False)


def verify_glb(url: str) -> dict:
    """Range-fetch 12 bytes from a presigned URL to confirm glTF magic
    + read the embedded file size from the GLB header (bytes 8-11)."""
    try:
        req = urllib.request.Request(url, headers={"Range": "bytes=0-11"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
            if len(data) < 12:
                return {"ok": False, "reason": f"short read ({len(data)} bytes)"}
            if data[:4] != b"glTF":
                return {"ok": False, "reason": f"bad magic {data[:4]!r}"}
            # glTF binary header: magic(4) + version(4) + length(4), LE
            total_size = int.from_bytes(data[8:12], "little")
            version = int.from_bytes(data[4:8], "little")
            return {"ok": True, "version": version, "total_size_bytes": total_size}
    except urllib.error.HTTPError as e:
        return {"ok": False, "reason": f"HTTP {e.code}"}
    except Exception as e:
        return {"ok": False, "reason": f"{type(e).__name__}: {e}"}


def main() -> int:
    print(f"Submitting cast of {len(CAST)} characters to {BACKEND}/api/scene-director/resolve-cast")
    payload = {
        "descriptions": CAST,
        "heightMeters": 1.78,
        "includeAnimations": True,
        "concurrency": 1,
    }

    start = time.time()
    req = urllib.request.Request(
        f"{BACKEND}/api/scene-director/resolve-cast",
        method="POST",
        headers={"content-type": "application/json"},
        data=json.dumps(payload).encode("utf-8"),
    )
    try:
        with urllib.request.urlopen(req, timeout=1800) as r:
            body = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')}")
        return 2

    elapsed = time.time() - start
    print(f"\n/resolve-cast returned in {elapsed:.1f}s")
    print(f"count: {body['count']}")

    any_fail = False
    for i, r in enumerate(body["results"], 1):
        print(f"\n=== character {i}: {r['description']!r}")
        print(f"   success    : {r['success']}")
        print(f"   provider   : {r['provider']}")
        print(f"   cacheHit   : {r['cacheHit']}")
        print(f"   elapsed    : {r['elapsedSec']}s")
        if r.get("error"):
            print(f"   error      : {r['error']}")
            any_fail = True
            continue
        if r.get("glbUrl"):
            v = verify_glb(r["glbUrl"])
            if v["ok"]:
                mb = v["total_size_bytes"] / (1024 * 1024)
                print(f"   glb verify : OK  v={v['version']}  {mb:.2f} MB")
            else:
                print(f"   glb verify : FAIL {v['reason']}")
                any_fail = True

    print(f"\nTotal wall-time: {elapsed:.1f}s")
    return 0 if not any_fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
