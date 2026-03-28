import unittest

from fastapi.testclient import TestClient

try:
    from environment_assembly_service import EnvironmentAssemblyService
except ImportError:
    from backend.environment_assembly_service import EnvironmentAssemblyService

try:
    from main import app
except ImportError:
    from backend.main import app


def build_pizza_plan() -> dict:
    return {
        "planId": "pizza-assembly-test",
        "prompt": "warm pizza restaurant commercial",
        "concept": "Warm pizza commercial set",
        "summary": "Counter service with hero pizza and wall menu",
        "roomShell": {
            "type": "storefront",
            "width": 14.0,
            "depth": 10.0,
            "height": 4.6,
        },
        "camera": {
            "shotType": "beauty",
            "positionHint": [0.0, 1.8, 6.8],
            "target": [0.0, 1.45, 0.0],
            "fov": 0.58,
        },
        "surfaces": [
            {"target": "backWall", "materialId": "brick-white", "visible": True},
            {"target": "leftWall", "materialId": "stucco", "visible": True},
            {"target": "rightWall", "materialId": "wood-panels", "visible": True},
            {"target": "rearWall", "materialId": "plaster", "visible": False},
            {"target": "floor", "materialId": "checkerboard", "visible": True},
        ],
        "props": [
            {
                "name": "Hero pizza",
                "category": "hero",
                "priority": "high",
                "placementHint": "Centered on the counter in the foreground",
            },
            {
                "name": "Menu board with prices",
                "category": "set_dressing",
                "priority": "medium",
                "placementHint": "Mounted on the back wall",
            },
            {
                "name": "Fresh herbs",
                "category": "supporting",
                "priority": "medium",
                "placementHint": "On the counter next to the hero pizza",
            },
        ],
    }


class EnvironmentAssemblyServiceTest(unittest.TestCase):
    def test_assemble_auto_adds_anchor_and_avoids_duplicate_hero_match(self) -> None:
        service = EnvironmentAssemblyService()

        result = service.assemble(build_pizza_plan())

        self.assertTrue(result["success"])
        runtime_asset_ids = [request["assetId"] for request in result["runtimeProps"]]
        self.assertIn("pizza_hero_display", runtime_asset_ids)
        self.assertIn("herb_pots_cluster", runtime_asset_ids)
        self.assertIn("menu_board_wall", runtime_asset_ids)
        self.assertIn("counter_pizza_prep", runtime_asset_ids)
        self.assertIn("counter_pizza_prep", result["assembly"]["autoAddedAssetIds"])

        supported_relationships = [
            relationship
            for relationship in result["assembly"]["relationships"]
            if relationship["type"] == "supported_by"
        ]
        self.assertGreaterEqual(len(supported_relationships), 2)

        wall_relationship = next(
            (
                relationship
                for relationship in result["assembly"]["relationships"]
                if relationship["type"] == "attached_to"
                and relationship["targetNodeId"] == "surface:backWall"
            ),
            None,
        )
        self.assertIsNotNone(wall_relationship)

    def test_assemble_uses_layout_guidance_for_wall_target_without_explicit_side_hint(self) -> None:
        service = EnvironmentAssemblyService()
        plan = build_pizza_plan()
        plan["props"] = [
            {
                "name": "Menu board with prices",
                "category": "set_dressing",
                "priority": "medium",
                "placementHint": "Mounted on wall",
            }
        ]
        plan["layoutGuidance"] = {
            "provider": "heuristics",
            "visiblePlanes": ["floor", "backWall", "leftWall"],
            "depthProfile": {"quality": "medium", "cameraElevation": "eye"},
            "suggestedZones": {
                "hero": {"xBias": 0.0, "depthZone": "foreground"},
                "supporting": {"side": "center", "depthZone": "midground"},
                "background": {"wallTarget": "leftWall", "depthZone": "background"},
            },
        }

        result = service.assemble(plan)

        menu_request = next(request for request in result["runtimeProps"] if request["assetId"] == "menu_board_wall")
        self.assertEqual(menu_request["metadata"]["preferredWallTarget"], "leftWall")
        self.assertTrue(menu_request["metadata"]["shotAwarePlacement"])

        wall_relationship = next(
            relationship
            for relationship in result["assembly"]["relationships"]
            if relationship["type"] == "attached_to"
        )
        self.assertEqual(wall_relationship["targetNodeId"], "surface:leftWall")

    def test_assemble_uses_object_anchors_to_bias_surface_and_wall_requests(self) -> None:
        service = EnvironmentAssemblyService()
        plan = build_pizza_plan()
        plan["layoutGuidance"] = {
            "provider": "sam2_depth",
            "roomType": "storefront",
            "visiblePlanes": ["floor", "backWall", "rightWall"],
            "depthProfile": {"quality": "deep", "cameraElevation": "eye", "horizonLine": 0.48},
            "objectAnchors": [
                {
                    "id": "anchor_counter_1",
                    "kind": "counter",
                    "label": "Prep counter",
                    "placementMode": "ground",
                    "bbox": [0.18, 0.52, 0.8, 0.84],
                    "preferredZonePurpose": "counter",
                    "confidence": 0.94,
                },
                {
                    "id": "anchor_menu_1",
                    "kind": "menu_board",
                    "label": "Menu board",
                    "placementMode": "wall",
                    "bbox": [0.72, 0.14, 0.94, 0.34],
                    "wallTarget": "rightWall",
                    "preferredZonePurpose": "background",
                    "confidence": 0.88,
                },
            ],
            "suggestedZones": {
                "hero": {"xBias": 0.0, "depthZone": "midground"},
                "supporting": {"side": "left", "depthZone": "midground"},
                "background": {"wallTarget": "backWall", "depthZone": "background"},
            },
        }

        result = service.assemble(plan)

        hero_request = next(request for request in result["runtimeProps"] if request["assetId"] == "pizza_hero_display")
        menu_request = next(request for request in result["runtimeProps"] if request["assetId"] == "menu_board_wall")
        self.assertEqual(hero_request["metadata"]["surfaceHint"], "counter")
        self.assertEqual(hero_request["metadata"]["layoutAnchorKind"], "counter")
        self.assertEqual(hero_request["metadata"]["preferredAnchorAssetId"], "counter_pizza_prep")
        self.assertEqual(menu_request["metadata"]["preferredWallTarget"], "rightWall")
        self.assertEqual(menu_request["metadata"]["layoutAnchorKind"], "menu_board")


class EnvironmentAssemblyRouteTest(unittest.TestCase):
    def test_environment_assemble_route_returns_scenegraph_payload(self) -> None:
        client = TestClient(app)

        status_response = client.get("/api/environment/assemble/status")
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.json()["supportsAutoAddedAnchors"])

        response = client.post(
            "/api/environment/assemble",
            json={"plan": build_pizza_plan()},
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["shell"]["type"], "storefront")
        self.assertGreaterEqual(len(payload["assembly"]["nodes"]), 6)
        self.assertIn("counter_pizza_prep", payload["assembly"]["autoAddedAssetIds"])


if __name__ == "__main__":
    unittest.main()
