---
name: interna-division-audit
description: Two-phase Orchestrator + Parallel Subagent workflow for clinical auditing and patching of Interna Snack v2 divisions (modules and questions). Use when auditing or patching any division in data/modules/ and data/questions/.
---

# Interna Snack v2 — Division Audit & Patching Workflow

## Golden Rules
1. **NEVER edit JSON files during Tahap 1 (Audit).** Always produce `audit_<divisi>.md` (`UserFacing: true`, `RequestFeedback: true`) and wait for explicit user approval before Tahap 2.
2. **Zero Generic Boilerplate:** Every `clinicalPearl`, `redFlags`, and `pathophysiology` must be case-specific. No emojis, no `keywords` fields.
3. **Clinical & Guideline Hierarchy:**
   - **Competency & Local:** SK KKI No. 181/2024 + Buku Ajar IPD PAPDI Edisi VII (2024) + PPK/PNPK Nasional.
   - **International:** Latest global consensus (e.g., ESC & ACC/AHA only for Kardiologi — NO PERKI; GOLD 2025/2026; GINA 2025; ADA 2025/2026; KDIGO; etc.).
4. **Do NOT run `deploy.py`, `git commit`, or `git push`** unless explicitly requested by the user.

---

## Tahap 1: Audit (Read-Only + Parallel Waves)
1. **Inspect & Split into Waves:**
   - Check `archive/raw_sources/` for any local source files for the division.
   - Run a Python script to inspect `data/modules/<divisi>.json` and `data/questions/<divisi>.json` (module IDs, question counts, missing `clinicalPearl`/`redFlags`/`pathophysiology`, duplicate stems).
   - Dump the division into **3 balanced waves (~80–130 questions each)** in `<artifactDir>/scratch/`.
2. **Verify Latest Guidelines:**
   - Search latest international & national guidelines for the division's key topics.
3. **Run 3 Parallel Subagents (Audit Only):**
   - Instruct each subagent to audit its wave line-by-line for:
     - **P0 (Critical):** Wrong answer key, outdated/dangerous clinical management, guideline mismatch.
     - **P1 (High):** Ambiguous stem/options, missing/outdated guideline citation, misclassified `moduleId` (needs re-home).
     - **P2 (Medium):** Duplicate/near-duplicate questions needing replacement, missing `clinicalPearl`/`redFlags`/`pathophysiology`.
     - **Cross-Division & Pregnancy:** Identify topics needing `Lihat juga` hyperlinks or `Pregnancy / Cross-Division Pearl`.
4. **Consolidate & Request Approval:**
   - Merge wave findings into `audit_<divisi>.md` (`UserFacing: true`, `RequestFeedback: true`) and stop to wait for user approval.

---

## Tahap 2: Patching (After User Approval)
1. **Run 3 Parallel Subagents (Patching):**
   - Apply all approved P0/P1/P2 fixes, re-home misclassified questions, replace duplicates with new high-yield questions, and fill missing `clinicalPearl`/`redFlags`/`pathophysiology` (case-specific).
   - Standardize the final slide of every module in `data/modules/<divisi>.json` with the 3-component **`High-Yield Exam Pattern & Clinical Pearl`** (`Exam Trap`, `Head-to-Head`, `High-Yield Pearl` including `Pregnancy / Cross-Division Pearl`) and interactive `Lihat juga` buttons:
     ```html
     <button type="button" onclick="window.InternaApp.openMaterialCarousel('<mod_id>')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] cursor-pointer mr-1.5 mt-1">Lihat juga: <label></button>
     ```
2. **Bundle & Validate (Mandatory):**
   ```bash
   python3 scripts/bundle_data.py && python3 scripts/validate_schema.py
   ```
   - Must pass with **0 errors** before reporting completion.
