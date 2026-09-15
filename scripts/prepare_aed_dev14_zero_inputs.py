"""Prepare public official addresses for the two zero-listing recovery cities."""
import json
from pathlib import Path

from import_aed_open_data import ADDRESS_FIELDS, NAME_FIELDS, first_value, read_records
from import_nationwide_aed import clean


ROOT = Path("data/aed_dev14")
TARGETS = {"12239": ("千葉県", "大網白里市"), "27218": ("大阪府", "大東市")}


def main() -> None:
    inputs = []
    catalog = json.loads((ROOT / "catalog_fetch.json").read_text())
    for source in catalog:
        code = str(source["code"])
        if code not in TARGETS or source.get("fetch_status") != "downloaded":
            continue
        prefecture, municipality = TARGETS[code]
        rows = read_records(Path(source["snapshot"]).read_bytes())
        dataset = f"dev14:{code}:{source['selected_resource']['resource_id']}"
        for row_number, row in enumerate(rows, 2):
            name = first_value(row, NAME_FIELDS)
            address = first_value(row, ADDRESS_FIELDS)
            if not name or not address:
                continue
            if not address.startswith(prefecture):
                address = prefecture + (address if address.startswith(municipality) else municipality + address)
            inputs.append(
                {
                    "dataset": dataset,
                    "row": row_number,
                    "code": code,
                    "name": clean(name),
                    "address": clean(address),
                    "prefecture": prefecture,
                    "municipality": municipality,
                    "source_url": source["url"],
                    "resource_url": source["selected_resource"]["download_url"],
                    "resource_id": str(source["selected_resource"]["resource_id"]),
                    "license_id": "PDL 1.0" if code == "12239" else "CC BY 2.1 Japan",
                    "source_updated_at": source["selected_resource"].get("updated_at"),
                    "source_sha256": source["sha256"],
                    "original": row,
                }
            )
    (ROOT / "geocode_inputs.json").write_text(json.dumps(inputs, ensure_ascii=False, indent=2, default=str) + "\n")
    print(len(inputs), "public-address candidates")


if __name__ == "__main__":
    main()
