"""Virtual Studio API routes — extracted from backend/main.py.

Covers: scenes, presets, light-groups, user-assets, scene-versions, notes
(and /api/notes aliases), studio preferences, snapshots, camera-presets,
export-templates.

Two underlying services:
  - virtual_studio_service: scenes/presets/groups/assets/versions/notes/camera-presets/export-templates
  - settings_service:       studio preferences + snapshots (namespaced KV)
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["studio"])


# --- service loaders ---------------------------------------------------------


def _vs_or_503():
    try:
        import virtual_studio_service as svc
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Virtual Studio service not available: {exc}",
        )
    return svc


def _settings_or_503():
    try:
        import settings_service as svc
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Settings service not available: {exc}",
        )
    return svc


# --- scenes ------------------------------------------------------------------


@router.get("/api/studio/scenes")
async def api_get_scenes(user_id: Optional[str] = None, is_template: Optional[bool] = None):
    try:
        scenes = _vs_or_503().get_scenes(user_id, is_template)
        return JSONResponse({"success": True, "scenes": scenes})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/studio/scenes/{scene_id}")
async def api_get_scene(scene_id: str):
    try:
        scene = _vs_or_503().get_scene(scene_id)
        if scene:
            return JSONResponse({"success": True, "scene": scene})
        raise HTTPException(status_code=404, detail="Scene not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/scenes")
async def api_save_scene(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        scene = svc.save_scene(data, user_id)
        return JSONResponse({"success": True, "scene": scene})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/scenes/{scene_id}")
async def api_delete_scene(scene_id: str):
    try:
        if _vs_or_503().delete_scene(scene_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Scene not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- presets -----------------------------------------------------------------


@router.get("/api/studio/presets")
async def api_get_presets(user_id: Optional[str] = None, type: Optional[str] = None):
    try:
        presets = _vs_or_503().get_presets(user_id, type)
        return JSONResponse({"success": True, "presets": presets})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/presets")
async def api_save_preset(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        preset = svc.save_preset(data, user_id)
        return JSONResponse({"success": True, "preset": preset})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/presets/{preset_id}")
async def api_delete_preset(preset_id: str):
    try:
        if _vs_or_503().delete_preset(preset_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- light groups ------------------------------------------------------------


@router.get("/api/studio/light-groups")
async def api_get_light_groups(user_id: Optional[str] = None, scene_id: Optional[str] = None):
    try:
        groups = _vs_or_503().get_light_groups(user_id, scene_id)
        return JSONResponse({"success": True, "lightGroups": groups})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/light-groups")
async def api_save_light_group(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        group = svc.save_light_group(data, user_id)
        return JSONResponse({"success": True, "lightGroup": group})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/light-groups/{group_id}")
async def api_delete_light_group(group_id: str):
    try:
        if _vs_or_503().delete_light_group(group_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Light group not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- user assets -------------------------------------------------------------


@router.get("/api/studio/assets")
async def api_get_user_assets(user_id: Optional[str] = None, type: Optional[str] = None):
    try:
        assets = _vs_or_503().get_user_assets(user_id, type)
        return JSONResponse({"success": True, "assets": assets})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/assets")
async def api_save_user_asset(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        asset = svc.save_user_asset(data, user_id)
        return JSONResponse({"success": True, "asset": asset})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/assets/{asset_id}")
async def api_delete_user_asset(asset_id: str):
    try:
        if _vs_or_503().delete_user_asset(asset_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Asset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- scene versions ----------------------------------------------------------


@router.get("/api/studio/scenes/{scene_id}/versions")
async def api_get_scene_versions(scene_id: str):
    try:
        versions = _vs_or_503().get_scene_versions(scene_id)
        return JSONResponse({"success": True, "versions": versions})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/scenes/{scene_id}/versions")
async def api_save_scene_version(scene_id: str, request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        data["sceneId"] = scene_id
        version = svc.save_scene_version(data)
        return JSONResponse({"success": True, "version": version})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/versions/{version_id}")
async def api_delete_scene_version(version_id: str):
    try:
        if _vs_or_503().delete_scene_version(version_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Version not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- notes (canonical + legacy aliases) --------------------------------------


@router.get("/api/studio/notes")
async def api_get_notes(user_id: Optional[str] = None, project_id: Optional[str] = None):
    try:
        notes = _vs_or_503().get_notes(user_id, project_id)
        return JSONResponse({"success": True, "notes": notes})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/notes")
async def api_save_note(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        note = svc.save_note(data, user_id)
        return JSONResponse({"success": True, "note": note})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/notes/{note_id}")
async def api_delete_note(note_id: str):
    try:
        if _vs_or_503().delete_note(note_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Note not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/notes")
async def api_get_notes_alias(
    user_id: Optional[str] = None,
    projectId: Optional[str] = None,
    sceneId: Optional[str] = None,
):
    """Alias for studio notes (supports legacy notes service)."""
    try:
        notes = _vs_or_503().get_notes(user_id, projectId)
        if sceneId:
            notes = [
                n for n in notes
                if n.get("scene_id") == sceneId or n.get("sceneId") == sceneId
            ]
        return JSONResponse({"success": True, "notes": notes})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/notes")
async def api_save_note_alias(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        return JSONResponse(svc.save_note(data, user_id))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/notes")
async def api_update_note_alias(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        return JSONResponse(svc.save_note(data, user_id))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/notes/{note_id}")
async def api_delete_note_alias(note_id: str):
    try:
        if _vs_or_503().delete_note(note_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Note not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/notes/batch")
async def api_save_notes_batch_alias(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        for note in data.get("notes", []):
            user_id = note.pop("userId", None)
            svc.save_note(note, user_id)
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- studio preferences (favorites + recent) ---------------------------------


@router.get("/api/studio/preferences")
async def api_get_studio_preferences(user_id: Optional[str] = None):
    try:
        data = _settings_or_503().get_settings(
            user_id or "default-user", "studio_preferences"
        ) or {"favorites": {}, "recent": {}}
        return JSONResponse(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/studio/preferences/favorites")
async def api_update_studio_favorites(request: Request, user_id: Optional[str] = None):
    try:
        svc = _settings_or_503()
        body = await request.json()
        section = body.get("section")
        favorites = body.get("favorites")
        if section is None or favorites is None:
            raise HTTPException(status_code=400, detail="section and favorites required")
        current = svc.get_settings(
            user_id or "default-user", "studio_preferences"
        ) or {"favorites": {}, "recent": {}}
        current.setdefault("favorites", {})[section] = favorites
        svc.set_settings(user_id or "default-user", "studio_preferences", current)
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/preferences/recent")
async def api_add_studio_recent(request: Request, user_id: Optional[str] = None):
    try:
        svc = _settings_or_503()
        body = await request.json()
        section = body.get("section")
        item = body.get("item")
        if section is None or item is None:
            raise HTTPException(status_code=400, detail="section and item required")
        current = svc.get_settings(
            user_id or "default-user", "studio_preferences"
        ) or {"favorites": {}, "recent": {}}
        recent = current.setdefault("recent", {}).get(section, [])
        recent = [entry for entry in recent if entry.get("id") != item.get("id")]
        recent = [item] + recent
        current["recent"][section] = recent[:10]
        svc.set_settings(user_id or "default-user", "studio_preferences", current)
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- snapshots ---------------------------------------------------------------


@router.get("/api/studio/scenes/{scene_id}/snapshots")
async def api_list_snapshots(scene_id: str, user_id: Optional[str] = None):
    try:
        data = _settings_or_503().get_settings(
            user_id or "default-user", "studio_snapshots", scene_id
        ) or {"snapshots": []}
        return JSONResponse({"snapshots": data.get("snapshots", [])})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/snapshots")
async def api_create_snapshot(request: Request, user_id: Optional[str] = None):
    try:
        svc = _settings_or_503()
        payload = await request.json()
        scene_id = payload.get("sceneId")
        if not scene_id:
            raise HTTPException(status_code=400, detail="sceneId required")
        record = dict(payload)
        if not record.get("id"):
            record["id"] = f"snapshot_{uuid.uuid4().hex[:10]}"
        if not record.get("createdAt"):
            record["createdAt"] = datetime.utcnow().isoformat()
        data = svc.get_settings(
            user_id or "default-user", "studio_snapshots", scene_id
        ) or {"snapshots": []}
        snapshots = [record] + [s for s in data.get("snapshots", []) if s.get("id") != record["id"]]
        svc.set_settings(
            user_id or "default-user",
            "studio_snapshots",
            {"snapshots": snapshots[:10]},
            scene_id,
        )
        return JSONResponse({"snapshot": record})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/snapshots/{snapshot_id}")
async def api_delete_snapshot(
    snapshot_id: str,
    sceneId: Optional[str] = None,
    user_id: Optional[str] = None,
):
    if not sceneId:
        raise HTTPException(status_code=400, detail="sceneId required")
    try:
        svc = _settings_or_503()
        data = svc.get_settings(
            user_id or "default-user", "studio_snapshots", sceneId
        ) or {"snapshots": []}
        snapshots = [s for s in data.get("snapshots", []) if s.get("id") != snapshot_id]
        svc.set_settings(
            user_id or "default-user", "studio_snapshots", {"snapshots": snapshots}, sceneId
        )
        return JSONResponse({"success": True})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- camera presets ----------------------------------------------------------


@router.get("/api/studio/camera-presets")
async def api_get_camera_presets(user_id: Optional[str] = None):
    try:
        presets = _vs_or_503().get_camera_presets(user_id)
        return JSONResponse({"success": True, "cameraPresets": presets})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/camera-presets")
async def api_save_camera_preset(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        preset = svc.save_camera_preset(data, user_id)
        return JSONResponse({"success": True, "cameraPreset": preset})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/camera-presets/{preset_id}")
async def api_delete_camera_preset(preset_id: str):
    try:
        if _vs_or_503().delete_camera_preset(preset_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Camera preset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- export templates --------------------------------------------------------


@router.get("/api/studio/export-templates")
async def api_get_export_templates(user_id: Optional[str] = None, type: Optional[str] = None):
    try:
        templates = _vs_or_503().get_export_templates(user_id, type)
        return JSONResponse({"success": True, "exportTemplates": templates})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/studio/export-templates")
async def api_save_export_template(request: Request):
    try:
        svc = _vs_or_503()
        data = await request.json()
        user_id = data.pop("userId", None)
        template = svc.save_export_template(data, user_id)
        return JSONResponse({"success": True, "exportTemplate": template})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/studio/export-templates/{template_id}")
async def api_delete_export_template(template_id: str):
    try:
        if _vs_or_503().delete_export_template(template_id):
            return JSONResponse({"success": True})
        raise HTTPException(status_code=404, detail="Export template not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
