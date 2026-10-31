"""Offline unit tests; never open the actual official page in normal CI."""
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mail_form_dom_probe import clean_control_text, safe_control_name, PUBLIC_URL

class MailFormProbeTests(unittest.TestCase):
    def test_host_strictly_official_public_landing(self):
        self.assertEqual(PUBLIC_URL, 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/')
    def test_newline_and_control_codes_hidden(self):
        self.assertEqual(clean_control_text(' 出力 \n 形式\r\x00'), '出力 形式')
    def test_long_option_label_bounded(self):
        self.assertEqual(len(clean_control_text('a'*1000, 80)), 80)
    def test_secret_control_names_are_redacted(self):
        for name in ['csrf_token', 'sessionId','password','apiKey','AUTH_TOKEN']:
            self.assertEqual(safe_control_name(name), '[redacted-control-name]')
    def test_non_secret_names_preserved(self):
        self.assertEqual(safe_control_name('dateFrom'), 'dateFrom')
if __name__ == '__main__': unittest.main()
