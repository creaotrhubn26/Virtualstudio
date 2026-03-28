import unittest
from unittest.mock import patch

try:
    from environment_validation_service import EnvironmentValidationService
except ImportError:
    from backend.environment_validation_service import EnvironmentValidationService


class _AssemblyStub:
    def __init__(self, shell_type: str = "storefront") -> None:
        self.shell_type = shell_type

    def assemble(self, plan):
        return {
            "success": True,
            "provider": "local_scenegraph",
            "shell": {
                "type": self.shell_type,
                "zones": plan.get("roomShell", {}).get("zones", []),
            },
            "assembly": {
                "nodes": [{"id": "shell"}, {"id": "camera"}, {"id": "prop:1"}],
                "relationships": [{"id": "hero_focus"}],
                "autoAddedAssetIds": [],
            },
            "runtimeProps": [
                {"assetId": "pizza_hero_display", "metadata": {"placementMode": "surface"}},
                {"assetId": "menu_board_wall", "metadata": {"placementMode": "wall"}},
            ],
        }


class EnvironmentValidationServiceTest(unittest.TestCase):
    def build_plan(self):
        return {
            "version": "1.0",
            "planId": "plan-validate",
            "prompt": "Pizza restaurant commercial with warm trattoria lighting",
            "summary": "Warm pizza scene",
            "concept": "Rustic Italian Pizzeria",
            "roomShell": {
                "type": "storefront",
                "width": 14.0,
                "depth": 10.0,
                "height": 4.6,
                "openCeiling": False,
                "openings": [
                    {"id": "front_entry", "kind": "door"},
                    {"id": "service_pass", "kind": "pass_through"},
                ],
                "zones": [
                    {"id": "prep_line", "purpose": "prep"},
                    {"id": "front_counter", "purpose": "counter"},
                    {"id": "backroom_prep", "purpose": "backroom"},
                ],
                "fixtures": [
                    {"id": "front_counter_block", "kind": "counter_block"},
                    {"id": "pass_shelf", "kind": "pass_shelf"},
                ],
                "niches": [{"id": "menu_niche"}],
                "wallSegments": [{"id": "front_bay_segment"}],
            },
            "props": [
                {"name": "Hero Pizza", "priority": "high"},
                {"name": "Menu Board", "priority": "medium"},
            ],
            "characters": [
                {
                    "role": "baker",
                    "logoPlacement": "apron_chest",
                    "behaviorPlan": {
                        "homeZoneId": "prep_line",
                        "routeZoneIds": ["prep_line", "front_counter"],
                    },
                }
            ],
            "branding": {
                "enabled": True,
                "palette": ["#c0392b", "#f4e7d3"],
                "applicationTargets": ["wardrobe", "signage", "packaging", "interior_details"],
            },
            "lighting": [
                {
                    "role": "key",
                    "intent": "food",
                    "modifier": "softbox",
                    "beamAngle": 38,
                    "rationale": "Warm appetizing key",
                },
                {
                    "role": "rim",
                    "intent": "food",
                    "modifier": "fresnel",
                    "beamAngle": 30,
                    "rationale": "Warm separation on steam and crust",
                    "gobo": {"goboId": "window"},
                },
            ],
            "camera": {
                "shotType": "hero shot",
                "target": [0.0, 1.4, 0.0],
                "positionHint": [0.0, 1.8, -6.0],
                "mood": "appetizing premium commercial",
            },
            "layoutGuidance": {
                "summary": "Front counter with visible service pass",
                "objectAnchors": [{"id": "counter_1", "kind": "counter"}],
                "detectedOpenings": [{"id": "service_pass", "kind": "pass_through"}],
            },
        }

    def test_validate_scores_well_formed_pizzeria_scene(self):
        service = EnvironmentValidationService(_AssemblyStub())
        result = service.validate(self.build_plan())

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "heuristic_environment_validation")
        self.assertGreaterEqual(result["evaluation"]["overallScore"], 0.72)
        self.assertEqual(result["evaluation"]["verdict"], "approved")
        self.assertIn("brandConsistency", result["evaluation"]["categories"])
        self.assertIn("imageLayoutMatch", result["evaluation"]["categories"])

    def test_validate_flags_missing_detail_with_adjustments(self):
        service = EnvironmentValidationService(_AssemblyStub(shell_type="studio_shell"))
        plan = self.build_plan()
        plan["roomShell"]["openings"] = []
        plan["roomShell"]["zones"] = [{"id": "hero_zone", "purpose": "hero"}]
        plan["lighting"] = [{"role": "key"}]
        plan["branding"] = {"enabled": False}
        plan["layoutGuidance"] = None

        result = service.validate(plan)
        self.assertEqual(result["evaluation"]["verdict"], "needs_refinement")
        self.assertTrue(result["evaluation"]["suggestedAdjustments"])
        self.assertLess(result["evaluation"]["categories"]["roomRealism"]["score"], 0.72)

    def test_validate_merges_external_preview_scores_when_provider_is_available(self):
        service = EnvironmentValidationService(_AssemblyStub())
        service.external_validation_url = "https://vision.example/api"

        with patch.object(service, "_post_external_json", return_value={
            "provider": "vision_vlm",
            "evaluation": {
                "provider": "vision_vlm",
                "overallScore": 0.88,
                "verdict": "approved",
                "previewSimilarity": {
                    "score": 0.91,
                    "notes": ["Preview closely matches the intended pizza prompt."],
                },
                "categories": {
                    "lightingIntentMatch": {
                        "score": 0.9,
                        "notes": ["Warm window rim reads well in the preview."],
                    },
                },
                "suggestedAdjustments": ["Push the front menu board slightly further into the midground."],
                "previewUsed": True,
                "previewSource": "runtime_capture",
                "usedVisionModel": True,
                "providerMetadata": {"model": "vision-eval-v1"},
            },
        }):
            result = service.validate(
                self.build_plan(),
                preview_image="data:image/jpeg;base64,preview",
                provider="vision_vlm",
                validation_options={"referenceMode": "runtime_preview"},
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "vision_vlm")
        self.assertFalse(result["usedFallback"])
        self.assertTrue(result["evaluation"]["previewUsed"])
        self.assertTrue(result["evaluation"]["usedVisionModel"])
        self.assertIn("previewSimilarity", result["evaluation"]["categories"])
        self.assertGreater(result["evaluation"]["overallScore"], 0.8)
        self.assertEqual(result["evaluation"]["providerMetadata"]["model"], "vision-eval-v1")

    def test_provider_health_reports_configuration_state(self):
        service = EnvironmentValidationService(_AssemblyStub())
        service.external_validation_url = ""

        health = service.get_provider_health(probe=False)

        self.assertEqual(health["provider"], service.provider)
        self.assertFalse(health["probeEnabled"])
        self.assertFalse(health["providers"]["vision_vlm"]["configured"])

    def test_provider_health_can_probe_validation_endpoint(self):
        service = EnvironmentValidationService(_AssemblyStub())
        service.external_validation_url = "https://vision.example/api"
        service._probe_provider_url = lambda url: {  # type: ignore[method-assign]
            "configured": True,
            "healthy": True,
            "reachable": True,
            "statusCode": 200,
            "method": "GET",
            "url": url,
        }

        health = service.get_provider_health(probe=True)

        self.assertTrue(health["probeEnabled"])
        self.assertTrue(health["providers"]["vision_vlm"]["probe"]["healthy"])

    def test_merge_evaluations_moderates_structural_blockout_penalties(self):
        service = EnvironmentValidationService(_AssemblyStub())
        heuristic_evaluation = service._build_heuristic_evaluation(self.build_plan())
        external_evaluation = {
            "provider": "gemini_validation",
            "overallScore": 0.52,
            "categories": {
                "promptFidelity": {"score": 0.4, "notes": ["Abstract but structurally aligned."]},
                "compositionMatch": {"score": 0.9, "notes": ["Composition is strong."]},
                "lightingIntentMatch": {"score": 0.0, "notes": ["Lighting reads as placeholder."]},
                "technicalIntegrity": {"score": 0.9, "notes": ["Scene assembly is solid."]},
                "roomRealism": {"score": 0.1, "notes": ["Preview is still a blockout."]},
                "brandConsistency": {"score": 0.1, "notes": ["Brand is not rendered yet."]},
                "imageLayoutMatch": {"score": 0.95, "notes": ["Layout matches strongly."]},
                "previewSimilarity": {"score": 0.7, "notes": ["Preview is structurally similar."]},
            },
            "suggestedAdjustments": ["Refine materials and lighting."],
            "providerMetadata": {
                "scenePhase": "provider_smoke",
            },
        }

        merged = service._merge_evaluations(
            heuristic_evaluation=heuristic_evaluation,
            external_evaluation=external_evaluation,
        )

        self.assertEqual(merged["providerMetadata"]["validationMode"], "structural_blockout")
        self.assertGreater(merged["categories"]["lightingIntentMatch"]["score"], 0.45)
        self.assertGreater(merged["categories"]["roomRealism"]["score"], 0.45)
        self.assertGreater(merged["overallScore"], 0.62)

    def test_validate_reuses_cached_result_for_identical_preview_request(self):
        service = EnvironmentValidationService(_AssemblyStub())
        service.external_validation_url = "https://vision.example/api"
        service.cache_ttl_seconds = 60.0
        call_count = 0

        def _fake_external(_url, _payload):
            nonlocal call_count
            call_count += 1
            return {
                "provider": "vision_vlm",
                "evaluation": {
                    "provider": "vision_vlm",
                    "overallScore": 0.84,
                    "verdict": "approved",
                    "categories": {
                        "lightingIntentMatch": {
                            "score": 0.86,
                            "notes": ["Warm key and rim feel intentional."],
                        }
                    },
                    "previewUsed": True,
                    "previewSource": "runtime_capture",
                    "usedVisionModel": True,
                },
            }

        with patch.object(service, "_post_external_json", side_effect=_fake_external):
            first = service.validate(
                self.build_plan(),
                preview_image="data:image/jpeg;base64,preview-one",
                provider="vision_vlm",
                validation_options={"referenceMode": "runtime_preview"},
            )
            second = service.validate(
                self.build_plan(),
                preview_image="data:image/jpeg;base64,preview-one",
                provider="vision_vlm",
                validation_options={"referenceMode": "runtime_preview"},
            )

        self.assertEqual(call_count, 1)
        self.assertFalse(first["cacheHit"])
        self.assertTrue(second["cacheHit"])
        self.assertGreater(second["evaluation"]["overallScore"], 0.8)


if __name__ == "__main__":
    unittest.main()
