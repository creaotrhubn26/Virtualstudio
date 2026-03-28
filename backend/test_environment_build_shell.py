import unittest

try:
    from environment_planner_service import build_room_shell_spec
except ImportError:
    from backend.environment_planner_service import build_room_shell_spec


class EnvironmentBuildShellTest(unittest.TestCase):
    def test_build_room_shell_spec_infers_storefront_defaults_from_prompt(self) -> None:
        shell = build_room_shell_spec(
            prompt="Branded takeaway storefront with front counter and queue line",
        )

        self.assertEqual(shell["type"], "storefront")
        self.assertFalse(shell["openCeiling"])
        self.assertEqual(shell["ceilingStyle"], "canopy")
        self.assertGreaterEqual(len(shell["openings"]), 2)
        self.assertIn("front_counter", {zone["id"] for zone in shell["zones"]})
        fixture_ids = {fixture["id"] for fixture in shell["fixtures"]}
        self.assertIn("front_counter_block", fixture_ids)
        self.assertIn("host_stand", fixture_ids)
        self.assertIn("service_pass_shelf", fixture_ids)
        niche_ids = {niche["id"] for niche in shell["niches"]}
        self.assertIn("menu_display_niche", niche_ids)
        segment_ids = {segment["id"] for segment in shell["wallSegments"]}
        self.assertIn("front_bay_segment", segment_ids)
        self.assertIn("backroom_zone", {zone["id"] for zone in shell["zones"]})
        self.assertIn("service_pass", {opening["id"] for opening in shell["openings"]})

    def test_build_room_shell_spec_uses_layout_hint_and_explicit_dimensions(self) -> None:
        shell = build_room_shell_spec(
            {
                "width": 19.5,
                "depth": 15.2,
                "height": 7.4,
                "openings": [
                    {
                        "id": "loading_bay",
                        "wallTarget": "rearWall",
                        "kind": "archway",
                        "widthRatio": 0.38,
                        "heightRatio": 0.82,
                        "xAlign": "center",
                    }
                ],
            },
            prompt="industrial hero bay",
            layout_hints={
                "roomType": "warehouse",
            },
        )

        self.assertEqual(shell["type"], "warehouse")
        self.assertEqual(shell["width"], 19.5)
        self.assertEqual(shell["depth"], 15.2)
        self.assertEqual(shell["height"], 7.4)
        self.assertEqual(shell["ceilingStyle"], "open_truss")
        self.assertEqual(shell["openings"][0]["id"], "loading_bay")
        self.assertEqual(shell["wallSegments"][0]["kind"], "bay")
        self.assertTrue(any("warehouse" in note.lower() for note in shell["notes"]))

    def test_build_room_shell_spec_normalizes_fixtures(self) -> None:
        shell = build_room_shell_spec(
            {
                "type": "interior_room",
                "fixtures": [
                    {
                        "id": "hero_display",
                        "kind": "display_plinth",
                        "zoneId": "hero_zone",
                        "widthRatio": 0.18,
                        "depthRatio": 0.18,
                        "height": 0.92,
                    },
                    {
                        "id": "bad_fixture",
                        "kind": "unknown",
                        "widthRatio": 4.0,
                        "depthRatio": -1.0,
                        "height": 99,
                    },
                ],
            },
            prompt="interior dining room",
        )

        self.assertEqual(shell["fixtures"][0]["kind"], "display_plinth")
        self.assertEqual(shell["fixtures"][1]["kind"], "display_plinth")
        self.assertLessEqual(shell["fixtures"][1]["widthRatio"], 1.0)
        self.assertGreaterEqual(shell["fixtures"][1]["depthRatio"], 0.08)
        self.assertLessEqual(shell["fixtures"][1]["height"], 4.5)

    def test_build_room_shell_spec_normalizes_niches(self) -> None:
        shell = build_room_shell_spec(
            {
                "type": "storefront",
                "niches": [
                    {
                        "id": "bad_niche",
                        "wallTarget": "unknown",
                        "kind": "mystery",
                        "widthRatio": 4.0,
                        "heightRatio": -1.0,
                        "xAlign": "edge",
                        "sillHeight": 99,
                        "depth": 10,
                    },
                ],
            },
            prompt="branded storefront",
        )

        self.assertEqual(shell["niches"][0]["wallTarget"], "backWall")
        self.assertEqual(shell["niches"][0]["kind"], "display")
        self.assertLessEqual(shell["niches"][0]["widthRatio"], 0.9)
        self.assertGreaterEqual(shell["niches"][0]["heightRatio"], 0.12)
        self.assertLessEqual(shell["niches"][0]["depth"], 1.2)

    def test_build_room_shell_spec_normalizes_wall_segments(self) -> None:
        shell = build_room_shell_spec(
            {
                "type": "interior_room",
                "ceilingStyle": "mystery",
                "wallSegments": [
                    {
                        "id": "bad_segment",
                        "wallTarget": "unknown",
                        "kind": "mystery",
                        "widthRatio": 4.0,
                        "heightRatio": -1.0,
                        "xAlign": "edge",
                        "sillHeight": 99,
                        "depth": 10,
                    },
                ],
            },
            prompt="interior dining room",
        )

        self.assertEqual(shell["ceilingStyle"], "coffered")
        self.assertEqual(shell["wallSegments"][0]["wallTarget"], "backWall")
        self.assertEqual(shell["wallSegments"][0]["kind"], "panel")
        self.assertLessEqual(shell["wallSegments"][0]["widthRatio"], 0.9)
        self.assertGreaterEqual(shell["wallSegments"][0]["heightRatio"], 0.12)
        self.assertLessEqual(shell["wallSegments"][0]["depth"], 0.8)


if __name__ == "__main__":
    unittest.main()
