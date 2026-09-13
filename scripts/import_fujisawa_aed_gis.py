#!/usr/bin/env python3
"""Create an AED seed from Fujisawa City's official ALANDIS+ GIS.

Only the three layers maintained by Fujisawa City are imported. The two map
layers sourced from the Japan Foundation for Emergency Medicine are excluded.
"""
from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import json
import math
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def norm(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip()


def sql_text(value: str | None) -> str:
    return "null" if not value else "'" + value.replace("'", "''") + "'"


def full_address(prefecture: str, municipality: str, address: str) -> str:
    if address.startswith(prefecture):
        return address
    if address.startswith(municipality):
        return prefecture + address
    return prefecture + municipality + address


def inverse_jgd2011_zone9(x: float, y: float) -> tuple[float, float]:
    """Convert EPSG:6677 (JGD2011 / Japan Plane Rectangular IX) to lon/lat.

    Uses the standard inverse Transverse Mercator series with the GRS80
    ellipsoid. The result is returned as WGS84-compatible longitude/latitude.
    """
    semi_major = 6_378_137.0
    flattening = 1 / 298.257222101
    eccentricity_sq = flattening * (2 - flattening)
    second_eccentricity_sq = eccentricity_sq / (1 - eccentricity_sq)
    scale = 0.9999
    lat_origin = math.radians(36.0)
    lon_origin = math.radians(139 + 50 / 60)

    def meridional_arc(latitude: float) -> float:
        e4 = eccentricity_sq**2
        e6 = eccentricity_sq**3
        return semi_major * (
            (1 - eccentricity_sq / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latitude
            - (3 * eccentricity_sq / 8 + 3 * e4 / 32 + 45 * e6 / 1024)
            * math.sin(2 * latitude)
            + (15 * e4 / 256 + 45 * e6 / 1024) * math.sin(4 * latitude)
            - (35 * e6 / 3072) * math.sin(6 * latitude)
        )

    arc = meridional_arc(lat_origin) + y / scale
    e1 = (1 - math.sqrt(1 - eccentricity_sq)) / (
        1 + math.sqrt(1 - eccentricity_sq)
    )
    mu = arc / (
        semi_major
        * (
            1
            - eccentricity_sq / 4
            - 3 * eccentricity_sq**2 / 64
            - 5 * eccentricity_sq**3 / 256
        )
    )
    footpoint = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    sin_fp = math.sin(footpoint)
    cos_fp = math.cos(footpoint)
    tan_fp = math.tan(footpoint)
    radius_prime = semi_major / math.sqrt(1 - eccentricity_sq * sin_fp**2)
    radius_meridian = (
        semi_major
        * (1 - eccentricity_sq)
        / (1 - eccentricity_sq * sin_fp**2) ** 1.5
    )
    tangent_sq = tan_fp**2
    c_value = second_eccentricity_sq * cos_fp**2
    d_value = x / (radius_prime * scale)

    latitude = footpoint - (radius_prime * tan_fp / radius_meridian) * (
        d_value**2 / 2
        - (5 + 3 * tangent_sq + 10 * c_value - 4 * c_value**2 - 9 * second_eccentricity_sq)
        * d_value**4
        / 24
        + (
            61
            + 90 * tangent_sq
            + 298 * c_value
            + 45 * tangent_sq**2
            - 252 * second_eccentricity_sq
            - 3 * c_value**2
        )
        * d_value**6
        / 720
    )
    longitude = lon_origin + (
        d_value
        - (1 + 2 * tangent_sq + c_value) * d_value**3 / 6
        + (
            5
            - 2 * c_value
            + 28 * tangent_sq
            - 3 * c_value**2
            + 8 * second_eccentricity_sq
            + 24 * tangent_sq**2
        )
        * d_value**5
        / 120
    ) / cos_fp
    return math.degrees(longitude), math.degrees(latitude)


class AlandisClient:
    def __init__(self, source: dict[str, Any]) -> None:
        self.source = source
        jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(jar)
        )
        self.headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "machimamo-map-fujisawa-aed-import/1.0",
            "X-Requested-With": "XMLHttpRequest",
        }
        html = self.opener.open(source["map_url"], timeout=60).read().decode("utf-8-sig")
        token_match = re.search(r'name="csrf_token" value="([^"]+)', html)
        params_match = re.search(
            r'id="cmn_url_params"[^>]*>(.*?)</div>', html, flags=re.DOTALL
        )
        if not token_match or not params_match:
            raise ValueError("Could not initialize the Fujisawa GIS session")
        self.token = token_match.group(1)
        params = json.loads(params_match.group(1))
        basis = self._post(
            "/common/Basis_responder",
            {"urlParams": json.dumps(params, separators=(",", ":"))},
        )
        actual_layers = {
            int(item["mapservice_layer_id"]): item["display_name"]
            for item in basis["results"]["legend"]["legend_item_list"]
        }
        for layer in source["layers"]:
            if actual_layers.get(layer["mapservice_layer_id"]) != layer["display_name"]:
                raise ValueError(
                    "Official GIS layer configuration changed: "
                    f"{layer['mapservice_layer_id']} {actual_layers.get(layer['mapservice_layer_id'])!r}"
                )

    def _post(self, endpoint: str, data: dict[str, Any] | list[tuple[str, str]]) -> dict[str, Any]:
        base_pairs = [
            ("csrf_token", self.token),
            ("loginid", "guest_iryou"),
            ("application", "jsWebGIS"),
        ]
        pairs = base_pairs + (list(data.items()) if isinstance(data, dict) else data)
        url = self.source["api_base_url"] + endpoint
        request = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(pairs).encode(),
            headers=self.headers,
        )
        with self.opener.open(request, timeout=90) as response:
            result = json.loads(response.read())
        if result.get("status") != 0:
            raise ValueError(f"Fujisawa GIS returned an error: {result!r}")
        return result

    def query(
        self, layer: dict[str, Any], bbox: tuple[float, float, float, float], page: int
    ) -> dict[str, Any]:
        xmin, ymin, xmax, ymax = bbox
        ring = [
            [xmin, ymin],
            [xmax, ymin],
            [xmax, ymax],
            [xmin, ymax],
            [xmin, ymin],
        ]
        prefix = "key_list[0]"
        pairs = [
            ("formID", "srh_area_search_form"),
            ("page_index", str(page)),
            (prefix + "[mapservice_layer_id]", str(layer["mapservice_layer_id"])),
            (prefix + "[legend_item_id]", str(layer["legend_item_id"])),
            (prefix + "[type]", "polygon"),
            (prefix + "[condition]", "overlap"),
            (prefix + "[scale]", "10"),
            (prefix + "[epsg]", "6677"),
        ]
        for row_index, point in enumerate(ring):
            for value_index, value in enumerate(point):
                pairs.append(
                    (
                        f"{prefix}[area][0][{row_index}][{value_index}]",
                        str(value),
                    )
                )
        result = self._post("/core/search/Area_search_responder", pairs)["results"]
        return result.get(
            str(layer["legend_item_id"]),
            {
                "count": 0,
                "page_index": page,
                "result": [],
                "max_count_flg": False,
            },
        )

    def fetch_layer(self, layer: dict[str, Any]) -> list[dict[str, Any]]:
        records: dict[str, dict[str, Any]] = {}

        def fetch_box(bbox: tuple[float, float, float, float], depth: int = 0) -> None:
            first_page = self.query(layer, bbox, 1)
            count = int(first_page["count"])
            # The API returns max_count_flg as string values including "-1" for
            # ordinary small result sets, so the numeric count is the reliable
            # signal. Subdivide at 100 because that is the configured cap.
            if count >= 100:
                if depth >= 8:
                    raise ValueError(f"GIS search remained capped after subdivision: {bbox}")
                xmin, ymin, xmax, ymax = bbox
                if xmax - xmin >= ymax - ymin:
                    middle = (xmin + xmax) / 2
                    children = [(xmin, ymin, middle, ymax), (middle, ymin, xmax, ymax)]
                else:
                    middle = (ymin + ymax) / 2
                    children = [(xmin, ymin, xmax, middle), (xmin, middle, xmax, ymax)]
                for child in children:
                    fetch_box(child, depth + 1)
                return

            pages = [first_page]
            for page in range(2, math.ceil(count / 10) + 1):
                pages.append(self.query(layer, bbox, page))
            for page_data in pages:
                for record in page_data["result"]:
                    record_id = f"{record['basetablename']}:{record['_system_objectid']}"
                    records[record_id] = record

        xmin, ymin, xmax, ymax = (float(value) for value in layer["extent"])
        # The layer metadata extent is rounded in the manifest. Add a small
        # buffer so points exactly on the published edge are not lost.
        fetch_box((xmin - 5, ymin - 5, xmax + 5, ymax + 5))
        return list(records.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.manifest.read_text(encoding="utf-8"))["source"]
    client = AlandisClient(source)
    records: dict[tuple[str, str, str], dict[str, Any]] = {}
    layer_reports = []
    point_pattern = re.compile(r"POINT\(([-+0-9.eE]+)\s+([-+0-9.eE]+)\)")

    for layer in source["layers"]:
        rows = client.fetch_layer(layer)
        expected_layer_count = layer.get("expected_feature_count")
        if expected_layer_count is not None and len(rows) != expected_layer_count:
            raise ValueError(
                f"Expected {expected_layer_count} features in {layer['display_name']}, "
                f"got {len(rows)}"
            )
        layer_reports.append(
            {
                "legend_item_id": layer["legend_item_id"],
                "mapservice_layer_id": layer["mapservice_layer_id"],
                "display_name": layer["display_name"],
                "feature_count": len(rows),
            }
        )
        for row in rows:
            table = row["basetablename"]
            name = norm(row.get(f"{table}_meishou"))
            address = norm(row.get(f"{table}_address"))
            detail = norm(row.get(f"{table}_setchibashoshousai"))
            available_time = norm(row.get(f"{table}_shiyoukanoujikan"))
            match = point_pattern.search(row.get("geometryattr", ""))
            if not name or not address or not match:
                raise ValueError(f"Missing required AED data: {row!r}")
            x, y = (float(match.group(1)), float(match.group(2)))
            longitude, latitude = inverse_jgd2011_zone9(x, y)
            if not (35.0 <= latitude <= 36.0 and 139.0 <= longitude <= 140.0):
                raise ValueError(f"Coordinate outside Kanagawa: {row!r}")
            address = full_address(source["prefecture"], source["municipality"], address)
            key = (name, address, detail)
            records.setdefault(
                key,
                {
                    "name": name,
                    "address": address,
                    "detail": detail,
                    "available_time": available_time,
                    "latitude": latitude,
                    "longitude": longitude,
                    "layer": layer["display_name"],
                },
            )

    expected = source.get("expected_unique_count")
    if expected is not None and len(records) != expected:
        raise ValueError(f"Expected {expected} unique rows, got {len(records)}")

    values = []
    stable_rows = []
    for (name, address, detail), row in sorted(records.items()):
        digest = hashlib.sha256(f"{name}|{address}|{detail}".encode()).hexdigest()[:24]
        source_key = f"municipal-gis:fujisawa-aed:{digest}"
        stable_rows.append(
            {
                "source_key": source_key,
                "name": name,
                "address": address,
                "detail": detail,
                "latitude": round(row["latitude"], 8),
                "longitude": round(row["longitude"], 8),
            }
        )
        values.append(
            "("
            + ",".join(
                [
                    sql_text(source_key),
                    sql_text("aed"),
                    sql_text(name),
                    sql_text(source["prefecture"]),
                    sql_text(source["municipality"]),
                    sql_text(address),
                    "null",
                    "null",
                    str(round(row["latitude"], 8)),
                    str(round(row["longitude"], 8)),
                    sql_text(source["source_name"]),
                    sql_text(source["dataset_url"]),
                    sql_text(source["source_date"]),
                    sql_text(source["license"]),
                    sql_text("自治体公式GIS（EPSG:6677からWGS84へ変換）"),
                    "null",
                ]
            )
            + ")"
        )

    raw_count = sum(item["feature_count"] for item in layer_reports)
    snapshot = json.dumps(stable_rows, ensure_ascii=False, sort_keys=True).encode()
    report = {
        "dataset_id": source["dataset_id"],
        "municipality": source["municipality"],
        "source_name": source["source_name"],
        "dataset_url": source["dataset_url"],
        "map_url": source["map_url"],
        "source_date": source["source_date"],
        "source_date_note": source["source_date_note"],
        "license": source["license"],
        "raw_features": raw_count,
        "duplicate_features": raw_count - len(records),
        "generated_rows": len(records),
        "layers": layer_reports,
        "excluded_layers": source["excluded_layers"],
        "deduplication_key": "NFKC-normalized facility name, full address, and installation detail",
        "coordinate_conversion": "EPSG:6677 to longitude/latitude using inverse Transverse Mercator on GRS80",
        "snapshot_sha256": hashlib.sha256(snapshot).hexdigest(),
    }
    sql = (
        "begin;\n\ninsert into public.safety_spots "
        "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,"
        "source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set facility_type=excluded.facility_type,name=excluded.name,"
        "prefecture=excluded.prefecture,municipality=excluded.municipality,address=excluded.address,"
        "phone=excluded.phone,parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
        "source_license=excluded.source_license,geocode_source=excluded.geocode_source,"
        "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output_sql.write_text(sql, encoding="utf-8")
    args.output_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"{source['municipality']} raw={raw_count} duplicates={raw_count - len(records)} "
        f"generated={len(records)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
