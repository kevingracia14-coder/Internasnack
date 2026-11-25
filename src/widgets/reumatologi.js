/* ==========================================================================
   InternaSnack — Reumatologi Interactive Widgets & Calculators (Apple HIG)
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { clampNum, escapeHtml } = R.utils;
  const {
    buildSmoothSvgPath,
    renderVizLegend,
    syncSliderAndPill,
    syncVizPresets,
    formatVizReadoutHtml,
    updateVizReadout,
    swapVizSvgFrame,
    renderCardioTabRow,
    renderCardioSliderBlock,
    renderCardioWidgetCard,
    renderCalcGaugeSvg,
    updateCalcGauge,
    updateCalcReadoutTone,
    renderCalcCheckItem
  } = R.viz;

  function svgWrap(str, x, y, maxChars, lineH, attrs) {
    var words = String(str || "").split(/\s+/);
    var lines = [];
    var cur = "";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!cur) { cur = w; }
      else if (cur.length + 1 + w.length <= maxChars) { cur += " " + w; }
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.map(function (ln, idx) {
      return '<text x="' + x + '" y="' + (y + idx * (lineH || 12)) + '" ' + (attrs || "") + '>' + escapeHtml(ln) + '</text>';
    }).join("");
  }

  var reumaVizState = {
    // 1. reuma-1-1: Synovial Fluid & ANA IIF Atlas
    synAnaMode: "synovial", // "synovial", "ana"
    synClass: "inflammatory", // "normal", "non_inflam", "inflammatory", "septic"
    anaPattern: "homogeneous", // "homogeneous", "speckled", "nucleolar", "centromere"

    // 1B. reuma-1-1 (extra): Hand Joint Distribution Atlas
    handDx: "compare", // "compare", "ra", "oa", "psa", "sle", "gout"

    // 2. reuma-1-2: ACR/EULAR 2010 RA Criteria
    raJointScore: 3, // 0, 1, 2, 3, 5
    raSeroScore: 3, // 0, 2, 3
    raAcuteScore: 1, // 0, 1
    raDurScore: 1, // 0, 1

    // 3. reuma-1-2 (extra): DAS28-ESR Calculator
    dasTjc: 8, // 0..28
    dasSjc: 6, // 0..28
    dasEsr: 45, // 2..120 mm/h
    dasVas: 60, // 0..100 mm

    // 4. reuma-1-3: Axial SpA vs DISH vs OA
    spaType: "as", // "as", "nr_axspa", "dish", "psa"

    // 5. reuma-2-1: ACR/EULAR 2019 SLE Criteria

    // 6. reuma-2-1 (extra): SLEDAI-2K Flare Evaluator

    // 7. reuma-2-2: SLE Pregnancy Drug Safety & Neonatal Lupus
    pregGroup: "safe", // "safe", "teratogenic", "neonatal_chb"

    // 8. reuma-2-3: SSc Capillaroscopy & lcSSc vs dcSSc
    sscSub: "dcssc_src", // "normal_raynaud", "lcssc", "dcssc_ild", "dcssc_src"

    // 9. reuma-2-4: Inflammatory Myopathy & MSA Panel
    myoAb: "jo1", // "jo1", "mi2", "mda5", "tif1g", "hmgcr"

    // 10. reuma-3-1: Crystal Polarized Microscopy (rAF: reumaCrystal)
    crystalAngle: 0, // 0..90 deg
    crystalType: "msu", // "msu", "cppd"

    // 11. reuma-3-2: Septic Joint Probability & Drainage
    septicWbc: 75, // x10^3/mm3 (10..150)
    septicType: "nongono", // "nongono", "dgi"

    // 12. reuma-3-3: Knee OA Kellgren-Lawrence (rAF: reumaOa)
    klGrade: 3, // 0..4

    // 13. reuma-4-1: Chapel Hill Vasculitis Caliber (rAF: reumaVasc)
    vascPos: 15, // 0..100 (0-33 Large, 34-66 Medium, 67-100 Small)

    // 14. reuma-4-2: ANCA Spectrum (GPA vs MPA vs EGPA)
    ancaEntity: "gpa" // "gpa", "mpa", "egpa", "igav"
  };

  function getReumaVizMotionSpec(key) {
    if (key === "reumaCrystal") {
      return {
        min: 0, max: 90, start: 0, end: 90, duration: 5800,
        get: function () { return reumaVizState.crystalAngle; },
        apply: function (v) { updateReumaCrystalViz(v, null, false); }
      };
    }
    if (key === "reumaOa") {
      return {
        min: 0, max: 4, start: 0, end: 4, duration: 6400,
        get: function () { return reumaVizState.klGrade; },
        apply: function (v) { updateReumaOaKellgrenViz(v, false); }
      };
    }
    if (key === "reumaVasc") {
      return {
        min: 0, max: 100, start: 0, end: 100, duration: 6600,
        get: function () { return reumaVizState.vascPos; },
        apply: function (v) { updateReumaVasculitisViz(v, false); }
      };
    }
    return null;
  }

  // =========================================================================
  // W1. ANALISIS CAIRAN SENDI & ATLAS POLA ANA IIF (reuma-1-1)
  // =========================================================================
  var REUMA_SYNOVIAL_CLASSES = {
    normal: { label: "Normal", color: "var(--accent-primary)", clarity: "Jernih / Transparan", viscosity: "Sangat Tinggi (String >4 cm)", wbc: "< 200 /mm3", pmn: "< 25%", tone: "info", dx: "Sendi Sehat Fisiologis", pearl: "Asam hialuronat utuh menjaga viskositas tinggi." },
    non_inflam: { label: "Non-Inflamasi", color: "var(--viz-blue)", clarity: "Kuning Jernih", viscosity: "Tinggi", wbc: "200 – 2.000 /mm3", pmn: "< 25%", tone: "info", dx: "Osteoartritis (OA), Trauma Mekanik, Nekrosis Avaskular", pearl: "Kaku sendi pagi hari <30 menit, nyeri memberat dengan beban mekanik." },
    inflammatory: { label: "Inflamasi", color: "var(--accent-secondary)", clarity: "Kuning Keruh (Translucent)", viscosity: "Rendah (Encer)", wbc: "2.000 – 50.000 /mm3", pmn: "50 – 75%", tone: "warning", dx: "Artritis Reumatoid, Gout/CPPD Akut, SpA, SLE", pearl: "Enzim lisosom leukosit memecah hialuronat sehingga viskositas turun drastis. Wajib periksa kristal polarisasi!" },
    septic: { label: "Septik (Purulen)", color: "var(--accent-coral)", clarity: "Opak / Purulen Pekat", viscosity: "Sangat Rendah", wbc: "> 50.000 (>100k) /mm3", pmn: "> 90%", tone: "danger", dx: "Artritis Septik Bakterial (S. aureus / Gram Negatif)", pearl: "EMERGENSI! Wajib Gram stain + kultur sebelum antibiotik IV empiris + drainase sendi berulang." }
  };

  var REUMA_ANA_PATTERNS = {
    homogeneous: { label: "Homogeneous (Difus)", antigen: "Anti-dsDNA, Anti-Histon, Nukleosom", disease: "SLE Klasik & Drug-Induced Lupus (Hidralazin/Prokainamid/INH)", tone: "danger" },
    speckled: { label: "Speckled (Berbintik)", antigen: "Anti-Sm, Anti-U1-RNP, Anti-Ro/SSA, Anti-La/SSB", disease: "SLE, MCTD (U1-RNP), Sindrom Sjögren, Lupus Neonatal", tone: "warning" },
    nucleolar: { label: "Nucleolar", antigen: "Anti-Scl-70 (Topoisomerase I), PM-Scl, RNA Pol III", disease: "Diffuse Cutaneous Systemic Sclerosis (dcSSc — Risiko ILD & SRC)", tone: "danger" },
    centromere: { label: "Centromere (Diskret)", antigen: "Anti-Centromere (CENP-B)", disease: "Limited Cutaneous SSc / Sindrom CREST (Risiko Tinggi PAH)", tone: "warning" }
  };

  function buildReumaSynAnaSvg() {
    if (reumaVizState.synAnaMode === "synovial") {
      var s = REUMA_SYNOVIAL_CLASSES[reumaVizState.synClass] || REUMA_SYNOVIAL_CLASSES.inflammatory;
      var fillOp = reumaVizState.synClass === "septic" ? "0.65" : (reumaVizState.synClass === "inflammatory" ? "0.38" : "0.16");
      return '<svg class="viz-svg" viewBox="0 0 480 190" role="img" aria-label="Analisis Cairan Sendi">' +
        '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PROFIL MAKROSKOPIS &amp; SELULARITAS CAIRAN SINOVIAL</text>' +
        '<text x="460" y="16" text-anchor="end" font-size="10.5" font-weight="800" fill="' + s.color + '">' + s.label.toUpperCase() + '</text>' +
        '<rect x="28" y="30" width="110" height="142" rx="14" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
        '<rect x="58" y="45" width="50" height="110" rx="22" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2" />' +
        '<rect x="60" y="72" width="46" height="81" rx="20" fill="' + s.color + '" fill-opacity="' + fillOp + '" />' +
        '<text x="83" y="62" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-muted)">Tabung Sinovial</text>' +
        '<rect x="155" y="30" width="305" height="142" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
        '<text x="172" y="54" font-size="8.6" font-weight="800" fill="var(--text-muted)">HITUNG LEUKOSIT &amp; PMN</text>' +
        '<text x="172" y="72" font-size="12.5" font-weight="800" fill="' + s.color + '">' + s.wbc + ' &bull; PMN ' + s.pmn + '</text>' +
        '<text x="172" y="98" font-size="8.6" font-weight="800" fill="var(--text-muted)">KEJERNIHAN &amp; VISKOSITAS</text>' +
        '<text x="172" y="114" font-size="10" font-weight="700" fill="var(--text-primary)">' + s.clarity + ' | Viskositas: ' + s.viscosity + '</text>' +
        '<text x="172" y="140" font-size="8.6" font-weight="800" fill="var(--text-muted)">ENTITAS UTAMA</text>' +
        '<text x="172" y="156" font-size="9.5" font-weight="700" fill="var(--accent-primary)">' + s.dx + '</text>' +
        '</svg>';
    }
    var a = REUMA_ANA_PATTERNS[reumaVizState.anaPattern] || REUMA_ANA_PATTERNS.homogeneous;
    var pat = reumaVizState.anaPattern;
    var nucSvg = "";
    if (pat === "homogeneous") {
      nucSvg = '<circle cx="95" cy="102" r="38" fill="var(--viz-green)" fill-opacity="0.58" stroke="var(--viz-green)" stroke-width="2.5" />';
    } else if (pat === "speckled") {
      nucSvg = '<circle cx="95" cy="102" r="38" fill="var(--viz-green)" fill-opacity="0.12" stroke="var(--viz-green)" stroke-width="2" />' +
        '<circle cx="80" cy="88" r="4" fill="var(--viz-green)" /><circle cx="105" cy="86" r="3.5" fill="var(--viz-green)" /><circle cx="92" cy="102" r="4" fill="var(--viz-green)" /><circle cx="76" cy="112" r="3.5" fill="var(--viz-green)" /><circle cx="110" cy="114" r="4" fill="var(--viz-green)" /><circle cx="95" cy="122" r="3.5" fill="var(--viz-green)" />';
    } else if (pat === "nucleolar") {
      nucSvg = '<circle cx="95" cy="102" r="38" fill="var(--viz-green)" fill-opacity="0.1" stroke="var(--viz-green)" stroke-width="1.8" />' +
        '<circle cx="83" cy="94" r="9.5" fill="var(--viz-green)" fill-opacity="0.85" /><circle cx="108" cy="110" r="8.5" fill="var(--viz-green)" fill-opacity="0.85" />';
    } else {
      nucSvg = '<circle cx="95" cy="102" r="38" fill="none" stroke="var(--viz-green)" stroke-width="1.5" stroke-dasharray="3,3" />' +
        '<circle cx="84" cy="82" r="2.6" fill="var(--viz-green)" /><circle cx="98" cy="80" r="2.6" fill="var(--viz-green)" /><circle cx="112" cy="92" r="2.6" fill="var(--viz-green)" /><circle cx="80" cy="98" r="2.6" fill="var(--viz-green)" /><circle cx="95" cy="102" r="2.6" fill="var(--viz-green)" /><circle cx="108" cy="106" r="2.6" fill="var(--viz-green)" /><circle cx="86" cy="116" r="2.6" fill="var(--viz-green)" /><circle cx="102" cy="120" r="2.6" fill="var(--viz-green)" />';
    }
    return '<svg class="viz-svg" viewBox="0 0 480 190" role="img" aria-label="Pola Imunofluoresensi ANA Hep-2">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">MIKROSKOP IMUNOFLUORESENSI SEL HEP-2 (ANA IIF)</text>' +
      '<circle cx="95" cy="102" r="56" fill="var(--bg-surface-subtle)" stroke="var(--border-strong)" stroke-width="2" />' +
      nucSvg +
      '<rect x="172" y="32" width="288" height="140" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="188" y="55" font-size="8.6" font-weight="800" fill="var(--text-muted)">POLA FLUORESENSI</text>' +
      '<text x="188" y="73" font-size="12" font-weight="800" fill="var(--viz-green)">' + a.label + '</text>' +
      '<text x="188" y="99" font-size="8.6" font-weight="800" fill="var(--text-muted)">TARGET ANTIGEN SPESIFIK</text>' +
      '<text x="188" y="115" font-size="9.8" font-weight="700" fill="var(--text-primary)">' + a.antigen + '</text>' +
      '<text x="188" y="141" font-size="8.6" font-weight="800" fill="var(--text-muted)">KORELASI KLINIS UTAMA</text>' +
      svgWrap(a.disease, 188, 155, 42, 11.5, 'font-size="8.8" font-weight="700" fill="var(--accent-primary)"') +
      '</svg>';
  }

  function renderReumaSynovialAnaWidget() {
    var m = reumaVizState.synAnaMode;
    var subTabs = m === "synovial"
      ? renderCardioTabRow("viz-reumaSyn-sub", Object.keys(REUMA_SYNOVIAL_CLASSES).map(function (k) {
          return { key: k, label: REUMA_SYNOVIAL_CLASSES[k].label, onclick: "window.InternaApp.updateReumaSynovialAnaViz('synovial', '" + k + "')" };
        }), reumaVizState.synClass)
      : renderCardioTabRow("viz-reumaSyn-sub", Object.keys(REUMA_ANA_PATTERNS).map(function (k) {
          return { key: k, label: REUMA_ANA_PATTERNS[k].label, onclick: "window.InternaApp.updateReumaSynovialAnaViz('ana', '" + k + "')" };
        }), reumaVizState.anaPattern);

    var top = renderCardioTabRow("viz-reumaSyn-mode", [
      { key: "synovial", label: "Analisis Cairan Sendi (4 Kelas)", onclick: "window.InternaApp.updateReumaSynovialAnaViz('synovial', null)" },
      { key: "ana", label: "Atlas Pola ANA Hep-2 (IIF)", onclick: "window.InternaApp.updateReumaSynovialAnaViz('ana', null)" }
    ], m) + subTabs;

    var s = REUMA_SYNOVIAL_CLASSES[reumaVizState.synClass];
    var a = REUMA_ANA_PATTERNS[reumaVizState.anaPattern];
    var info = m === "synovial"
      ? { tone: s.tone, rKey: "syn_" + reumaVizState.synClass, title: "Cairan Sendi " + s.label + " (" + s.wbc + ")", c1Label: "Diagnosis Diferensial", c1Body: s.dx, c2Label: "Mutiara Klinis", c2Body: s.pearl }
      : { tone: a.tone, rKey: "ana_" + reumaVizState.anaPattern, title: "Pola ANA IIF: " + a.label, c1Label: "Target Autoantibodi", c1Body: a.antigen, c2Label: "Asosiasi Penyakit", c2Body: a.disease };

    return '<div id="viz-reumaSyn-wrap">' + renderCardioWidgetCard({
      key: "reumaSyn",
      title: "Simulator Analisis Cairan Sendi & Atlas Pola Imunofluoresensi ANA",
      tag: "DIAGNOSTIK REUMATOLOGI",
      controlsTop: top,
      svgHtml: buildReumaSynAnaSvg(),
      info: info,
      readoutFooter: ""
    }) + '</div>';
  }

  function updateReumaSynovialAnaViz(mode, subKey) {
    if (mode === "synovial" || mode === "ana") reumaVizState.synAnaMode = mode;
    if (subKey) {
      if (reumaVizState.synAnaMode === "synovial" && REUMA_SYNOVIAL_CLASSES[subKey]) reumaVizState.synClass = subKey;
      if (reumaVizState.synAnaMode === "ana" && REUMA_ANA_PATTERNS[subKey]) reumaVizState.anaPattern = subKey;
    }
    var wrap = document.getElementById("viz-reumaSyn-wrap");
    if (wrap) wrap.outerHTML = renderReumaSynovialAnaWidget();
  }

  // =========================================================================
  // W2. KALKULATOR KRITERIA ACR/EULAR 2010 ARTRITIS REUMATOID (reuma-1-2)
  // =========================================================================
  function calcReumaRaAcr2010() {
    var j = Number(document.getElementById("reuma-ra-joint")?.value ?? 3);
    var s = Number(document.getElementById("reuma-ra-sero")?.value ?? 3);
    var a = Number(document.getElementById("reuma-ra-acute")?.value ?? 1);
    var d = Number(document.getElementById("reuma-ra-dur")?.value ?? 1);
    var total = j + s + a + d;
    var isRa = total >= 6;
    var toneColor = isRa ? "var(--accent-coral)" : "var(--accent-primary)";
    var pill = document.getElementById("reuma-ra-pill");
    if (pill) pill.textContent = "Skor " + total + " / 10";
    updateCalcGauge("calc-reuma-ra", total / 10, "Skor ACR/EULAR: " + total + "/10 (" + (isRa ? "Definite RA >=6" : "Belum RA <6") + ")", toneColor);
    var res = document.getElementById("widget-reuma-ra-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        isRa ? "danger" : "info",
        "ra_" + total,
        '<p class="font-bold text-[var(--text-primary)]">Total Skor ACR/EULAR 2010 = ' + total + ' / 10 Poin (' + (isRa ? "Memenuhi Klasifikasi Definite Artritis Reumatoid &ge;6" : "Belum Memenuhi Kriteria RA (&lt;6)") + ')</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Strategi Lini Pertama:</strong> Inisiasi segera <strong>Metotreksat (MTX 7,5–25 mg/minggu) + Asam Folat (&ge;5 mg/minggu)</strong> disertai jembatan kortikosteroid dosis rendah jangka pendek (&le;3 bulan). Wajib skrining TB laten &amp; Hepatitis B/C sebelum eskalasi ke bDMARD/JAKi.</p>'
      );
    }
  }

  function renderReumaRaAcr2010Widget() {
    return '<div class="viz-widget" id="viz-calc-reuma-ra-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Kalkulator Kriteria Klasifikasi ACR/EULAR 2010 Artritis Reumatoid</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="reuma-ra-pill">Skor 8 / 10</span><span class="viz-tag">CUTOFF &ge;6 POIN</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-ra-joint">1. Domain Keterlibatan Sendi (0–5)</label><select id="reuma-ra-joint" class="viz-calc-input" onchange="window.InternaApp.calcReumaRaAcr2010()"><option value="0">1 Sendi Besar (0)</option><option value="1">2–10 Sendi Besar (+1)</option><option value="2">1–3 Sendi Kecil MCP/PIP/MTP (+2)</option><option value="3" selected>4–10 Sendi Kecil (+3)</option><option value="5">&gt;10 Sendi (min. 1 sendi kecil) (+5)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-ra-sero">2. Serologi RF &amp; ACPA / Anti-CCP (0–3)</label><select id="reuma-ra-sero" class="viz-calc-input" onchange="window.InternaApp.calcReumaRaAcr2010()"><option value="0">RF (-) dan ACPA (-) (0)</option><option value="2">Positif Rendah (&le;3x ULN) (+2)</option><option value="3" selected>Positif Tinggi (&gt;3x ULN) (+3)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-ra-acute">3. Reaktan Fase Akut CRP / LED (0–1)</label><select id="reuma-ra-acute" class="viz-calc-input" onchange="window.InternaApp.calcReumaRaAcr2010()"><option value="0">CRP normal &amp; LED normal (0)</option><option value="1" selected>CRP meningkat atau LED meningkat (+1)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-ra-dur">4. Durasi Sinovitis (0–1)</label><select id="reuma-ra-dur" class="viz-calc-input" onchange="window.InternaApp.calcReumaRaAcr2010()"><option value="0">&lt; 6 Minggu (0)</option><option value="1" selected>&ge; 6 Minggu (+1)</option></select></div>' +
      '</div>' +
      renderCalcGaugeSvg("calc-reuma-ra", "SKOR ACR/EULAR 2010 RA", 0.8, "Skor ACR/EULAR: 8/10 (Definite RA >=6)", "var(--accent-coral)", [
        { from: 0, to: 0.6, fill: "var(--accent-primary)", rx: 7, label: "0–5: Belum Definite RA", textFill: "var(--accent-primary)" },
        { from: 0.6, to: 1, fill: "var(--accent-coral)", rx: 7, label: "6–10: Definite RA (MTX Lini 1)", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-reuma-ra-result" class="viz-readout" data-tone="danger" data-last-key="ra_8">' +
        '<p class="font-bold text-[var(--text-primary)]">Total Skor ACR/EULAR 2010 = 8 / 10 Poin (Memenuhi Klasifikasi Definite Artritis Reumatoid &ge;6)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Strategi Lini Pertama:</strong> Inisiasi segera <strong>Metotreksat (MTX 7,5–25 mg/minggu) + Asam Folat (&ge;5 mg/minggu)</strong> disertai jembatan kortikosteroid dosis rendah jangka pendek.</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // W3 (EXTRA). KALKULATOR AKTIVITAS PENYAKIT DAS28-ESR (reuma-1-2)
  // =========================================================================
  function calcReumaDas28() {
    var tjc = clampNum(document.getElementById("reuma-das-tjc")?.value, 0, 28, 8);
    var sjc = clampNum(document.getElementById("reuma-das-sjc")?.value, 0, 28, 6);
    var esr = clampNum(document.getElementById("reuma-das-esr")?.value, 2, 140, 45);
    var vas = clampNum(document.getElementById("reuma-das-vas")?.value, 0, 100, 60);

    var das = 0.56 * Math.sqrt(tjc) + 0.28 * Math.sqrt(sjc) + 0.70 * Math.log(esr) + 0.014 * vas;
    var cat = das < 2.6 ? "Remisi (<2,6)" : (das <= 3.2 ? "Aktivitas Rendah (2,6–3,2)" : (das <= 5.1 ? "Aktivitas Sedang (3,2–5,1)" : "Aktivitas Tinggi (>5,1)"));
    var tone = das > 5.1 ? "danger" : (das > 3.2 ? "warning" : "info");
    var color = das > 5.1 ? "var(--accent-coral)" : (das > 3.2 ? "var(--accent-secondary)" : "var(--accent-primary)");

    var pill = document.getElementById("reuma-das-pill");
    if (pill) pill.textContent = "DAS28: " + das.toFixed(2);
    updateCalcGauge("calc-reuma-das", clampNum(das / 8.5, 0.05, 1, 0.6), "DAS28 = " + das.toFixed(2) + " (" + cat + ")", color);

    var res = document.getElementById("widget-reuma-das-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        tone,
        "das_" + das.toFixed(1),
        '<p class="font-bold text-[var(--text-primary)]">Skor DAS28-ESR = ' + das.toFixed(2) + ' &rarr; ' + cat + '</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Target Treat-to-Target (EULAR/IRA):</strong> Remisi (<strong>DAS28 &lt;2,6</strong>) atau Aktivitas Penyakit Rendah (<strong>&le;3,2</strong>). Evaluasi tiap 1–3 bulan; bila gagal mencapai target dalam 3–6 bulan dengan csDMARD optimal + faktor prognosis buruk (RF/ACPA tinggi, erosi dini), tambahkan <strong>bDMARD atau JAK inhibitor</strong>.</p>'
      );
    }
  }

  function renderReumaDas28Widget() {
    return '<div class="viz-widget" id="viz-calc-reuma-das-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Kalkulator Aktivitas Penyakit DAS28-ESR (Treat-to-Target RA)</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="reuma-das-pill">DAS28: 5.77</span><span class="viz-tag">REMISI &lt;2,6</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-das-tjc">Sendi Nyeri TJC (0–28)</label><input type="number" id="reuma-das-tjc" value="8" min="0" max="28" class="viz-calc-input" oninput="window.InternaApp.calcReumaDas28()" /></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-das-sjc">Sendi Bengkak SJC (0–28)</label><input type="number" id="reuma-das-sjc" value="6" min="0" max="28" class="viz-calc-input" oninput="window.InternaApp.calcReumaDas28()" /></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-das-esr">LED / ESR (mm/jam)</label><input type="number" id="reuma-das-esr" value="45" min="2" max="140" class="viz-calc-input" oninput="window.InternaApp.calcReumaDas28()" /></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-das-vas">Global VAS (0–100 mm)</label><input type="number" id="reuma-das-vas" value="60" min="0" max="100" class="viz-calc-input" oninput="window.InternaApp.calcReumaDas28()" /></div>' +
      '</div>' +
      renderCalcGaugeSvg("calc-reuma-das", "SKOR AKTIVITAS DAS28-ESR", 5.77 / 8.5, "DAS28 = 5.77 (Aktivitas Tinggi >5,1)", "var(--accent-coral)", [
        { from: 0, to: 0.31, fill: "var(--accent-primary)", rx: 7, label: "<2,6: Remisi", textFill: "var(--accent-primary)" },
        { from: 0.31, to: 0.6, fill: "var(--accent-secondary)", label: "2,6–5,1: Rendah/Sedang", textFill: "var(--accent-secondary)" },
        { from: 0.6, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">5,1: Aktivitas Tinggi", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-reuma-das-result" class="viz-readout" data-tone="danger" data-last-key="das_init">' +
        '<p class="font-bold text-[var(--text-primary)]">Skor DAS28-ESR = 5.77 &rarr; Aktivitas Tinggi (&gt;5,1)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">Indikasi eskalasi terapi DMARD menuju target remisi (&lt;2,6) atau aktivitas penyakit rendah (&le;3,2).</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // W4. SIMULATOR SPONDILOARTRITIS AKSIAL (AS vs nr-axSpA vs DISH vs PsA) (reuma-1-3)
  // =========================================================================
  var REUMA_SPA_PROFILES = {
    as: {
      label: "Spondilitis Ankilosa (r-axSpA)",
      sacro: "Sakroiliitis Bilateral Grade >=2 (X-ray)",
      spine: "Sindesmofit Marginal Vertikal Tipis (Bamboo Spine)",
      tx: "OAINS Lini 1 -> Anti-TNF / Anti-IL-17 (MTX Tidak Efektif Aksial!)",
      tone: "danger",
      c1: "Memenuhi kriteria <strong>Modified New York</strong>: nyeri pinggang inflamatorik >3 bulan + keterbatasan Schober (<5 cm) + <strong>sakroiliitis radiologis definitif</strong> (bilateral grade &ge;2 atau unilateral 3–4) dan jembatan sindesmofit vertikal.",
      c2: "Lini 1: <strong>OAINS dosis penuh kontinu</strong> + fisioterapi. Bila gagal &ge;2 OAINS &rarr; langsung <strong>bDMARD (TNFi / IL-17i)</strong>. Ingat: <strong>MTX &amp; Sulfasalazin tidak efektif untuk penyakit aksial murni!</strong>"
    },
    nr_axspa: {
      label: "nr-axSpA (MRI STIR+)",
      sacro: "X-ray Polos Normal, Edema Sumsum Tulang MRI STIR (+)",
      spine: "Belum tampak sindesmofit radiografi polos",
      tx: "OAINS Lini 1 -> Anti-TNF / Anti-IL-17",
      tone: "warning",
      c1: "Stadium dini aksial SpA: pasien memiliki nyeri pinggang inflamatorik + <strong>HLA-B27 (+)</strong> atau <strong>sakroiliitis aktif pada MRI (STIR osteitis subkondral)</strong>, tetapi foto X-ray panggul belum mencapai grade 2 bilateral.",
      c2: "Beban gejala setara dengan AS; tata laksana sama: OAINS lini pertama, eskalasi ke anti-TNF atau anti-IL-17 bila refrakter."
    },
    dish: {
      label: "DISH (Forestier) / OA Spinal",
      sacro: "Sendi Sakroiliaka & Facet Tetap Normal / Terpelihara",
      spine: "Kalsifikasi Mengalir Anterolateral >=4 Vertebra (Flowing Osteophytes)",
      tx: "Manajemen Mekanik & Komorbid Sindrom Metabolik / DM",
      tone: "info",
      c1: "<em>Diffuse Idiopathic Skeletal Hyperostosis</em> pada lansia/DM: kalsifikasi ligamen longitudinal anterior tebal seperti lilin meleleh di &ge;4 vertebra torakal kanan, namun <strong>celah diskus dan sendi sakroiliaka tetap utuh</strong>.",
      c2: "Bukan penyakit autoimun inflamatorik; tidak ada indikasi DMARD maupun biologik."
    },
    psa: {
      label: "Artritis Psoriatik (PsA)",
      sacro: "Sakroiliitis Asimetris + Sindesmofit Non-Marginal Kasar",
      spine: "Keterlibatan DIP, Daktilitis (Sausage Digit) & Pencil-in-Cup X-ray",
      tx: "MTX (Perifer) / Anti-TNF / Anti-IL-17 / Anti-IL-23 (Hindari Steroid Sistemik!)",
      tone: "warning",
      c1: "Kriteria CASPAR: psoriasis kulit/distrofi kuku (<em>pitting nail</em>, onikolisis), daktilitis, entesitis Achilles, artritis DIP, dan gambaran osteolisis falang <strong>pencil-in-cup deformity</strong>.",
      c2: "<strong>Board Pitfall:</strong> Hindari penghentian mendadak kortikosteroid sistemik karena memicu <strong>Psoriasis Pustular Generalisata</strong>!"
    }
  };

  function buildReumaSpaSvg(key) {
    var p = REUMA_SPA_PROFILES[key] || REUMA_SPA_PROFILES.as;
    var bridgeColor = key === "as" ? "var(--accent-coral)" : (key === "dish" ? "var(--accent-secondary)" : "var(--accent-primary)");
    return '<svg class="viz-svg" viewBox="0 0 480 185" role="img" aria-label="Perbandingan Radiografi Spondiloartritis">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">MORFOLOGI VERTEBRA &amp; SENDI SAKROILIAKA</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + bridgeColor + '">' + p.label + '</text>' +
      '<rect x="20" y="28" width="160" height="142" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      // 3 vertebral bodies
      '<rect x="72" y="40" width="56" height="26" rx="4" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2" />' +
      '<rect x="72" y="76" width="56" height="26" rx="4" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2" />' +
      '<rect x="72" y="112" width="56" height="26" rx="4" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="2" />' +
      (key === "as" ? '<path d="M72,66 Q66,71 72,76 M128,66 Q134,71 128,76 M72,102 Q66,107 72,112 M128,102 Q134,107 128,112" fill="none" stroke="var(--accent-coral)" stroke-width="3" />' : '') +
      (key === "dish" ? '<path d="M128,44 C146,58 146,88 128,98 C146,108 146,126 128,136" fill="none" stroke="var(--accent-secondary)" stroke-width="5" />' : '') +
      '<text x="100" y="158" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-secondary)">' + (key === "as" ? "Sindesmofit Marginal (Bamboo)" : (key === "dish" ? "Flowing Osteophytes Anterolateral" : (key === "psa" ? "Pencil-in-Cup + Asimetris" : "Edema MRI STIR Sakroiliaka"))) + '</text>' +
      '<rect x="195" y="28" width="265" height="146" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="210" y="47" font-size="8.2" font-weight="800" fill="var(--text-muted)">SENDI SAKROILIAKA (SIJ)</text>' +
      svgWrap(p.sacro, 210, 61, 42, 11, 'font-size="8.8" font-weight="700" fill="var(--text-primary)"') +
      '<text x="210" y="91" font-size="8.2" font-weight="800" fill="var(--text-muted)">CIRI RADIOLOGIS TULANG BELAKANG</text>' +
      svgWrap(p.spine, 210, 105, 42, 11, 'font-size="8.6" font-weight="700" fill="' + bridgeColor + '"') +
      '<text x="210" y="135" font-size="8.2" font-weight="800" fill="var(--text-muted)">PILIHAN TERAPI UTAMA</text>' +
      svgWrap(p.tx, 210, 149, 44, 11, 'font-size="8.4" font-weight="700" fill="var(--accent-primary)"') +
      '</svg>';
  }

  function renderReumaSpaAxialWidget() {
    var cur = reumaVizState.spaType;
    var p = REUMA_SPA_PROFILES[cur] || REUMA_SPA_PROFILES.as;
    var tabs = Object.keys(REUMA_SPA_PROFILES).map(function (k) {
      return { key: k, label: REUMA_SPA_PROFILES[k].label, onclick: "window.InternaApp.updateReumaSpaViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaSpa",
      title: "Simulator Spondiloartritis Aksial (Bamboo Spine) vs DISH vs PsA",
      tag: "SPONDILOARTROPATI",
      controlsTop: renderCardioTabRow("viz-reumaSpa-tabs", tabs, cur),
      svgHtml: buildReumaSpaSvg(cur),
      info: { tone: p.tone, rKey: "spa_" + cur, title: p.label, c1Label: "Kriteria & Pencitraan", c1Body: p.c1, c2Label: "Prinsip Terapi SpPD", c2Body: p.c2 },
      readoutFooter: ""
    });
  }

  function updateReumaSpaViz(key) {
    if (REUMA_SPA_PROFILES[key]) reumaVizState.spaType = key;
    var cur = reumaVizState.spaType;
    var p = REUMA_SPA_PROFILES[cur];
    syncVizPresets("viz-reumaSpa-tabs", Object.keys(REUMA_SPA_PROFILES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaSpa-frame", buildReumaSpaSvg(cur));
    updateVizReadout("viz-reumaSpa-readout", p.tone, formatVizReadoutHtml(p.label, "Kriteria & Pencitraan", p.c1, "Prinsip Terapi SpPD", p.c2, ""), "spa_" + cur);
  }

  // =========================================================================
  // W5. KALKULATOR KRITERIA ACR/EULAR 2019 SLE (reuma-2-1)
  // =========================================================================
  function calcReumaSleAcr2019() {
    var anaPositive = document.getElementById("reuma-sle-ana")?.value !== "neg";
    var renal = Number(document.getElementById("reuma-sle-renal")?.value ?? 10);
    var muco = Number(document.getElementById("reuma-sle-muco")?.value ?? 6);
    var sero = Number(document.getElementById("reuma-sle-sero")?.value ?? 6);
    var comp = Number(document.getElementById("reuma-sle-comp")?.value ?? 4);
    var hema = document.getElementById("reuma-sle-hema")?.checked ? 4 : 0;
    var joint = document.getElementById("reuma-sle-joint")?.checked ? 6 : 0;

    var rawTotal = renal + muco + sero + comp + hema + joint;
    var validSle = anaPositive && rawTotal >= 10 && (renal + muco + hema + joint) > 0;
    var toneColor = !anaPositive ? "var(--text-muted)" : (validSle ? "var(--accent-coral)" : "var(--accent-secondary)");

    var pill = document.getElementById("reuma-sle-pill");
    if (pill) pill.textContent = !anaPositive ? "ANA (-) Stop" : ("Skor " + rawTotal + " (>=10)");
    updateCalcGauge("calc-reuma-sle", anaPositive ? clampNum(rawTotal / 22, 0.05, 1, 0.5) : 0.04, !anaPositive ? "Entry Criterion ANA <1:80 (Bukan SLE)" : ("Skor Domain: " + rawTotal + " Poin (" + (validSle ? "SLE >=10" : "Belum SLE <10") + ")"), toneColor);

    var res = document.getElementById("widget-reuma-sle-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        !anaPositive ? "warning" : (validSle ? "danger" : "info"),
        "sle2019_" + anaPositive + "_" + rawTotal,
        !anaPositive
          ? '<p class="font-bold text-[var(--text-primary)]">Gerbang Masuk (Entry Criterion) Tidak Terpenuhi: ANA &lt; 1:80</p><p class="mt-1 text-xs text-[var(--text-secondary)]">Berdasarkan ACR/EULAR 2019, pasien dengan ANA negatif (&lt;1:80 pada sel Hep-2) tidak dapat diklasifikasikan sebagai SLE.</p>'
          : '<p class="font-bold text-[var(--text-primary)]">ANA &ge; 1:80 (+) &bull; Skor Total = ' + rawTotal + ' Poin (' + (validSle ? "Memenuhi Klasifikasi SLE ACR/EULAR 2019 &ge;10 Poin" : "Belum Memenuhi Ambang &ge;10 Poin") + ')</p><p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Aturan Domain:</strong> Hanya skor tertinggi dalam tiap domain yang dihitung. <strong>Nefritis Lupus Kelas III/IV biopsi (+10 poin)</strong> langsung memenuhi ambang skor bila ANA &ge;1:80 positif! Semua pasien SLE wajib mendapat <strong>Hidroksiklorokuin (&le;5 mg/kgBB)</strong>.</p>'
      );
    }
  }

  function renderReumaSleAcr2019Widget() {
    return '<div class="viz-widget" id="viz-calc-reuma-sle-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Kalkulator Kriteria Klasifikasi ACR/EULAR 2019 SLE</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="reuma-sle-pill">Skor 30 (>=10)</span><span class="viz-tag">ANA &ge;1:80 + &ge;10 POIN</span></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-sle-ana">Gerbang Masuk Wajib: Titer ANA (Hep-2)</label><select id="reuma-sle-ana" class="viz-calc-input" onchange="window.InternaApp.calcReumaSleAcr2019()"><option value="pos" selected>ANA Positif &ge; 1:80 (Memenuhi Entry)</option><option value="neg">ANA Negatif &lt; 1:80 (Eksklusi)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-sle-renal">Domain Ginjal (Skor Tertinggi 0–10)</label><select id="reuma-sle-renal" class="viz-calc-input" onchange="window.InternaApp.calcReumaSleAcr2019()"><option value="0">Normal (0)</option><option value="4">Proteinuria &gt;0,5 g/24 jam (+4)</option><option value="8">Biopsi Nefritis Lupus Kelas II atau V (+8)</option><option value="10" selected>Biopsi Nefritis Lupus Kelas III atau IV (+10)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-sle-muco">Domain Mukokutan / Serosa (0–6)</label><select id="reuma-sle-muco" class="viz-calc-input" onchange="window.InternaApp.calcReumaSleAcr2019()"><option value="0">Tidak ada (0)</option><option value="2">Alopesia non-sikatrikal / Ulkus oral (+2)</option><option value="4">Lupus kutaneus subakut / diskoid (+4)</option><option value="6" selected>Lupus kutaneus akut (Ruam Malar) / Efusi Perikard (+6)</option></select></div>' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-sle-sero">Antibodi Spesifik SLE (0–6)</label><select id="reuma-sle-sero" class="viz-calc-input" onchange="window.InternaApp.calcReumaSleAcr2019()"><option value="0">Negatif (0)</option><option value="2">Antibodi Antifosfolipid (LA/ACA/b2GPI) (+2)</option><option value="6" selected>Anti-dsDNA (+) atau Anti-Sm (+) (+6)</option></select></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">' +
        '<div><label class="viz-slider-label block mb-1" for="reuma-sle-comp">Komplemen C3 &amp; C4</label><select id="reuma-sle-comp" class="viz-calc-input" onchange="window.InternaApp.calcReumaSleAcr2019()"><option value="0">C3 &amp; C4 Normal (0)</option><option value="3">C3 rendah ATAU C4 rendah (+3)</option><option value="4" selected>C3 rendah DAN C4 rendah (+4)</option></select></div>' +
        renderCalcCheckItem("reuma-sle-hema", "window.InternaApp.calcReumaSleAcr2019()", "AIHA Coombs (+) / Trombositopenia (+4)", { checked: true }) +
        renderCalcCheckItem("reuma-sle-joint", "window.InternaApp.calcReumaSleAcr2019()", "Sinovitis / Nyeri &ge;2 Sendi (+6)", { checked: false }) +
      '</div>' +
      renderCalcGaugeSvg("calc-reuma-sle", "SKOR KLASIFIKASI ACR/EULAR 2019 SLE", 1, "Skor Domain: 30 Poin (SLE >=10)", "var(--accent-coral)", [
        { from: 0, to: 0.45, fill: "var(--accent-primary)", rx: 7, label: "<10: Belum Kriteria SLE", textFill: "var(--accent-primary)" },
        { from: 0.45, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">=10 + ANA >=1:80: Definite SLE", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-reuma-sle-result" class="viz-readout" data-tone="danger" data-last-key="sle_init">' +
        '<p class="font-bold text-[var(--text-primary)]">ANA &ge; 1:80 (+) &bull; Skor Total = 30 Poin (Memenuhi Klasifikasi SLE ACR/EULAR 2019 &ge;10 Poin)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">Nefritis Lupus Kelas III/IV (+10 poin) langsung memenuhi ambang skor klasifikasi bila ANA &ge;1:80 positif.</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // W6 (EXTRA). EVALUATOR AKTIVITAS SLEDAI-2K & DERAJAT FLARE (reuma-2-1)
  // =========================================================================
  function calcReumaSledaiFlare() {
    var score = 0;
    if (document.getElementById("sledai-npsle")?.checked) score += 8;
    if (document.getElementById("sledai-vasc")?.checked) score += 8;
    if (document.getElementById("sledai-renal")?.checked) score += 4;
    if (document.getElementById("sledai-art")?.checked) score += 4;
    if (document.getElementById("sledai-rash")?.checked) score += 2;
    if (document.getElementById("sledai-sero")?.checked) score += 2;
    if (document.getElementById("sledai-comp")?.checked) score += 2;
    if (document.getElementById("sledai-dsdna")?.checked) score += 2;

    var severity = score >= 12 ? "Berat / Mengancam Organ (SLEDAI >=12)" : (score >= 6 ? "Aktivitas Sedang (SLEDAI 6–11)" : "Aktivitas Ringan (SLEDAI <6)");
    var tone = score >= 12 ? "danger" : (score >= 6 ? "warning" : "info");
    var color = score >= 12 ? "var(--accent-coral)" : (score >= 6 ? "var(--accent-secondary)" : "var(--accent-primary)");

    var pill = document.getElementById("reuma-sledai-pill");
    if (pill) pill.textContent = "SLEDAI: " + score;
    updateCalcGauge("calc-reuma-sledai", clampNum(score / 24, 0.05, 1, 0.6), "SLEDAI-2K = " + score + " (" + severity + ")", color);

    var res = document.getElementById("widget-reuma-sledai-result");
    if (res) {
      updateCalcReadoutTone(
        res,
        tone,
        "sledai_" + score,
        '<p class="font-bold text-[var(--text-primary)]">Skor SLEDAI-2K = ' + score + ' Poin &rarr; ' + severity + '</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]">' + (score >= 12 ? '<strong>Indikasi Terapi Induksi Agresif:</strong> Metilprednisolon pulse IV 250–1.000 mg/hari &times; 3 hari + <strong>MMF 2–3 g/hari</strong> atau <strong>Siklofosfamid IV (Euro-Lupus)</strong>.' : (score >= 6 ? '<strong>Manajemen Flare Sedang:</strong> HCQ + Prednison dosis sedang + imunosupresan hemat steroid (Azatioprin / MTX / MMF).' : '<strong>Manajemen Ringan:</strong> Lanjutkan Hidroksiklorokuin &le;5 mg/kgBB/hari &plusmn; OAINS/steroid dosis rendah.')) + ' <em>Ingat: Pada flare lupus murni, C3/C4 turun dan LED naik tetapi CRP biasanya normal (CRP tinggi curigai infeksi bakterial/serositis!).</em></p>'
      );
    }
  }

  function renderReumaSledaiFlareWidget() {
    return '<div class="viz-widget" id="viz-calc-reuma-sledai-card">' +
      '<div class="viz-header">' +
        '<span class="viz-title">Evaluator Aktivitas SLEDAI-2K &amp; Derajat Flare Lupus</span>' +
        '<div class="viz-slider-meta"><span class="viz-value-pill" id="reuma-sledai-pill">SLEDAI: 16</span><span class="viz-tag">BERAT &ge;12</span></div>' +
      '</div>' +
      '<div class="viz-calc-grid mb-2">' +
        renderCalcCheckItem("sledai-npsle", "window.InternaApp.calcReumaSledaiFlare()", "Kejang / Psikosis / Mielitis NPSLE (+8)", { checked: true }) +
        renderCalcCheckItem("sledai-vasc", "window.InternaApp.calcReumaSledaiFlare()", "Vaskulitis Lupus Ulseratif (+8)") +
        renderCalcCheckItem("sledai-renal", "window.InternaApp.calcReumaSledaiFlare()", "Proteinuria Baru &gt;0,5g / Silinder (+4)", { checked: true }) +
        renderCalcCheckItem("sledai-art", "window.InternaApp.calcReumaSledaiFlare()", "Artritis Aktif &ge;2 Sendi (+4)") +
        renderCalcCheckItem("sledai-rash", "window.InternaApp.calcReumaSledaiFlare()", "Ruam Lupus Baru / Ulkus Oral (+2)") +
        renderCalcCheckItem("sledai-sero", "window.InternaApp.calcReumaSledaiFlare()", "Pleuritis / Perikarditis (+2)") +
        renderCalcCheckItem("sledai-comp", "window.InternaApp.calcReumaSledaiFlare()", "Komplemen C3 / C4 Turun (+2)", { checked: true }) +
        renderCalcCheckItem("sledai-dsdna", "window.InternaApp.calcReumaSledaiFlare()", "Titer Anti-dsDNA Meningkat (+2)", { checked: true }) +
      '</div>' +
      renderCalcGaugeSvg("calc-reuma-sledai", "STRATIFIKASI AKTIVITAS SLEDAI-2K", 16 / 24, "SLEDAI-2K = 16 (Berat / Mengancam Organ)", "var(--accent-coral)", [
        { from: 0, to: 0.25, fill: "var(--accent-primary)", rx: 7, label: "<6: Ringan", textFill: "var(--accent-primary)" },
        { from: 0.25, to: 0.5, fill: "var(--accent-secondary)", label: "6–11: Sedang", textFill: "var(--accent-secondary)" },
        { from: 0.5, to: 1, fill: "var(--accent-coral)", rx: 7, label: ">=12: Berat (Pulse MP + MMF/CYC)", textFill: "var(--accent-coral)" }
      ]) +
      '<div id="widget-reuma-sledai-result" class="viz-readout" data-tone="danger" data-last-key="sledai_16">' +
        '<p class="font-bold text-[var(--text-primary)]">Skor SLEDAI-2K = 16 Poin &rarr; Berat / Mengancam Organ (SLEDAI &ge;12)</p>' +
        '<p class="mt-1 text-xs text-[var(--text-secondary)]"><strong>Indikasi Terapi Induksi Agresif:</strong> Metilprednisolon pulse IV 250–1.000 mg/hari &times; 3 hari + MMF atau Siklofosfamid IV.</p>' +
      '</div>' +
    '</div>';
  }

  // =========================================================================
  // W7. SIMULATOR KEAMANAN OBAT SLE KEHAMILAN & LUPUS NEONATAL (reuma-2-2)
  // =========================================================================
  var REUMA_PREG_GROUPS = {
    safe: {
      label: "Aman Kehamilan (Lanjutkan!)",
      drugs: "Hidroksiklorokuin (HCQ), Azatioprin (<=2 mg/kg), Siklosporin, Takrolimus, Prednison dosis rendah, Aspirin + LMWH",
      tone: "info",
      title: "Regimen Aman pada Kehamilan SLE & Nefritis Lupus",
      c1: "Syarat kehamilan ideal: <strong>remisi minimal 6 bulan</strong> sebelum konsepsi. <strong>Hidroksiklorokuin WAJIB dilanjutkan</strong> selama hamil karena mencegah flare lupus, menurunkan preeklamsia, dan menurunkan 50% risiko blok jantung janin.",
      c2: "Jika pasien Nefritis Lupus memakai MMF sebelum hamil, <strong>ganti MMF ke Azatioprin atau Siklosporin/Takrolimus minimal 6 minggu sebelum konsepsi</strong>. Tambahkan Aspirin dosis rendah mulai minggu ke-12 untuk profilaksis preeklamsia."
    },
    teratogenic: {
      label: "KONTRAINDIKASI (Teratogenik!)",
      drugs: "Mikofenolat Mofetil (MMF), Metotreksat (MTX), Siklofosfamid (CYC), Leflunomid, ACEi / ARB",
      tone: "danger",
      title: "Obat Teratogenik Mutlak — Wajib Dihentikan Sebelum Konsepsi!",
      c1: "<strong>MMF</strong> memicu embriopati berat (mikrotia, celah bibir-langit, malformasi jantung; stop &ge;6 minggu pra-hamil). <strong>Metotreksat</strong> memicu abortus &amp; sindrom aminopterin (stop &ge;3 bulan). <strong>Leflunomid</strong> wajib <em>washout</em> dengan Kolestiramin 8g 3x/hari &times; 11 hari.",
      c2: "Pada pasien nefritis lupus dengan hipertensi/proteinuria yang hamil, <strong>hentikan ACE inhibitor / ARB segera</strong> saat tes kehamilan positif (risiko agenesis ginjal janin &amp; oligohidramnion); ganti ke Nifedipin/Metildopa/Labetalol."
    },
    neonatal_chb: {
      label: "Anti-Ro/SSA & Blok Jantung Janin",
      drugs: "Transfer Pasif IgG Anti-Ro/SSA & Anti-La/SSB (Minggu 16–26 Gestasi)",
      tone: "warning",
      title: "Lupus Neonatal & Blok Jantung Kongenital (Complete Heart Block)",
      c1: "Autoantibodi <strong>Anti-Ro/SSA dan Anti-La/SSB</strong> menembus plasenta mulai usia kehamilan 16 minggu dan memicu inflamasi-fibrosis nodus AV janin &rarr; bradikardia janin menetap (DJJ 50–70x/mnt).",
      c2: "Lakukan pemantauan <strong>Ekokardiografi Janin (PR interval) mingguan pada usia 16–26 minggu</strong>. Ruam lupus neonatal bersifat transien (hilang dalam 6 bulan), tetapi <strong>blok jantung derajat 3 bersifat IREVERSIBEL</strong> (butuh pacu jantung neonatus)!"
    }
  };

  function buildReumaPregSvg(key) {
    var g = REUMA_PREG_GROUPS[key] || REUMA_PREG_GROUPS.safe;
    var badgeCol = g.tone === "danger" ? "var(--accent-coral)" : (g.tone === "warning" ? "var(--accent-secondary)" : "var(--viz-green)");
    return '<svg class="viz-svg" viewBox="0 0 480 175" role="img" aria-label="Keamanan Obat SLE Kehamilan">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">MATRIKS FARMAKOTERAPI KEHAMILAN PADA PENYAKIT REUMATIK AUTOIMUN</text>' +
      '<rect x="20" y="28" width="440" height="68" rx="12" fill="var(--bg-surface-subtle)" stroke="' + badgeCol + '" stroke-width="1.6" />' +
      '<text x="240" y="46" text-anchor="middle" font-size="9" font-weight="800" fill="' + badgeCol + '">' + g.label.toUpperCase() + '</text>' +
      svgWrap(g.drugs, 240, 64, 62, 13, 'text-anchor="middle" font-size="9.2" font-weight="800" fill="var(--text-primary)"') +
      '<rect x="20" y="106" width="212" height="58" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="126" font-size="8.5" font-weight="800" fill="var(--text-muted)">SYARAT KEHAMILAN SLE</text>' +
      '<text x="32" y="144" font-size="9.2" font-weight="700" fill="var(--accent-primary)">Remisi Klinis &ge; 6 Bulan + HCQ Lanjut</text>' +
      '<rect x="248" y="106" width="212" height="58" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="126" font-size="8.5" font-weight="800" fill="var(--text-muted)">PROFILAKSIS APS OBSTETRIK</text>' +
      '<text x="260" y="144" font-size="9.2" font-weight="700" fill="var(--accent-coral)">LMWH + Aspirin Dosis Rendah (80–100 mg)</text>' +
      '</svg>';
  }

  function renderReumaSlePregnancyWidget() {
    var cur = reumaVizState.pregGroup;
    var g = REUMA_PREG_GROUPS[cur] || REUMA_PREG_GROUPS.safe;
    var tabs = Object.keys(REUMA_PREG_GROUPS).map(function (k) {
      return { key: k, label: REUMA_PREG_GROUPS[k].label, onclick: "window.InternaApp.updateReumaSlePregViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaPreg",
      title: "Simulator Keamanan Imunosupresan Kehamilan & Lupus Neonatal",
      tag: "SLE & KEHAMILAN",
      controlsTop: renderCardioTabRow("viz-reumaPreg-tabs", tabs, cur),
      svgHtml: buildReumaPregSvg(cur),
      info: { tone: g.tone, rKey: "preg_" + cur, title: g.title, c1Label: "Panduan Obat & Konsepsi", c1Body: g.c1, c2Label: "Tindakan Spesifik", c2Body: g.c2 },
      readoutFooter: ""
    });
  }

  function updateReumaSlePregViz(key) {
    if (REUMA_PREG_GROUPS[key]) reumaVizState.pregGroup = key;
    var cur = reumaVizState.pregGroup;
    var g = REUMA_PREG_GROUPS[cur];
    syncVizPresets("viz-reumaPreg-tabs", Object.keys(REUMA_PREG_GROUPS).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaPreg-frame", buildReumaPregSvg(cur));
    updateVizReadout("viz-reumaPreg-readout", g.tone, formatVizReadoutHtml(g.title, "Panduan Obat & Konsepsi", g.c1, "Tindakan Spesifik", g.c2, ""), "preg_" + cur);
  }

  // =========================================================================
  // W8. ATLAS KAPILAROSKOPI LIPAT KUKU & SUBTIPE SSc (reuma-2-3)
  // =========================================================================
  var REUMA_SSC_SUBTYPES = {
    normal_raynaud: { label: "Raynaud Primer", ab: "ANA Negatif, LED Normal", cap: "Loop Kapiler Hairpin Rapi Seragam", organ: "Tidak ada ulkus digital / fibrosis organ", tone: "info", tx: "Penghangat tangan + CCB Dihidropiridin (Nifedipin/Amlodipin)" },
    lcssc: { label: "lcSSc (CREST)", ab: "Anti-Centromere (CENP-B) (+)", cap: "Giant Capillaries (Megakapiler Dilatasi)", organ: "Kulit distal siku/lutut + Risiko Tinggi PAH", tone: "warning", tx: "Skrining Ekokardiografi PAH tahunan; Sildenafil/Bosentan untuk ulkus digital & PAH" },
    dcssc_ild: { label: "dcSSc + ILD", ab: "Anti-Scl-70 (Topoisomerase I) (+)", cap: "Perdarahan Mikro & Area Avaskular", organ: "Fibrosis kulit proksimal/trunkus + ILD (NSIP)", tone: "danger", tx: "Imunosupresi ILD: Mikofenolat Mofetil (MMF) / Siklofosfamid / Nintedanib / Tocilizumab" },
    dcssc_src: { label: "Krisis Renal (SRC)", ab: "Anti-RNA Polymerase III (+)", cap: "Destruksi Kapiler Masif & Ramifikasi", organ: "Hipertensi Maligna + AKI Oligurik + MAHA", tone: "danger", tx: "CAPTOPRIL (ACEi) Lini Pertama Cito! HINDARI Steroid Dosis Tinggi (>15 mg/hari)!" }
  };

  function buildReumaSscSvg(key) {
    var s = REUMA_SSC_SUBTYPES[key] || REUMA_SSC_SUBTYPES.dcssc_src;
    var loopsHtml = "";
    if (key === "normal_raynaud") {
      loopsHtml = '<path d="M55,140 L55,80 A8,8 0 0,1 71,80 L71,140 M95,140 L95,80 A8,8 0 0,1 111,80 L111,140 M135,140 L135,80 A8,8 0 0,1 151,80 L151,140 M175,140 L175,80 A8,8 0 0,1 191,80 L191,140" fill="none" stroke="var(--accent-primary)" stroke-width="2.6" />';
    } else if (key === "lcssc") {
      loopsHtml = '<path d="M60,142 L60,82 A20,20 0 0,1 100,82 L100,142 M135,142 L135,80 A22,22 0 0,1 179,80 L179,142" fill="none" stroke="var(--accent-secondary)" stroke-width="5.5" />';
    } else {
      loopsHtml = '<path d="M58,142 L58,95 A16,16 0 0,1 90,95 L90,142" fill="none" stroke="var(--accent-coral)" stroke-width="4.5" />' +
        '<circle cx="74" cy="62" r="6" fill="var(--accent-coral)" /><circle cx="92" cy="68" r="5" fill="var(--accent-coral)" />' +
        '<rect x="115" y="70" width="78" height="65" rx="6" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-dasharray="4,3" />' +
        '<text x="154" y="106" text-anchor="middle" font-size="8.2" font-weight="800" fill="var(--accent-coral)">ZONA AVASKULAR</text>';
    }
    return '<svg class="viz-svg" viewBox="0 0 480 185" role="img" aria-label="Atlas Kapilaroskopi Sklerosis Sistemik">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">KAPILAROSKOPI LIPAT KUKU &amp; PROFIL ANTIBODI SSc</text>' +
      '<rect x="25" y="28" width="195" height="142" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      loopsHtml +
      '<text x="122" y="160" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-secondary)">' + s.cap + '</text>' +
      '<rect x="235" y="28" width="225" height="150" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="248" y="47" font-size="8.2" font-weight="800" fill="var(--text-muted)">PENANDA AUTOANTIBODI</text>' +
      svgWrap(s.ab, 248, 61, 34, 11, 'font-size="9.4" font-weight="800" fill="var(--accent-coral)"') +
      '<text x="248" y="88" font-size="8.2" font-weight="800" fill="var(--text-muted)">KOMPLIKASI ORGAN DOMINAN</text>' +
      svgWrap(s.organ, 248, 102, 36, 11, 'font-size="8.6" font-weight="700" fill="var(--text-primary)"') +
      '<text x="248" y="132" font-size="8.2" font-weight="800" fill="var(--text-muted)">PRINSIP TERAPI</text>' +
      svgWrap(s.tx, 248, 146, 36, 11, 'font-size="8.3" font-weight="700" fill="var(--accent-primary)"') +
      '</svg>';
  }

  function renderReumaSscCapillaroscopyWidget() {
    var cur = reumaVizState.sscSub;
    var s = REUMA_SSC_SUBTYPES[cur] || REUMA_SSC_SUBTYPES.dcssc_src;
    var tabs = Object.keys(REUMA_SSC_SUBTYPES).map(function (k) {
      return { key: k, label: REUMA_SSC_SUBTYPES[k].label, onclick: "window.InternaApp.updateReumaSscViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaSsc",
      title: "Atlas Kapilaroskopi Lipat Kuku & Pembeda lcSSc vs dcSSc",
      tag: "SKLERODERMA",
      controlsTop: renderCardioTabRow("viz-reumaSsc-tabs", tabs, cur),
      svgHtml: buildReumaSscSvg(cur),
      info: { tone: s.tone, rKey: "ssc_" + cur, title: s.label + " — " + s.ab, c1Label: "Temuan Kapilaroskopi & Organ", c1Body: s.cap + " &bull; " + s.organ, c2Label: "Tatalaksana Spesifik", c2Body: s.tx },
      readoutFooter: ""
    });
  }

  function updateReumaSscViz(key) {
    if (REUMA_SSC_SUBTYPES[key]) reumaVizState.sscSub = key;
    var cur = reumaVizState.sscSub;
    var s = REUMA_SSC_SUBTYPES[cur];
    syncVizPresets("viz-reumaSsc-tabs", Object.keys(REUMA_SSC_SUBTYPES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaSsc-frame", buildReumaSscSvg(cur));
    updateVizReadout("viz-reumaSsc-readout", s.tone, formatVizReadoutHtml(s.label + " — " + s.ab, "Temuan Kapilaroskopi & Organ", s.cap + " &bull; " + s.organ, "Tatalaksana Spesifik", s.tx, ""), "ssc_" + cur);
  }

  // =========================================================================
  // W9. SIMULATOR MIOPATI INFLAMATORIK & PANEL ANTIBODI MSA (reuma-2-4)
  // =========================================================================
  var REUMA_MYO_PANELS = {
    jo1: { label: "Anti-Jo-1 (Anti-Sintetase)", rash: "Mechanic's Hands (Fisura Sisi Jari) + Raynaud", organ: "Trias: Miositis + ILD (NSIP/UIP) + Artritis Non-Erosif", tone: "danger", tx: "Kortikosteroid + MMF / Takrolimus / Rituximab / Siklofosfamid untuk ILD" },
    mi2: { label: "Anti-Mi-2 (DM Klasik)", rash: "Papul Gottron, Heliotrope Rash, Shawl & V-Sign", organ: "Kelemahan Otot Proksimal Simetris (CK Naik 10–50x), Risiko ILD Rendah", tone: "info", tx: "Respons Sangat Baik terhadap Prednison 1 mg/kgBB + Azatioprin / MTX" },
    mda5: { label: "Anti-MDA5 (RP-ILD)", rash: "Ulkus Kutaneus Dalam & Palmar Papules (Sering Amiopatik)", organ: "Rapidly Progressive ILD (RP-ILD) Fatal dengan CK Normal/Sedikit Naik", tone: "danger", tx: "Kombinasi Imunosupresi Tripel Dini (Steroid Dosis Tinggi + Takrolimus + Siklofosfamid/Rituximab)" },
    tif1g: { label: "Anti-TIF1-gamma / NXP2", rash: "Ruam Dermatomiositis Luas & Disfagia Berat", organ: "Asosiasi Sangat Kuat dengan Keganasan Okulta (Paraneoplastik)", tone: "danger", tx: "WAJIB Skrining Kanker Komprehensif (CT Toraks-Abdomen-Pelvis, Nasofaring/KNF, Mamografi, Kolonoskopi)" },
    hmgcr: { label: "Anti-HMGCR / Anti-SRP (IMNM)", rash: "Minimal / Tanpa Ruam Kulit", organ: "Nekrosis Serat Otot Berat Pasca-Statin (CK >5.000–10.000 U/L), Menetap Meski Statin Dihentikan!", tone: "warning", tx: "Hentikan Statin + Wajib Imunosupresi (Steroid + IVIg + MTX/Rituximab)" }
  };

  function buildReumaMyoSvg(key) {
    var m = REUMA_MYO_PANELS[key] || REUMA_MYO_PANELS.jo1;
    var badgeCol = m.tone === "danger" ? "var(--accent-coral)" : (m.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)");
    return '<svg class="viz-svg" viewBox="0 0 480 175" role="img" aria-label="Panel Autoantibodi Miopati Inflamatorik">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PROFIL MYOSITIS-SPECIFIC ANTIBODIES (MSA) &amp; FENOTIPE ORGAN</text>' +
      '<rect x="20" y="28" width="440" height="44" rx="10" fill="var(--bg-surface-subtle)" stroke="' + badgeCol + '" stroke-width="1.5" />' +
      '<text x="240" y="54" text-anchor="middle" font-size="11.5" font-weight="800" fill="' + badgeCol + '">' + m.label + '</text>' +
      '<rect x="20" y="82" width="212" height="82" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="101" font-size="8.4" font-weight="800" fill="var(--text-muted)">MANIFESTASI KULIT KHAS</text>' +
      svgWrap(m.rash, 32, 118, 33, 12, 'font-size="8.6" font-weight="700" fill="var(--text-primary)"') +
      '<rect x="248" y="82" width="212" height="82" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="101" font-size="8.4" font-weight="800" fill="var(--text-muted)">TARGET ORGAN &amp; RISIKO UTAMA</text>' +
      svgWrap(m.organ, 260, 118, 33, 12, 'font-size="8.5" font-weight="700" fill="' + badgeCol + '"') +
      '</svg>';
  }

  function renderReumaMyositisPanelWidget() {
    var cur = reumaVizState.myoAb;
    var m = REUMA_MYO_PANELS[cur] || REUMA_MYO_PANELS.jo1;
    var tabs = Object.keys(REUMA_MYO_PANELS).map(function (k) {
      return { key: k, label: REUMA_MYO_PANELS[k].label, onclick: "window.InternaApp.updateReumaMyoViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaMyo",
      title: "Simulator Fenotipe Miopati Inflamatorik & Panel Autoantibodi (MSA)",
      tag: "MIOPATI AUTOIMUN",
      controlsTop: renderCardioTabRow("viz-reumaMyo-tabs", tabs, cur),
      svgHtml: buildReumaMyoSvg(cur),
      info: { tone: m.tone, rKey: "myo_" + cur, title: m.label, c1Label: "Fenotipe Klinis & Kulit", c1Body: m.rash + " &bull; " + m.organ, c2Label: "Strategi Manajemen", c2Body: m.tx },
      readoutFooter: ""
    });
  }

  function updateReumaMyoViz(key) {
    if (REUMA_MYO_PANELS[key]) reumaVizState.myoAb = key;
    var cur = reumaVizState.myoAb;
    var m = REUMA_MYO_PANELS[cur];
    syncVizPresets("viz-reumaMyo-tabs", Object.keys(REUMA_MYO_PANELS).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaMyo-frame", buildReumaMyoSvg(cur));
    updateVizReadout("viz-reumaMyo-readout", m.tone, formatVizReadoutHtml(m.label, "Fenotipe Klinis & Kulit", m.rash + " &bull; " + m.organ, "Strategi Manajemen", m.tx, ""), "myo_" + cur);
  }

  // =========================================================================
  // W10. SIMULATOR MIKROSKOP POLARISASI KRISTAL MSU vs CPPD (reuma-3-1, rAF: reumaCrystal)
  // =========================================================================
  function buildReumaCrystalSvg(angle, cType) {
    var a = clampNum(angle, 0, 90, 0);
    var isMsu = cType === "msu";
    var isParallel = a < 45;
    // MSU: parallel = Yellow, perpendicular = Blue. CPPD: parallel = Blue, perpendicular = Yellow.
    var crystalYellow = (isMsu && isParallel) || (!isMsu && !isParallel);
    var cColor = crystalYellow ? "#F59E0B" : "#007AFF";
    var cColorName = crystalYellow ? "KUNING (Yellow)" : "BIRU (Blue)";
    var orientLabel = isParallel ? "Sejajar Sumbu Kompensator (0°)" : "Tegak Lurus Sumbu Kompensator (90°)";

    var shapeSvg = isMsu
      ? '<polygon points="65,105 155,100 225,105 155,110" fill="' + cColor + '" stroke="#FFFFFF" stroke-width="1.2" transform="rotate(' + (-a) + ' 145 105)" />'
      : '<polygon points="110,92 175,88 182,118 117,122" fill="' + cColor + '" fill-opacity="0.88" stroke="#FFFFFF" stroke-width="1.5" transform="rotate(' + (-a) + ' 145 105)" />';

    return '<svg class="viz-svg" viewBox="0 0 480 205" role="img" aria-label="Simulator Mikroskop Polarisasi Kristal">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">LENSA MIKROSKOP POLARISASI KOMPENSATOR MERAH</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + cColor + '">Sudut ' + Math.round(a) + '&deg; &bull; Warna: ' + cColorName + '</text>' +
      '<circle cx="145" cy="108" r="76" fill="#7F1D1D" fill-opacity="0.82" stroke="var(--border-strong)" stroke-width="2.5" />' +
      // Axis of slow vibration (horizontal arrow)
      '<line x1="80" y1="162" x2="210" y2="162" stroke="#FCA5A5" stroke-width="2" />' +
      '<text x="145" y="175" text-anchor="middle" font-size="7.8" font-weight="800" fill="#FECACA">Sumbu Kompensator Lambat (&rarr;)</text>' +
      shapeSvg +
      '<rect x="245" y="32" width="215" height="152" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="54" font-size="8.6" font-weight="800" fill="var(--text-muted)">JENIS KRISTAL &amp; MORFOLOGI</text>' +
      '<text x="260" y="71" font-size="10.5" font-weight="800" fill="var(--text-primary)">' + (isMsu ? "MSU (Gout) — Jarum Tajam" : "CPPD (Pseudogout) — Romboid") + '</text>' +
      '<text x="260" y="97" font-size="8.6" font-weight="800" fill="var(--text-muted)">SIKAP BIREFRINGENCE</text>' +
      '<text x="260" y="113" font-size="9.5" font-weight="800" fill="' + cColor + '">' + (isMsu ? "Strong Negative Birefringence" : "Weakly Positive Birefringence") + '</text>' +
      '<text x="260" y="139" font-size="8.6" font-weight="800" fill="var(--text-muted)">ORIENTASI SAAT INI</text>' +
      '<text x="260" y="155" font-size="8.8" font-weight="700" fill="var(--text-secondary)">' + orientLabel + '</text>' +
      '<text x="260" y="172" font-size="8.8" font-weight="800" fill="' + cColor + '">Tampak Berwarna ' + cColorName + '</text>' +
      '</svg>';
  }

  function getReumaCrystalInfo(angle, cType) {
    var isMsu = cType === "msu";
    if (isMsu) {
      return {
        tone: "danger",
        rKey: "crys_msu_" + (angle < 45 ? "par" : "perp"),
        title: "Kristal Monosodium Urat (MSU) — Artritis Gout",
        c1Label: "Prinsip Polarisasi Kompensator",
        c1Body: "Kristal berbentuk <strong>jarum tajam</strong> dengan <strong>birefringensi negatif kuat</strong>: tampak <strong>KUNING saat sejajar</strong> sumbu kompensator (0&deg;) dan <strong>BIRU saat tegak lurus</strong> (90&deg;).",
        c2Label: "Aturan Emas Terapi Gout",
        c2Body: "Serangan akut: Kolkisin dosis rendah (1,0 mg lalu 0,5 mg 1 jam kemudian), OAINS, atau Steroid (injeksi IA/oral pada CKD). <strong>Jangan hentikan Alopurinol rutin saat serangan akut!</strong> Target asam urat &lt;6 mg/dL (&lt;5 mg/dL bila bertofus)."
      };
    }
    return {
      tone: "warning",
      rKey: "crys_cppd_" + (angle < 45 ? "par" : "perp"),
      title: "Kristal Calcium Pyrophosphate (CPPD) — Pseudogout",
      c1Label: "Prinsip Polarisasi Kompensator",
      c1Body: "Kristal berbentuk <strong>romboid / batang tumpul</strong> dengan <strong>birefringensi positif lemah</strong>: tampak <strong>BIRU saat sejajar</strong> sumbu kompensator (0&deg;) dan <strong>KUNING saat tegak lurus</strong> (90&deg;).",
      c2Label: "Korelasi Klinis & Skrining 4H",
      c2Body: "Predileksi sendi lutut &amp; pergelangan tangan disertai kalsifikasi kartilago (<em>chondrocalcinosis</em>). Pada pasien usia muda, wajib skrining <strong>4H: Hyperparathyroidism, Hemochromatosis, Hypomagnesemia, Hypophosphatasia</strong>."
    };
  }

  function renderReumaCrystalPolarWidget() {
    var a = reumaVizState.crystalAngle;
    var t = reumaVizState.crystalType;
    var info = getReumaCrystalInfo(a, t);
    var top = renderCardioTabRow("viz-reumaCrystal-tabs", [
      { key: "msu", label: "Kristal MSU (Gout — Jarum)", onclick: "window.InternaApp.updateReumaCrystalViz(null, 'msu', true)" },
      { key: "cppd", label: "Kristal CPPD (Pseudogout — Romboid)", onclick: "window.InternaApp.updateReumaCrystalViz(null, 'cppd', true)" }
    ], t);
    var bottom = renderCardioSliderBlock({
      key: "reumaCrystal",
      label: "Sudut Rotasi Kristal terhadap Sumbu Kompensator (&deg;)",
      pillText: Math.round(a) + "&deg;",
      min: 0, max: 90, step: 5, value: a,
      trackBg: "linear-gradient(90deg, #F59E0B 0%, #007AFF 100%)",
      oninput: "window.InternaApp.updateReumaCrystalViz(this.value, null, true)",
      presets: [
        { val: 0, label: "0° (Sejajar Kompensator)", active: Math.round(a) === 0 },
        { val: 90, label: "90° (Tegak Lurus)", active: Math.round(a) === 90 }
      ]
    });
    return renderCardioWidgetCard({
      key: "reumaCrystal",
      title: "Simulator Mikroskop Polarisasi Kompensator Merah (MSU vs CPPD)",
      tag: "ARTROPATI KRISTAL",
      controlsTop: top,
      svgHtml: buildReumaCrystalSvg(a, t),
      controlsBottom: bottom,
      info: info,
      readoutFooter: ""
    });
  }

  function updateReumaCrystalViz(angleVal, typeVal, cancelAnim) {
    if (cancelAnim !== false && R.viz && typeof R.viz.stopVizWalkthrough === "function") {
      R.viz.stopVizWalkthrough("reumaCrystal");
    }
    if (angleVal !== null && angleVal !== undefined) reumaVizState.crystalAngle = clampNum(angleVal, 0, 90, 0);
    if (typeVal === "msu" || typeVal === "cppd") reumaVizState.crystalType = typeVal;
    var a = reumaVizState.crystalAngle;
    var t = reumaVizState.crystalType;
    syncVizPresets("viz-reumaCrystal-tabs", [t === "msu", t === "cppd"]);
    syncSliderAndPill("viz-reumaCrystal-slider", "viz-reumaCrystal-pill", a, Math.round(a) + "°");
    syncVizPresets("viz-reumaCrystal-presets", [Math.round(a) === 0, Math.round(a) === 90]);
    swapVizSvgFrame("viz-reumaCrystal-frame", buildReumaCrystalSvg(a, t));
    var info = getReumaCrystalInfo(a, t);
    updateVizReadout("viz-reumaCrystal-readout", info.tone, formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""), info.rKey);
  }

  // =========================================================================
  // W11. SIMULATOR PROBABILITAS ARTRITIS SEPTIK & DRAINASE (reuma-3-2)
  // =========================================================================
  function buildReumaSepticSvg(wbc, sType) {
    var w = clampNum(wbc, 10, 150, 75);
    var isNongono = sType === "nongono";
    var col = w >= 50 ? "var(--accent-coral)" : (w >= 25 ? "var(--accent-secondary)" : "var(--accent-primary)");
    var pct = clampNum((w - 10) / 140, 0.05, 1, 0.5);
    var barW = (pct * 400).toFixed(1);

    return '<svg class="viz-svg" viewBox="0 0 480 185" role="img" aria-label="Probabilitas Artritis Septik">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">HITUNG LEUKOSIT SINOVIAL &amp; PROTOKOL DRAINASE EMERGENSI</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10.5" font-weight="800" fill="' + col + '">' + w + '.000 /mm&sup3; (PMN &gt;90%)</text>' +
      '<rect x="40" y="28" width="400" height="14" rx="7" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<rect x="40" y="28" width="' + barW + '" height="14" rx="7" fill="' + col + '" class="viz-smooth-bar" />' +
      '<text x="40" y="55" font-size="8" font-weight="700" fill="var(--text-muted)">&lt;25.000: Risiko Rendah</text>' +
      '<text x="220" y="55" text-anchor="middle" font-size="8" font-weight="700" fill="var(--accent-secondary)">&gt;50.000: Sangat Curiga Septik</text>' +
      '<text x="440" y="55" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">&gt;100.000: Septik Pasti</text>' +
      '<rect x="20" y="70" width="212" height="102" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="89" font-size="8.4" font-weight="800" fill="var(--text-muted)">PATOGEN &amp; PRESENTASI</text>' +
      '<text x="32" y="106" font-size="9.4" font-weight="800" fill="var(--text-primary)">' + (isNongono ? "S. aureus / Strept. / Gram (-)" : "Neisseria gonorrhoeae (DGI)") + '</text>' +
      svgWrap(isNongono ? "Monoartritis destruktif lutut/panggul, kultur sinovial (+) >85%" : "Trias: Poliartralgia migratorik + Tenosinovitis + Pustul akral", 32, 124, 34, 11.5, 'font-size="8.2" font-weight="600" fill="var(--text-secondary)"') +
      '<rect x="248" y="70" width="212" height="102" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="89" font-size="8.4" font-weight="800" fill="var(--text-muted)">TERAPI EMPIRIS + DRAINASE</text>' +
      '<text x="260" y="106" font-size="9.3" font-weight="800" fill="var(--accent-coral)">' + (isNongono ? "Vankomisin + Seftriakson/Cefepime" : "Seftriakson 1–2 g IV/IM tiap 24j") + '</text>' +
      svgWrap(isNongono ? "Wajib Aspirasi Harian / Artroskopi / Artrotomi!" : "Wajib NAAT Urin/Serviks/Uretra (kultur sendi sering negatif)", 260, 124, 34, 11.5, 'font-size="8.2" font-weight="700" fill="var(--accent-primary)"') +
      '</svg>';
  }

  function renderReumaSepticJointWidget() {
    var w = reumaVizState.septicWbc;
    var t = reumaVizState.septicType;
    var top = renderCardioTabRow("viz-reumaSeptic-tabs", [
      { key: "nongono", label: "Nongonokokal (S. aureus / Gram -)", onclick: "window.InternaApp.updateReumaSepticViz(null, 'nongono')" },
      { key: "dgi", label: "Gonokokal Diseminata (DGI)", onclick: "window.InternaApp.updateReumaSepticViz(null, 'dgi')" }
    ], t);
    var bottom = '<div class="viz-controls"><div class="viz-slider-row"><label class="viz-slider-label" for="viz-reumaSeptic-slider">Hitung Leukosit Cairan Sendi (&times;10&sup3;/mm&sup3;)</label><span class="viz-value-pill" id="viz-reumaSeptic-pill">' + w + '.000 /mm&sup3;</span></div><input type="range" id="viz-reumaSeptic-slider" class="viz-range" min="10" max="150" step="5" value="' + w + '" oninput="window.InternaApp.updateReumaSepticViz(this.value, null)" /></div>';

    return renderCardioWidgetCard({
      key: "reumaSeptic",
      title: "Simulator Probabilitas Artritis Septik & Protokol Drainase-Antibiotik",
      tag: "EMERGENSI SENDI",
      controlsTop: top,
      svgHtml: buildReumaSepticSvg(w, t),
      controlsBottom: bottom,
      info: {
        tone: w >= 50 ? "danger" : "warning",
        rKey: "sep_" + t + "_" + Math.round(w / 25),
        title: "Hitung Sel Sinovial " + w + ".000 /mm&sup3; — " + (w >= 50 ? "Probabilitas Tinggi Artritis Septik!" : "Zona Abu-abu Inflamasi vs Septik Dini"),
        c1Label: "Aturan Emas Diagnostik",
        c1Body: "Lakukan <strong>artrosentesis sebelum dosis pertama antibiotik</strong>. Ingat: ditemukannya kristal gout (MSU) <strong>TIDAK menyingkirkan artritis septik</strong> karena keduanya dapat ko-eksisten!",
        c2Label: "Dua Pilar Tatalaksana",
        c2Body: "Antibiotik IV saja tidak cukup bila pus mengental di kavum sendi — wajib dikombinasikan dengan <strong>evakuasi/drainase pus adekuat</strong> (aspirasi jarum tertutup berulang tiap hari, artroskopi, atau artrotomi bedah pada panggul/prostetik)."
      },
      readoutFooter: ""
    });
  }

  function updateReumaSepticViz(wbcVal, typeVal) {
    if (wbcVal !== null && wbcVal !== undefined) reumaVizState.septicWbc = clampNum(wbcVal, 10, 150, 75);
    if (typeVal === "nongono" || typeVal === "dgi") reumaVizState.septicType = typeVal;
    var w = reumaVizState.septicWbc;
    var t = reumaVizState.septicType;
    syncVizPresets("viz-reumaSeptic-tabs", [t === "nongono", t === "dgi"]);
    syncSliderAndPill("viz-reumaSeptic-slider", "viz-reumaSeptic-pill", w, w + ".000 /mm³");
    swapVizSvgFrame("viz-reumaSeptic-frame", buildReumaSepticSvg(w, t));
  }

  // =========================================================================
  // W12. SIMULATOR RADIOGRAFI LUTUT KELLGREN-LAWRENCE 0–4 (reuma-3-3, rAF: reumaOa)
  // =========================================================================
  var REUMA_KL_GRADES = [
    { grade: 0, label: "KL Grade 0 (Normal)", space: 22, osteo: 0, scler: 1.5, tx: "Edukasi gaya hidup aktif & jaga berat badan ideal", desc: "Celah sendi femorotibial simetris normal tanpa osteofit maupun sklerosis." },
    { grade: 1, label: "KL Grade 1 (Meragukan)", space: 18, osteo: 3, scler: 2, tx: "Penurunan berat badan + latihan penguatan otot kuadriseps", desc: "Penyempitan celah sendi meragukan disertai kemungkinan osteofit marginal kecil (minute osteophytes)." },
    { grade: 2, label: "KL Grade 2 (Minimal)", space: 14, osteo: 7, scler: 2.8, tx: "Fisioterapi + OAINS Topikal (Diklofenak gel) lini pertama", desc: "Osteofit marginal DEFINITIF disertai kemungkinan penyempitan celah sendi kompartemen medial." },
    { grade: 3, label: "KL Grade 3 (Moderat)", space: 8, osteo: 12, scler: 4, tx: "OAINS Topikal/Oral (Coxib) + Duloxetine / Injeksi Steroid IA saat flare", desc: "Osteofit multipel ukuran sedang + penyempitan celah sendi DEFINITIF + sklerosis subkondral awal." },
    { grade: 4, label: "KL Grade 4 (Berat / Bone-on-Bone)", space: 2, osteo: 18, scler: 6, tx: "Indikasi Rujukan Artroplasti Lutut Total (Total Knee Replacement / TKR)", desc: "Osteofit besar + penyempitan celah sendi berat (kissing bone) + sklerosis subkondral berat & kista/geode." }
  ];

  function buildReumaOaSvg(gradeVal) {
    var gIdx = Math.round(clampNum(gradeVal, 0, 4, 3));
    var g = REUMA_KL_GRADES[gIdx];
    var tibiaY = 102 + g.space;
    var col = gIdx >= 3 ? "var(--accent-coral)" : (gIdx === 2 ? "var(--accent-secondary)" : "var(--accent-primary)");

    return '<svg class="viz-svg" viewBox="0 0 480 195" role="img" aria-label="Radiografi Lutut Kellgren-Lawrence">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">GRADING RADIOGRAFI LUTUT KELLGREN-LAWRENCE (KL 0–4)</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10.5" font-weight="800" fill="' + col + '">' + g.label + '</text>' +
      '<rect x="25" y="28" width="185" height="150" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      // Femoral condyles
      '<path d="M80,40 L80,82 C76,102 108,102 116,86 C124,102 156,102 152,82 L152,40" fill="var(--bg-surface)" stroke="var(--text-primary)" stroke-width="2.2" />' +
      // Osteophyte spurs on medial side (left)
      (g.osteo > 0 ? '<polygon points="78,94 ' + (78 - g.osteo) + ',98 82,102" fill="' + col + '" />' : '') +
      (g.osteo > 0 ? '<polygon points="78,' + tibiaY + ' ' + (78 - g.osteo) + ',' + (tibiaY - 4) + ' 82,' + (tibiaY + 6) + '" fill="' + col + '" />' : '') +
      // Tibial plateau with subchondral sclerosis
      '<line x1="76" y1="' + tibiaY + '" x2="118" y2="' + tibiaY + '" stroke="' + col + '" stroke-width="' + g.scler + '" />' +
      '<path d="M76,' + tibiaY + ' L156,' + (tibiaY - 4) + ' L148,165 L84,165 Z" fill="var(--bg-surface)" stroke="var(--text-primary)" stroke-width="2.2" />' +
      '<text x="117" y="173" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-secondary)">Kompartemen Medial (Kiri)</text>' +
      // Right info box
      '<rect x="225" y="28" width="235" height="150" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="238" y="47" font-size="8.2" font-weight="800" fill="var(--text-muted)">TEMUAN RADIOLOGIS UTAMA</text>' +
      svgWrap(g.desc, 238, 62, 38, 11.5, 'font-size="8.7" font-weight="700" fill="var(--text-primary)"') +
      '<text x="238" y="110" font-size="8.2" font-weight="800" fill="var(--text-muted)">REKOMENDASI TERAPI</text>' +
      svgWrap(g.tx, 238, 125, 38, 11.5, 'font-size="8.7" font-weight="800" fill="' + col + '"') +
      '<text x="238" y="164" font-size="8" font-weight="700" fill="var(--text-secondary)">OA Erosif: Gull-wing appearance (sayap camar)</text>' +
      '</svg>';
  }

  function renderReumaOaKellgrenWidget() {
    var gIdx = Math.round(clampNum(reumaVizState.klGrade, 0, 4, 3));
    var g = REUMA_KL_GRADES[gIdx];
    var bottom = renderCardioSliderBlock({
      key: "reumaOa",
      label: "Derajat Radiografi Kellgren-Lawrence (Grade 0–4)",
      pillText: "Grade " + gIdx,
      min: 0, max: 4, step: 1, value: gIdx,
      trackBg: "linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 50%, var(--accent-coral) 100%)",
      oninput: "window.InternaApp.updateReumaOaKellgrenViz(this.value, true)",
      presets: [
        { val: 0, label: "KL 0 (Normal)", active: gIdx === 0 },
        { val: 2, label: "KL 2 (Osteofit+)", active: gIdx === 2 },
        { val: 3, label: "KL 3 (Moderat)", active: gIdx === 3 },
        { val: 4, label: "KL 4 (Bone-on-Bone)", active: gIdx === 4 }
      ]
    });
    return renderCardioWidgetCard({
      key: "reumaOa",
      title: "Simulator Radiografi Lutut Kellgren-Lawrence (Grade 0–4) & Terapi OA",
      tag: "OSTEOARTRITIS",
      svgHtml: buildReumaOaSvg(gIdx),
      controlsBottom: bottom,
      info: {
        tone: gIdx >= 3 ? "danger" : (gIdx === 2 ? "warning" : "info"),
        rKey: "kl_" + gIdx,
        title: g.label,
        c1Label: "Kriteria Radiologis",
        c1Body: g.desc,
        c2Label: "Strategi Terapi Multimodal",
        c2Body: g.tx + ". <em>Catatan GIOP: Pasien steroid &ge;2,5–5 mg/hari selama &ge;3 bulan wajib profilaksis Ca + Vit D + Bisfosfonat (gunakan Zoledronat IV bila memakai NGT/disfagia).</em>"
      },
      readoutFooter: ""
    });
  }

  function updateReumaOaKellgrenViz(val, cancelAnim) {
    if (cancelAnim !== false && R.viz && typeof R.viz.stopVizWalkthrough === "function") {
      R.viz.stopVizWalkthrough("reumaOa");
    }
    reumaVizState.klGrade = clampNum(val, 0, 4, 3);
    var gIdx = Math.round(reumaVizState.klGrade);
    var g = REUMA_KL_GRADES[gIdx];
    syncSliderAndPill("viz-reumaOa-slider", "viz-reumaOa-pill", gIdx, "Grade " + gIdx);
    syncVizPresets("viz-reumaOa-presets", [gIdx === 0, gIdx === 2, gIdx === 3, gIdx === 4]);
    swapVizSvgFrame("viz-reumaOa-frame", buildReumaOaSvg(gIdx));
    updateVizReadout("viz-reumaOa-readout", gIdx >= 3 ? "danger" : (gIdx === 2 ? "warning" : "info"), formatVizReadoutHtml(g.label, "Kriteria Radiologis", g.desc, "Strategi Terapi Multimodal", g.tx, ""), "kl_" + gIdx);
  }

  // =========================================================================
  // W13. SIMULATOR KALIBER VASKULITIS CHAPEL HILL (reuma-4-1, rAF: reumaVasc)
  // =========================================================================
  function getReumaVascMeta(pos) {
    var p = clampNum(pos, 0, 100, 15);
    if (p < 34) {
      return {
        zone: "large",
        label: "Vaskulitis Pembuluh Besar (Aorta & Cabang Utama)",
        entities: "Arteritis Takayasu (<40 thn) & Giant Cell Arteritis / GCA (>50 thn)",
        hallmark: "Takayasu: Selisih TD lengan >10 mmHg, pulseless | GCA: Klaudikasio rahang & kebutaan AION",
        tx: "GCA dengan gejala mata: Steroid Dosis Tinggi CITO SEBELUM Biopsi a. temporalis (+ Tocilizumab)!",
        tone: "danger"
      };
    }
    if (p < 67) {
      return {
        zone: "medium",
        label: "Vaskulitis Pembuluh Sedang (Arteri Viseral Utama)",
        entities: "Poliarteritis Nodosa (PAN — Asosiasi HBV) & Penyakit Kawasaki",
        hallmark: "PAN: Mikroaneurisma ginjal/mesenterika (Rosary sign), Mononeuritis multiplex, TANPA Glomerulonefritis/Paru!",
        tx: "PAN Non-HBV: Steroid + Siklofosfamid | PAN-HBV: Antiviral HBV (Entecavir/TDF) + Steroid pendek + PLEX",
        tone: "warning"
      };
    }
    return {
      zone: "small",
      label: "Vaskulitis Pembuluh Kecil (Arteriola, Kapiler & Venula)",
      entities: "ANCA-Associated (GPA, MPA, EGPA) vs Kompleks Imun (IgAV, Krioglobulin, Anti-GBM)",
      hallmark: "Keterlibatan kapiler glomerulus (RPGN) & kapiler alveolus paru (Diffuse Alveolar Hemorrhage)",
      tx: "AAV Mengancam Organ: Induksi Steroid (PEXIVAS) + Rituximab atau Siklofosfamid (+/- Avacopan)",
      tone: "danger"
    };
  }

  function buildReumaVascSvg(pos) {
    var m = getReumaVascMeta(pos);
    var xMarker = (40 + (clampNum(pos, 0, 100, 15) / 100) * 400).toFixed(1);
    return '<svg class="viz-svg" viewBox="0 0 480 190" role="img" aria-label="Peta Kaliber Pembuluh Darah Vaskulitis">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">SPEKTRUM KALIBER PEMBULUH DARAH CHAPEL HILL (CHCC 2012)</text>' +
      // Vessel tapering tree
      '<rect x="35" y="28" width="135" height="46" rx="8" fill="var(--accent-coral)" fill-opacity="' + (m.zone === "large" ? "0.32" : "0.1") + '" stroke="var(--accent-coral)" stroke-width="2" />' +
      '<text x="102" y="48" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-coral)">PEMBULUH BESAR</text>' +
      '<text x="102" y="63" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-primary)">Takayasu &amp; GCA</text>' +
      '<rect x="175" y="34" width="130" height="36" rx="8" fill="var(--accent-secondary)" fill-opacity="' + (m.zone === "medium" ? "0.32" : "0.1") + '" stroke="var(--accent-secondary)" stroke-width="2" />' +
      '<text x="240" y="50" text-anchor="middle" font-size="9" font-weight="800" fill="var(--accent-secondary)">PEMBULUH SEDANG</text>' +
      '<text x="240" y="63" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-primary)">PAN (HBV) &amp; Kawasaki</text>' +
      '<rect x="310" y="38" width="135" height="28" rx="8" fill="var(--viz-purple)" fill-opacity="' + (m.zone === "small" ? "0.32" : "0.1") + '" stroke="var(--viz-purple)" stroke-width="2" />' +
      '<text x="377" y="56" text-anchor="middle" font-size="8.8" font-weight="800" fill="var(--viz-purple)">KECIL (ANCA / IgA)</text>' +
      '<circle cx="' + xMarker + '" cy="52" r="8" fill="var(--bg-surface)" stroke="var(--text-primary)" stroke-width="3" />' +
      // Bottom detail card
      '<rect x="25" y="88" width="430" height="96" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="38" y="106" font-size="9.3" font-weight="800" fill="var(--text-primary)">' + m.entities + '</text>' +
      svgWrap(m.hallmark, 38, 122, 68, 11.5, 'font-size="8.4" font-weight="700" fill="var(--text-secondary)"') +
      svgWrap(m.tx, 38, 152, 68, 11.5, 'font-size="8.4" font-weight="800" fill="var(--accent-coral)"') +
      '</svg>';
  }

  function renderReumaVasculitisCaliberWidget() {
    var p = reumaVizState.vascPos;
    var m = getReumaVascMeta(p);
    var bottom = renderCardioSliderBlock({
      key: "reumaVasc",
      label: "Posisi Kaliber Pembuluh Darah (Aorta -> Arteri Viseral -> Kapiler)",
      pillText: m.zone.toUpperCase(),
      min: 0, max: 100, step: 1, value: p,
      trackBg: "linear-gradient(90deg, var(--accent-coral) 0%, var(--accent-secondary) 50%, var(--viz-purple) 100%)",
      oninput: "window.InternaApp.updateReumaVasculitisViz(this.value, true)",
      presets: [
        { val: 15, label: "Pembuluh Besar (Takayasu/GCA)", active: p < 34 },
        { val: 50, label: "Pembuluh Sedang (PAN)", active: p >= 34 && p < 67 },
        { val: 85, label: "Pembuluh Kecil (ANCA/IgA)", active: p >= 67 }
      ]
    });
    return renderCardioWidgetCard({
      key: "reumaVasc",
      title: "Simulator Kaliber Pembuluh Darah Vaskulitis Chapel Hill (CHCC)",
      tag: "VASKULITIS SISTEMIK",
      svgHtml: buildReumaVascSvg(p),
      controlsBottom: bottom,
      info: { tone: m.tone, rKey: "vasc_" + m.zone, title: m.label, c1Label: "Ciri Klinis Patognomonik", c1Body: m.hallmark, c2Label: "Prinsip Tatalaksana", c2Body: m.tx },
      readoutFooter: ""
    });
  }

  function updateReumaVasculitisViz(val, cancelAnim) {
    if (cancelAnim !== false && R.viz && typeof R.viz.stopVizWalkthrough === "function") {
      R.viz.stopVizWalkthrough("reumaVasc");
    }
    reumaVizState.vascPos = clampNum(val, 0, 100, 15);
    var p = reumaVizState.vascPos;
    var m = getReumaVascMeta(p);
    syncSliderAndPill("viz-reumaVasc-slider", "viz-reumaVasc-pill", p, m.zone.toUpperCase());
    syncVizPresets("viz-reumaVasc-presets", [p < 34, p >= 34 && p < 67, p >= 67]);
    swapVizSvgFrame("viz-reumaVasc-frame", buildReumaVascSvg(p));
    updateVizReadout("viz-reumaVasc-readout", m.tone, formatVizReadoutHtml(m.label, "Ciri Klinis Patognomonik", m.hallmark, "Prinsip Tatalaksana", m.tx, ""), "vasc_" + m.zone);
  }

  // =========================================================================
  // W14. SIMULATOR SPEKTRUM VASKULITIS ANCA (GPA vs MPA vs EGPA vs IgAV) (reuma-4-2)
  // =========================================================================
  var REUMA_ANCA_ENTITIES = {
    gpa: {
      label: "GPA (Wegener)",
      anca: "c-ANCA / Anti-PR3 (+) (>85%)",
      ent: "Sinusitis Destruktif, Epistaksis, Saddle-Nose (+)",
      lung: "Nodul Paru Berongga (Kavitasi) & DAH",
      renal: "Pauci-Immune Crescentic RPGN (+)",
      eos: "Normal",
      tone: "danger",
      tx: "Induksi: Steroid (PEXIVAS) + Rituximab atau Siklofosfamid; Rumatan: Rituximab"
    },
    mpa: {
      label: "MPA (Microscopic)",
      anca: "p-ANCA / Anti-MPO (+) (>75%)",
      ent: "Tanpa Granuloma THT Destruktif (-)",
      lung: "Kapilaritis Alveolar / DAH (Tanpa Asma/Nodul Kavitasi)",
      renal: "Pauci-Immune Crescentic RPGN Sangat Sering (>80%)",
      eos: "Normal",
      tone: "danger",
      tx: "Induksi: Steroid + Rituximab atau Siklofosfamid (+/- Avacopan)"
    },
    egpa: {
      label: "EGPA (Churg-Strauss)",
      anca: "p-ANCA / Anti-MPO (+) (~40%)",
      ent: "Polip Nasi Kronik & Rinosinusitis Alergik",
      lung: "Asma Onset Dewasa Refrakter + Infiltrat Eosinofilik",
      renal: "Jarang (Dominan Mononeuritis Multiplex & Miokarditis)",
      eos: "Hipereosinofilia Berat (>10% atau >1.500/mm3)",
      tone: "warning",
      tx: "Steroid + Mepolizumab (Anti-IL-5) atau Rituximab/Siklofosfamid bila penyakit organ berat"
    },
    igav: {
      label: "Vaskulitis IgA (HSP)",
      anca: "ANCA Negatif (Deposit IgA1 Kompleks Imun)",
      ent: "Tidak ada",
      lung: "Jarang",
      renal: "Hematuria Glomerular Deposit IgA Mesangial",
      eos: "Trombosit Normal + Purpura Palpabel + Kolik Abdomen + Artritis",
      tone: "info",
      tx: "Suportif/OAINS untuk kulit-sendi; Steroid +/- imunosupresan bila nefritis/GI berat"
    }
  };

  function buildReumaAncaSvg(key) {
    var d = REUMA_ANCA_ENTITIES[key] || REUMA_ANCA_ENTITIES.gpa;
    var col = d.tone === "danger" ? "var(--accent-coral)" : (d.tone === "warning" ? "var(--accent-secondary)" : "var(--accent-primary)");
    return '<svg class="viz-svg" viewBox="0 0 480 190" role="img" aria-label="Spektrum Vaskulitis ANCA">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">MATRIKS ORGAN &amp; SEROLOGI VASKULITIS PEMBULUH KECIL</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + col + '">' + d.anca + '</text>' +
      '<rect x="20" y="28" width="212" height="72" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="45" font-size="8.2" font-weight="800" fill="var(--text-muted)">1. SALURAN NAPAS ATAS (THT)</text>' +
      svgWrap(d.ent, 32, 61, 34, 11.5, 'font-size="8.6" font-weight="700" fill="var(--text-primary)"') +
      '<rect x="248" y="28" width="212" height="72" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="45" font-size="8.2" font-weight="800" fill="var(--text-muted)">2. PARU &amp; JALAN NAPAS BAWAH</text>' +
      svgWrap(d.lung, 260, 61, 34, 11.5, 'font-size="8.6" font-weight="700" fill="var(--text-primary)"') +
      '<rect x="20" y="108" width="212" height="72" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="125" font-size="8.2" font-weight="800" fill="var(--text-muted)">3. GINJAL (GLOMERULUS)</text>' +
      svgWrap(d.renal, 32, 141, 34, 11.5, 'font-size="8.6" font-weight="700" fill="' + col + '"') +
      '<rect x="248" y="108" width="212" height="72" rx="10" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="260" y="125" font-size="8.2" font-weight="800" fill="var(--text-muted)">4. EOSINOFIL / CIRI KHUSUS</text>' +
      svgWrap(d.eos, 260, 141, 34, 11.5, 'font-size="8.5" font-weight="700" fill="var(--accent-primary)"') +
      '</svg>';
  }

  function renderReumaAncaSpectrumWidget() {
    var cur = reumaVizState.ancaEntity;
    var d = REUMA_ANCA_ENTITIES[cur] || REUMA_ANCA_ENTITIES.gpa;
    var tabs = Object.keys(REUMA_ANCA_ENTITIES).map(function (k) {
      return { key: k, label: REUMA_ANCA_ENTITIES[k].label, onclick: "window.InternaApp.updateReumaAncaViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaAnca",
      title: "Simulator Spektrum Vaskulitis ANCA (GPA vs MPA vs EGPA) & IgAV",
      tag: "VASKULITIS ANCA",
      controlsTop: renderCardioTabRow("viz-reumaAnca-tabs", tabs, cur),
      svgHtml: buildReumaAncaSvg(cur),
      info: { tone: d.tone, rKey: "anca_" + cur, title: d.label + " — " + d.anca, c1Label: "Trias Organ & Eosinofilia", c1Body: d.ent + " | " + d.lung + " | " + d.renal + " (" + d.eos + ")", c2Label: "Terapi Induksi & Rumatan", c2Body: d.tx },
      readoutFooter: ""
    });
  }

  function updateReumaAncaViz(key) {
    if (REUMA_ANCA_ENTITIES[key]) reumaVizState.ancaEntity = key;
    var cur = reumaVizState.ancaEntity;
    var d = REUMA_ANCA_ENTITIES[cur];
    syncVizPresets("viz-reumaAnca-tabs", Object.keys(REUMA_ANCA_ENTITIES).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaAnca-frame", buildReumaAncaSvg(cur));
    updateVizReadout("viz-reumaAnca-readout", d.tone, formatVizReadoutHtml(d.label + " — " + d.anca, "Trias Organ & Eosinofilia", d.ent + " | " + d.lung + " | " + d.renal, "Terapi Induksi & Rumatan", d.tx, ""), "anca_" + cur);
  }

  // =========================================================================
  // W15 (EXTRA). ATLAS DISTRIBUSI SENDI TANGAN (RA vs OA vs PsA vs SLE vs Gout)
  // =========================================================================
  var REUMA_HAND_DATA = {
    compare: {
      label: "Bandingkan Semua",
      color: "var(--accent-primary)",
      tone: "info",
      title: "Peta Komparatif Distribusi Sendi Tangan pada Artritis",
      involved: "RA: Wrist+MCP+PIP | OA: DIP+PIP+CMC-1 | PsA: DIP+Ray",
      spared: "Kunci Board: RA BEBAS DIP & CMC-1 | OA BEBAS MCP & Wrist",
      c1: "<strong>Artritis Reumatoid (Merah):</strong> Simetris menyerang <strong>Wrist, MCP, dan PIP</strong>, sementara <strong>DIP &amp; CMC-1 selalu bebas</strong>. <strong>Osteoartritis (Biru):</strong> Menyerang <strong>DIP (Heberden), PIP (Bouchard), dan CMC-1</strong>, sementara MCP &amp; Wrist bebas.",
      c2: "<strong>Artritis Psoriatik (Ungu):</strong> Predileksi <strong>DIP + Daktilitis (1 jari bengkak utuh/sausage digit) + Pitting kuku</strong>. <strong>SLE Jaccoud:</strong> Mirip RA tetapi non-erosif reversibel."
    },
    ra: {
      label: "RA (Merah)",
      color: "var(--accent-coral)",
      tone: "danger",
      title: "Artritis Reumatoid (RA) — Poliartritis Simetris Proksimal",
      involved: "Wrist (Radiokarpal), MCP 1–5, dan PIP 2–5 Simetris",
      spared: "BEBAS DIP &amp; CMC-1!",
      c1: "Sinovitis proliferatif simetris bilateral pada <strong>pergelangan tangan (Wrist), MCP 2–3, dan PIP</strong>. Deformitas klasik lanjut: <em>Swan-neck</em>, <em>Boutonniere</em>, dan deviasi ulnar.",
      c2: "<strong>Pembeda Wajib:</strong> Sendi DIP hampir tidak pernah terlibat pada RA; bila DIP ikut meradang disertai kuku berbintik, pikirkan <strong>Artritis Psoriatik</strong>!"
    },
    oa: {
      label: "OA (Biru)",
      color: "var(--accent-primary)",
      tone: "info",
      title: "Osteoartritis Tangan (OA) — Degenerasi Distal & Pangkal Ibu Jari",
      involved: "DIP (Nodus Heberden), PIP (Nodus Bouchard) &amp; CMC-1",
      spared: "BEBAS MCP &amp; Pergelangan Tangan!",
      c1: "Pembesaran tulang keras tanpa sinovitis hangat di <strong>DIP (Heberden)</strong>, <strong>PIP (Bouchard)</strong>, dan <strong>CMC-1 (pangkal ibu jari berbentuk persegi / squaring)</strong> dengan kaku pagi &lt;30 menit.",
      c2: "Varian <strong>OA Erosif</strong> pada DIP/PIP wanita pascamenopause memberikan gambaran radiologis klasik <strong>gull-wing appearance</strong> (sayap burung camar)."
    },
    psa: {
      label: "PsA (Ungu)",
      color: "var(--viz-purple)",
      tone: "warning",
      title: "Artritis Psoriatik (PsA) — DIP, Daktilitis Ray & Distrofi Kuku",
      involved: "DIP, Pola Ray / Sausage Digit (MCP+PIP+DIP) &amp; Kuku",
      spared: "Asimetris (Oligoartikular / Pola Ray 1 Jari)",
      c1: "Dapat mengenai <strong>sendi DIP</strong> bersama <strong>pitting/onikolisis kuku</strong> di jari yang sama, atau pola <strong>Daktilitis (Sausage digit)</strong> akibat entesitis-tenosinovitis sepanjang satu jari.",
      c2: "Radiografi menunjukkan destruksi tulang klasik <strong>pencil-in-cup deformity</strong> serta proliferasi periosteal juksta-artikular."
    },
    sle: {
      label: "SLE (Amber)",
      color: "var(--accent-secondary)",
      tone: "warning",
      title: "SLE (Artropati Jaccoud) — Simetris Non-Erosif Reversibel",
      involved: "MCP, PIP &amp; Pergelangan Tangan (Pola Mirip RA)",
      spared: "TANPA Erosi Tulang pada X-ray; Deformitas Reversibel",
      c1: "Menyerang distribusi mirip RA (MCP, PIP, Wrist), namun patologinya berupa <strong>kelemahan kapsul/ligamen (laxity)</strong> tanpa pannus erosif tulang.",
      c2: "Deformitas leher angsa atau deviasi ulnar pada <strong>Artropati Jaccoud</strong> dapat diluruskan kembali secara pasif di atas meja pemeriksaan dan foto X-ray tidak menunjukkan erosi!"
    },
    gout: {
      label: "Gout (Hijau)",
      color: "var(--viz-green)",
      tone: "info",
      title: "Gout Tofaseus Kronik Tangan — Asimetris dengan Nodul Tofus",
      involved: "Multifokal Asimetris (DIP / PIP / MCP / Wrist)",
      spared: "Tidak Simetris; Nodul Tofus Subkutan Putih Kekuningan",
      c1: "Pada gout kronik yang tidak diterapi, kristal MSU membentuk <strong>tofus asimetris</strong> di atas sendi DIP/PIP/MCP atau bursa olekranon dengan kulit teregang mengkilat.",
      c2: "Gambaran X-ray khas berupa erosi para-artikular <strong>punched-out lesion dengan overhanging edge (Martel sign)</strong> dan celah sendi tetap terpelihara."
    }
  };

  function buildReumaHandJointSvg(dxKey) {
    var d = REUMA_HAND_DATA[dxKey] || REUMA_HAND_DATA.compare;
    // Joint coordinates on left hand schematic (x=25..215, y=28..218)
    // Wrist: (125, 198); CMC1: (88, 178);
    // Thumb: MCP1(66,154), IP1(50,126)
    // Index(2): MCP2(90,126), PIP2(82,86), DIP2(76,56), Nail2(73,39)
    // Middle(3): MCP3(118,120), PIP3(118,76), DIP3(118,46), Nail3(118,29)
    // Ring(4): MCP4(146,125), PIP4(150,82), DIP4(154,53), Nail4(156,36)
    // Little(5): MCP5(172,135), PIP5(180,98), DIP5(186,73), Nail5(189,58)
    var joints = [
      { id: "wrist", x: 125, y: 196, r: 9, lbl: "Wrist" },
      { id: "cmc1", x: 86, y: 176, r: 6.5, lbl: "CMC-1" },
      { id: "mcp1", x: 64, y: 150, r: 6 }, { id: "pip1", x: 48, y: 124, r: 5.2 },
      { id: "mcp2", x: 90, y: 124, r: 6.5 }, { id: "pip2", x: 82, y: 86, r: 5.5 }, { id: "dip2", x: 76, y: 56, r: 5 },
      { id: "mcp3", x: 118, y: 118, r: 6.5 }, { id: "pip3", x: 118, y: 76, r: 5.5 }, { id: "dip3", x: 118, y: 46, r: 5 },
      { id: "mcp4", x: 146, y: 124, r: 6.5 }, { id: "pip4", x: 150, y: 82, r: 5.5 }, { id: "dip4", x: 154, y: 53, r: 5 },
      { id: "mcp5", x: 172, y: 134, r: 6 }, { id: "pip5", x: 180, y: 98, r: 5.2 }, { id: "dip5", x: 186, y: 73, r: 4.8 }
    ];

    function getJointColor(jid) {
      if (dxKey === "ra") {
        return (jid === "wrist" || jid.startsWith("mcp") || jid.startsWith("pip")) && jid !== "pip1" ? "var(--accent-coral)" : null;
      }
      if (dxKey === "oa") {
        return (jid === "cmc1" || jid.startsWith("dip") || jid === "pip2" || jid === "pip3" || jid === "pip4" || jid === "pip5") ? "var(--accent-primary)" : null;
      }
      if (dxKey === "psa") {
        if (jid === "mcp2" || jid === "pip2" || jid === "dip2" || jid.startsWith("dip")) return "var(--viz-purple)";
        return null;
      }
      if (dxKey === "sle") {
        return (jid === "wrist" || jid.startsWith("mcp") || jid.startsWith("pip")) && jid !== "pip1" ? "var(--accent-secondary)" : null;
      }
      if (dxKey === "gout") {
        return (jid === "dip2" || jid === "pip4" || jid === "mcp1" || jid === "wrist") ? "var(--viz-green)" : null;
      }
      // Compare mode: distinct colors on signature targets
      if (jid === "wrist" || jid === "mcp3" || jid === "mcp4" || jid === "mcp5") return "var(--accent-coral)"; // RA
      if (jid === "cmc1" || jid === "dip3" || jid === "dip4" || jid === "dip5") return "var(--accent-primary)"; // OA
      if (jid === "mcp2" || jid === "pip2" || jid === "dip2") return "var(--viz-purple)"; // PsA Ray
      if (jid === "pip3" || jid === "pip4") return "var(--accent-secondary)"; // Overlap PIP (RA/OA/SLE)
      return null;
    }

    var bones = [
      // Metacarpals
      [125,196, 86,176], [86,176, 64,150], [64,150, 48,124], [48,124, 38,104],
      [125,196, 90,124], [90,124, 82,86], [82,86, 76,56], [76,56, 72,38],
      [125,196, 118,118], [118,118, 118,76], [118,76, 118,46], [118,46, 118,28],
      [125,196, 146,124], [146,124, 150,82], [150,82, 154,53], [154,53, 156,36],
      [125,196, 172,134], [172,134, 180,98], [180,98, 186,73], [186,73, 189,57]
    ].map(function (b) {
      return '<line x1="' + b[0] + '" y1="' + b[1] + '" x2="' + b[2] + '" y2="' + b[3] + '" stroke="var(--border-strong)" stroke-width="4.5" stroke-linecap="round" />';
    }).join("");

    // PsA Ray / Dactylitis highlight halo on index finger
    var rayHalo = (dxKey === "psa" || dxKey === "compare")
      ? '<line x1="90" y1="124" x2="73" y2="42" stroke="var(--viz-purple)" stroke-width="17" stroke-opacity="0.18" stroke-linecap="round" />'
      : '';

    var nodesHtml = joints.map(function (j) {
      var col = getJointColor(j.id);
      var fill = col || "var(--bg-surface)";
      var stroke = col || "var(--border-strong)";
      var op = col ? "0.92" : "1";
      return '<circle cx="' + j.x + '" cy="' + j.y + '" r="' + j.r + '" fill="' + fill + '" fill-opacity="' + op + '" stroke="' + stroke + '" stroke-width="2" />';
    }).join("");

    // Nail markers (PsA pitting)
    var nailColor = (dxKey === "psa" || dxKey === "compare") ? "var(--viz-purple)" : "var(--border-strong)";
    var nailsHtml = '<circle cx="72" cy="39" r="2.8" fill="' + nailColor + '" /><circle cx="118" cy="29" r="2.8" fill="' + nailColor + '" /><circle cx="156" cy="36" r="2.8" fill="' + nailColor + '" />';

    return '<svg class="viz-svg" viewBox="0 0 480 232" role="img" aria-label="Peta Distribusi Sendi Jari Tangan Artritis">' +
      '<text x="20" y="16" font-size="9.5" font-weight="800" fill="var(--text-muted)">PEMETAAN DISTRIBUSI SENDI TANGAN</text>' +
      '<text x="460" y="16" text-anchor="end" font-size="10" font-weight="800" fill="' + d.color + '">' + d.label.toUpperCase() + '</text>' +
      '<rect x="20" y="24" width="205" height="196" rx="12" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      rayHalo + bones + nodesHtml + nailsHtml +
      // Anatomical row labels on hand
      '<text x="29" y="59" font-size="7.5" font-weight="800" fill="var(--text-muted)">DIP</text>' +
      '<text x="29" y="89" font-size="7.5" font-weight="800" fill="var(--text-muted)">PIP</text>' +
      '<text x="29" y="126" font-size="7.5" font-weight="800" fill="var(--text-muted)">MCP</text>' +
      '<text x="150" y="180" font-size="7.5" font-weight="800" fill="var(--text-muted)">CMC-1</text>' +
      '<text x="150" y="200" font-size="7.5" font-weight="800" fill="var(--text-muted)">WRIST</text>' +
      // Right info card
      '<rect x="236" y="24" width="224" height="196" rx="12" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="249" y="44" font-size="8.2" font-weight="800" fill="var(--text-muted)">SENDI TARGET UTAMA</text>' +
      svgWrap(d.involved, 249, 59, 34, 11.5, 'font-size="8.8" font-weight="800" fill="' + d.color + '"') +
      '<text x="249" y="96" font-size="8.2" font-weight="800" fill="var(--text-muted)">SENDI BEBAS / CIRI PEMBEDA</text>' +
      svgWrap(d.spared, 249, 111, 34, 11.5, 'font-size="8.6" font-weight="700" fill="var(--text-primary)"') +
      '<line x1="249" y1="142" x2="447" y2="142" stroke="var(--border-subtle)" />' +
      '<text x="249" y="157" font-size="8" font-weight="800" fill="var(--text-muted)">LEGENDA WARNA KOMPARATIF</text>' +
      '<circle cx="254" cy="171" r="4" fill="var(--accent-coral)" /><text x="263" y="174" font-size="8" font-weight="700" fill="var(--text-primary)">Merah: RA (Wrist, MCP, PIP)</text>' +
      '<circle cx="254" cy="186" r="4" fill="var(--accent-primary)" /><text x="263" y="189" font-size="8" font-weight="700" fill="var(--text-primary)">Biru: OA (DIP, PIP, CMC-1)</text>' +
      '<circle cx="254" cy="201" r="4" fill="var(--viz-purple)" /><text x="263" y="204" font-size="8" font-weight="700" fill="var(--text-primary)">Ungu: PsA (DIP, Ray, Kuku)</text>' +
      '<circle cx="254" cy="214" r="4" fill="var(--accent-secondary)" /><text x="263" y="217" font-size="7.8" font-weight="700" fill="var(--text-primary)">Amber: SLE / Overlap PIP</text>' +
      '</svg>';
  }

  function renderReumaHandJointWidget() {
    var cur = reumaVizState.handDx;
    var d = REUMA_HAND_DATA[cur] || REUMA_HAND_DATA.compare;
    var tabs = Object.keys(REUMA_HAND_DATA).map(function (k) {
      return { key: k, label: REUMA_HAND_DATA[k].label, onclick: "window.InternaApp.updateReumaHandJointViz('" + k + "')" };
    });
    return renderCardioWidgetCard({
      key: "reumaHand",
      title: "Atlas Distribusi Sendi Jari Tangan pada Artritis (RA vs OA vs PsA vs SLE vs Gout)",
      tag: "DISTRIBUSI SENDI",
      controlsTop: renderCardioTabRow("viz-reumaHand-tabs", tabs, cur),
      svgHtml: buildReumaHandJointSvg(cur),
      legendHtml: renderVizLegend([
        { color: "var(--accent-coral)", label: "RA (Wrist/MCP/PIP)" },
        { color: "var(--accent-primary)", label: "OA (DIP/PIP/CMC-1)" },
        { color: "var(--viz-purple)", label: "PsA (DIP/Ray/Kuku)" },
        { color: "var(--accent-secondary)", label: "SLE (Jaccoud)" },
        { color: "var(--viz-green)", label: "Gout (Tofus Asimetris)" }
      ]),
      info: { tone: d.tone, rKey: "hand_" + cur, title: d.title, c1Label: "Pola Keterlibatan Sendi", c1Body: d.c1, c2Label: "Mutiara Board & Radiologi", c2Body: d.c2 },
      readoutFooter: ""
    });
  }

  function updateReumaHandJointViz(key) {
    if (REUMA_HAND_DATA[key]) reumaVizState.handDx = key;
    var cur = reumaVizState.handDx;
    var d = REUMA_HAND_DATA[cur];
    syncVizPresets("viz-reumaHand-tabs", Object.keys(REUMA_HAND_DATA).map(function (k) { return k === cur; }));
    swapVizSvgFrame("viz-reumaHand-frame", buildReumaHandJointSvg(cur));
    updateVizReadout("viz-reumaHand-readout", d.tone, formatVizReadoutHtml(d.title, "Pola Keterlibatan Sendi", d.c1, "Mutiara Board & Radiologi", d.c2, ""), "hand_" + cur);
  }

  // =========================================================================
  // REUMATOLOGI MODULE WIDGET DISPATCHER
  // =========================================================================
  function renderReumaModuleWidget(type) {
    if (type === "reuma-synovial-ana-viz") return renderReumaSynovialAnaWidget();
    if (type === "reuma-hand-joint-viz") return renderReumaHandJointWidget();
    if (type === "reuma-ra-acr2010-calc") return renderReumaRaAcr2010Widget();
    if (type === "reuma-das28-calc") return renderReumaDas28Widget();
    if (type === "reuma-spa-axial-viz") return renderReumaSpaAxialWidget();
    if (type === "reuma-sle-acr2019-calc") return renderReumaSleAcr2019Widget();
    if (type === "reuma-sledai-flare-calc") return renderReumaSledaiFlareWidget();
    if (type === "reuma-sle-pregnancy-viz") return renderReumaSlePregnancyWidget();
    if (type === "reuma-ssc-capillaroscopy-viz") return renderReumaSscCapillaroscopyWidget();
    if (type === "reuma-myositis-panel-viz") return renderReumaMyositisPanelWidget();
    if (type === "reuma-crystal-polar-viz") return renderReumaCrystalPolarWidget();
    if (type === "reuma-septic-joint-viz") return renderReumaSepticJointWidget();
    if (type === "reuma-oa-kellgren-viz") return renderReumaOaKellgrenWidget();
    if (type === "reuma-vasculitis-caliber-viz") return renderReumaVasculitisCaliberWidget();
    if (type === "reuma-anca-spectrum-viz") return renderReumaAncaSpectrumWidget();
    return "";
  }

  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("reuma-")) return null;
    return renderReumaModuleWidget(type) || null;
  });
  R.registerMotionProvider(getReumaVizMotionSpec);

  Object.assign(R.handlers, {
    getReumaVizMotionSpec,
    updateReumaSynovialAnaViz,
    renderReumaSynovialAnaWidget,
    calcReumaRaAcr2010,
    renderReumaRaAcr2010Widget,
    calcReumaDas28,
    renderReumaDas28Widget,
    updateReumaSpaViz,
    renderReumaSpaAxialWidget,
    calcReumaSleAcr2019,
    renderReumaSleAcr2019Widget,
    calcReumaSledaiFlare,
    renderReumaSledaiFlareWidget,
    updateReumaSlePregViz,
    renderReumaSlePregnancyWidget,
    updateReumaSscViz,
    renderReumaSscCapillaroscopyWidget,
    updateReumaMyoViz,
    renderReumaMyositisPanelWidget,
    updateReumaCrystalViz,
    renderReumaCrystalPolarWidget,
    updateReumaSepticViz,
    renderReumaSepticJointWidget,
    updateReumaOaKellgrenViz,
    renderReumaOaKellgrenWidget,
    updateReumaVasculitisViz,
    renderReumaVasculitisCaliberWidget,
    updateReumaAncaViz,
    renderReumaAncaSpectrumWidget,
    updateReumaHandJointViz,
    renderReumaHandJointWidget,
    renderReumaModuleWidget
  });
})(window);
