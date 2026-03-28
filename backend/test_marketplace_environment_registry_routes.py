import unittest
import importlib.util
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

_BACKEND_MAIN_PATH = Path(__file__).resolve().parent / "main.py"
_BACKEND_MAIN_SPEC = importlib.util.spec_from_file_location("virtualstudio_backend_main_marketplace", _BACKEND_MAIN_PATH)
if _BACKEND_MAIN_SPEC is None or _BACKEND_MAIN_SPEC.loader is None:
    raise RuntimeError("Could not load backend/main.py for marketplace registry route tests")
backend_main = importlib.util.module_from_spec(_BACKEND_MAIN_SPEC)
_BACKEND_MAIN_SPEC.loader.exec_module(backend_main)


class MarketplaceEnvironmentRegistryRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(backend_main.app)

    def test_list_marketplace_environment_packs_route(self):
        sample_product = {
            "id": "environment-user-test-pack",
            "name": "Test Pack",
            "category": "template",
            "price": 0,
            "thumbnail": "data:image/svg+xml,test",
            "screenshots": [],
            "version": "1.0.0",
            "author": {"id": "user", "name": "You"},
            "rating": 0,
            "reviewCount": 0,
            "downloadCount": 0,
            "installCount": 0,
            "tags": ["environment"],
            "features": ["Scene-ready environment plan"],
            "releaseDate": "2026-03-27T00:00:00Z",
            "lastUpdated": "2026-03-27T00:00:00Z",
            "license": "User Pack",
            "isInstalled": False,
            "hasUpdate": False,
            "isFavorite": False,
            "environmentPackage": {
                "packageId": "marketplace-user-test-pack",
                "type": "environment_plan",
                "plan": {"planId": "pack-plan"},
            },
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(backend_main, "list_environment_pack_products", return_value=[sample_product]):
            response = self.client.get(
                "/api/marketplace/environment-packs",
                params={
                    "actor_user_id": "user-7",
                    "actor_name": "Test User",
                    "actor_role": "producer",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["products"][0]["id"], "environment-user-test-pack")

    def test_publish_and_record_install_routes(self):
        sample_product = {
            "id": "environment-user-pizza-pack",
            "name": "Pizza Pack",
            "category": "template",
            "price": 0,
            "thumbnail": "data:image/svg+xml,test",
            "screenshots": [],
            "version": "1.0.0",
            "author": {"id": "user", "name": "You"},
            "rating": 0,
            "reviewCount": 0,
            "downloadCount": 0,
            "installCount": 0,
            "tags": ["environment", "pizza"],
            "features": ["Food environment"],
            "releaseDate": "2026-03-27T00:00:00Z",
            "lastUpdated": "2026-03-27T00:00:00Z",
            "license": "User Pack",
            "isInstalled": False,
            "hasUpdate": False,
            "isFavorite": False,
            "environmentPackage": {
                "packageId": "marketplace-user-pizza-pack",
                "type": "environment_plan",
                "plan": {"planId": "pizza-plan"},
            },
        }

        installed_product = {**sample_product, "installCount": 1}

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(backend_main, "upsert_environment_pack_product", return_value=sample_product) as publish_mock, \
             patch.object(backend_main, "record_environment_pack_install", return_value=installed_product) as install_mock:
            publish_response = self.client.post(
                "/api/marketplace/environment-packs/publish",
                json={
                    "product": sample_product,
                    "mode": "save_copy",
                    "actor": {
                        "userId": "user-1",
                        "name": "User One",
                        "role": "producer",
                    },
                },
            )
            install_response = self.client.post(
                "/api/marketplace/environment-packs/environment-user-pizza-pack/record-install",
            )

        self.assertEqual(publish_response.status_code, 200)
        self.assertEqual(install_response.status_code, 200)
        self.assertEqual(publish_response.json()["product"]["id"], "environment-user-pizza-pack")
        self.assertEqual(install_response.json()["product"]["installCount"], 1)
        publish_mock.assert_called_once_with(
            sample_product,
            actor={"userId": "user-1", "name": "User One", "role": "producer"},
            publish_mode="save_copy",
        )
        install_mock.assert_called_once_with("environment-user-pizza-pack")

    def test_publish_route_returns_403_when_non_admin_tries_to_update_shared_pack(self):
        sample_product = {
            "id": "environment-shared-pizza-pack",
            "name": "Shared Pizza Pack",
            "category": "template",
            "price": 0,
            "thumbnail": "data:image/svg+xml,test",
            "screenshots": [],
            "version": "1.0.1",
            "author": {"id": "admin-1", "name": "Admin"},
            "rating": 0,
            "reviewCount": 0,
            "downloadCount": 0,
            "installCount": 2,
            "tags": ["environment", "pizza"],
            "features": ["Food environment"],
            "releaseDate": "2026-03-27T00:00:00Z",
            "lastUpdated": "2026-03-27T00:00:00Z",
            "license": "Marketplace Shared Pack",
            "isInstalled": True,
            "hasUpdate": False,
            "isFavorite": False,
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(
                 backend_main,
                 "upsert_environment_pack_product",
                 side_effect=PermissionError("Kun administrator kan oppdatere eksisterende Marketplace-pakker. Lagre en egen kopi i stedet."),
             ):
            response = self.client.post(
                "/api/marketplace/environment-packs/publish",
                json={
                    "product": sample_product,
                    "mode": "update_shared",
                    "actor": {
                        "userId": "user-2",
                        "name": "Regular User",
                        "role": "producer",
                    },
                },
            )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Kun administrator", response.json()["detail"])

    def test_validate_release_route_returns_quality_report(self):
        sample_product = {
            "id": "environment-shared-pizza-pack",
            "name": "Shared Pizza Pack",
            "environmentPackage": {
                "type": "environment_plan",
                "plan": {"planId": "pizza-plan"},
            },
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(
                 backend_main,
                 "get_environment_pack_quality_report",
                 return_value={
                     "ready": True,
                     "score": 0.88,
                     "blockingIssues": [],
                     "warnings": [],
                     "checks": [],
                 },
             ):
            response = self.client.post(
                "/api/marketplace/environment-packs/validate-release",
                json={
                    "product": sample_product,
                    "mode": "create_shared",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertTrue(payload["qualityReport"]["ready"])

    def test_promote_route_requires_admin_and_returns_promoted_product(self):
        promoted_product = {
            "id": "environment-shared-pizza-pack",
            "name": "Shared Pizza Pack",
            "version": "1.1.0",
            "registryMetadata": {
                "visibility": "shared",
                "releaseStatus": "stable",
                "lineageId": "environment-shared-pizza-pack",
            },
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(
                 backend_main,
                 "promote_environment_pack_candidate",
                 return_value=promoted_product,
             ) as promote_mock:
            response = self.client.post(
                "/api/marketplace/environment-packs/environment-shared-pizza-pack--candidate/promote",
                json={
                    "actor": {
                        "userId": "admin-1",
                        "name": "Admin",
                        "role": "admin",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["product"]["registryMetadata"]["releaseStatus"], "stable")
        promote_mock.assert_called_once_with(
            "environment-shared-pizza-pack--candidate",
            actor={"userId": "admin-1", "name": "Admin", "role": "admin"},
        )

    def test_release_dashboard_route_returns_admin_dashboard(self):
        dashboard = {
            "summary": {
                "sharedPackCount": 2,
                "candidateCount": 1,
                "stableCount": 1,
                "readyCandidateCount": 1,
                "blockedCandidateCount": 0,
            },
            "entries": [
                {
                    "lineageId": "environment-shared-pizza-pack",
                    "productName": "Shared Pizza Pack",
                    "currentStable": {"id": "environment-shared-pizza-pack", "version": "1.0.0"},
                    "currentCandidate": {"id": "environment-shared-pizza-pack--candidate", "version": "1.1.0"},
                    "qualityReport": {"ready": True, "score": 0.85, "blockingIssues": [], "warnings": [], "checks": []},
                    "history": [],
                    "canRollback": True,
                    "rollbackTargetVersions": ["1.0.0"],
                },
            ],
            "recentHistory": [],
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(backend_main, "get_environment_pack_release_dashboard", return_value=dashboard) as dashboard_mock:
            response = self.client.get(
                "/api/marketplace/environment-packs/release-dashboard",
                params={
                    "actor_user_id": "admin-1",
                    "actor_name": "Admin",
                    "actor_role": "admin",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["dashboard"]["summary"]["candidateCount"], 1)
        dashboard_mock.assert_called_once_with(actor={"userId": "admin-1", "name": "Admin", "role": "admin"})

    def test_rollback_route_returns_rolled_back_product(self):
        rolled_back_product = {
            "id": "environment-shared-pizza-pack",
            "name": "Shared Pizza Pack",
            "version": "1.0.0",
            "registryMetadata": {
                "visibility": "shared",
                "releaseStatus": "stable",
                "lineageId": "environment-shared-pizza-pack",
            },
        }

        with patch.object(backend_main, "MARKETPLACE_REGISTRY_AVAILABLE", True), \
             patch.object(
                 backend_main,
                 "rollback_environment_pack_release",
                 return_value=rolled_back_product,
             ) as rollback_mock:
            response = self.client.post(
                "/api/marketplace/environment-packs/environment-shared-pizza-pack/rollback",
                json={
                    "actor": {
                        "userId": "admin-1",
                        "name": "Admin",
                        "role": "admin",
                    },
                    "targetVersion": "1.0.0",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["product"]["version"], "1.0.0")
        rollback_mock.assert_called_once_with(
            "environment-shared-pizza-pack",
            actor={"userId": "admin-1", "name": "Admin", "role": "admin"},
            target_version="1.0.0",
        )


if __name__ == "__main__":
    unittest.main()
