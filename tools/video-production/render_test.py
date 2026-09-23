#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
VIDEO_Y = 350
VIDEO_H = 608
VIDEO_W = 1080

FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"

C = {
    "blue": "#0778E8",
    "blue2": "#004FB8",
    "navy": "#08213F",
    "yellow": "#FFD326",
    "red": "#DC1725",
    "white": "#FFFFFF",
    "light": "#F5FAFF",
    "pale": "#E8F5FF",
    "muted": "#4B647D",
    "ink": "#071C38",
}

def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size=size)

def gradient(draw, box, c1, c2, horizontal=False):
    from PIL import ImageColor
    x0, y0, x1, y1 = box
    a = ImageColor.getrgb(c1)
    b = ImageColor.getrgb(c2)
    steps = (x1 - x0) if horizontal else (y1 - y0)
    steps = max(1, int(steps))
    for i in range(steps):
        t = i / max(1, steps - 1)
        col = tuple(round(a[j] * (1 - t) + b[j] * t) for j in range(3))
        if horizontal:
            draw.line((x0 + i, y0, x0 + i, y1), fill=col)
        else:
            draw.line((x0, y0 + i, x1, y0 + i), fill=col)

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_logo(draw, x, y, scale=1.0, text=True):
    s = int(68 * scale)
    rounded_rect(draw, (x, y, x + s, y + s), int(16 * scale), "#0A86F1")
    cx = x + s // 2
    pts = [
        (cx, y + 10 * scale),
        (x + 56 * scale, y + 21 * scale),
        (x + 52 * scale, y + 47 * scale),
        (cx, y + 61 * scale),
        (x + 16 * scale, y + 47 * scale),
        (x + 12 * scale, y + 21 * scale),
    ]
    draw.polygon(pts, fill="#FFFFFF")
    pts2 = [
        (cx, y + 16 * scale),
        (x + 50 * scale, y + 25 * scale),
        (x + 46 * scale, y + 43 * scale),
        (cx, y + 54 * scale),
        (x + 22 * scale, y + 43 * scale),
        (x + 18 * scale, y + 25 * scale),
    ]
    draw.polygon(pts2, fill="#CFEAFF")
    r = 9 * scale
    draw.ellipse((cx - r, y + 27 * scale - r, cx + r, y + 27 * scale + r), fill="#FF6A21")
    draw.polygon(
        [(cx, y + 46 * scale), (cx - 8 * scale, y + 30 * scale), (cx + 8 * scale, y + 30 * scale)],
        fill="#FF6A21",
    )
    draw.ellipse((cx - 3 * scale, y + 24 * scale, cx + 3 * scale, y + 30 * scale), fill="#FFFFFF")
    if text:
        draw.text((x + s + 14 * scale, y + 6 * scale), "まちまも", font=font(int(42 * scale), True), fill=C["white"])

def fit_text(draw, text, box, max_size, min_size=20, bold=False, fill=None, line_spacing=6):
    x0, y0, x1, y1 = box
    for size in range(max_size, min_size - 1, -1):
        f = font(size, bold)
        bbox = draw.multiline_textbbox((0, 0), text, font=f, spacing=line_spacing)
        if bbox[2] - bbox[0] <= x1 - x0 and bbox[3] - bbox[1] <= y1 - y0:
            draw.multiline_text((x0, y0), text, font=f, fill=fill or C["ink"], spacing=line_spacing)
            return size
    draw.multiline_text((x0, y0), text, font=font(min_size, bold), fill=fill or C["ink"], spacing=line_spacing)
    return min_size

def wrap_by_width(draw, text, f, max_width):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for ch in para:
            test = cur + ch
            if draw.textbbox((0, 0), test, font=f)[2] <= max_width or not cur:
                cur = test
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    return "\n".join(lines)

def draw_icon(draw, kind, cx, cy):
    navy = C["navy"]
    blue = C["blue"]
    if kind == "rain":
        draw.ellipse((cx - 30, cy - 18, cx + 20, cy + 16), fill=blue)
        draw.ellipse((cx - 5, cy - 30, cx + 36, cy + 16), fill=blue)
        for dx in (-20, 0, 20):
            draw.line((cx + dx, cy + 23, cx + dx - 8, cy + 42), fill=blue, width=7)
    elif kind == "road":
        draw.rounded_rectangle((cx - 38, cy - 26, cx + 38, cy + 24), radius=10, fill=navy)
        draw.rectangle((cx - 26, cy - 42, cx + 26, cy - 12), fill=navy)
        draw.ellipse((cx - 26, cy + 12, cx - 12, cy + 28), fill=C["white"])
        draw.ellipse((cx + 12, cy + 12, cx + 26, cy + 28), fill=C["white"])
    elif kind == "info":
        draw.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), outline=blue, width=8)
        draw.text((cx - 8, cy - 26), "i", font=font(42, True), fill=blue)
    else:
        pts = [(cx, cy - 36), (cx + 32, cy - 23), (cx + 27, cy + 18), (cx, cy + 38), (cx - 27, cy + 18), (cx - 32, cy - 23)]
        draw.polygon(pts, fill=blue)
        draw.text((cx - 10, cy - 23), "!", font=font(42, True), fill=C["white"])

def draw_common_frame(spec, out_path):
    im = Image.new("RGB", (W, H), C["light"])
    d = ImageDraw.Draw(im)

    gradient(d, (0, 0, W, 112), C["blue"], C["blue2"], horizontal=True)
    draw_logo(d, 28, 22, 0.95, True)
    d.text((300, 29), "速報", font=font(44, True), fill=C["yellow"])
    d.line((410, 18, 410, 94), fill="#7FC4FF", width=2)
    d.text((438, 21), "2026.9.23 (水)", font=font(31, True), fill=C["white"])
    d.text((438, 61), "情報: 国土交通省 ｜ 映像: 気象庁/JAXA・CSU/CIRA", font=font(19), fill="#D9EDFF")
    d.text((875, 25), "まちの安心を\nもっと身近に", font=font(19, True), fill=C["white"], spacing=3, align="right")

    rounded_rect(d, (18, 122, 1062, 336), 20, C["white"], outline="#D3E9F9", width=2)
    d.text((50, 142), spec.get("headline1", "台風25号 関東で大雨被害"), font=font(59, True), fill=C["navy"])
    d.text((50, 230), spec.get("headline2", "千葉県で道路・堤防対応続く"), font=font(56, True), fill=C["red"])

    d.rectangle((0, VIDEO_Y, W, VIDEO_Y + VIDEO_H), fill="#0B1625")

    rounded_rect(d, (20, 976, 1060, 1218), 18, C["white"], outline="#D8EAF8", width=2)
    rounded_rect(d, (38, 994, 250, 1041), 20, C["pale"])
    d.text((58, 999), spec.get("section", "何が起きた？"), font=font(25, True), fill=C["blue2"])
    f = font(32)
    body = wrap_by_width(d, spec.get("summary", ""), f, 970)
    fit_text(d, body, (48, 1053, 1035, 1196), 34, 25, False, C["ink"], 10)

    rounded_rect(d, (20, 1232, 1060, 1300), 18, "#FFF4C0", outline="#FFE06B", width=2)
    draw_icon(d, "shield", 67, 1265)
    d.text((115, 1244), "注意ポイント", font=font(35, True), fill=C["navy"])
    d.text((590, 1251), "身の安全を最優先に", font=font(28, True), fill=C["blue2"])

    cards = spec.get("points", [
        ("斜面・崖に\n近づかない", "危険箇所・被災場所を避ける", "rain"),
        ("冠水道路に\n入らない", "水深不明の道に車で進入しない", "road"),
        ("公式情報を\n確認", "気象庁・自治体・道路情報を確認", "info"),
    ])
    xstarts = [20, 375, 730]
    for i, (title, sub, kind) in enumerate(cards):
        x = xstarts[i]
        rounded_rect(d, (x, 1314, x + 330, 1548), 16, C["white"], outline="#CAE4F7", width=2)
        draw_icon(d, kind, x + 55, 1373)
        d.multiline_text((x + 105, 1338), title, font=font(29, True), fill=C["navy"], spacing=4)
        sf = font(21)
        d.multiline_text((x + 24, 1450), wrap_by_width(d, sub, sf, 286), font=sf, fill=C["muted"], spacing=6)

    gradient(d, (0, 1564, W, H), "#0A91F1", "#0059C8", horizontal=True)
    rounded_rect(d, (50, 1610, 220, 1865), 30, "#F5FBFF")
    d.rectangle((67, 1642, 203, 1819), fill="#DFF0F9")
    for yy in (1685, 1740, 1790):
        d.line((75, yy, 194, yy - 18), fill="#B9DCC8", width=6)
    draw_logo(d, 94, 1680, 0.75, False)
    d.text((275, 1626), "近くで何が起きてる？", font=font(43, True), fill=C["white"])
    d.text((275, 1695), "まちまもMAPで確認", font=font(53, True), fill=C["yellow"])
    rounded_rect(d, (278, 1788, 755, 1854), 33, None, outline="#80C9FF", width=3)
    d.text((370, 1803), "詳しくはプロフィールから ›", font=font(25, True), fill=C["white"])
    d.text((810, 1655), "知ることで\n守れるまちがある", font=font(25, True), fill="#E8F6FF", spacing=6, align="center")

    im.save(out_path, quality=95)

def draw_video_caption(out_path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rounded_rect(d, (28, VIDEO_Y + 28, 430, VIDEO_Y + 100), 14, (5, 20, 36, 185))
    d.text((48, VIDEO_Y + 40), "台風25号 ドゥージェン", font=font(27, True), fill=C["white"])
    d.text((48, VIDEO_Y + 72), "9月22日 ひまわり9号", font=font(20), fill="#DDEEFF")
    rounded_rect(d, (700, VIDEO_Y + 28, 1050, VIDEO_Y + 72), 12, (5, 20, 36, 165))
    d.text((724, VIDEO_Y + 38), "実映像 / SNS UIなし", font=font(19, True), fill=C["white"])
    rounded_rect(d, (28, VIDEO_Y + VIDEO_H - 78, 900, VIDEO_Y + VIDEO_H - 22), 12, (5, 20, 36, 180))
    d.text((48, VIDEO_Y + VIDEO_H - 66), "映像: 気象庁/JAXA・CSU/CIRA　※表示用に再構成", font=font(19), fill=C["white"])
    im.save(out_path)

def draw_endcard(out_path):
    im = Image.new("RGB", (W, H), C["blue"])
    d = ImageDraw.Draw(im)
    gradient(d, (0, 0, W, H), "#0A91F1", "#0047B5")
    draw_logo(d, 305, 275, 1.6, True)
    d.text((210, 560), "近くで何が起きてる？", font=font(58, True), fill=C["white"])
    d.text((165, 670), "まちまもMAPで確認", font=font(72, True), fill=C["yellow"])
    rounded_rect(d, (170, 850, 910, 960), 55, None, outline="#92D5FF", width=4)
    d.text((275, 879), "詳しくはプロフィールから ›", font=font(35, True), fill=C["white"])
    d.text((302, 1080), "いいね　・　保存　・　シェア　・　フォロー", font=font(27, True), fill="#DDEEFF")
    d.text((300, 1250), "知ることで、守れるまちがある。", font=font(36, True), fill=C["white"])
    d.text((320, 1320), "日常の防災・防犯情報をもっと身近に", font=font(27), fill="#DDEEFF")
    for i, x in enumerate(range(0, W, 90)):
        hh = 80 + (i % 4) * 35
        d.rectangle((x, H - hh, x + 55, H), fill="#63B8F4")
    d.text((360, 1730), "まちの安心を もっと身近に", font=font(31, True), fill=C["white"])
    im.save(out_path, quality=95)

def run(cmd):
    print("RUN:", " ".join(map(str, cmd)), flush=True)
    subprocess.run(cmd, check=True)

def render_segment(source, frame, caption, out, duration, offset=0.0, zoom=1.0, end=False):
    if end:
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-i", str(frame),
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-t", str(duration), "-r", "30", "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "96k", "-shortest", str(out)
        ]
        run(cmd)
        return

    sw = max(1080, int(round(1080 * zoom / 2) * 2))
    sh = max(608, int(round(608 * zoom / 2) * 2))
    fc = (
        f"[1:v]setpts=PTS-STARTPTS,scale={sw}:{sh}:force_original_aspect_ratio=increase,"
        f"crop={VIDEO_W}:{VIDEO_H}[clip];"
        f"[0:v][clip]overlay=0:{VIDEO_Y}:shortest=1[base];"
        f"[base][2:v]overlay=0:0:shortest=1[outv]"
    )
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", "30", "-i", str(frame),
        "-stream_loop", "-1", "-ss", str(offset), "-i", str(source),
        "-loop", "1", "-framerate", "30", "-i", str(caption),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex", fc, "-map", "[outv]", "-map", "3:a",
        "-t", str(duration), "-r", "30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-shortest", str(out)
    ]
    run(cmd)

def concat_segments(paths, out_path):
    listp = Path(out_path).with_suffix(".txt")
    listp.write_text("".join(f"file '{Path(p).resolve()}'\n" for p in paths), encoding="utf-8")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listp), "-c", "copy", str(out_path)])

def make_preview(video, times, out_path):
    tmp = Path(out_path).parent / "preview_frames"
    tmp.mkdir(exist_ok=True)
    imgs = []
    for i, t in enumerate(times):
        p = tmp / f"f{i}.jpg"
        run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1", "-vf", "scale=360:-2", str(p)])
        imgs.append(Image.open(p).convert("RGB"))
    w = max(im.width for im in imgs)
    h = max(im.height for im in imgs)
    sheet = Image.new("RGB", (w * len(imgs), h), (255, 255, 255))
    for i, im in enumerate(imgs):
        sheet.paste(im, (i * w, 0))
    sheet.save(out_path, quality=90)

def duration_of(path):
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True
    )
    return float(p.stdout.strip())

SHORT = [
    {"duration": 7, "offset": 0, "zoom": 1.0, "section": "速報",
     "summary": "気象衛星が捉えた台風25号。9月22日、関東では大雨による道路・河川への影響が相次ぎました。"},
    {"duration": 13, "offset": 2.0, "zoom": 1.14, "section": "何が起きた？",
     "summary": "国土交通省は9月23日9時時点で被害状況の第7報を公表。千葉県では国道127号の土砂災害対応や交通マネジメントが続いています。"},
    {"duration": 11, "offset": 4.0, "zoom": 1.26, "section": "注意ポイント",
     "summary": "冠水道路や斜面・崖には近づかず、通行止め・河川・気象情報を公式発表で確認してください。状況は更新される場合があります。"},
    {"duration": 5, "end": True},
]

LONG = [
    {"duration": 10, "offset": 0, "zoom": 1.0, "section": "1｜概要",
     "summary": "台風25号の影響で関東では大雨被害が発生。9月23日も国や自治体による道路・河川の復旧対応が続いています。"},
    {"duration": 12, "offset": 1.7, "zoom": 1.10, "section": "2｜道路への影響",
     "summary": "千葉県では国道127号などで土砂災害・通行止め対応が行われ、23日には一部区間で通行止め解除の発表も出ています。"},
    {"duration": 12, "offset": 3.4, "zoom": 1.22, "section": "3｜復旧支援",
     "summary": "関東地方整備局はTEC-FORCEを千葉県へ派遣。印旛沼周辺の堤防では緊急復旧への技術的な支援が進められています。"},
    {"duration": 12, "offset": 5.1, "zoom": 1.30, "section": "4｜安全行動",
     "summary": "冠水した道路には車で進入しない。斜面や崖、増水した河川には近づかない。移動前に道路情報を確認してください。"},
    {"duration": 12, "offset": 6.7, "zoom": 1.16, "section": "5｜最新情報",
     "summary": "被害状況や規制は短時間で変わります。気象庁・国土交通省・自治体の公式情報を確認し、安全を優先して行動してください。"},
    {"duration": 10, "end": True},
]

def render_variant(name, specs, source, outdir):
    segments = []
    caption = outdir / "video_caption.png"
    draw_video_caption(caption)
    endcard = outdir / "endcard.png"
    draw_endcard(endcard)

    for i, spec in enumerate(specs):
        seg = outdir / f"{name}_seg{i:02d}.mp4"
        if spec.get("end"):
            render_segment(source, endcard, caption, seg, spec["duration"], end=True)
        else:
            frame = outdir / f"{name}_frame{i:02d}.png"
            draw_common_frame(spec, frame)
            render_segment(source, frame, caption, seg, spec["duration"], spec.get("offset", 0), spec.get("zoom", 1.0))
        segments.append(seg)

    final = outdir / f"machimamo_{name}_v1.mp4"
    concat_segments(segments, final)
    return final

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    source = Path(args.source)

    short = render_variant("short", SHORT, source, out)
    long = render_variant("long", LONG, source, out)

    make_preview(short, [2, 12, 26, 33], out / "preview_short.jpg")
    make_preview(long, [3, 16, 30, 47, 58, 64], out / "preview_long.jpg")

    meta = {
        "short": {"file": short.name, "duration": duration_of(short)},
        "long": {"file": long.name, "duration": duration_of(long)},
        "source": "Typhoon Dujuan / Himawari-9 / JMA-JAXA-CSU-CIRA",
        "render": "1080x1920 H.264 / 30fps / silent AAC compatibility track",
    }
    (out / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
