import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.responses import Response

from backend.utils import large_asset_sync
from backend import main as backend_main


class LargeAssetSyncTests(unittest.TestCase):
    def test_avatar_library_candidate_uses_models_route(self):
        temp_dir = large_asset_sync.REPO_ROOT / "backend" / "test_images" / "_sync_test_avatar"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "avatar_man.glb"
        temp_file.write_bytes(b"0" * (600 * 1024))

        try:
            candidate = large_asset_sync._candidate_for_file(temp_file)

            self.assertEqual(candidate.category, "avatar-library")
            self.assertEqual(candidate.fallback_url, "/models/avatars/avatar_man.glb")
            self.assertEqual(candidate.content_type, "model/gltf-binary")
        finally:
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_generated_avatar_candidate_uses_avatar_route(self):
        temp_dir = large_asset_sync.REPO_ROOT / "backend" / "outputs" / "_sync_test_candidate"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "1234_avatar.glb"
        temp_file.write_bytes(b"1" * (600 * 1024))

        try:
            candidate = large_asset_sync._candidate_for_file(temp_file)
            self.assertEqual(candidate.category, "avatars")
            self.assertEqual(candidate.storage_id, "1234")
            self.assertEqual(candidate.fallback_url, "/api/avatar/1234.glb")
        finally:
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_public_candidate_uses_public_route(self):
        temp_dir = large_asset_sync.REPO_ROOT / "public" / "_sync_test_public"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "poster.png"
        temp_file.write_bytes(b"3" * (600 * 1024))

        try:
            candidate = large_asset_sync._candidate_for_file(temp_file)
            self.assertEqual(candidate.category, "public-assets")
            self.assertEqual(candidate.fallback_url, "/public/_sync_test_public/poster.png")
        finally:
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_humaniflow_model_file_is_not_treated_as_demo_asset(self):
        temp_file = large_asset_sync.REPO_ROOT / "backend" / "humaniflow" / "model_files" / "cocoplus_regressor.npy"
        candidate = large_asset_sync._candidate_for_file(temp_file)

        self.assertEqual(candidate.category, "humaniflow-model-files")
        self.assertFalse(large_asset_sync.can_delete_local_copy(candidate))
        self.assertEqual(
            candidate.fallback_url,
            "/api/storage/repo-file?path=backend/humaniflow/model_files/cocoplus_regressor.npy",
        )

    def test_sync_large_asset_candidate_writes_sidecar_metadata(self):
        temp_dir = large_asset_sync.REPO_ROOT / "backend" / "outputs" / "_sync_test"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "sync-test_avatar.glb"
        temp_file.write_bytes(b"0" * (600 * 1024))
        metadata_path = large_asset_sync.get_storage_metadata_path(temp_file)

        fake_metadata = {
            "storage": "r2",
            "bucket": "ml-models",
            "r2_key": "generated-assets/avatars/sync-test/sync-test_avatar.glb",
            "url": "/api/avatar/sync-test.glb",
            "content_type": "model/gltf-binary",
            "size_bytes": temp_file.stat().st_size,
        }

        try:
            candidate = large_asset_sync._candidate_for_file(temp_file)
            with patch.object(large_asset_sync, "store_generated_file", return_value=fake_metadata):
                result = large_asset_sync.sync_large_asset_candidate(candidate, dry_run=False)

            self.assertEqual(result["status"], "synced_to_r2")
            self.assertTrue(metadata_path.exists())
            metadata = large_asset_sync.read_storage_metadata(metadata_path)
            self.assertEqual(metadata["r2_key"], fake_metadata["r2_key"])
        finally:
            if metadata_path.exists():
                metadata_path.unlink()
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_sync_large_asset_candidate_deletes_existing_local_copy_when_already_synced(self):
        temp_dir = large_asset_sync.REPO_ROOT / "backend" / "test_images" / "_sync_delete_test"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "delete-me.glb"
        temp_file.write_bytes(b"2" * (600 * 1024))
        metadata_path = large_asset_sync.get_storage_metadata_path(temp_file)
        large_asset_sync.write_storage_metadata(
            metadata_path,
            {
                "storage": "r2",
                "bucket": "ml-models",
                "r2_key": "generated-assets/avatar-library/delete-me/delete-me.glb",
                "url": "/models/avatars/delete-me.glb",
            },
        )

        try:
            candidate = large_asset_sync._candidate_for_file(temp_file)
            with patch.object(large_asset_sync, "head_r2_object", return_value={"ContentLength": temp_file.stat().st_size}):
                result = large_asset_sync.sync_large_asset_candidate(
                    candidate,
                    dry_run=False,
                    delete_local_after_upload=True,
                )

            self.assertEqual(result["status"], "deleted_local_copy")
            self.assertTrue(result["localDeleted"])
            self.assertFalse(temp_file.exists())
            self.assertTrue(metadata_path.exists())
        finally:
            if metadata_path.exists():
                metadata_path.unlink()
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()


class LargeAssetSyncRouteTests(unittest.TestCase):
    def test_repo_file_response_proxies_synced_attached_asset(self):
        temp_dir = large_asset_sync.REPO_ROOT / "attached_assets" / "_sync_route_test"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "lighting-diagram.png"
        metadata_path = large_asset_sync.get_storage_metadata_path(temp_file)
        metadata_path.write_text(
            """
{
  "storage": "r2",
  "bucket": "ml-models",
  "r2_key": "generated-assets/attached-assets/test/lighting-diagram.png",
  "content_type": "image/png",
  "url": "/api/storage/repo-file?path=attached_assets/_sync_route_test/lighting-diagram.png"
}
            """.strip(),
            encoding="utf-8",
        )

        try:
            with patch("backend.main.maybe_proxy_r2_asset", return_value=Response(content=b"png", media_type="image/png", headers={"X-Storage-Backend": "r2"})):
                response = backend_main.build_repo_file_response("attached_assets/_sync_route_test/lighting-diagram.png")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers.get("X-Storage-Backend"), "r2")
            self.assertEqual(response.body, b"png")
        finally:
            if metadata_path.exists():
                metadata_path.unlink()
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_public_file_response_proxies_synced_public_asset(self):
        temp_dir = large_asset_sync.REPO_ROOT / "public" / "_sync_route_test"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / "role.png"
        metadata_path = large_asset_sync.get_storage_metadata_path(temp_file)
        metadata_path.write_text(
            """
{
  "storage": "r2",
  "bucket": "ml-models",
  "r2_key": "generated-assets/public-assets/test/role.png",
  "content_type": "image/png",
  "url": "/public/_sync_route_test/role.png"
}
            """.strip(),
            encoding="utf-8",
        )

        try:
            with patch("backend.main.maybe_proxy_r2_asset", return_value=Response(content=b"role", media_type="image/png", headers={"X-Storage-Backend": "r2"})):
                response = backend_main.build_public_file_response("_sync_route_test/role.png")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers.get("X-Storage-Backend"), "r2")
            self.assertEqual(response.body, b"role")
        finally:
            if metadata_path.exists():
                metadata_path.unlink()
            if temp_file.exists():
                temp_file.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()


if __name__ == "__main__":
    unittest.main()
