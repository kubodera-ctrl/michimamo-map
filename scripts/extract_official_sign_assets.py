#!/usr/bin/env python3
"""Extract quiz sign tiles from MLIT's official road-sign chart.

Source (Road Bureau, Ministry of Land, Infrastructure, Transport and Tourism):
https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf

The source chart is A3. Coordinates below are PDF points and deliberately crop
only the official pictogram, not the chart caption.
"""

from pathlib import Path
import fitz
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "road-signs" / "official"
SOURCE_URL = "https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf"

# sign key: (centre x, centre y, crop width, crop height), in PDF points.
TILES = {
    "warning-crossroads": (59, 494, 42, 42),
    "warning-t-junction": (147, 494, 42, 42),
    "warning-y-junction": (191, 494, 42, 42),
    "warning-roundabout": (235, 494, 42, 42),
    "warning-right-curve": (59, 552, 42, 42),
    "warning-right-turn": (103, 552, 42, 42),
    "warning-right-reverse-turn": (191, 552, 42, 42),
    "warning-right-winding": (235, 552, 42, 42),
    "warning-railway-locomotive": (59, 610, 42, 42),
    "warning-railway-tram": (103, 610, 42, 42),
    "warning-school": (147, 610, 42, 42),
    "warning-signal": (191, 610, 42, 42),
    "warning-slippery": (235, 610, 42, 42),
    "warning-rockfall": (59, 668, 42, 42),
    "warning-uneven": (103, 668, 42, 42),
    "warning-merge": (147, 668, 42, 42),
    "warning-lanes-reduced": (191, 668, 42, 42),
    "warning-width-reduced": (235, 668, 42, 42),
    "warning-two-way": (59, 726, 42, 42),
    "warning-down-grade": (103, 726, 42, 42),
    "warning-up-grade": (147, 726, 42, 42),
    "warning-roadworks": (191, 726, 42, 42),
    "warning-crosswind": (235, 726, 42, 42),
    "warning-animal": (59, 784, 42, 42),
    "warning-other-danger": (103, 784, 42, 42),
}

# The regulation and indication sections use a regular grid on the official
# chart. Only cells referenced by the quiz are exported.
REG_CELLS = {
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9),
    (2, 1), (2, 2), (2, 3), (2, 7), (2, 8), (2, 9), (2, 10), (2, 11),
    (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 9), (3, 10),
    (4, 4), (4, 8), (4, 9), (4, 11), (4, 12),
    (5, 1), (5, 2), (5, 9),
    (6, 1), (6, 2), (6, 4),
}
for row, col in REG_CELLS:
    TILES[f"reg-r{row}c{col}"] = (284.5 + 49 * (col - 1), (436 + 58 * row), 44, 44)

IND_CELLS = {(1, 1), (1, 2), (1, 3), (2, 1), (2, 2), (2, 3), (3, 1), (3, 2), (4, 1), (4, 2), (4, 3), (5, 1)}
for row, col in IND_CELLS:
    TILES[f"ind-r{row}c{col}"] = (869.5 + 49 * (col - 1), (436 + 58 * row), 46, 46)

# Official supplementary signs used by composite quiz questions.
TILES.update({
    "supp-time-8-20": (1091, 495, 40, 16),
    "supp-except-sun-holidays": (1091, 477, 42, 14),
    "supp-except-bicycles": (870, 728, 27, 6),
    "supp-start": (1091, 594, 39, 16),
    "supp-end": (1004, 680, 39, 16),
    "supp-zone": (1004, 651, 39, 15),
    "supp-no-passing": (1004, 708, 39, 14),
})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old_tile in OUT.glob('*.png'):
        old_tile.unlink()
    with urllib.request.urlopen(SOURCE_URL) as response:
        pdf_bytes = response.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    matrix = fitz.Matrix(4, 4)
    for key, (cx, cy, width, height) in TILES.items():
        rect = fitz.Rect(cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2)
        pix = page.get_pixmap(matrix=matrix, clip=rect, alpha=True)
        pix.save(OUT / f"{key}.png")


if __name__ == "__main__":
    main()
