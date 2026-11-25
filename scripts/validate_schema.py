#!/usr/bin/env python3
"""
Strict schema & clinical quality gate validator for modular datasets in /data/.
Run directly: python3 scripts/validate_schema.py
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")

DIVISION_FILES = [
    ("tropik-infeksi", "tropikModules"),
    ("kardiologi", "kardiologiModules"),
    ("ginjal-hipertensi", "nefrologiModules"),
    ("pulmonologi", "pulmonologiModules"),
    ("gastroenterohepatologi", "gehModules"),
    ("endokrin-metabolik", "endokrinModules"),
    ("hematologi-onkologi", "homModules"),
    ("reumatologi", "reumatologiModules"),
    ("geriatri", "geriatriModules"),
    ("alergi-imunologi", "alergiModules"),
    ("psikosomatik-paliatif", "psikosomatikModules"),
]

REQUIRED_Q_FIELDS = [
    "id", "divisionId", "moduleId", "subtopic", "category",
    "difficulty", "sourceType", "vignette", "leadIn", "options",
    "correctIndex", "rationale"
]

VALID_DIFFICULTIES = {"Esensial PAPDI", "Menengah PAPDI", "Tantangan Board"}
VALID_CATEGORIES = {
    "Teori Dasar", "Patofisiologi", "Diagnosis",
    "Tatalaksana", "Pencegahan", "Kasus Lintas Divisi"
}

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]")
FORBIDDEN_RE = re.compile(
    r"bukan pilihan tepat|sesuai panduan tatalaksana standar|indikasi sesuai evidence|"
    r"mengacu pada buku|\bopsi\s+[a-e]\b|\bpilihan\s+[a-e]\b",
    re.I
)


def validate_all():
    errors = []

    core_path = os.path.join(DATA_DIR, "core.json")
    if not os.path.exists(core_path):
        return [f"Missing {core_path}"]

    with open(core_path, "r", encoding="utf-8") as f:
        core = json.load(f)

    divisions = core.get("divisions", [])
    lab_refs = core.get("labReference", [])
    if len(divisions) != 11:
        errors.append(f"Expected 11 divisions in core.json, got {len(divisions)}")
    if not lab_refs:
        errors.append("Missing labReference entries in core.json")

    div_ids = {d["id"] for d in divisions}
    module_ids = set()

    for div_id, _ in DIVISION_FILES:
        mod_path = os.path.join(DATA_DIR, "modules", f"{div_id}.json")
        if not os.path.exists(mod_path):
            errors.append(f"Missing module file: {mod_path}")
            continue
        with open(mod_path, "r", encoding="utf-8") as f:
            mods = json.load(f)
        if not isinstance(mods, list) or len(mods) == 0:
            errors.append(f"Module file {div_id}.json must be a non-empty list")
            continue
        for m in mods:
            mid = m.get("id")
            if not mid:
                errors.append(f"Module in {div_id}.json missing id")
            elif mid in module_ids:
                errors.append(f"Duplicate module id: {mid}")
            else:
                module_ids.add(mid)
            if not m.get("title"):
                errors.append(f"Module {mid} missing title")

    seen_qids = set()
    total_q = 0

    for div_id, _ in DIVISION_FILES:
        q_path = os.path.join(DATA_DIR, "questions", f"{div_id}.json")
        if not os.path.exists(q_path):
            errors.append(f"Missing questions file: {q_path}")
            continue
        with open(q_path, "r", encoding="utf-8") as f:
            qs = json.load(f)
        if not isinstance(qs, list):
            errors.append(f"Questions file {div_id}.json must be a list")
            continue

        div_ci = Counter()
        for q in qs:
            total_q += 1
            qid = q.get("id", "<missing>")
            if qid in seen_qids:
                errors.append(f"Duplicate question id: {qid}")
            seen_qids.add(qid)

            for field in REQUIRED_Q_FIELDS:
                if field not in q:
                    errors.append(f"{qid}: missing required field '{field}'")

            if q.get("divisionId") not in div_ids:
                errors.append(f"{qid}: unknown divisionId '{q.get('divisionId')}'")

            if q.get("divisionId") != div_id:
                errors.append(f"{qid}: divisionId '{q.get('divisionId')}' does not match file '{div_id}'")

            if q.get("difficulty") not in VALID_DIFFICULTIES:
                errors.append(f"{qid}: non-canonical difficulty '{q.get('difficulty')}'")

            if q.get("category") not in VALID_CATEGORIES:
                errors.append(f"{qid}: non-canonical category '{q.get('category')}'")

            opts = q.get("options", [])
            if not isinstance(opts, list) or len(opts) != 5 or any(not str(o).strip() for o in opts):
                errors.append(f"{qid}: options must be exactly 5 non-empty strings")

            ci = q.get("correctIndex")
            if not isinstance(ci, int) or not (0 <= ci <= 4):
                errors.append(f"{qid}: invalid correctIndex '{ci}'")
            else:
                div_ci[ci] += 1

            rat = q.get("rationale", {})
            if not isinstance(rat, dict):
                errors.append(f"{qid}: rationale must be an object")
                continue

            if "keywords" in rat:
                errors.append(f"{qid}: deprecated 'keywords' field present in rationale")

            ce = rat.get("correctExplanation", "")
            if len(ce) < 80:
                errors.append(f"{qid}: correctExplanation too short ({len(ce)} chars)")

            da = rat.get("distractorAnalysis", {})
            expected_keys = {str(i) for i in range(5) if i != ci}
            if set(da.keys()) != expected_keys:
                errors.append(f"{qid}: distractorAnalysis keys {sorted(da.keys())} != expected {sorted(expected_keys)}")

            for dk, dv in da.items():
                if len(str(dv).strip()) < 30:
                    errors.append(f"{qid}: distractor '{dk}' too short ({len(str(dv))} chars)")

            if not rat.get("guidelineAnchor"):
                errors.append(f"{qid}: missing guidelineAnchor")

            blob = json.dumps(q, ensure_ascii=False)
            if EMOJI_RE.search(blob):
                errors.append(f"{qid}: contains forbidden emoji")
            if FORBIDDEN_RE.search(blob):
                errors.append(f"{qid}: contains forbidden letter/boilerplate phrasing")

        if qs:
            if set(div_ci.keys()) != {0, 1, 2, 3, 4} or (max(div_ci.values()) - min(div_ci.values()) > 2):
                errors.append(f"{div_id}: unbalanced correctIndex distribution {dict(sorted(div_ci.items()))}")

    return errors, total_q, len(module_ids)


if __name__ == "__main__":
    res = validate_all()
    if isinstance(res, list):
        print("VALIDATION FAILED:", res)
        sys.exit(1)
    errors, total_q, total_mods = res
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):")
        for e in errors[:25]:
            print("  -", e)
        sys.exit(1)
    print(f"VALIDATION PASSED: {total_mods} modules, {total_q} questions, 0 errors.")
