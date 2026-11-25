/* ==========================================================================
   InternaSnack — Shared Visualization Engine, rAF Controller & Calculators
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { escapeHtml, clampNum } = R.utils;

  function renderCalcGaugeSvg(idPrefix, metricTitle, pct, readoutLabel, toneColor, zones) {
    const p = clampNum(pct, 0, 1, 0);
    const barW = (p * 440).toFixed(1);
    const nx = (20 + p * 440).toFixed(1);
    return `
      <div class="viz-gauge-wrap">
        <svg class="viz-svg" viewBox="0 0 480 64" role="img" aria-label="${metricTitle}">
          <text x="20" y="15" font-size="10.2" font-weight="700" letter-spacing="0.04em" fill="var(--text-muted)">${metricTitle}</text>
          <text id="${idPrefix}-gauge-val" x="460" y="15" text-anchor="end" font-size="11.5" font-weight="700" style="font-variant-numeric: tabular-nums;" fill="${toneColor}">${readoutLabel}</text>
          <rect x="20" y="25" width="440" height="10" rx="5" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" stroke-width="0.8" />
          ${(zones || [])
            .map(
              (z) => `<rect x="${(20 + z.from * 440).toFixed(1)}" y="25" width="${((z.to - z.from) * 440).toFixed(1)}" height="10" rx="${z.rx ? Math.min(z.rx, 5) : 0}" fill="${z.fill}" fill-opacity="0.18" />`
            )
            .join("")}
          <rect id="${idPrefix}-gauge-bar" class="viz-gauge-bar" x="20" y="25" width="${barW}" height="10" rx="5" fill="${toneColor}" fill-opacity="0.88" />
          <g id="${idPrefix}-gauge-needle" class="viz-gauge-needle" style="transform: translateX(${nx}px)">
            <circle cx="0" cy="30" r="8" fill="var(--bg-surface)" stroke="${toneColor}" stroke-width="2.5" />
            <circle cx="0" cy="30" r="2.5" fill="${toneColor}" />
          </g>
          ${(zones || [])
            .map((z) => {
              const tx = (20 + ((z.from + z.to) / 2) * 440).toFixed(1);
              return `<text x="${tx}" y="54" text-anchor="middle" font-size="9.8" font-weight="600" fill="${z.textFill || "var(--text-muted)"}">${z.label}</text>`;
            })
            .join("")}
        </svg>
      </div>
    `;
  }

  function updateCalcGauge(idPrefix, pct, readoutLabel, toneColor) {
    const p = clampNum(pct, 0, 1, 0);
    const bar = document.getElementById(`${idPrefix}-gauge-bar`);
    if (bar) {
      bar.setAttribute("width", (p * 440).toFixed(1));
      bar.setAttribute("fill", toneColor);
    }
    const needle = document.getElementById(`${idPrefix}-gauge-needle`);
    if (needle) {
      const nx = (20 + p * 440).toFixed(1);
      if (needle.style) needle.style.transform = `translateX(${nx}px)`;
      needle.setAttribute("data-x", nx);
    }
    const valEl = document.getElementById(`${idPrefix}-gauge-val`);
    if (valEl) {
      valEl.textContent = readoutLabel;
      valEl.setAttribute("fill", toneColor);
    }
  }

  function syncCalcWeightPair(prefix, rawVal, triggerSlider = false) {
    const bb = clampNum(rawVal, 30, 150, 60);
    const numEl = document.getElementById(`widget-${prefix}-bb`);
    const sliderEl = document.getElementById(`widget-${prefix}-slider`);
    if (triggerSlider && sliderEl) sliderEl.value = String(bb);
    else if (!triggerSlider && numEl && Number(numEl.value) !== bb) numEl.value = String(bb);
    if (sliderEl && Number(sliderEl.value) !== bb) sliderEl.value = String(bb);
    const pill = document.getElementById(`widget-${prefix}-pill`);
    if (pill) pill.textContent = `${bb} kg`;
    syncVizPresets(`widget-${prefix}-presets`, [bb === 45, bb === 55, bb === 65, bb === 80]);
    return bb;
  }

  function updateCalcReadoutTone(resEl, tone, transitionKey, html) {
    if (!resEl) return;
    resEl.className = "viz-readout";
    resEl.setAttribute("data-tone", tone);
    const prevKey = resEl.dataset ? resEl.dataset.lastKey : null;
    resEl.innerHTML = html;
    if (resEl.dataset) resEl.dataset.lastKey = String(transitionKey);
    if (prevKey !== String(transitionKey) && resEl.classList) {
      resEl.classList.remove("osm-readout-enter");
      if (typeof resEl.getBoundingClientRect === "function") resEl.getBoundingClientRect();
      resEl.classList.add("osm-readout-enter");
    }
  }

  function calcDSS(sliderVal) {
    const bbEl = document.getElementById("widget-dss-bb");
    const raw = sliderVal !== undefined ? sliderVal : bbEl?.value || "55";
    const bb = syncCalcWeightPair("dss", raw, sliderVal === undefined);
    if (sliderVal !== undefined && bbEl) bbEl.value = String(bb);
    const type = document.getElementById("widget-dss-type")?.value || "comp";
    const res = document.getElementById("widget-dss-result");
    if (!res) return;

    if (type === "comp") {
      const volMin = Math.round(bb * 10);
      const volMax = Math.round(bb * 20);
      updateCalcGauge("calc-dss", (bb - 30) / 120 * 0.55 + 0.15, `${volMin}–${volMax} mL / 1 jam`, "var(--accent-secondary)");
      updateCalcReadoutTone(
        res,
        "warning",
        `comp-${bb}`,
        `
          <p class="font-bold text-[var(--text-primary)]">DSS Terkompensasi (Tekanan Nadi ≤20 mmHg)</p>
          <p class="mt-1">• <strong>Resusitasi Awal:</strong> <strong>${volMin} – ${volMax} mL Kristaloid Isotonik (RL)</strong> habis dalam <strong>1 jam</strong> (~${Math.round(volMin / 3)}–${Math.round(volMax / 3)} tpm makrodrip).</p>
          <p class="mt-1">• <strong>Evaluasi 1 jam:</strong> Bila membaik, turunkan bertahap 7 ➔ 5 ➔ 3 mL/kg/jam. Jika syok persisten ➔ cek Hematokrit serial segera!</p>
        `
      );
    } else {
      const vol = Math.round(bb * 20);
      const prc = Math.round(bb * 10);
      updateCalcGauge("calc-dss", 0.72 + ((bb - 30) / 120) * 0.25, `Bolus ${vol} mL (15–30 mnt)`, "var(--accent-coral)");
      updateCalcReadoutTone(
        res,
        "danger",
        `decomp-${bb}`,
        `
          <p class="font-bold text-[var(--text-primary)]">DSS Dekompensasi / Hipotensif (Nadi Lemah/Tak Teraba)</p>
          <p class="mt-1">• <strong>Bolus Emergensi:</strong> <strong>${vol} mL Kristaloid/Koloid</strong> habis dalam <strong>15–30 menit</strong>.</p>
          <p class="mt-1">• <strong>Ht tetap TINGGI pasca bolus:</strong> Ganti <strong>KOLOID ${vol} mL</strong> (30–60 mnt). <strong>Ht TURUN drastis + syok:</strong> <strong>TRANSFUSI PRC ${prc} mL / WB ${vol} mL SEGERA</strong>!</p>
        `
      );
    }
  }

  function calcSepsis(sliderVal) {
    const bbEl = document.getElementById("widget-sepsis-bb");
    const raw = sliderVal !== undefined ? sliderVal : bbEl?.value || "60";
    const bb = syncCalcWeightPair("sepsis", raw, sliderVal === undefined);
    if (sliderVal !== undefined && bbEl) bbEl.value = String(bb);
    const vol = Math.round(bb * 30);
    const hourly = Math.round(vol / 3);
    const targetBox = document.getElementById("widget-sepsis-target-box");
    if (targetBox) targetBox.textContent = `${vol.toLocaleString("id-ID")} mL (dalam ≤ 3 jam)`;
    updateCalcGauge("calc-sepsis", (bb - 30) / 120, `${vol.toLocaleString("id-ID")} mL (~${hourly} mL/jam)`, "var(--accent-primary)");
    const res = document.getElementById("widget-sepsis-result");
    if (!res) return;
    updateCalcReadoutTone(
      res,
      "info",
      `sepsis-${bb}`,
      `
        <p class="font-bold text-[var(--text-primary)]">Target Resusitasi Cairan Sepsis 3 Jam Pertama (SSC 2021)</p>
        <p class="mt-1">• <strong>30 mL/kgBB Kristaloid Seimbang (RL / Plasmalyte):</strong> <strong>${vol} mL</strong> (rata-rata ~<strong>${hourly} mL/jam</strong>). Hindari NaCl 0,9% masif (risiko asidosis hiperkloremik).</p>
        <p class="mt-1">• <strong>Vasopresor Lini 1:</strong> Norepinefrin target <strong>MAP ≥65 mmHg</strong> (${(bb * 0.05).toFixed(1)}–${(bb * 0.5).toFixed(1)} mcg/mnt). Tambahkan Vasopresin 0,03 unit/mnt bila perlu.</p>
      `
    );
  }

  function calcMalaria(sliderVal) {
    const bbEl = document.getElementById("widget-malaria-bb");
    const raw = sliderVal !== undefined ? sliderVal : bbEl?.value || "60";
    const bb = syncCalcWeightPair("malaria", raw, sliderVal === undefined);
    if (sliderVal !== undefined && bbEl) bbEl.value = String(bb);
    const type = document.getElementById("widget-malaria-type")?.value || "falciparum";
    const res = document.getElementById("widget-malaria-result");
    if (!res) return;

    let tabs = "3 tablet";
    let tabCount = 3;
    if (bb >= 60 && bb <= 80) {
      tabs = "4 tablet";
      tabCount = 4;
    } else if (bb > 80) {
      tabs = "5 tablet";
      tabCount = 5;
    } else if (bb < 41) {
      tabs = "2 tablet";
      tabCount = 2;
    }

    if (type === "falciparum") {
      updateCalcGauge("calc-malaria", (tabCount - 1) / 5, `DHP ${tabs}/hari + Primakuin 1x`, "var(--accent-primary)");
      updateCalcReadoutTone(
        res,
        "info",
        `falc-${tabCount}-${bb}`,
        `
          <p class="font-bold text-[var(--text-primary)]">P. falciparum Tanpa Komplikasi</p>
          <p class="mt-1">• <strong>DHP:</strong> 1 kali <strong>${tabs}</strong>/hari selama <strong>3 hari</strong> + <strong>Primakuin ${(bb * 0.25).toFixed(1)} mg</strong> dosis tunggal Hari ke-1 (gametosidal).</p>
          <p class="mt-1">• <em>Kontraindikasi Primakuin:</em> Ibu hamil dan bayi &lt;6 bulan.</p>
        `
      );
    } else if (type === "vivax") {
      updateCalcGauge("calc-malaria", (tabCount - 1) / 5, `DHP ${tabs}/hari + Primakuin 14 hari`, "var(--accent-secondary)");
      updateCalcReadoutTone(
        res,
        "warning",
        `vivax-${tabCount}-${bb}`,
        `
          <p class="font-bold text-[var(--text-primary)]">P. vivax / P. ovale Tanpa Komplikasi (Eradikasi Hipnozoit)</p>
          <p class="mt-1">• <strong>DHP:</strong> 1 kali <strong>${tabs}</strong>/hari selama <strong>3 hari</strong> + <strong>Primakuin ${(bb * 0.25).toFixed(1)} mg/hari selama 14 HARI</strong>.</p>
          <p class="mt-1">• <em>Defisiensi G6PD:</em> Primakuin 0,75 mg/kgBB 1x seminggu selama 8–12 minggu.</p>
        `
      );
    } else {
      const artDose = (bb * 2.4).toFixed(1);
      updateCalcGauge("calc-malaria", 0.85, `Artesunat IV ${artDose} mg (J0, 12, 24)`, "var(--accent-coral)");
      updateCalcReadoutTone(
        res,
        "danger",
        `severe-${bb}`,
        `
          <p class="font-bold text-[var(--text-primary)]">Malaria Berat (Semua Spesies &amp; Ibu Hamil Semua Trimester)</p>
          <p class="mt-1">• <strong>Artesunat IV 2,4 mg/kgBB = ${artDose} mg IV</strong> pada <strong>Jam ke-0, 12, dan 24</strong>, lanjut tiap 24 jam sampai sadar, lalu tuntaskan DHP oral 3 hari.</p>
        `
      );
    }
  }

  function calcTifoid(sliderVal) {
    const bbEl = document.getElementById("widget-tifoid-bb");
    const raw = sliderVal !== undefined ? sliderVal : bbEl?.value || "60";
    const bb = syncCalcWeightPair("tifoid", raw, sliderVal === undefined);
    if (sliderVal !== undefined && bbEl) bbEl.value = String(bb);
    const loadDose = Math.round(bb * 3);
    const maintDose = Math.round(bb * 1);
    updateCalcGauge("calc-tifoid", (bb - 30) / 120, `Loading ${loadDose} mg ➔ ${maintDose} mg/6j`, "var(--accent-secondary)");
    const res = document.getElementById("widget-tifoid-result");
    if (!res) return;
    updateCalcReadoutTone(
      res,
      "warning",
      `tifoid-${bb}`,
      `
        <p class="font-bold text-[var(--text-primary)]">Protokol Deksametason Ensefalopati Tifoid (Hoffman et al.)</p>
        <p class="mt-1">• <strong>Loading Dose:</strong> 3 mg/kgBB = <strong>${loadDose} mg IV</strong> lambat dalam 30 menit.</p>
        <p class="mt-1">• <strong>Maintenance:</strong> 1 mg/kgBB = <strong>${maintDose} mg IV tiap 6 jam × 48 jam</strong> (8 dosis = ${maintDose * 8} mg; menekan mortalitas 56% ➔ 10%).</p>
      `
    );
  }

  function calcCURB() {
    const c = document.getElementById("curb-c")?.checked ? 1 : 0;
    const u = document.getElementById("curb-u")?.checked ? 1 : 0;
    const r = document.getElementById("curb-r")?.checked ? 1 : 0;
    const b = document.getElementById("curb-b")?.checked ? 1 : 0;
    const a65 = document.getElementById("curb-65")?.checked ? 1 : 0;
    const score = c + u + r + b + a65;
    const res = document.getElementById("widget-curb-result");
    if (!res) return;

    const pill = document.getElementById("curb-score-pill");
    if (pill) pill.textContent = `Skor ${score} / 5`;

    let text = "";
    let tone = "info";
    let toneColor = "var(--accent-primary)";
    if (score <= 1) {
      text = `Skor ${score} Poin: Risiko Rendah (<2%). Rekomendasi: <strong>Rawat Jalan (Outpatient)</strong> dengan antibiotik oral (Amoksisilin / Doksisiklin / Makrolid).`;
    } else if (score === 2) {
      tone = "warning";
      toneColor = "var(--accent-secondary)";
      text = `Skor ${score} Poin: Risiko Sedang (~9%). Rekomendasi: <strong>Rawat Inap Bangsal Biasa (Inpatient Ward)</strong> dengan Beta-laktam IV + Makrolid.`;
    } else {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      text = `Skor ${score} Poin: Risiko Tinggi (15–40%). Rekomendasi: <strong>Rawat Inap Segera; Pertimbangkan Ruang Rawat Intensif (ICU/HCU)</strong> bila ada gagal napas atau syok.`;
    }
    updateCalcGauge("calc-curb", score / 5, `Skor ${score}/5 (${score <= 1 ? "Rendah" : score === 2 ? "Sedang" : "Tinggi"})`, toneColor);
    updateCalcReadoutTone(res, tone, `curb-${score}`, `<p>${text}</p>`);
  }

  function calcGRACE() {
    const arrest = document.getElementById("grace-arrest")?.checked;
    const shock = document.getElementById("grace-shock")?.checked;
    const angina = document.getElementById("grace-angina")?.checked;
    const vt = document.getElementById("grace-vt")?.checked;
    const trop = document.getElementById("grace-trop")?.checked;
    const st = document.getElementById("grace-st")?.checked;
    const score = clampNum(document.getElementById("grace-score-val")?.value || "145", 50, 250, 145);
    const res = document.getElementById("widget-grace-result");
    if (!res) return;

    const pill = document.getElementById("grace-risk-pill");
    let tone = "info";
    let toneColor = "var(--accent-primary)";
    let pct = (score - 50) / 200;
    let badgeTxt = `GRACE ${score} • Non-High`;
    let bodyHtml = "";

    if (arrest || shock || angina || vt) {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      pct = Math.max(0.86, pct);
      badgeTxt = "VERY HIGH RISK (<2 jam)";
      bodyHtml = `<strong>Kategori Risiko Sangat Tinggi (Very High Risk - ESC 2023):</strong> Indikasi <strong>Immediate Invasive Strategy (<2 jam)</strong> ke laboratorium kateterisasi darurat tanpa menunggu hasil serial troponin.`;
    } else if (trop || st || score > 140) {
      tone = "warning";
      toneColor = "var(--accent-secondary)";
      pct = Math.max(0.55, Math.min(0.79, pct));
      badgeTxt = `HIGH RISK (<24 jam) • ${score}`;
      bodyHtml = `<strong>Kategori Risiko Tinggi (High Risk - ESC 2023):</strong> Indikasi <strong>Early Invasive Strategy (<24 jam)</strong> angiografi koroner selama rawat inap, disertai DAPT dan antikoagulan parenteral.`;
    } else {
      pct = Math.min(0.42, pct);
      bodyHtml = `<strong>Kategori Risiko Tidak Tinggi (Non-High Risk - ESC 2023):</strong> Direkomendasikan <strong>Invasive Strategy In-Hospital</strong> atau <strong>Selective Invasive Strategy</strong> setelah uji iskemik non-invasif / CCTA.`;
    }

    if (pill) pill.textContent = badgeTxt;
    updateCalcGauge("calc-grace", pct, badgeTxt, toneColor);
    updateCalcReadoutTone(res, tone, `grace-${tone}`, `<p>${bodyHtml}</p>`);
  }

  function calcCHA2DS2VA() {
    const c = document.getElementById("cha-c")?.checked ? 1 : 0;
    const h = document.getElementById("cha-h")?.checked ? 1 : 0;
    const a2 = document.getElementById("cha-a2")?.checked ? 2 : 0;
    const d = document.getElementById("cha-d")?.checked ? 1 : 0;
    const s2 = document.getElementById("cha-s2")?.checked ? 2 : 0;
    const v = document.getElementById("cha-v")?.checked ? 1 : 0;
    const a1 = document.getElementById("cha-a1")?.checked ? 1 : 0;
    const score = c + h + a2 + d + s2 + v + a1;
    const res = document.getElementById("widget-cha-result");
    if (!res) return;

    const pill = document.getElementById("cha-score-pill");
    if (pill) pill.textContent = `Skor ${score} Poin`;

    let tone = "info";
    let toneColor = "var(--accent-primary)";
    let bodyHtml = "";
    if (score >= 2) {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      bodyHtml = `Skor CHA₂DS₂-VA = <strong>${score} Poin</strong> (ESC 2024 Class I, Level A): <strong>Indikasi Mutlak Antikoagulan Oral (OAC)</strong>. Pilih <strong>DOAC</strong> (Apixaban, Rivaroxaban, Dabigatran, Edoxaban) di atas Warfarin, kecuali pada stenosis mitral sedang-berat atau katup jantung mekanik.`;
    } else if (score === 1) {
      tone = "warning";
      toneColor = "var(--accent-secondary)";
      bodyHtml = `Skor CHA₂DS₂-VA = <strong>1 Poin</strong> (ESC 2024 Class IIa, Level C): <strong>Antikoagulan Oral (DOAC) Harus Dipertimbangkan</strong> untuk pencegahan tromboemboli berdasarkan keputusan bersama dan profil perdarahan.`;
    } else {
      bodyHtml = `Skor CHA₂DS₂-VA = <strong>0 Poin</strong> (ESC 2024): Risiko tromboemboli rendah; <strong>Tidak Direkomendasikan</strong> pemberian antikoagulan maupun terapi antiplatelet tunggal untuk pencegahan stroke.`;
    }
    updateCalcGauge("calc-cha", Math.min(1, score / 6), `Skor ${score} (${score >= 2 ? "OAC Wajib" : score === 1 ? "Pertimbangkan OAC" : "Tanpa OAC"})`, toneColor);
    updateCalcReadoutTone(res, tone, `cha-${score}`, `<p>${bodyHtml}</p>`);
  }

  function calcWellsPE() {
    const dvt = document.getElementById("wells-dvt")?.checked ? 3.0 : 0;
    const alt = document.getElementById("wells-alt")?.checked ? 3.0 : 0;
    const hr = document.getElementById("wells-hr")?.checked ? 1.5 : 0;
    const immob = document.getElementById("wells-immob")?.checked ? 1.5 : 0;
    const prev = document.getElementById("wells-prev")?.checked ? 1.5 : 0;
    const hemop = document.getElementById("wells-hemop")?.checked ? 1.0 : 0;
    const ca = document.getElementById("wells-ca")?.checked ? 1.0 : 0;
    const score = dvt + alt + hr + immob + prev + hemop + ca;
    const res = document.getElementById("widget-wells-result");
    if (!res) return;

    const pill = document.getElementById("wells-score-pill");
    if (pill) pill.textContent = `${score.toFixed(1)} Poin`;

    let tone = "info";
    let toneColor = "var(--accent-primary)";
    let bodyHtml = "";
    if (score > 4.0) {
      tone = "danger";
      toneColor = "var(--accent-coral)";
      bodyHtml = `Skor Wells = <strong>${score.toFixed(1)} Poin (PE Likely / Probabilitas Tinggi)</strong>: <strong>Jangan periksa D-dimer!</strong> Langsung lakukan <strong>CT Pulmonary Angiography (CTPA)</strong> dan mulai antikoagulan parenteral/DOAC sembari menunggu bila tidak ada kontraindikasi (ESC 2019).`;
    } else {
      bodyHtml = `Skor Wells = <strong>${score.toFixed(1)} Poin (PE Unlikely / Probabilitas Rendah-Sedang)</strong>: Periksa <strong>D-dimer kuantitatif</strong> (gunakan cut-off terkompensasi usia: <em>Usia × 10 mcg/L</em> untuk usia >50 tahun). Bila D-dimer negatif, PE disingkirkan tanpa CTPA.`;
    }
    updateCalcGauge("calc-wells", Math.min(1, score / 10), `${score.toFixed(1)} Poin (${score > 4.0 ? "PE Likely → CTPA" : "PE Unlikely → D-dimer"})`, toneColor);
    updateCalcReadoutTone(res, tone, `wells-${score > 4 ? "hi" : "lo"}-${score.toFixed(1)}`, `<p>${bodyHtml}</p>`);
  }

  // =========================================================================
  // PRIORITAS 2 INTERACTIVE SVG VISUALIZATIONS (Tropik Infeksi - Osmosis Smooth)
  // =========================================================================


  const vizMotionState = {
    tweenRaf: 0,
    playRaf: 0,
    playingKey: null
  };

  function isReducedMotionPreferred() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hasRafSupport() {
    return typeof window.requestAnimationFrame === "function" && typeof window.cancelAnimationFrame === "function";
  }

  function vizPlayIconSvg(isPlaying) {
    if (isPlaying) {
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="3" height="8" rx="0.8"/><rect x="7" y="2" width="3" height="8" rx="0.8"/></svg>';
    }
    return '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 2.2v7.6c0 .5.5.8.9.5l6.1-3.8c.4-.2.4-.8 0-1L3.9 1.7c-.4-.3-.9 0-.9.5z"/></svg>';
  }

  function scheduleVizFrame(cb) {
    if (typeof document !== "undefined" && document.hidden) {
      return window.setTimeout(() => cb(typeof performance !== "undefined" ? performance.now() : Date.now()), 16);
    }
    return window.requestAnimationFrame(cb);
  }

  function cancelVizFrame(id) {
    if (!id) return;
    if (hasRafSupport()) window.cancelAnimationFrame(id);
    window.clearTimeout(id);
  }

  function cancelVizTween() {
    cancelVizFrame(vizMotionState.tweenRaf);
    vizMotionState.tweenRaf = 0;
  }

  function stopVizWalkthrough() {
    cancelVizFrame(vizMotionState.playRaf);
    vizMotionState.playRaf = 0;
    const prevKey = vizMotionState.playingKey;
    vizMotionState.playingKey = null;
    if (prevKey) {
      const btn = document.getElementById(`viz-${prevKey}-play-btn`);
      if (btn) {
        btn.classList.remove("playing");
        btn.setAttribute("aria-pressed", "false");
        btn.innerHTML = `${vizPlayIconSvg(false)}<span>Putar Fase</span>`;
      }
    }
  }

  function cancelAllVizAnimations() {
    cancelVizTween();
    stopVizWalkthrough();
  }



  function getVizMotionSpec(key) {
    for (let i = 0; i < R.motionProviders.length; i++) {
      const spec = R.motionProviders[i](key);
      if (spec) return spec;
    }
    return null;
  }

  function animateVizTo(key, targetVal) {
    const spec = getVizMotionSpec(key);
    if (!spec) return;
    stopVizWalkthrough();
    cancelVizTween();

    const target = clampNum(targetVal, spec.min, spec.max, spec.min);
    const startVal = clampNum(spec.get(), spec.min, spec.max, target);
    if (!hasRafSupport() || isReducedMotionPreferred() || Math.abs(target - startVal) < 0.01) {
      spec.apply(target);
      return;
    }

    const duration = 420;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    function step(now) {
      const elapsed = (now || Date.now()) - t0;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = startVal + (target - startVal) * eased;
      spec.apply(p >= 1 ? target : cur);
      if (p < 1) {
        vizMotionState.tweenRaf = scheduleVizFrame(step);
      } else {
        vizMotionState.tweenRaf = 0;
      }
    }
    vizMotionState.tweenRaf = scheduleVizFrame(step);
  }

  function toggleVizWalkthrough(key) {
    const spec = getVizMotionSpec(key);
    if (!spec) return;
    if (vizMotionState.playingKey === key) {
      stopVizWalkthrough();
      return;
    }
    cancelAllVizAnimations();
    if (!hasRafSupport() || isReducedMotionPreferred()) {
      spec.apply(spec.end);
      return;
    }

    vizMotionState.playingKey = key;
    const btn = document.getElementById(`viz-${key}-play-btn`);
    if (btn) {
      btn.classList.add("playing");
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML = `${vizPlayIconSvg(true)}<span>Jeda</span>`;
    }

    const current = clampNum(spec.get(), spec.min, spec.max, spec.start);
    const isForward = spec.end >= spec.start;
    const nearEnd = isForward ? current >= spec.end - 0.15 : current <= spec.end + 0.5;
    const fromVal = nearEnd ? spec.start : current;
    const spanRatio = Math.max(0.18, Math.abs(spec.end - fromVal) / Math.max(1, Math.abs(spec.end - spec.start)));
    const duration = Math.max(1600, Math.round(spec.duration * spanRatio));
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

    function frame(now) {
      if (vizMotionState.playingKey !== key) return;
      const elapsed = (now || Date.now()) - t0;
      const p = Math.min(1, elapsed / duration);
      const cur = fromVal + (spec.end - fromVal) * p;
      spec.apply(p >= 1 ? spec.end : cur);
      if (p < 1) {
        vizMotionState.playRaf = scheduleVizFrame(frame);
      } else {
        stopVizWalkthrough();
      }
    }
    vizMotionState.playRaf = scheduleVizFrame(frame);
  }

  function buildSmoothSvgPath(pts) {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i > 0 ? i - 1 : i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  function sampleSmoothCurveY(pts, targetX) {
    if (!pts || pts.length === 0) return 0;
    if (targetX <= pts[0][0]) return pts[0][1];
    if (targetX >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    let i = 0;
    while (i < pts.length - 2 && targetX > pts[i + 1][0]) i++;
    const p0 = pts[i > 0 ? i - 1 : i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    const span = Math.max(0.0001, p2[0] - p1[0]);
    let t = clampNum((targetX - p1[0]) / span, 0, 1, 0);
    for (let iter = 0; iter < 4; iter++) {
      const mt = 1 - t;
      const bx = mt * mt * mt * p1[0] + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * p2[0];
      const dbx = 3 * mt * mt * (cp1x - p1[0]) + 6 * mt * t * (cp2x - cp1x) + 3 * t * t * (p2[0] - cp2x);
      if (Math.abs(dbx) < 0.0001) break;
      t = clampNum(t - (bx - targetX) / dbx, 0, 1, t);
    }
    const mt = 1 - t;
    return mt * mt * mt * p1[1] + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * p2[1];
  }

  function renderVizLegend(items) {
    return `
      <div class="viz-legend" aria-label="Legenda Grafik">
        ${items
          .map(
            (it) => `
          <span class="viz-legend-item">
            <span class="viz-swatch" style="background:${it.color};${it.dashed ? "background: repeating-linear-gradient(90deg, " + it.color + " 0 4px, transparent 4px 7px);" : ""}"></span>
            <span>${it.label}</span>
          </span>`
          )
          .join("")}
      </div>
    `;
  }

  function setSvgAttrs(id, attrs) {
    const el = document.getElementById(id);
    if (!el) return null;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function syncSliderAndPill(sliderId, pillId, val, pillText) {
    const slider = document.getElementById(sliderId);
    if (slider && Math.abs(Number(slider.value) - val) > 0.001) slider.value = String(val);
    const pill = document.getElementById(pillId);
    if (pill) pill.textContent = pillText;
  }

  function syncVizPresets(containerId, activeStates) {
    const presets = document.getElementById(containerId);
    if (!presets) return;
    presets.querySelectorAll(".viz-pill-btn").forEach((btn, idx) => {
      if (idx < activeStates.length) btn.classList.toggle("active", Boolean(activeStates[idx]));
    });
  }

  function formatVizReadoutHtml(title, c1Label, c1Body, c2Label, c2Body, footerHtml) {
    return `
      <p class="font-bold text-[var(--text-primary)]">${title}</p>
      <div class="viz-readout-grid">
        <p><strong>${c1Label}:</strong> ${c1Body}</p>
        <p><strong>${c2Label}:</strong> ${c2Body}</p>
      </div>
      ${footerHtml}
    `;
  }

  function updateVizReadout(readoutId, tone, innerHtml, transitionKey = null) {
    const readout = document.getElementById(readoutId);
    if (!readout) return;
    readout.setAttribute("data-tone", tone);
    const prevKey = readout.dataset ? readout.dataset.lastKey : null;
    if (transitionKey !== null && prevKey === String(transitionKey)) return false;
    readout.innerHTML = innerHtml;
    if (readout.dataset && transitionKey !== null) readout.dataset.lastKey = String(transitionKey);
    if (readout.classList) {
      readout.classList.remove("osm-readout-enter");
      if (typeof readout.getBoundingClientRect === "function") readout.getBoundingClientRect();
      readout.classList.add("osm-readout-enter");
    }
    return true;
  }

  function swapVizSvgFrame(frameId, svgHtml) {
    const frame = document.getElementById(frameId);
    if (!frame) return;
    frame.innerHTML = svgHtml;
    const svg = typeof frame.querySelector === "function" ? frame.querySelector("svg") : null;
    if (svg && svg.classList) {
      svg.classList.remove("osm-svg-enter");
      if (typeof svg.getBoundingClientRect === "function") svg.getBoundingClientRect();
      svg.classList.add("osm-svg-enter");
    }
  }



  function renderVizArrowDefs(markerId) {
    return `<defs><marker id="${markerId}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0 0, 7 3.5, 0 7" fill="var(--text-muted)" /></marker></defs>`;
  }



  function renderCardioTabRow(containerId, items, activeKey, extraClass = "viz-subtabs") {
    return `
      <div class="${extraClass}" id="${containerId}">
        ${items
          .map(
            (it) => `<button type="button" class="viz-pill-btn ${it.key === activeKey ? "active" : ""}" onclick="${it.onclick}">${it.label}</button>`
          )
          .join("")}
      </div>
    `;
  }

  function renderCardioSliderBlock(cfg) {
    return `
      <div class="viz-controls">
        <div class="viz-slider-row">
          <label for="viz-${cfg.key}-slider" class="viz-slider-label">${cfg.label}</label>
          <div class="viz-slider-meta">
            <button type="button" id="viz-${cfg.key}-play-btn" class="viz-play-btn" aria-pressed="false" onclick="window.InternaApp.toggleVizWalkthrough('${cfg.key}')">${vizPlayIconSvg(false)}<span>Putar Fase</span></button>
            <span id="viz-${cfg.key}-pill" class="viz-value-pill">${cfg.pillText}</span>
          </div>
        </div>
        <input type="range" id="viz-${cfg.key}-slider" class="viz-range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.value}" style="--viz-track-bg: ${cfg.trackBg};" oninput="${cfg.oninput}" />
        <div class="viz-presets" id="viz-${cfg.key}-presets">
          ${cfg.presets
            .map((p) => `<button type="button" class="viz-pill-btn ${p.active ? "active" : ""}" onclick="window.InternaApp.animateVizTo('${cfg.key}', ${p.val})">${p.label}</button>`)
            .join("")}
        </div>
      </div>
    `;
  }

  function renderCardioWidgetCard({ key, title, tag, controlsTop = "", svgHtml, legendHtml = "", controlsBottom = "", info, readoutFooter }) {
    return `
      <div class="viz-widget" id="viz-${key}-card">
        <div class="viz-header">
          <span class="viz-title">${title}</span>
          <span class="viz-tag">${tag}</span>
        </div>
        ${controlsTop}
        <div class="viz-svg-frame" id="viz-${key}-frame">
          ${svgHtml}
        </div>
        ${legendHtml}
        ${controlsBottom}
        <div id="viz-${key}-readout" class="viz-readout" data-tone="${info.tone}" data-last-key="${info.rKey}">
          ${formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, readoutFooter)}
        </div>
      </div>
    `;
  }



  function renderCalcCheckItem(id, handlerCall, labelHtml, options = {}) {
    const spanStyle = options.fullWidth ? ' style="grid-column: 1 / -1;"' : "";
    const checkedAttr = options.checked ? " checked" : "";
    return `
      <label class="viz-calc-check"${spanStyle}>
        <input type="checkbox" id="${id}"${checkedAttr} onchange="${handlerCall}" />
        <span>${labelHtml}</span>
      </label>
    `;
  }

  function renderCalcWeightSlider(prefix, fnName, defaultWeight, extraControlHtml) {
    const presets = [45, 55, 65, 80];
    return `
      <div class="viz-slider-block" style="margin-bottom: 0.75rem; padding: 0.75rem 0.85rem; border-radius: 14px; border: 1px solid var(--border-subtle); background-color: var(--bg-surface-subtle);">
        <div class="viz-slider-top">
          <span class="viz-slider-label">Berat Badan Pasien (kg)</span>
          <span class="viz-value-pill" id="widget-${prefix}-pill" style="font-variant-numeric: tabular-nums;">${defaultWeight} kg</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" style="align-items: center;">
          <div style="min-width: 0;">
            <input type="range" class="viz-range" id="widget-${prefix}-slider" min="30" max="150" step="1" value="${defaultWeight}" oninput="window.InternaApp.${fnName}(this.value)" />
            <div style="margin-top: 0.45rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem;">
              <input type="number" id="widget-${prefix}-bb" value="${defaultWeight}" min="30" max="150" class="viz-calc-input" style="width: 84px; flex: 0 0 auto; font-family: var(--font-mono); background-color: var(--bg-surface);" oninput="window.InternaApp.${fnName}()" />
              <div class="viz-presets" id="widget-${prefix}-presets" style="margin-top: 0; min-width: 0;">
                ${presets
                  .map(
                    (w) => `<button type="button" class="viz-pill-btn ${w === defaultWeight ? "active" : ""}" onclick="window.InternaApp.${fnName}(${w})">${w} kg</button>`
                  )
                  .join("")}
              </div>
            </div>
          </div>
          ${extraControlHtml || ""}
        </div>
      </div>
    `;
  }

  // =========================================================================


  function renderPulmoSliderOnly(cfg) {
    return `
      <div class="viz-controls">
        <div class="viz-slider-row">
          <label for="viz-${cfg.key}-slider" class="viz-slider-label">${cfg.label}</label>
          <span id="viz-${cfg.key}-pill" class="viz-value-pill">${cfg.pillText}</span>
        </div>
        <input type="range" id="viz-${cfg.key}-slider" class="viz-range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.value}" style="--viz-track-bg: ${cfg.trackBg};" oninput="${cfg.oninput}" />
        ${cfg.presets && cfg.presets.length > 0 ? `
          <div class="viz-presets" id="viz-${cfg.key}-presets">
            ${cfg.presets.map((p) => `<button type="button" class="viz-pill-btn ${p.active ? "active" : ""}" onclick="${p.onclick}">${p.label}</button>`).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }



  R.viz = {
    vizMotionState,
    isReducedMotionPreferred,
    hasRafSupport,
    vizPlayIconSvg,
    scheduleVizFrame,
    cancelVizFrame,
    cancelVizTween,
    stopVizWalkthrough,
    cancelAllVizAnimations,
    getVizMotionSpec,
    animateVizTo,
    toggleVizWalkthrough,
    buildSmoothSvgPath,
    sampleSmoothCurveY,
    renderVizLegend,
    setSvgAttrs,
    syncSliderAndPill,
    syncVizPresets,
    formatVizReadoutHtml,
    updateVizReadout,
    swapVizSvgFrame,
    renderVizArrowDefs,
    renderCardioTabRow,
    renderCardioSliderBlock,
    renderCardioWidgetCard,
    renderPulmoSliderOnly,
    renderCalcGaugeSvg,
    updateCalcGauge,
    syncCalcWeightPair,
    updateCalcReadoutTone,
    renderCalcCheckItem,
    renderCalcWeightSlider
  };

  Object.assign(R.handlers, {
    calcDSS,
    calcSepsis,
    calcMalaria,
    calcTifoid,
    calcCURB,
    calcGRACE,
    calcCHA2DS2VA,
    calcWellsPE,
    animateVizTo,
    toggleVizWalkthrough
  });
})(window);
