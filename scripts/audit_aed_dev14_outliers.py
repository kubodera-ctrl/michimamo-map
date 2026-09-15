"""Detect obvious coordinate outliers after source-level review and record quarantine SQL."""
import json
import statistics
from pathlib import Path

from import_aed_open_data import sql_text


ROOT = Path("data/aed_dev14")


def main():
    holds = []
    for source in json.loads((ROOT / "coordinate_sources.json").read_text()):
        rows = json.loads((ROOT / f"{source['key']}_review.json").read_text())
        median_lat = statistics.median(row["latitude"] for row in rows)
        median_lng = statistics.median(row["longitude"] for row in rows)
        for row in rows:
            if abs(row["latitude"] - median_lat) > 0.12 or abs(row["longitude"] - median_lng) > 0.15:
                holds.append({"source_key": row["source_key"], "municipality": row["municipality"], "name": row["name"], "address": row["address"], "latitude": row["latitude"], "longitude": row["longitude"], "median_latitude": median_lat, "median_longitude": median_lng, "reason": "municipality_coordinate_outlier"})
    values = ",".join("(" + sql_text(row["source_key"]) + ")" for row in holds)
    sql = f"""-- Executed once after dev14 publication; do not rerun without reconciling the baseline.
begin;
create temporary table dev14_outliers(source_key text primary key) on commit drop;
insert into dev14_outliers values {values};
do $guard$ begin
 if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45390 then raise exception 'Public baseline changed'; end if;
 if (select count(*) from public.safety_spots p join dev14_outliers o using(source_key) where p.active) <> {len(holds)} then raise exception 'Outlier target mismatch'; end if;
end $guard$;
update public.safety_spots p set active=false,quality_status='rough',updated_at=now() from dev14_outliers o where p.source_key=o.source_key;
update public.safety_spots_nationwide_stage s set active=false,quality_status='rough',review_decision='hold',review_reason='自治体公式原票の座標が自治体内の主分布から大幅に外れるため公開保留',review_next_action='公式施設座標の訂正確認後に再審査',reviewed_at=now() from dev14_outliers o where s.source_key=o.source_key;
do $guard$ begin
 if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45381 then raise exception 'Post-quarantine mismatch'; end if;
end $guard$;
commit;
"""
    (ROOT / "coordinate_outlier_holds.json").write_text(json.dumps(holds, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "quarantine_coordinate_outliers.sql").write_text(sql)
    print(len(holds), "coordinate outliers")


if __name__ == "__main__":
    main()
