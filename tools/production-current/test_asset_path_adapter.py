import tempfile
import unittest
from pathlib import Path

from asset_path_adapter import prepare_source_tree, resolve_legacy_path, rewrite_source_paths


class AssetPathAdapterTest(unittest.TestCase):
    def test_routes_code_assets_output_and_recovered_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            assets = root / "assets"
            work = root / "work"
            (assets / "machimamo_v164").mkdir(parents=True)
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/render_latest.py", assets, work),
                work / "machimamo_v164" / "render_latest.py",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/review5_segments/out.mp4", assets, work),
                work / "review5_segments" / "out.mp4",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_v164/review5_logo_emblem_grabcut.png", assets, work),
                assets / "machimamo_v164" / "review5_logo_emblem_grabcut.png",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_reference_v13/package/machimamo_reference_v13.py", assets, work),
                work / "machimamo_reference_v13" / "package" / "machimamo_reference_v13.py",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_reference_v12/source/machimamo_reference_v12.py", assets, work),
                work / "machimamo_reference_v12" / "source" / "machimamo_reference_v12.py",
            )
            self.assertEqual(
                resolve_legacy_path("/mnt/data/machimamo_video5_build_v4/source_v7/render_short_44s_v7_zoom_refined.py", assets, work),
                work / "machimamo_video5_build_v4" / "source_v7" / "render_short_44s_v7_zoom_refined.py",
            )

    def test_rewrites_paths_only_and_leaves_drawing_code_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = "x = 7\nP='/mnt/data/machimamo_reference_v13/package/machimamo_reference_v13.py'\n"
            result = rewrite_source_paths(source, root / "assets", root / "work")
            self.assertEqual(
                result,
                f"x = 7\nP={str(root / 'work/machimamo_reference_v13/package/machimamo_reference_v13.py')!r}\n"
            )
            self.assertIn("x = 7", result)

    def test_prepares_current_and_recovered_roots_without_drawing_edits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            assets = root / "assets"
            work = root / "work"
            current = assets / "machimamo_v164"
            v13 = assets / "machimamo_reference_v13" / "package"
            current.mkdir(parents=True)
            v13.mkdir(parents=True)
            (current / "render_latest.py").write_text(
                "DRAWING_CONSTANT = 42\nP='/mnt/data/machimamo_reference_v13/package/machimamo_reference_v13.py'\n",
                encoding="utf-8",
            )
            (v13 / "machimamo_reference_v13.py").write_text("V13 = True\n", encoding="utf-8")
            result = prepare_source_tree(assets, work)
            text = (result / "render_latest.py").read_text(encoding="utf-8")
            self.assertIn("DRAWING_CONSTANT = 42", text)
            self.assertIn(str(work / "machimamo_reference_v13/package/machimamo_reference_v13.py"), text)
            self.assertTrue((work / "machimamo_reference_v13/package/machimamo_reference_v13.py").is_file())


if __name__ == "__main__":
    unittest.main()
