#!/usr/bin/env python3
"""Strict ABR parcel-detail review of four priority Tokyo address sources."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path

from prepare_aed_dev20_priority_coordinates import availability, normalize_space, row_key, sql_literal
from reprocess_aed_dev20_local_holds import build_parcel_index, choose_match, compact_address


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
RAW = OUT / "raw"
SPECS = {
    "akishima": {"code": "13207", "municipality": "昭島市", "raw": "akishima.xlsx", "converted": "akishima.csv", "header": 0, "name": "設置施設", "address": "施設住所", "phone": "施設電話\u00a0", "installation": None, "count": 55, "source_name": "昭島市 AED設置箇所一覧", "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132071d0000000003", "resource_url": "https://www.opendata.metro.tokyo.lg.jp/akishima/AED.xlsx", "updated": "2025-12-12T09:04:14.351596+00:00"},
    "akiruno": {"code": "13228", "municipality": "あきる野市", "raw": "akiruno.csv", "converted": "akiruno.csv", "header": 0, "name": "名称", "address": "所在地_連結表記", "phone": "電話番号", "installation": "設置位置", "count": 172, "source_name": "あきる野市 AED設置箇所一覧", "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132284d3100000009", "resource_url": "https://www.city.akiruno.tokyo.jp/cmsfiles/contents/0000015/15465/132284_aed.csv", "updated": "2025-12-12T10:00:54.518391+00:00"},
    "chofu": {"code": "13208", "municipality": "調布市", "raw": "chofu.csv", "converted": "chofu.csv", "header": 1, "name": "施設名", "address": "所在地", "phone": "電話番号", "installation": "AED配置場所", "count": 13, "source_name": "調布市 市民スポーツ施設及び施設内AED配置場所一覧", "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132080d3100000417", "resource_url": "https://www.city.chofu.lg.jp/documents/4691/1.csv", "updated": "2026-05-13T15:18:09.114511+00:00"},
    "kiyose": {"code": "13221", "municipality": "清瀬市", "raw": "kiyose.csv", "converted": "kiyose.csv", "header": 0, "name": "名称", "address": "住所", "phone": "電話番号", "installation": "設置位置", "count": 50, "source_name": "清瀬市 AED設置個所一覧", "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132217d0000000010", "resource_url": "https://www.city.kiyose.lg.jp/_res/projects/default_project/_page_/001/001/605/20260901_aed.csv", "updated": "2026-06-09T06:36:59.991464+00:00"},
}


def read_rows(path: Path, header: int) -> list[dict]:
    data = path.read_bytes()
    for encoding in ("utf-8-sig", "cp932"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            pass
    raw = list(csv.reader(text.splitlines()))
    headers = raw[header]
    return [dict(zip(headers, row)) for row in raw[header + 1:] if any(row)]


def build_sql(rows: list[dict]) -> str:
    return f"""begin;
create temp table dev20_tokyo_address_aed on commit drop as select * from jsonb_to_recordset({sql_literal(rows)}) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,phone text,
 latitude double precision,longitude double precision,source_name text,source_url text,source_license text,
 source_updated_at timestamptz,prefecture_code text,installation_location text,availability text,
 geocode_source text,geocoded_title text);
do $$ begin
 if (select count(*) from dev20_tokyo_address_aed)<>52 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_tokyo_address_aed where name='' or address='' or source_license<>'CC BY 4.0'
  or latitude not between 35.6 and 35.85 or longitude not between 139.15 and 139.5)
 then raise exception 'required-field, license, or coordinate validation failed'; end if;
 if exists(select 1 from dev20_tokyo_address_aed c join public.safety_spots p on p.facility_type='aed' and p.active
  and p.prefecture=c.prefecture and p.municipality=c.municipality
  and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
  and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g')
  and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,
 phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,
 source_external_id,installation_location,availability,geocode_source,geocoded_title,quality_status,active,
 duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,
 source_license,source_updated_at,prefecture_code,source_external_id,installation_location,availability,
 geocode_source,geocoded_title,'verified',false,false,'published',
 '開発20: 自治体公式CC BY住所をデジタル庁ABR地番詳細座標で番地まで厳格一致',
 '自治体原票またはABR更新時に差分確認',now() from dev20_tokyo_address_aed
on conflict(source_key) do update set review_decision='published',quality_status='verified',
 review_reason=excluded.review_reason,review_next_action=excluded.review_next_action,reviewed_at=now();
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,
 longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,geocoded_title,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,
 source_license,source_updated_at,prefecture_code,source_external_id,installation_location,availability,
 geocode_source,geocoded_title,'verified',true,false from dev20_tokyo_address_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,phone=excluded.phone,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 source_external_id=excluded.source_external_id,installation_location=excluded.installation_location,
 availability=excluded.availability,geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,
 quality_status='verified',active=true,duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_tokyo_address_aed c using(source_key)
 where p.active and p.facility_type='aed')<>52 then raise exception 'post-insert validation failed'; end if; end $$;
commit;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--converted-dir", type=Path, required=True)
    parser.add_argument("--abr-dir", type=Path, required=True)
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    accepted, held, evidence = [], [], []
    for key, spec in SPECS.items():
        raw_path = args.input_dir / spec["raw"]
        shutil.copyfile(raw_path, RAW / f"{key}_official{raw_path.suffix}")
        source_rows = read_rows(args.converted_dir / spec["converted"], spec["header"])
        assert len(source_rows) == spec["count"]
        index, abr_evidence = build_parcel_index(args.abr_dir, spec["code"], {"prefecture": "東京都", "municipality": spec["municipality"]})
        for number, row in enumerate(source_rows, spec["header"] + 2):
            name = normalize_space(row.get(spec["name"]))
            address = normalize_space(row.get(spec["address"]))
            if address and not address.startswith("東京都"):
                address = "東京都" + spec["municipality"] + address
            install = normalize_space(row.get(spec["installation"])) if spec["installation"] else ""
            query = compact_address(address, "東京都", spec["municipality"])
            match = choose_match(query, index)
            if not match:
                held.append({"dataset": key, "source_row": number, "name": name, "address": address,
                    "reason": "abr_parcel_unavailable" if not abr_evidence else "no_unambiguous_abr_parcel_detail_match"})
                continue
            matched_key, (latitude, longitude) = match
            external_id = normalize_space(row.get("ID") or row.get("NO")) or str(number)
            accepted.append({
                "source_key": row_key(key, external_id, name, address, install), "source_external_id": external_id,
                "name": name, "prefecture": "東京都", "municipality": spec["municipality"], "address": address,
                "phone": normalize_space(row.get(spec["phone"])) or None, "latitude": latitude, "longitude": longitude,
                "source_name": spec["source_name"], "source_url": spec["source_url"], "source_license": "CC BY 4.0",
                "source_updated_at": spec["updated"], "prefecture_code": "13", "installation_location": install or None,
                "availability": availability(row), "geocode_source": "デジタル庁アドレス・ベース・レジストリ地番詳細座標",
                "geocoded_title": matched_key,
            })
        evidence.append({"municipality": spec["municipality"], "raw_rows": len(source_rows),
            "accepted": sum(row["municipality"] == spec["municipality"] for row in accepted),
            "catalog_url": spec["source_url"], "resource_url": spec["resource_url"], "license": "CC BY 4.0",
            "source_sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest(), "abr_available": bool(abr_evidence),
            "abr": abr_evidence})
    assert len(accepted) == 52 and len(held) == 238
    (OUT / "tokyo_address_candidates.json").write_text(json.dumps(accepted, ensure_ascii=False, indent=2) + "\n")
    (OUT / "tokyo_address_holds.json").write_text(json.dumps(held, ensure_ascii=False, indent=2) + "\n")
    (OUT / "publish_tokyo_address_recovery.sql").write_text(build_sql(accepted))
    summary = {"processed": 290, "publishable": 52, "held": 238,
        "published_by_municipality": {m: sum(r["municipality"] == m for r in accepted) for m in ("昭島市", "あきる野市", "調布市", "清瀬市")},
        "quality_rank": "B", "policy": "official CC BY address plus unique current ABR parcel-detail coordinate; no town/block fallback", "sources": evidence}
    (OUT / "tokyo_address_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
