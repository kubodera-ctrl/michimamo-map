#!/usr/bin/env python3
"""Prepare an isolated CURRENT source worktree with configurable legacy path roots.

Only Python string literals containing historic file paths are rewritten. Drawing
functions, constants, timing, and assets are copied byte-for-byte otherwise.
"""
from __future__ import annotations

import os
import re
import shutil
from pathlib import Path
from typing import Mapping

PATH_LITERAL = re.compile(r"(?P<quote>['\"])(?P<path>/mnt/data/[^'\"]+)(?P=quote)")
OUTPUT_DIRS = {
    "latest_segments", "review2_segments", "review3_segments",
    "review4_segments", "review5_segments", "output",
}


def _safe_join(root: Path, *parts: str) -> Path:
    root = root.expanduser().resolve()
    candidate = root.joinpath(*parts).resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("path escapes configured root")
    return candidate


def resolve_legacy_path(value: str, asset_root: Path, work_root: Path) -> Path:
    """Map a historic /mnt/data reference into ASSET_ROOT or WORK_ROOT."""
    raw = Path(value)
    parts = raw.parts
    if not raw.is_absolute() or len(parts) < 4 or parts[:3] != ("/", "mnt", "data"):
        raise ValueError(f"unsupported legacy path: {value}")

    tail = parts[3:]
    if tail[0] == "machimamo_v164":
        rel = tail[1:]
        if rel and (rel[0] in OUTPUT_DIRS or rel[0].endswith("_segments")):
            return _safe_join(work_root, *rel)
        if rel and rel[-1].endswith(".py"):
            return _safe_join(work_root, "machimamo_v164", *rel)
        return _safe_join(asset_root, "machimamo_v164", *rel)

    historical = {
        "machimamo_reference_v14": ("machimamo_v164", "build", "v14"),
        "machimamo_reference_v16_2": ("machimamo_v164", "build", "v162"),
        "machimamo_reference_v13": ("machimamo_reference_v13",),
        "machimamo_reference_v16_1": ("machimamo_reference_v16_1",),
        "machimamo_reference_v16_3": ("machimamo_reference_v16_3",),
    }
    prefix = tail[0]
    if prefix not in historical:
        raise ValueError(f"unmapped legacy root: {prefix}")
    mapped = historical[prefix]
    rest = tail[1:]
    if prefix in {"machimamo_reference_v14", "machimamo_reference_v16_2"} and rest and rest[-1].endswith(".py"):
        return _safe_join(work_root, *mapped, *rest)
    return _safe_join(asset_root, *mapped, *rest)


def rewrite_source_paths(source: str, asset_root: Path, work_root: Path) -> str:
    """Replace only legacy path literals with resolved configured paths."""
    def replace(match: re.Match[str]) -> str:
        resolved = resolve_legacy_path(match.group("path"), asset_root, work_root)
        return repr(os.fspath(resolved))
    return PATH_LITERAL.sub(replace, source)


def prepare_source_tree(asset_root: Path, work_root: Path) -> Path:
    """Copy CURRENT source under WORK_ROOT and rewrite legacy path literals."""
    asset_root = asset_root.expanduser().resolve()
    work_root = work_root.expanduser().resolve()
    source = asset_root / "machimamo_v164"
    if not source.is_dir():
        raise FileNotFoundError(f"CURRENT source tree not found below ASSET_ROOT: {source}")
    target = work_root / "machimamo_v164"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, dirs_exist_ok=True)
    for py_file in target.rglob("*.py"):
        original = py_file.read_text(encoding="utf-8")
        rewritten = rewrite_source_paths(original, asset_root, work_root)
        py_file.write_text(rewritten, encoding="utf-8")
    return target


def roots_from_env(env: Mapping[str, str] = os.environ) -> tuple[Path, Path]:
    asset = env.get("ASSET_ROOT")
    if not asset:
        raise RuntimeError("ASSET_ROOT must point to the extracted CURRENT source tree")
    work = env.get("WORK_ROOT") or str(Path(os.getenv("TMPDIR", "/tmp")) / "machimamo-production-work")
    return Path(asset), Path(work)
