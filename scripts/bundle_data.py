#!/usr/bin/env python3
"""
Deterministic bundler: validates modular datasets in /data/ and compiles production data.js
preserving the global window.INTERNA_DATA runtime contract.
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(ROOT, "data")
sys.path.insert(0, SCRIPT_DIR)

from validate_schema import DIVISION_FILES, validate_all


def bundle():
    res = validate_all()
    if isinstance(res, list):
        print("ABORTING BUNDLE:", res)
        sys.exit(1)
    errors, total_q, total_mods = res
    if errors:
        print(f"ABORTING BUNDLE ({len(errors)} schema errors):")
        for e in errors[:20]:
            print("  -", e)
        sys.exit(1)

    with open(os.path.join(DATA_DIR, "core.json"), "r", encoding="utf-8") as f:
        core = json.load(f)

    out_data = {
        "divisions": core["divisions"],
    }

    for div_id, legacy_key in DIVISION_FILES:
        mod_path = os.path.join(DATA_DIR, "modules", f"{div_id}.json")
        with open(mod_path, "r", encoding="utf-8") as f:
            out_data[legacy_key] = json.load(f)

    out_data["labReference"] = core["labReference"]

    all_questions = []
    for div_id, _ in DIVISION_FILES:
        q_path = os.path.join(DATA_DIR, "questions", f"{div_id}.json")
        with open(q_path, "r", encoding="utf-8") as f:
            all_questions.extend(json.load(f))

    out_data["questions"] = all_questions

    out_path = os.path.join(ROOT, "data.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("window.INTERNA_DATA = ")
        f.write(json.dumps(out_data, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(
        f"BUNDLED OK: {len(out_data['divisions'])} divisions, "
        f"{total_mods} modules, {len(all_questions)} questions -> data.js "
        f"({os.path.getsize(out_path):,} bytes)"
    )


if __name__ == "__main__":
    bundle()
