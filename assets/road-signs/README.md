# Road-sign quiz assets

The quiz does not synthesize road signs. Its base sign and supplementary-sign
tiles are cropped from the Ministry of Land, Infrastructure, Transport and
Tourism Road Bureau's official **Road Signs List**:

- https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf
- chart edition checked: July 2026 (downloaded 17 September 2026)

Run `python3 scripts/extract_official_sign_assets.py` to reproduce the PNG
tiles from the current official PDF. Mirrored variants allowed by the chart are
rendered with a horizontal transform rather than redrawn.

The bicycle navigation mark and navigation line GIFs are the shape examples
published by the Tokyo Metropolitan Police Department:

- https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/bicycle/menu/navimark.html

Those two items are non-statutory guidance markings, not statutory road signs.
The quiz wording and explanation must keep that distinction.
