#!/usr/bin/env python3
"""Strictly reprocess the 939 formal AED holds recorded in Supabase.

The script is review-only: it reads the exported hold snapshot and current
Digital Agency Address Base Registry (ABR) parcel-detail files, then emits
candidate and remaining-hold artifacts. It never writes to Supabase.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from reprocess_aed_dev20_local_holds import (
    build_parcel_index,
    choose_match,
    compact_address,
    sql_text,
    with_check_digit,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
DUPLICATE_SOURCE_KEYS = {
    # Same address, no installation distinction, and only a corporate-prefix
    # difference from the retained official row.
    "bodik-reviewed:badb813d950c9765:38b37e1c5227266244bb76df",
}


def load_ledger() -> list[dict]:
    return json.loads((ROOT / "data/aed_municipality_audit/ledger.json").read_text(encoding="utf-8"))


def strip_county(value: str) -> str:
    return re.sub(r"^.*?郡", "", value)


def resolve_target(row: dict, ledger: list[dict]) -> dict | None:
    prefecture = row["prefecture"]
    municipality = row["municipality"]
    address = str(row.get("address") or "")
    same_pref = [item for item in ledger if item["prefecture"] == prefecture]

    # Designated-city source rows often store only the city while the official
    # address contains a ward. ABR detail files are keyed by ward code, so the
    # longest municipality name explicitly present in the address wins.
    explicit = [item for item in same_pref if item["municipality"] in address]
    if explicit:
        return max(explicit, key=lambda item: len(item["municipality"]))

    exact = [
        item
        for item in same_pref
        if item["municipality"] == municipality
        or item["municipality"] == strip_county(municipality)
    ]
    return exact[0] if len(exact) == 1 else None


def target_for_row(row: dict, ledger: list[dict]) -> dict | None:
    item = resolve_target(row, ledger)
    if not item:
        return None
    return {
        "code": item["code"],
        "full_code": item["local_government_code"],
        "prefecture": row["prefecture"],
        "municipality": item["municipality"],
        "source_municipality": row["municipality"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--abr-dir", type=Path, required=True)
    parser.add_argument("--list-downloads", action="store_true")
    args = parser.parse_args()

    rows = json.loads((OUT / "formal_holds.json").read_text(encoding="utf-8"))
    ledger = load_ledger()
    targets_by_row = {row["id"]: target_for_row(row, ledger) for row in rows}
    unique_targets = {
        target["code"]: target for target in targets_by_row.values() if target is not None
    }
    if args.list_downloads:
        for code in sorted(unique_targets):
            full = with_check_digit(code)
            print(f"https://data.address-br.digital.go.jp/mt_parcel/city/mt_parcel_city{full}.csv.zip")
            print(f"https://data.address-br.digital.go.jp/mt_parcel_pos/city/mt_parcel_pos_city{full}.csv.zip")
        return

    parcel_indexes = {}
    parcel_sources = {}
    for code, target in sorted(unique_targets.items()):
        index, evidence = build_parcel_index(args.abr_dir, code, target)
        parcel_indexes[code] = index
        if evidence:
            parcel_sources[code] = evidence

    accepted = []
    held = []
    reasons: Counter[str] = Counter()
    by_source_municipality: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        target = targets_by_row[row["id"]]
        address = str(row.get("address") or "").strip()
        name = str(row.get("name") or "").strip()
        if not name or not address:
            reason = "missing_name_or_address"
        elif not re.search(r"[0-9０-９]", address):
            reason = "address_without_number"
        elif target is None:
            reason = "municipality_code_unresolved"
        elif target["code"] not in parcel_sources:
            reason = "abr_parcel_detail_unavailable"
        else:
            query = compact_address(address, row["prefecture"], target["municipality"])
            match = choose_match(query, parcel_indexes.get(target["code"], {}))
            if match:
                matched_key, (latitude, longitude) = match
                accepted.append(
                    {
                        **row,
                        "abr_code": target["code"],
                        "full_lg_code": target["full_code"],
                        "abr_municipality": target["municipality"],
                        "normalized_query": query,
                        "abr_matched_key": matched_key,
                        "previous_latitude": row.get("latitude"),
                        "previous_longitude": row.get("longitude"),
                        "latitude": latitude,
                        "longitude": longitude,
                        "geocode_source": "デジタル庁アドレス・ベース・レジストリ地番詳細座標",
                        "abr_match_method": "parcel_detail",
                        "quality_rank": "B",
                        "dev20_reason": "accepted_parcel_detail_pending_duplicate_review",
                    }
                )
                reason = "accepted_parcel_detail_pending_duplicate_review"
            else:
                reason = "no_unambiguous_abr_parcel_detail_match"
        if reason != "accepted_parcel_detail_pending_duplicate_review":
            held.append({**row, "dev20_reason": reason})
        reasons[reason] += 1
        key = f"{row['prefecture']}_{row['municipality']}"
        by_source_municipality[key][reason] += 1

    (OUT / "formal_holds_abr_candidates.json").write_text(
        json.dumps(accepted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "formal_holds_remaining_after_abr.json").write_text(
        json.dumps(held, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    values = []
    for row in accepted:
        values.append(
            "(" + ",".join(
                [
                    sql_text(row["source_key"]),
                    sql_text(row["name"]),
                    sql_text(row["prefecture"]),
                    sql_text(row["municipality"]),
                    sql_text(row["address"]),
                    sql_text(row.get("installation_location")),
                    str(row["latitude"]),
                    str(row["longitude"]),
                    sql_text(row.get("review_reason")),
                ]
            ) + ")"
        )
    check_sql = """with candidates(source_key,name,prefecture,municipality,address,installation_location,latitude,longitude,prior_review_reason) as (values
""" + ",\n".join(values) + """
), normalized as (
 select c.*,
  regexp_replace(lower(c.name),'[[:space:]　・･\\-ー（）()]','','g') normalized_name,
  regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g') normalized_address,
  regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g') normalized_installation
 from candidates c
)
select n.*,
 count(p.*) filter(where p.source_key<>n.source_key and
  regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name and
  regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=n.normalized_address) exact_name_address_other,
 count(p.*) filter(where p.source_key<>n.source_key and
  regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name and
  regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=n.normalized_installation) exact_name_installation_other,
 count(p.*) filter(where p.source_key<>n.source_key and
  abs(p.latitude-n.latitude)<=0.00015 and abs(p.longitude-n.longitude)<=0.00015) within_about_20m_other
from normalized n
left join public.safety_spots p on p.facility_type='aed' and p.active
 and p.prefecture=n.prefecture and p.municipality=n.municipality
 and (abs(p.latitude-n.latitude)<=0.0003 and abs(p.longitude-n.longitude)<=0.0003
  or regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=n.normalized_address
  or regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name)
group by n.source_key,n.name,n.prefecture,n.municipality,n.address,n.installation_location,
 n.latitude,n.longitude,n.prior_review_reason,n.normalized_name,n.normalized_address,n.normalized_installation
order by n.prefecture,n.municipality,n.name;
"""
    (OUT / "formal_holds_candidate_check.sql").write_text(check_sql, encoding="utf-8")

    publishable = [row for row in accepted if row["source_key"] not in DUPLICATE_SOURCE_KEYS]
    duplicates = [row for row in accepted if row["source_key"] in DUPLICATE_SOURCE_KEYS]
    (OUT / "formal_holds_publishable.json").write_text(
        json.dumps(publishable, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "formal_holds_duplicates.json").write_text(
        json.dumps(duplicates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    publish_values = ",\n".join(
        "(" + ",".join(
            [sql_text(row["source_key"]), str(row["latitude"]), str(row["longitude"]),
             sql_text(row["geocode_source"]), sql_text(row["abr_matched_key"])]
        ) + ")"
        for row in publishable
    )
    duplicate_values = ",".join(f"({sql_text(row['source_key'])})" for row in duplicates)
    publish_sql = f"""begin;
create temp table dev20_formal_publish(source_key text primary key,latitude double precision,
 longitude double precision,geocode_source text,geocoded_title text) on commit drop;
insert into dev20_formal_publish values
{publish_values};
do $$ begin
 if (select count(*) from dev20_formal_publish) <> 87 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_formal_publish where latitude not between 20 and 46 or longitude not between 122 and 154)
 then raise exception 'invalid coordinates'; end if;
end $$;
update public.safety_spots_nationwide_stage s set
 latitude=c.latitude,longitude=c.longitude,geocode_source=c.geocode_source,geocoded_title=c.geocoded_title,
 quality_status='verified',review_decision='published',
 review_reason='開発20: デジタル庁ABR地番詳細座標で番地まで厳格一致。既存公開データとの同一設置場所重複なし',
 review_next_action='自治体原票またはABR更新時に差分確認',reviewed_at=now()
from dev20_formal_publish c where s.source_key=c.source_key;
insert into public.safety_spots(
 source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,
 source_name,source_url,source_date,source_license,geocode_source,geocoded_title,active,
 source_external_id,prefecture_code,installation_location,availability,source_updated_at,
 imported_at,duplicate_candidate,duplicate_group_key,quality_status)
select s.source_key,s.facility_type,s.name,s.prefecture,s.municipality,s.address,s.phone,s.parent_name,
 s.latitude,s.longitude,s.source_name,s.source_url,s.source_date,s.source_license,s.geocode_source,
 s.geocoded_title,true,s.source_external_id,s.prefecture_code,s.installation_location,s.availability,
 s.source_updated_at,now(),false,null,'verified'
from public.safety_spots_nationwide_stage s join dev20_formal_publish c using(source_key)
on conflict(source_key) do update set
 name=excluded.name,address=excluded.address,phone=excluded.phone,parent_name=excluded.parent_name,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_date=excluded.source_date,source_license=excluded.source_license,
 geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,active=true,
 source_external_id=excluded.source_external_id,prefecture_code=excluded.prefecture_code,
 installation_location=excluded.installation_location,availability=excluded.availability,
 source_updated_at=excluded.source_updated_at,duplicate_candidate=false,duplicate_group_key=null,
 quality_status='verified',updated_at=now();
create temp table dev20_formal_duplicate(source_key text primary key) on commit drop;
insert into dev20_formal_duplicate values {duplicate_values};
update public.safety_spots_nationwide_stage s set review_decision='duplicate',duplicate_candidate=true,
 quality_status='review',review_reason='開発20: 同一住所・設置位置なしで施設名が法人接頭辞のみ異なる同一AED候補',
 review_next_action='元データ更新で設置位置の区別が追加された場合のみ再審査',reviewed_at=now()
from dev20_formal_duplicate d where s.source_key=d.source_key;
do $$ begin
 if (select count(*) from public.safety_spots p join dev20_formal_publish c using(source_key)
     where p.active and p.facility_type='aed') <> 87 then raise exception 'post-insert verification failed'; end if;
end $$;
commit;
"""
    (OUT / "publish_formal_holds_abr_recovery.sql").write_text(publish_sql, encoding="utf-8")

    summary = {
        "processed": len(rows),
        "abr_candidates_before_duplicate_review": len(accepted),
        "publishable_after_duplicate_review": len(publishable),
        "duplicates_after_review": len(duplicates),
        "remaining_before_duplicate_review": len(held),
        "reason_counts": dict(reasons),
        "source_municipalities": len({(row["prefecture"], row["municipality"]) for row in rows}),
        "abr_target_municipalities_or_wards": len(unique_targets),
        "abr_targets_with_parcel_detail": len(parcel_sources),
        "municipality_results": {key: dict(value) for key, value in sorted(by_source_municipality.items())},
        "policy": "current ABR parcel-detail coordinate; exact resolved municipality/ward code; numbered address; unique coordinate; no town/block fallback; database duplicate review still required",
        "abr_parcel_sources": parcel_sources,
    }
    (OUT / "formal_holds_abr_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({key: value for key, value in summary.items() if key != "abr_parcel_sources"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
