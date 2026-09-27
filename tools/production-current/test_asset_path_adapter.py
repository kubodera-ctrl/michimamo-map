import tempfile
import unittest
from pathlib import Path

from asset_path_adapter import prepare_source_tree, resolve_legacy_path, rewrite_source_paths


class AssetPathAdapterTest(unittest.TestCase):
    def test_routes_code_assets_and_output_through_configured_roots(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            assets = root / "assets"
            work = root / "work"
            (assets / "machimamo_v164").mkdir(parents=True)
            code = assets / "machimamo_v164" / "render_latest.py"
            code.write_text("DRAWING_CONSTANT = 42\n", encoding="utf-8")
            expected_code = work / "machimamo_v164" / "render_latest.py"
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/render_latest.py", assets, work),
                expected_code,
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/review5_segments/out.mp4", assets, work),
                work / "review5_segments" / "out.mp4",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/review5_logo_emblem_grabcut.png", assets, work),
                assets / "machimamo_v164" / "review5_logo_emblem_grabcut.png",
            )

    def test_rewrites_paths_only_and_leaves_drawing_code_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = "x = 7\nP='/mnt/data/machimamo_v164/build/v14/src/machimamo_reference_v14.py'\n"
            result = rewrite_source_paths(source, root / "assets", root / "work")
            self.assertEqual(result, f"x = 7\nP={str(root / 'work/machimamo_v164/build/v14/src/machimamo_reference_v14.py')!r}\n")
            self.assertIn("x = 7", result)

    def test_prepares_copy_without_changing_non_path_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            assets = root / "assets"
            work = root / "work"
            source = assets / "machimamo_v164"
            source.mkdir(parents=True)
            (source / "render_latest.py").write_text("DRAWING_CONSTANT = 42\n", encoding="utf-8")
            result = prepare_source_tree(assets, work)
            self.assertEqual((result / "render_latest.py").read_text(encoding="utf-8"), "DRAWING_CONSTANT = 42\n")


if __name__ == "__main__":
    unittest.main()
