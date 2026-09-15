import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import audit_aed_official_sources as audit


class OfficialSourceAuditTests(unittest.TestCase):
    @patch.object(audit, "inspect_sitemaps", return_value=(["https://city.example.jp/aed/list.html"], 1))
    @patch.object(audit, "fetch")
    def test_official_site_search_combines_direct_search_and_sitemap(self, fetch, _sitemaps):
        fetch.side_effect = [
            ('<a href="/aed.html">AED設置場所</a><form action="/search"><input name="q"></form>',
             "https://city.example.jp/", 200),
            ('<a href="/health/aed.csv">AED CSV</a>', "https://city.example.jp/search?q=AED", 200),
        ]
        found, methods, errors = audit.search_official_site("https://city.example.jp/")
        self.assertEqual(errors, [])
        self.assertIn("https://city.example.jp/aed.html", found)
        self.assertIn("https://city.example.jp/health/aed.csv", found)
        self.assertIn("https://city.example.jp/aed/list.html", found)
        self.assertEqual(methods, ["official_home_links", "official_site_search", "official_sitemap"])

    def test_external_host_is_not_accepted_as_official_result(self):
        html = '<a href="https://evil.example/aed.csv">AED</a>'
        self.assertEqual(audit.extract_aed_links(html, "https://city.example.jp/", "https://city.example.jp/"), [])


if __name__ == "__main__":
    unittest.main()
