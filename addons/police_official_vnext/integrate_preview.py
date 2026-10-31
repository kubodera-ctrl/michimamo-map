"""Build a *test-only* isolated preview ZIP from exact preserved MAP 142-file artifact.

No live hosting, no new endpoints, no Git actions, no DB/API/network connections.
Produces a gated script/CSS integration into the ORIGINAL MAP index; no redesign.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

EXPECTED = "57e38f00304f541c10002c7ea34f2341acc1671ba62be2b15dbdcf936bc5cb90"
PREFIX = "<!-- police-official-vnext:nonprod -->"
SUFFIX = "<!-- /police-official-vnext:nonprod -->"
INSERT_HEAD = '<link rel="stylesheet" href="official-police-layer.css?v=vnext01" />'
INSERT_BODY = '''<script src="official-police-layer.js?v=vnext02"></script>
<script src="official-police-hub.js?v=vnext02"></script>
<script>
(function mountPoliceOfficialInExistingMap() {
  // Keep existing MAP beta unaffected until verified data+admin boundary exists.
  if (window.MACHIMAMO_POLICE_OFFICIAL_VNEXT_ENABLED !== true) return;
  const start = function() {
    if (window.MachimamoPoliceOfficialController || window.MachimamoPoliceHubController) return;
    try {
      var options = {doc: document, map: map, leaflet: L, fetcher: fetch.bind(window),
        location: window.location, enabled: true, db: db};
      var mail = window.MachimamoPoliceOfficial.createController(options);
      var hub = window.MachimamoPoliceHub.mount(options);
      if (!mail || !hub) return;
      window.MachimamoPoliceOfficialController = mail;
      window.MachimamoPoliceHubController = hub;
      if (typeof window.MACHIMAMO_POLICE_OFFICIAL_SNAPSHOT_PATH === 'string') {
        mail.refresh(window.MACHIMAMO_POLICE_OFFICIAL_SNAPSHOT_PATH);
      }
      var configured = window.MACHIMAMO_POLICE_CUMULATIVE_PATHS || {};
      hub.refresh({precursor: configured.precursor, town_stats: configured.town_stats,
        national: 'official_source_registry.json'});
    } catch (err) { console.warn('Police Open DATA MAP add-on not available', err); }
  };
  if (window.MachimamoInitialLoadReady) start();
  else window.addEventListener('machimamo:initial-ready', start, {once: true});
})();
</script>'''

# The existing admin_get_dashboard MUST succeed before adding police review status.
ADMIN_ANCHOR = "document.getElementById('adminDashboardArea').style.display = 'block';"
ADMIN_ADDITION = """document.getElementById('adminDashboardArea').style.display = 'block';
        window.MachimamoPoliceHubController?.loadAdmin({
            password: password,
            rpc: (...args) => db.rpc(...args),
            isCurrent: () => request === adminDashboardRequest && authUser === currentAuthUserId
        });"""



def build(original: bytes, root: Path) -> tuple[bytes, dict]:
    if hashlib.sha256(original).hexdigest() != EXPECTED:
        raise ValueError("baseline MAP142 SHA mismatch; STOP. No fallback to unrelated artifact")
    with zipfile.ZipFile(io.BytesIO(original)) as zi:
        if zi.testzip() is not None:
            raise ValueError("baseline ZIP CRC mismatch")
        files = {n: zi.read(n) for n in zi.namelist() if not n.endswith('/')}
    if len(files) != 142 or 'index.html' not in files or 'spot-loader.js' not in files:
        raise ValueError("baseline file set mismatch")
    html = files['index.html'].decode('utf-8')
    if PREFIX in html or SUFFIX in html:
        raise ValueError("already patched baseline; use clean original")
    if html.count('</head>') != 1 or html.count('</body>') != 1:
        raise ValueError("unexpected HTML structure")
    if 'id="filterWrapper"' not in html or 'const map = L.map(' not in html or 'machimamo:initial-ready' not in html or html.count(ADMIN_ANCHOR) != 1:
        raise ValueError("integration anchors changed; STOP")
    html = html.replace('</head>', f'{PREFIX}\n{INSERT_HEAD}\n{SUFFIX}\n</head>')
    html = html.replace('</body>', f'{PREFIX}\n{INSERT_BODY}\n{SUFFIX}\n</body>')
    html = html.replace(ADMIN_ANCHOR, ADMIN_ADDITION)
    html = html.replace('fa-solid fa-shield-halved"></i> 警察情報</button>', 'fa-solid fa-shield-halved"></i> 防犯ニュース</button>')
    files['index.html'] = html.encode()
    for name in ('official-police-layer.js', 'official-police-hub.js', 'official-police-layer.css', 'official_source_registry.json'):
        if name in files:
            raise ValueError("unexpected filename collision")
        files[name] = (root / name).read_bytes()
    # The output is wrapped under test-only/ and intentionally is NOT a direct-upload root.
    # A subsequent adoption gate must explicitly repackage, verify auth and DB isolation.
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zo:
        for name in sorted(files):
            zo.writestr('test_only_not_for_upload/' + name, files[name])
    with zipfile.ZipFile(io.BytesIO(output.getvalue())) as z:
        if z.testzip() is not None: raise ValueError("output CRC error")
    manifest = {
        'status': 'TEST_ONLY_UNDEPLOYABLE', 'base_sha256': EXPECTED,
        'added': ['official-police-layer.js', 'official-police-hub.js', 'official-police-layer.css', 'official_source_registry.json'],
        'changed': ['index.html'], 'unchanged_files': 141,
        'file_count': len(files), 'preview_zip_sha256': hashlib.sha256(output.getvalue()).hexdigest(),
        'warning': 'No Hosted QA; original app points at production Supabase. DO NOT UPLOAD ZIP. Feature flag OFF.'
    }
    return output.getvalue(), manifest


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--baseline', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--manifest', type=Path, required=True)
    args = p.parse_args()
    out, manifest = build(args.baseline.read_bytes(), Path(__file__).parent)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(out)
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False))
    return 0

if __name__ == '__main__': sys.exit(main())
