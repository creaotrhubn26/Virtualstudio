"""
Geocoder — turn a Claude-authored location string into (lat, lon).

Wraps Google's Geocoding API (the same `GOOGLE_MAP_TILES_KEY` Cloud
project also serves Geocoding for free up to ~$200/mo). Cache hits are
free locally; the cheapest cache layer is "memoise per process" since
typical scene authoring re-uses the same handful of place names.

Why this is here
----------------
Scene Director (Claude) emits a `location` string per beat:
"Oslo Café", "middle of Times Square", "Norwegian fjord at dawn". For
indoor / fictional locations we drop a studio. For real-world locations
we want the LocationScene streaming Google 3D Tiles. This service is
the bridge: it answers "is this a real place? if so, where?" so the
director output can carry a lat/lon the frontend can hand to the
TilesRenderer.

API ref: https://developers.google.com/maps/documentation/geocoding/overview
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional, Tuple

import httpx

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
# Per-process cache. Place-name resolution is essentially deterministic
# for a given Google account; no need for a TTL — server restart clears
# it, and locations move geologically slowly.
_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_MAX = 4096


class GeocoderService:
    def __init__(self) -> None:
        # The same Google Cloud key the LocationScene uses — Geocoding
        # is enabled on the same Cloud project by default once Map Tiles
        # is enabled. If the key was scoped only to the Map Tiles API
        # the call will 403 with a clear message; we surface that
        # verbatim so the operator knows to adjust the key restriction.
        self.api_key = os.environ.get("GOOGLE_MAP_TILES_KEY", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def geocode(self, query: str) -> Dict[str, Any]:
        """Resolve a place-name string to a structured location.

        Returns on success:
          {
            "success": True,
            "query": "<input>",
            "lat": 40.7484,
            "lon": -73.9857,
            "displayName": "Empire State Building, New York, NY 10001, USA",
            "placeId": "...",
            "locationType": "ROOFTOP" | "RANGE_INTERPOLATED" | "GEOMETRIC_CENTER" | "APPROXIMATE",
            "bounds": {"north": ..., "south": ..., "east": ..., "west": ...} | None,
            "viewport": {...},
            "types": [...],
            "cacheHit": False,
          }

        On failure: `{"success": False, "error": "...", "status": "..."}`.

        The Google API status field tells us:
          - OK            → results present
          - ZERO_RESULTS  → query didn't match any place (often Claude
                            authored a fictional location like "Anna's
                            café"; caller falls back to studio mode)
          - OVER_QUERY_LIMIT / REQUEST_DENIED / INVALID_REQUEST → key
                            or quota issues; surface verbatim
        """
        q = (query or "").strip()
        if not q:
            return {"success": False, "error": "empty query"}
        if not self.enabled:
            return {"success": False, "error": "GOOGLE_MAP_TILES_KEY not configured"}

        cached = _CACHE.get(q.lower())
        if cached:
            _, payload = cached
            return {**payload, "cacheHit": True}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    GEOCODE_URL,
                    params={"address": q, "key": self.api_key},
                )
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            return {"success": False, "error": f"network: {type(exc).__name__}"}

        if resp.status_code != 200:
            return {
                "success": False,
                "error": f"HTTP {resp.status_code}: {resp.text[:200]}",
            }

        body = resp.json()
        status = body.get("status", "")
        if status != "OK":
            return {
                "success": False,
                "status": status,
                "error": body.get("error_message") or status or "no result",
            }

        results = body.get("results") or []
        if not results:
            return {"success": False, "status": "ZERO_RESULTS", "error": "no results"}

        top = results[0]
        geom = top.get("geometry") or {}
        loc = geom.get("location") or {}
        lat = loc.get("lat")
        lon = loc.get("lng")
        if lat is None or lon is None:
            return {
                "success": False,
                "error": f"result missing lat/lng: {top.get('formatted_address')}",
            }

        bounds = geom.get("bounds")
        viewport = geom.get("viewport")

        payload: Dict[str, Any] = {
            "success": True,
            "query": q,
            "lat": float(lat),
            "lon": float(lon),
            "displayName": top.get("formatted_address") or q,
            "placeId": top.get("place_id"),
            "locationType": geom.get("location_type"),
            "bounds": bounds,
            "viewport": viewport,
            "types": top.get("types") or [],
            "cacheHit": False,
        }

        # Drop oldest entries if we hit the cache cap. Memoisation is
        # bounded so a long-lived backend doesn't grow unbounded on
        # adversarial input.
        if len(_CACHE) >= _CACHE_MAX:
            for k in list(_CACHE)[: _CACHE_MAX // 8]:
                _CACHE.pop(k, None)
        _CACHE[q.lower()] = (time.time(), payload)
        return payload


_service: Optional[GeocoderService] = None


def get_geocoder_service() -> GeocoderService:
    global _service
    if _service is None:
        _service = GeocoderService()
    return _service
