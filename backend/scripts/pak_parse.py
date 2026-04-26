"""
set.a.light 3D .pak parser — reverse-engineered from magic + byte pattern.

The AssetLibrary-v3.1.6.pak archive uses a proprietary format with magic
`\\x02SAL` at offset 0 followed by a 32-byte global header and then a
sequence of file-table entries. Each TOC record looks like:

    uint32  flags_or_compressed_size      (observed ~100k-800k values)
    uint8   unknown_byte                  (always 0x00 in samples)
    uint16  filename_len                  (little-endian)
    bytes   filename                      (ASCII, variable)
    uint32  uncompressed_size             (observed matching file kind)
    14 bytes hash-like blob
    uint16  misc                          (~0x001f / 0x001d / 0x0013 etc.)
    uint64  another_offset_or_size
    uint32  another_size
    8 bytes hash/salt

That's 43 bytes of framing per filename, not counting the name itself.

This script ONLY walks the TOC (filenames) — it doesn't extract payload.
That keeps it cheap on a 4.5 GB file; we only need to know what's in the
library, not decompress every asset.
"""

from __future__ import annotations

import struct
import sys
from collections import Counter
from pathlib import Path


def parse_toc(path: Path, max_entries: int = 50_000) -> list[dict]:
    entries: list[dict] = []
    with path.open("rb") as f:
        magic = f.read(4)
        if magic != b"\x02SAL":
            raise RuntimeError(f"not a set.a.light .pak (magic={magic!r})")
        # 28 more bytes of global header follow; skip them.
        f.read(28)

        while len(entries) < max_entries:
            # Peek whether we have at least enough for a plausible entry
            pos = f.tell()
            head = f.read(4)
            if len(head) < 4:
                break
            (_flags,) = struct.unpack("<I", head)

            # unknown byte + filename length
            mid = f.read(3)
            if len(mid) < 3:
                break
            (_zero,) = struct.unpack("<B", mid[0:1])
            (name_len,) = struct.unpack("<H", mid[1:3])

            # A sane upper bound — most set.a.light filenames are < 128
            # bytes. Runaway lengths mean we drifted out of the TOC into
            # payload; stop there.
            if name_len == 0 or name_len > 255:
                break
            name_bytes = f.read(name_len)
            if len(name_bytes) < name_len:
                break
            try:
                name = name_bytes.decode("utf-8")
            except UnicodeDecodeError:
                break

            # Trailing framing — 36 more bytes before the next entry.
            trailer = f.read(36)
            if len(trailer) < 36:
                break
            entries.append(
                {
                    "offset": pos,
                    "name": name,
                }
            )
    return entries


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else
                "/Users/usmanqazi/Virtualstudio/contexts/AssetLibrary-v3.1.6.pak")
    print(f"Parsing {path} …")
    size_mb = path.stat().st_size // (1024 * 1024)
    print(f"File size: {size_mb} MB")

    try:
        entries = parse_toc(path)
    except Exception as exc:
        print(f"parse error: {exc}")
        return 1

    print(f"\nParsed {len(entries)} TOC entries (stopped early if bogus length hit).\n")

    # Extension histogram — tells us what kinds of assets are in here.
    ext_counter: Counter[str] = Counter()
    for e in entries:
        ext = Path(e["name"]).suffix.lower().lstrip(".")
        ext_counter[ext or "(no-ext)"] += 1
    print("Top 20 extensions:")
    for ext, n in ext_counter.most_common(20):
        print(f"  {n:6}  .{ext}")
    print()

    # Filename-keyword histogram — rough topic buckets
    buckets = {
        "character/clothing": ("outfit", "jacket", "blouse", "shirt", "pants",
                                "dress", "hat", "hair", "hemd", "coat", "vest",
                                "shoe", "glove", "glass", "police", "beard"),
        "lighting fixtures": ("softbox", "octa", "stripbox", "beauty", "grid",
                              "snoot", "fresnel", "barn", "gel", "scrim", "umbrella",
                              "reflector", "stand", "par", "hmi", "profoto",
                              "godox", "aputure", "broncolor"),
        "cameras/lenses": ("camera", "lens", "objective", "24-70", "50mm", "85mm"),
        "backdrops/paper": ("backdrop", "paper", "seamless", "curtain"),
        "walls/surfaces": ("wall", "floor", "ceiling", "concrete", "brick",
                            "wood", "marble", "tile"),
        "props": ("chair", "table", "lamp", "book", "plant", "pflanze", "cup",
                  "bottle", "prop", "mirror"),
    }
    names_low = [e["name"].lower() for e in entries]
    print("Content buckets (keyword-matched):")
    for bucket, kws in buckets.items():
        n = sum(1 for name in names_low if any(k in name for k in kws))
        print(f"  {n:6}  {bucket}")
    print()

    # Show a sample of each extension
    print("Sample entries per extension (first 3):")
    per_ext: dict[str, list[str]] = {}
    for e in entries:
        ext = Path(e["name"]).suffix.lower().lstrip(".") or "(no-ext)"
        per_ext.setdefault(ext, []).append(e["name"])
    for ext, samples in sorted(per_ext.items()):
        print(f"  .{ext}:")
        for s in samples[:3]:
            print(f"     {s}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
