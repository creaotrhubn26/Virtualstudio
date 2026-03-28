import unittest

try:
    from environment_planner_service import EnvironmentPlannerService, build_room_shell_spec
except ImportError:
    from backend.environment_planner_service import EnvironmentPlannerService, build_room_shell_spec


class EnvironmentPlannerLayoutIntegrationTest(unittest.TestCase):
    def test_fallback_plan_uses_layout_hints_for_shell_and_camera(self) -> None:
        service = EnvironmentPlannerService()
        room_constraints = {
            "layoutHints": {
                "aggregate": {
                    "roomType": "warehouse",
                    "composition": "right_weighted",
                    "depthQuality": "deep",
                    "floorVisible": True,
                    "leftWallVisible": True,
                    "rightWallVisible": False,
                    "backWallVisible": True,
                    "estimatedShell": {
                        "width": 18.5,
                        "depth": 16.0,
                        "height": 7.4,
                        "openCeiling": True,
                    },
                    "suggestedCamera": {
                        "shotType": "wide",
                        "target": [0.7, 1.45, 0.0],
                        "positionHint": [0.2, 1.8, 8.2],
                    },
                }
            }
        }

        plan = service._build_fallback_plan(
            prompt="industrial product hero shot",
            reference_images=["/tmp/reference.png"],
            room_constraints=room_constraints,
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertEqual(plan["roomShell"]["type"], "warehouse")
        self.assertEqual(plan["roomShell"]["width"], 18.5)
        self.assertEqual(plan["roomShell"]["depth"], 16.0)
        self.assertEqual(plan["camera"]["shotType"], "wide")
        self.assertGreaterEqual(plan["camera"]["target"][0], 0.5)
        self.assertEqual(plan["layoutGuidance"]["provider"], "heuristics")
        self.assertEqual(plan["layoutGuidance"]["suggestedZones"]["background"]["wallTarget"], "backWall")
        self.assertEqual(plan["layoutGuidance"]["depthProfile"]["quality"], "deep")
        self.assertEqual(plan["surfaces"][1]["target"], "leftWall")
        self.assertTrue(plan["surfaces"][1]["visible"])
        self.assertEqual(plan["surfaces"][2]["target"], "rightWall")
        self.assertFalse(plan["surfaces"][2]["visible"])
        self.assertIn("sam2_segmentation", plan["compatibility"]["nextBuildModules"])
        self.assertIn("depth_anything_layout", plan["compatibility"]["nextBuildModules"])

    def test_build_room_shell_spec_prefers_detected_openings_when_shell_input_has_none(self) -> None:
        shell = build_room_shell_spec(
            {
                "type": "storefront",
                "width": 16.2,
                "depth": 10.8,
                "height": 4.9,
                "openCeiling": False,
            },
            prompt="pizza storefront with visible entry",
            layout_hints={
                "roomType": "storefront",
                "detectedOpenings": [
                    {
                        "id": "detected_door_1",
                        "wallTarget": "rearWall",
                        "kind": "door",
                        "widthRatio": 0.2,
                        "heightRatio": 0.74,
                        "xAlign": "left",
                        "sillHeight": 0.0,
                    },
                    {
                        "id": "detected_window_2",
                        "wallTarget": "rearWall",
                        "kind": "window",
                        "widthRatio": 0.34,
                        "heightRatio": 0.38,
                        "xAlign": "right",
                        "sillHeight": 1.02,
                    },
                ],
                "objectAnchors": [
                    {
                        "id": "anchor_counter_1",
                        "kind": "counter",
                        "placementMode": "ground",
                        "preferredZonePurpose": "counter",
                    }
                ],
            },
        )

        self.assertEqual(shell["type"], "storefront")
        self.assertEqual(len(shell["openings"]), 2)
        self.assertEqual(shell["openings"][0]["id"], "detected_door_1")
        self.assertEqual(shell["openings"][1]["kind"], "window")
        self.assertTrue(any("architectural openings" in note.lower() for note in shell["notes"]))
        self.assertTrue(any("fixture anchors" in note.lower() for note in shell["notes"]))

    def test_fallback_plan_adds_editorial_gobo_to_accent_light(self) -> None:
        service = EnvironmentPlannerService()

        plan = service._build_fallback_plan(
            prompt="luxury beauty editorial close-up",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        accent_light = next((light for light in plan["lighting"] if light["role"] == "accent"), None)
        self.assertIsNotNone(accent_light)
        self.assertEqual(accent_light["gobo"]["goboId"], "breakup")
        self.assertGreater(accent_light["gobo"]["intensity"], 0.5)
        self.assertEqual(accent_light["intent"], "beauty")
        self.assertEqual(accent_light["modifier"], "stripbox")
        self.assertGreater(accent_light["beamAngle"], 20)

    def test_normalize_plan_infers_noir_gobo_when_live_model_omits_it(self) -> None:
        service = EnvironmentPlannerService()
        fallback_plan = service._build_fallback_plan(
            prompt="dramatic noir portrait with venetian blind shadows",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        normalized = service._normalize_plan(
            live_plan={
                "summary": "Noir portrait with hard side light",
                "concept": "Noir Portrait",
                "lighting": [
                    {
                        "role": "accent",
                        "position": [1.2, 2.8, -0.4],
                        "intensity": 0.8,
                        "purpose": "Hard shadow texture across the subject and wall",
                    }
                ],
            },
            fallback_plan=fallback_plan,
            prompt="dramatic noir portrait with venetian blind shadows",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertEqual(normalized["lighting"][0]["gobo"]["goboId"], "blinds")
        self.assertEqual(normalized["lighting"][0]["gobo"]["rotation"], 0)

    def test_normalize_plan_keeps_rembrandt_key_clean_when_prompt_is_classic_portrait(self) -> None:
        service = EnvironmentPlannerService()
        fallback_plan = service._build_fallback_plan(
            prompt="classic rembrandt portrait headshot in studio",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        normalized = service._normalize_plan(
            live_plan={
                "summary": "Classic Rembrandt portrait with soft contrast",
                "concept": "Studio Headshot",
                "lighting": [
                    {
                        "role": "key",
                        "position": [-1.8, 2.7, -0.9],
                        "intensity": 0.92,
                        "purpose": "Classic rembrandt key for a clean portrait triangle",
                    }
                ],
            },
            fallback_plan=fallback_plan,
            prompt="classic rembrandt portrait headshot in studio",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertNotIn("gobo", normalized["lighting"][0])

    def test_normalize_plan_infers_window_gobo_for_pizzeria_rim_light(self) -> None:
        service = EnvironmentPlannerService()
        fallback_plan = service._build_fallback_plan(
            prompt="pizza restaurant commercial with warm trattoria light",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        normalized = service._normalize_plan(
            live_plan={
                "summary": "Warm pizzeria hero shot",
                "concept": "Rustic Italian Pizzeria Studio",
                "lighting": [
                    {
                        "role": "rim",
                        "position": [2.2, 3.1, 1.8],
                        "intensity": 0.64,
                        "purpose": "Warm separation on herbs and glassware",
                    }
                ],
            },
            fallback_plan=fallback_plan,
            prompt="pizza restaurant commercial with warm trattoria light",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertEqual(normalized["lighting"][0]["gobo"]["goboId"], "window")
        self.assertEqual(normalized["lighting"][0]["gobo"]["rotation"], 0)
        self.assertEqual(normalized["lighting"][0]["intent"], "food")
        self.assertEqual(normalized["lighting"][0]["modifier"], "fresnel")

    def test_fallback_plan_adds_backroom_shell_details_for_pizzeria(self) -> None:
        service = EnvironmentPlannerService()

        plan = service._build_fallback_plan(
            prompt="pizza restaurant commercial with visible back-of-house pass",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        zone_ids = {zone["id"] for zone in plan["roomShell"]["zones"]}
        fixture_ids = {fixture["id"] for fixture in plan["roomShell"]["fixtures"]}
        opening_ids = {opening["id"] for opening in plan["roomShell"]["openings"]}

        self.assertIn("backroom_prep", zone_ids)
        self.assertIn("pass_shelf", fixture_ids)
        self.assertIn("service_pass", opening_ids)

    def test_normalize_plan_infers_breakup_for_editorial_accent_light(self) -> None:
        service = EnvironmentPlannerService()
        fallback_plan = service._build_fallback_plan(
            prompt="luxury beauty editorial close-up",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        normalized = service._normalize_plan(
            live_plan={
                "summary": "Premium beauty editorial with glossy backdrop",
                "concept": "Luxury Beauty Editorial Set",
                "lighting": [
                    {
                        "role": "accent",
                        "position": [0.8, 3.2, 2.6],
                        "intensity": 0.52,
                        "purpose": "Glossy editorial accent on the backdrop and product edges",
                    }
                ],
            },
            fallback_plan=fallback_plan,
            prompt="luxury beauty editorial close-up",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertEqual(normalized["lighting"][0]["gobo"]["goboId"], "breakup")

    def test_normalize_plan_infers_breakup_for_warehouse_accent_light(self) -> None:
        service = EnvironmentPlannerService()
        fallback_plan = service._build_fallback_plan(
            prompt="industrial warehouse scene with haze",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        normalized = service._normalize_plan(
            live_plan={
                "summary": "Warehouse plate with dusty background texture",
                "concept": "Industrial Warehouse Shell",
                "lighting": [
                    {
                        "role": "accent",
                        "position": [1.6, 3.1, 2.0],
                        "intensity": 0.66,
                        "purpose": "Dusty industrial breakup on the background wall",
                    }
                ],
            },
            fallback_plan=fallback_plan,
            prompt="industrial warehouse scene with haze",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={},
        )

        self.assertEqual(normalized["lighting"][0]["gobo"]["goboId"], "breakup")

    def test_pizza_fallback_includes_staff_and_branding(self) -> None:
        service = EnvironmentPlannerService()

        plan = service._build_fallback_plan(
            prompt="pizza restaurant commercial with branded uniforms",
            reference_images=[],
            room_constraints={},
            preferred_preset_id=None,
            world_model_provider="none",
            world_model_reference={},
            brand_reference={
                "hasBranding": True,
                "brandName": "Luigi's Pizza",
                "signageText": "Luigi's Pizza",
                "palette": ["#c0392b", "#f4e7d3", "#2f6b45"],
                "logoImage": "data:image/svg+xml;base64,AAA",
            },
        )

        self.assertEqual(plan["concept"], "Warm pizza commercial set")
        self.assertEqual(plan["branding"]["brandName"], "Luigi's Pizza")
        self.assertEqual(plan["branding"]["profileName"], "Rustic Italian brand system")
        self.assertTrue(plan["branding"]["applyToWardrobe"])
        self.assertIn("wardrobe", plan["branding"]["applicationTargets"])
        self.assertIn("interior_details", plan["branding"]["applicationTargets"])
        self.assertEqual(plan["branding"]["uniformPolicy"], "front_of_house_emphasis")
        self.assertEqual(plan["branding"]["signageStyle"], "menu_board")
        self.assertEqual(plan["branding"]["packagingStyle"], "printed_wrap")
        self.assertEqual(plan["branding"]["interiorStyle"], "accent_trim")
        self.assertGreaterEqual(len(plan["roomShell"]["openings"]), 2)
        self.assertGreaterEqual(len(plan["roomShell"]["zones"]), 4)
        self.assertGreaterEqual(len(plan["roomShell"]["fixtures"]), 4)
        zone_ids = {zone["id"] for zone in plan["roomShell"]["zones"]}
        self.assertIn("prep_line", zone_ids)
        self.assertIn("front_counter", zone_ids)
        fixture_ids = {fixture["id"] for fixture in plan["roomShell"]["fixtures"]}
        self.assertIn("prep_island", fixture_ids)
        self.assertIn("front_counter_block", fixture_ids)
        self.assertGreaterEqual(len(plan["characters"]), 5)
        roles = {character["role"] for character in plan["characters"]}
        self.assertIn("baker", roles)
        self.assertIn("cashier", roles)
        self.assertIn("server", roles)
        self.assertIn("host", roles)
        self.assertIn("customer", roles)
        baker = next(character for character in plan["characters"] if character["role"] == "baker")
        self.assertEqual(baker["logoPlacement"], "apron_chest")
        self.assertIn(baker["wardrobeVariantId"], {"oven_ready", "artisan_cap"})
        self.assertIn("prep_line", baker["behaviorPlan"]["routeZoneIds"])
        self.assertEqual(baker["behaviorPlan"]["lookAtTarget"], "oven")
        self.assertEqual(baker["appearance"]["hairStyle"], "covered")
        self.assertEqual(baker["appearance"]["facialHair"], "stubble")
        host = next(character for character in plan["characters"] if character["role"] == "host")
        self.assertEqual(host["behaviorPlan"]["type"], "counter_service")
        customer = next(character for character in plan["characters"] if character["role"] == "customer")
        self.assertEqual(customer["behaviorPlan"]["type"], "patrol")
        rim_light = next(light for light in plan["lighting"] if light["role"] == "rim")
        self.assertEqual(rim_light["gobo"]["goboId"], "window")


if __name__ == "__main__":
    unittest.main()
