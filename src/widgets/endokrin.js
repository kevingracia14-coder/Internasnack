/* ==========================================================================
   InternaSnack — Endokrinologi, Metabolik & Diabetes Interactive Widgets
   ========================================================================== */
(function (global) {
  const R = global.InternaRuntime;
  const { escapeHtml, clampNum } = R.utils;
  const {
    vizMotionState, isReducedMotionPreferred, hasRafSupport, vizPlayIconSvg,
    scheduleVizFrame, cancelVizFrame, cancelVizTween, stopVizWalkthrough,
    cancelAllVizAnimations, animateVizTo, toggleVizWalkthrough,
    buildSmoothSvgPath, sampleSmoothCurveY, renderVizLegend, setSvgAttrs,
    syncSliderAndPill, syncVizPresets, formatVizReadoutHtml, updateVizReadout,
    swapVizSvgFrame, renderVizArrowDefs, renderCardioTabRow,
    renderCardioSliderBlock, renderCardioWidgetCard, renderPulmoSliderOnly,
    renderCalcGaugeSvg, updateCalcGauge, syncCalcWeightPair, updateCalcReadoutTone,
    renderCalcCheckItem, renderCalcWeightSlider
  } = R.viz;

var endoVizState = {
  // endo-1-1: DM Criteria & Artifact
  dmPreset: "normal",
  dmGdp: 92,
  dmTtgo: 125,
  dmHba1c: 5.4,
  dmArtifact: "none", // "none", "hemolytic_low", "iron_high"

  // endo-1-2: OAD & Organ Benefit
  oadComorbid: "ascvd", // "ascvd", "hfref", "ckd", "obesity", "standard"
  oadEgfr: 42, // 15..95

  // endo-1-3: Insulin PK & Dawn vs Somogyi
  insulinHour: 6.0, // 0..24 (rAF key: endoInsulin)
  insulinMode: "dawn", // "pk_profile", "dawn", "somogyi"

  // endo-2-1: DKA vs HHS & K Gate
  dkaHour: 2.0, // 0..12 (rAF key: endoDka)
  dkaSyndrome: "dka", // "dka", "hhs"
  dkaKGate: "normal", // "low", "normal", "high"

  // endo-2-2: Hypoglycemia D40 & Whipple
  hypoMode: "d40_calc", // "d40_calc", "whipple_diff"
  hypoGds: 42, // 20..75
  hypoConscious: "unconscious", // "conscious", "unconscious"
  hypoDiffCase: "insulinoma", // "insulinoma", "exogenous", "sulfonylurea"

  // endo-2-3: Diabetic Foot Wagner & ABI
  footWagner: 3, // 0..5
  footAbi: 0.65, // 0.3..1.35
  footProbeBone: true,
  footSirs: false,

  // endo-3-1: Thyroid Axis
  thyroidDisease: "graves", // "graves", "subacute", "adenoma", "tshoma"
  thyroidPreg: "none", // "none", "trim1", "trim2_3"

  // endo-3-2: Hypothyroid LT4 & Myxedema
  lt4Weight: 60, // 40..120
  lt4Profile: "young", // "young", "elderly_cad", "pregnant", "myxedema"

  // endo-3-3: Burch-Wartofsky Thyroid Storm
  bwTemp: 20, // 5, 10, 15, 20, 25, 30
  bwCns: 20, // 0, 10, 20, 30
  bwGi: 10, // 0, 10, 20
  bwHr: 20, // 0, 5, 10, 15, 20, 25
  bwChf: 10, // 0, 5, 10, 15
  bwAf: 10, // 0, 10
  bwPrecip: 10, // 0, 10

  // endo-3-4: ACR TI-RADS & Bethesda
  tiradsMode: "tirads", // "tirads", "bethesda"
  tiradsComp: 2, // 0, 1, 2
  tiradsEcho: 2, // 0, 1, 2, 3
  tiradsShape: 3, // 0, 3
  tiradsMargin: 2, // 0, 2, 3
  tiradsFoci: 3, // 0, 1, 2, 3
  tiradsSize: 1.8, // 0.5..4.5 cm
  bethesdaClass: 5, // 1..6

  // endo-4-1: Cushing vs Addison & Cortisol Rhythm
  cortisolHour: 8.0, // 0..24 (rAF key: endoCortisol)
  cortisolDisease: "cushing_pit", // "normal", "cushing_pit", "cushing_adrenal", "cushing_ectopic", "addison"
  cortisolStep: 1, // 1, 2, 3

  // endo-4-2: Pheochromocytoma & Conn ARR
  pheoMode: "pheo", // "pheo", "conn"
  pheoSequence: "correct_alpha_first", // "correct_alpha_first", "fatal_beta_first"
  connPac: 32, // 5..60 ng/dL
  connPra: 0.8, // 0.1..5.0 ng/mL/h

  // endo-4-3: Pituitary DI Water Deprivation
  diHour: 6.0, // 0..8 (rAF key: endoDi)
  diCondition: "central_di", // "normal", "polydipsia", "central_di", "nephrogenic_di"

  // endo-5-1: Calcium & DXA
  calciumMode: "matrix", // "matrix", "dxa"
  calciumCondition: "primary_hpt", // "primary_hpt", "secondary_hpt", "tertiary_hpt", "malignancy_pthrp", "vitd_def", "hypo_parathyroid"
  dxaTScore: -2.8, // -4.0 .. +1.5
  dxaMeasuredCa: 11.2,
  dxaAlbumin: 3.2,

  // Extra 1: DKA Anion & Katz
  dkaCalcGluc: 480,
  dkaCalcNa: 132,
  dkaCalcK: 4.8,
  dkaCalcCl: 94,
  dkaCalcHco3: 10,
  dkaCalcBun: 38,
  dkaCalcAlb: 3.6,

  // Extra 2: HOMA-IR & Dutch FH & TG
  homaGlu: 118,
  homaIns: 18.5,
  fhLdl: 260,
  fhXanthoma: true,
  fhArcus: true,
  fhCadFamily: true,
  tgVal: 620
};

// =========================================================================
// 4 rAF MOTION SPEC BLOCKS
// =========================================================================

function syncEndoTabByMatch(containerId, needle) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var btns = el.querySelectorAll(".viz-pill-btn");
  for (var i = 0; i < btns.length; i++) {
    var oc = btns[i].getAttribute("onclick") || "";
    if (oc.indexOf(needle) !== -1) btns[i].classList.add("active");
    else btns[i].classList.remove("active");
  }
}

function rerenderEndoCard(cardId, html) {
  var el = document.getElementById(cardId);
  if (el) el.outerHTML = html;
}

function getEndoVizMotionSpec(key) {
  if (key === "endoInsulin") {
    return {
      min: 0, max: 24, start: 0, end: 24, duration: 7200,
      get: function() { return endoVizState.insulinHour; },
      apply: function(v) { updateEndoInsulinPkViz(v, null, false); }
    };
  }
  if (key === "endoDka") {
    return {
      min: 0, max: 12, start: 0, end: 12, duration: 7600,
      get: function() { return endoVizState.dkaHour; },
      apply: function(v) { updateEndoDkaHhsViz(v, null, null, false); }
    };
  }
  if (key === "endoCortisol") {
    return {
      min: 0, max: 24, start: 0, end: 24, duration: 6400,
      get: function() { return endoVizState.cortisolHour; },
      apply: function(v) { updateEndoCushingAddisonViz(v, null, null, false); }
    };
  }
  if (key === "endoDi") {
    return {
      min: 0, max: 8, start: 0, end: 8, duration: 6800,
      get: function() { return endoVizState.diHour; },
      apply: function(v) { updateEndoPituitaryDiViz(v, null, false); }
    };
  }
  return null;
}

// =========================================================================
// W1. DIAGNOSIS GLIKEMIK, TTGO, HBA1C & ARTEFAK (endo-1-1)
// =========================================================================
var ENDO_DM_PRESETS = {
  normal: { gdp: 88, ttgo: 124, hba1c: 5.2, artifact: "none", label: "Normal / Euglikemik" },
  gdpt_tgt: { gdp: 114, ttgo: 168, hba1c: 6.1, artifact: "none", label: "Prediabetes (GDPT & TGT)" },
  dm_frank: { gdp: 172, ttgo: 248, hba1c: 8.6, artifact: "none", label: "Diabetes Melitus Pasti" },
  artifact_hemo: { gdp: 180, ttgo: 254, hba1c: 5.1, artifact: "hemolytic_low", label: "Artefak Anemia / Dialisis" }
};

function buildEndoDmCriteriaSvg(gdpVal, ttgoVal, a1cVal, artifact) {
  var gdp = clampNum(gdpVal, 70, 250, 92);
  var ttgo = clampNum(ttgoVal, 80, 350, 125);
  var a1c = clampNum(a1cVal, 4.0, 14.0, 5.4);

  // Gauge bar 1: GDP (70..250, span=180) -> width 440 (x=20..460)
  var gdpPct = (gdp - 70) / 180;
  var gdpX = 20 + clampNum(gdpPct, 0, 1, 0) * 440;
  var gdp100X = 20 + ((100 - 70) / 180) * 440; // 93.3
  var gdp126X = 20 + ((126 - 70) / 180) * 440; // 156.9
  var gdpTone = gdp >= 126 ? "var(--accent-coral)" : (gdp >= 100 ? "var(--accent-secondary)" : "var(--accent-primary)");

  // Gauge bar 2: TTGO (80..350, span=270)
  var ttgoPct = (ttgo - 80) / 270;
  var ttgoX = 20 + clampNum(ttgoPct, 0, 1, 0) * 440;
  var ttgo140X = 20 + ((140 - 80) / 270) * 440; // 117.8
  var ttgo200X = 20 + ((200 - 80) / 270) * 440; // 215.6
  var ttgoTone = ttgo >= 200 ? "var(--accent-coral)" : (ttgo >= 140 ? "var(--accent-secondary)" : "var(--accent-primary)");

  // Gauge bar 3: HbA1c (4..14, span=10)
  var a1cPct = (a1c - 4.0) / 10.0;
  var a1cX = 20 + clampNum(a1cPct, 0, 1, 0) * 440;
  var a1c57X = 20 + ((5.7 - 4.0) / 10.0) * 440; // 94.8
  var a1c65X = 20 + ((6.5 - 4.0) / 10.0) * 440; // 130.0
  var a1cTone = a1c >= 6.5 ? "var(--accent-coral)" : (a1c >= 5.7 ? "var(--accent-secondary)" : "var(--accent-primary)");

  var isArtifact = artifact === "hemolytic_low" || artifact === "iron_high";
  var artifactStrike = "";
  if (isArtifact) {
    artifactStrike = '<line x1="20" y1="172" x2="460" y2="172" stroke="var(--accent-coral)" stroke-width="3" stroke-dasharray="6,4" />' +
      '<rect x="130" y="157" width="220" height="22" rx="8" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="1.5" />' +
      '<text x="240" y="172" text-anchor="middle" font-size="9.8" font-weight="800" fill="var(--accent-coral)">HBA1C INVALID (ARTEFAK ERITROSIT)</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Simulator Diagnosis Glikemik">' +
    // Top Bar 1: GDP
    '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">1. GLUKOSA DARAH PUASA (GDP)</text>' +
    '<text x="458" y="18" text-anchor="end" font-size="11" font-weight="800" fill="' + gdpTone + '">' + gdp + ' mg/dL (' + (gdp >= 126 ? "DM" : (gdp >= 100 ? "GDPT" : "Normal")) + ')</text>' +
    '<rect x="20" y="25" width="440" height="15" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="25" width="' + (gdp100X - 20).toFixed(1) + '" height="15" fill="var(--accent-primary)" fill-opacity="0.25" />' +
    '<rect x="' + gdp100X.toFixed(1) + '" y="25" width="' + (gdp126X - gdp100X).toFixed(1) + '" height="15" fill="var(--accent-secondary)" fill-opacity="0.32" />' +
    '<rect x="' + gdp126X.toFixed(1) + '" y="25" width="' + (460 - gdp126X).toFixed(1) + '" height="15" fill="var(--accent-coral)" fill-opacity="0.28" />' +
    '<circle cx="' + gdpX.toFixed(1) + '" cy="32.5" r="7.5" fill="var(--bg-surface)" stroke="' + gdpTone + '" stroke-width="3" />' +
    '<text x="22" y="52" font-size="8" font-weight="700" fill="var(--text-muted)">Normal &lt;100</text>' +
    '<text x="' + gdp113X(gdp100X, gdp126X) + '" y="52" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-muted)">GDPT 100-125</text>' +
    '<text x="458" y="52" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">DM &ge;126 mg/dL</text>' +

    // Mid Bar 2: TTGO
    '<text x="22" y="80" font-size="9.5" font-weight="800" fill="var(--text-muted)">2. BEBAN GLUKOSA 75g (TTGO 2 JAM)</text>' +
    '<text x="458" y="80" text-anchor="end" font-size="11" font-weight="800" fill="' + ttgoTone + '">' + ttgo + ' mg/dL (' + (ttgo >= 200 ? "DM" : (ttgo >= 140 ? "TGT" : "Normal")) + ')</text>' +
    '<rect x="20" y="87" width="440" height="15" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="87" width="' + (ttgo140X - 20).toFixed(1) + '" height="15" fill="var(--accent-primary)" fill-opacity="0.25" />' +
    '<rect x="' + ttgo140X.toFixed(1) + '" y="87" width="' + (ttgo200X - ttgo140X).toFixed(1) + '" height="15" fill="var(--accent-secondary)" fill-opacity="0.32" />' +
    '<rect x="' + ttgo200X.toFixed(1) + '" y="87" width="' + (460 - ttgo200X).toFixed(1) + '" height="15" fill="var(--accent-coral)" fill-opacity="0.28" />' +
    '<circle cx="' + ttgoX.toFixed(1) + '" cy="94.5" r="7.5" fill="var(--bg-surface)" stroke="' + ttgoTone + '" stroke-width="3" />' +
    '<text x="22" y="114" font-size="8" font-weight="700" fill="var(--text-muted)">Normal &lt;140</text>' +
    '<text x="' + ttgo170X(ttgo140X, ttgo200X) + '" y="114" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-muted)">TGT 140-199</text>' +
    '<text x="458" y="114" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">DM &ge;200 mg/dL</text>' +

    // Bottom Bar 3: HbA1c
    '<text x="22" y="142" font-size="9.5" font-weight="800" fill="var(--text-muted)">3. GLIKASI HEMOGLOBIN (HBA1C)</text>' +
    '<text x="458" y="142" text-anchor="end" font-size="11" font-weight="800" fill="' + (isArtifact ? 'var(--text-muted)' : a1cTone) + '">' + a1c.toFixed(1) + '% ' + (isArtifact ? '(INVALID)' : (a1c >= 6.5 ? '(DM)' : (a1c >= 5.7 ? '(Prediabetes)' : '(Normal)'))) + '</text>' +
    '<rect x="20" y="149" width="440" height="15" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="149" width="' + (a1c57X - 20).toFixed(1) + '" height="15" fill="var(--accent-primary)" fill-opacity="0.25" />' +
    '<rect x="' + a1c57X.toFixed(1) + '" y="149" width="' + (a1c65X - a1c57X).toFixed(1) + '" height="15" fill="var(--accent-secondary)" fill-opacity="0.32" />' +
    '<rect x="' + a1c65X.toFixed(1) + '" y="149" width="' + (460 - a1c65X).toFixed(1) + '" height="15" fill="var(--accent-coral)" fill-opacity="0.28" />' +
    '<circle cx="' + a1cX.toFixed(1) + '" cy="156.5" r="7.5" fill="var(--bg-surface)" stroke="' + (isArtifact ? 'var(--text-muted)' : a1cTone) + '" stroke-width="3" />' +
    artifactStrike +
    '<text x="22" y="177" font-size="8" font-weight="700" fill="var(--text-muted)">Normal &lt;5.7%</text>' +
    '<text x="' + ((a1c57X + a1c65X) / 2).toFixed(1) + '" y="177" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-muted)">Prediabetes 5.7-6.4%</text>' +
    '<text x="458" y="177" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">DM &ge;6.5% NGSP</text>' +

    // Footer panel info
    '<rect x="20" y="190" width="440" height="32" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="206" font-size="8" font-weight="700" fill="var(--text-primary)">Kriteria: 2 tes abnormal atau 1 tes</text>' +
    '<text x="32" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">abnormal terkonfirmasi ulang</text>' +
  '</svg>';
}

function gdp113X(x1, x2) { return ((x1 + x2) / 2).toFixed(1); }
function ttgo170X(x1, x2) { return ((x1 + x2) / 2).toFixed(1); }

function getEndoDmInfo(gdp, ttgo, hba1c, artifact) {
  var isDM = gdp >= 126 || ttgo >= 200 || (artifact === "none" && hba1c >= 6.5);
  var isPre = !isDM && (gdp >= 100 || ttgo >= 140 || (artifact === "none" && hba1c >= 5.7));

  if (artifact === "hemolytic_low") {
    return {
      tone: "danger",
      rKey: "art_hemo",
      title: "Artefak Pemendekan Usia Eritrosit (HbA1c Falsely Low)",
      c1Label: "Temuan Laboratorium",
      c1Body: "GDP " + gdp + " mg/dL & TTGO " + ttgo + " mg/dL (Konfirmasi " + (isDM ? "DIABETES MELITUS" : (isPre ? "PREDIABETES" : "Normal")) + "). Nilai HbA1c " + hba1c + "% TIDAK VALID akibat lisis eritrosit/hemodialisis.",
      c2Label: "Rekomendasi PERKENI",
      c2Body: "Jangan gunakan HbA1c untuk diagnosis/monitoring! Gunakan <strong>Fruktosamin serum</strong> (glikasi albumin masa paruh 2-3 minggu) atau monitoring glukosa mandiri (SMBG/CGM)."
    };
  }

  if (artifact === "iron_high") {
    return {
      tone: "warning",
      rKey: "art_iron",
      title: "Artefak Defisiensi Besi Berat (HbA1c Falsely High)",
      c1Label: "Temuan Laboratorium",
      c1Body: "Defisiensi besi memperpanjang usia eritrosit sirkulasi sehingga meningkatkan fraksi terglikasi HbA1c semu (" + hba1c + "%).",
      c2Label: "Rekomendasi Klinis",
      c2Body: "Koreksi defisiensi besi dan tegakkan diagnosis glikemik berbasis GDP (" + gdp + " mg/dL) serta beban TTGO 75g (" + ttgo + " mg/dL)."
    };
  }

  if (isDM) {
    return {
      tone: "danger",
      rKey: "dm_frank",
      title: "Memenuhi Kriteria Diagnosis Diabetes Melitus (PERKENI / ADA 2024)",
      c1Label: "Status Glikemik",
      c1Body: "GDP &ge;126 mg/dL, TTGO &ge;200 mg/dL, atau HbA1c &ge;6.5%. Pada pasien asimtomatik, wajib dilakukan tes konfirmasi ulang dari sampel darah baru.",
      c2Label: "Langkah Selanjutnya",
      c2Body: "Skrining komplikasi vaskular (funduskopi, profil lipid, eLFG, UACR urin, EKG) dan edukasi modifikasi gaya hidup + inisiasi OAD/insulin lini pertama."
    };
  }

  if (isPre) {
    var sub = [];
    if (gdp >= 100) sub.push("GDPT (GDP 100-125)");
    if (ttgo >= 140) sub.push("TGT (TTGO 140-199)");
    if (hba1c >= 5.7) sub.push("HbA1c Prediabetes (5.7-6.4%)");
    return {
      tone: "warning",
      rKey: "prediabetes",
      title: "Status Prediabetes: " + sub.join(" &bull; "),
      c1Label: "Risiko Progresi",
      c1Body: "Risiko tinggi konversi menjadi DM Tipe 2 (5-10%/tahun) dan peningkatan risiko aterosklerosis kardiovaskular independen.",
      c2Label: "Intervensi PERKENI",
      c2Body: "Modifikasi gaya hidup intensif: penurunan berat badan 5-7%, latihan aerobik 150 menit/minggu. Pertimbangkan Metformin pada IMT &ge;35 atau riwayat DMG."
    };
  }

  return {
    tone: "info",
    rKey: "normal",
    title: "Toleransi Glukosa Normal (Euglikemia)",
    c1Label: "Hasil Pemeriksaan",
    c1Body: "GDP &lt;100 mg/dL (" + gdp + "), TTGO 2 jam &lt;140 mg/dL (" + ttgo + "), HbA1c &lt;5.7% (" + hba1c + "%). Homeostasis insulin-glukosa intak.",
    c2Label: "Surveilans Berkala",
    c2Body: "Skrining ulang setiap 3 tahun pada populasi umum usia &ge;45 tahun atau lebih dini pada individu dengan faktor risiko (obesitas, hipertensi, riwayat keluarga)."
  };
}

function updateEndoDmCriteriaViz(gdpVal, ttgoVal, a1cVal, artifactVal) {
  if (gdpVal !== null && gdpVal !== undefined) endoVizState.dmGdp = Number(gdpVal);
  if (ttgoVal !== null && ttgoVal !== undefined) endoVizState.dmTtgo = Number(ttgoVal);
  if (a1cVal !== null && a1cVal !== undefined) endoVizState.dmHba1c = Number(a1cVal);
  if (artifactVal !== null && artifactVal !== undefined) endoVizState.dmArtifact = String(artifactVal);

  var gdp = endoVizState.dmGdp;
  var ttgo = endoVizState.dmTtgo;
  var a1c = endoVizState.dmHba1c;
  var art = endoVizState.dmArtifact;

  // Update slider pills
  syncSliderAndPill("endo-dm-gdp", "endo-dm-gdp-pill", gdp, gdp + " mg/dL");
  syncSliderAndPill("endo-dm-ttgo", "endo-dm-ttgo-pill", ttgo, ttgo + " mg/dL");
  syncSliderAndPill("endo-dm-a1c", "endo-dm-a1c-pill", a1c, a1c.toFixed(1) + "%");

  swapVizSvgFrame("viz-endoDm-frame", buildEndoDmCriteriaSvg(gdp, ttgo, a1c, art));

  var info = getEndoDmInfo(gdp, ttgo, a1c, art);
  updateVizReadout(
    "viz-endoDm-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function applyEndoDmPreset(presetKey) {
  var p = ENDO_DM_PRESETS[presetKey];
  if (!p) return;
  endoVizState.dmPreset = presetKey;
  endoVizState.dmGdp = p.gdp;
  endoVizState.dmTtgo = p.ttgo;
  endoVizState.dmHba1c = p.hba1c;
  endoVizState.dmArtifact = p.artifact;

  var artSelect = document.getElementById("endo-dm-artifact-sel");
  if (artSelect) artSelect.value = p.artifact;

  syncVizPresets("viz-endo-dm-presets", Object.keys(ENDO_DM_PRESETS).map(function(k) { return k === presetKey; }));
  updateEndoDmCriteriaViz(p.gdp, p.ttgo, p.hba1c, p.artifact);
}

function renderEndoDmCriteriaWidget() {
  var gdp = endoVizState.dmGdp;
  var ttgo = endoVizState.dmTtgo;
  var a1c = endoVizState.dmHba1c;
  var art = endoVizState.dmArtifact;
  var info = getEndoDmInfo(gdp, ttgo, a1c, art);

  var presetBtns = Object.entries(ENDO_DM_PRESETS).map(function(e) {
    return { key: e[0], label: e[1].label, active: endoVizState.dmPreset === e[0] };
  });

  var controlsTop = '<div class="viz-presets mb-2.5" id="viz-endo-dm-presets">' +
    presetBtns.map(function(b) {
      return '<button type="button" class="viz-pill-btn ' + (b.active ? "active" : "") + '" onclick="window.InternaApp.applyEndoDmPreset(\'' + b.key + '\')">' + b.label + '</button>';
    }).join("") +
  '</div>';

  var controlsBottom = '<div class="space-y-2 mt-2">' +
    '<div class="viz-slider-row">' +
      '<label for="endo-dm-gdp" class="viz-slider-label">Glukosa Darah Puasa (GDP):</label>' +
      '<span id="endo-dm-gdp-pill" class="viz-value-pill">' + gdp + ' mg/dL</span>' +
    '</div>' +
    '<input type="range" id="endo-dm-gdp" class="viz-range" min="70" max="250" step="1" value="' + gdp + '" oninput="window.InternaApp.updateEndoDmCriteriaViz(this.value, null, null, null)" />' +

    '<div class="viz-slider-row mt-2">' +
      '<label for="endo-dm-ttgo" class="viz-slider-label">Beban Glukosa 75g (TTGO 2 Jam):</label>' +
      '<span id="endo-dm-ttgo-pill" class="viz-value-pill">' + ttgo + ' mg/dL</span>' +
    '</div>' +
    '<input type="range" id="endo-dm-ttgo" class="viz-range" min="80" max="350" step="1" value="' + ttgo + '" oninput="window.InternaApp.updateEndoDmCriteriaViz(null, this.value, null, null)" />' +

    '<div class="viz-slider-row mt-2">' +
      '<label for="endo-dm-a1c" class="viz-slider-label">Kadar HbA1c (%):</label>' +
      '<span id="endo-dm-a1c-pill" class="viz-value-pill">' + a1c.toFixed(1) + '%</span>' +
    '</div>' +
    '<input type="range" id="endo-dm-a1c" class="viz-range" min="4.0" max="14.0" step="0.1" value="' + a1c + '" oninput="window.InternaApp.updateEndoDmCriteriaViz(null, null, this.value, null)" />' +

    '<div class="mt-2.5 pt-2 border-t border-[var(--border-subtle)]">' +
      '<label for="endo-dm-artifact-sel" class="viz-slider-label block mb-1">Kondisi Klinis Pengganggu / Artefak Umur Eritrosit:</label>' +
      '<select id="endo-dm-artifact-sel" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoDmCriteriaViz(null, null, null, this.value)">' +
        '<option value="none" ' + (art === "none" ? "selected" : "") + '>Tidak Ada (Eritrosit Normal ~120 Hari)</option>' +
        '<option value="hemolytic_low" ' + (art === "hemolytic_low" ? "selected" : "") + '>Anemia Hemolitik / Dialisis / Perdarahan Akut (HbA1c Falsely Low)</option>' +
        '<option value="iron_high" ' + (art === "iron_high" ? "selected" : "") + '>Anemia Defisiensi Besi Berat / Splenektomi (HbA1c Falsely High)</option>' +
      '</select>' +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoDm",
    title: "Simulator Kriteria Diagnostik Glikemik & Deteksi Artefak",
    tag: "PERKENI &bull; ADA 2024",
    controlsTop: controlsTop,
    svgHtml: buildEndoDmCriteriaSvg(gdp, ttgo, a1c, art),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W2. ALGORITMA OAD & PROTEKSI ORGAN (endo-1-2)
// =========================================================================
var ENDO_OAD_COMORBIDS = {
  ascvd: { label: "ASCVD / Riwayat PJK / Stroke", tone: "danger" },
  hfref: { label: "Gagal Jantung (HFrEF / HFpEF)", tone: "danger" },
  ckd: { label: "CKD / Albuminuria (UACR >30)", tone: "warning" },
  obesity: { label: "Obesitas / Target Penurunan BB", tone: "info" },
  standard: { label: "Tanpa Komorbid / Prioritas Biaya", tone: "info" }
};

function buildEndoOadOrganSvg(comorbidKey, egfrVal) {
  var egfr = clampNum(egfrVal, 15, 95, 42);
  var isMetforminContra = egfr < 30;
  var isMetforminReduce = egfr >= 30 && egfr < 45;
  var isSglt2Contra = egfr < 20;

  var metTone = isMetforminContra ? "var(--accent-coral)" : (isMetforminReduce ? "var(--accent-secondary)" : "var(--accent-primary)");
  var metLabel = isMetforminContra ? "METFORMIN KONTRAINDIKASI (<30)" : (isMetforminReduce ? "Metformin Dosis Maks 1000 mg" : "Metformin Dosis Penuh 2000 mg");

  // eGFR gauge bar (15..95)
  var egfrPct = (egfr - 15) / 80;
  var egfrX = 20 + clampNum(egfrPct, 0, 1, 0) * 440;
  var cut30X = 20 + ((30 - 15) / 80) * 440; // 102.5
  var cut45X = 20 + ((45 - 15) / 80) * 440; // 185.0
  var cut60X = 20 + ((60 - 15) / 80) * 440; // 267.5

  var tier1Drug = "SGLT2i / GLP-1 RA";
  var tier1Evidence = "Bukti CV: Empa/Dapa/Semaglutide";
  var avoidDrug = "Hindari Sulfonilurea Dosis Tinggi";
  if (comorbidKey === "hfref") {
    tier1Drug = "SGLT2i (Empa / Dapa)";
    tier1Evidence = "Reduksi Hospitalisasi HF & Mortalitas";
    avoidDrug = "TZD (Pioglitazone) KONTRAINDIKASI!";
  } else if (comorbidKey === "ckd") {
    tier1Drug = "SGLT2i + Finerenon / GLP-1 RA";
    tier1Evidence = "Memperlambat Progresi ESKD (CREDENCE)";
    avoidDrug = "Hindari Glibenklamid (Risiko Hipoglikemia)";
  } else if (comorbidKey === "obesity") {
    tier1Drug = "GLP-1 RA / GIP-GLP-1 (Tirzepatide)";
    tier1Evidence = "Penurunan BB Sangat Kuat (>15%)";
    avoidDrug = "Hindari Insulin & SU (Menaikkan BB)";
  } else if (comorbidKey === "standard") {
    tier1Drug = "Metformin + Sulfonilurea / DPP-4i";
    tier1Evidence = "Efikasi Penurunan HbA1c Terjangkau";
    avoidDrug = "Pilih Glimepirid / Gliklazid (Bukan Gliben)";
  }

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Algoritma OAD Berbasis Organ">' +
    // Top eGFR bar
    '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">FUNGSI GINJAL (eLFG PASIEN)</text>' +
    '<text x="458" y="18" text-anchor="end" font-size="11" font-weight="800" fill="' + metTone + '">eLFG = ' + egfr + ' mL/min/1.73m2</text>' +
    '<rect x="20" y="25" width="440" height="14" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="25" width="' + (cut30X - 20).toFixed(1) + '" height="14" fill="var(--accent-coral)" fill-opacity="0.35" />' +
    '<rect x="' + cut30X.toFixed(1) + '" y="25" width="' + (cut45X - cut30X).toFixed(1) + '" height="14" fill="var(--accent-secondary)" fill-opacity="0.32" />' +
    '<rect x="' + cut45X.toFixed(1) + '" y="25" width="' + (460 - cut45X).toFixed(1) + '" height="14" fill="var(--accent-primary)" fill-opacity="0.25" />' +
    '<circle cx="' + egfrX.toFixed(1) + '" cy="32" r="7.5" fill="var(--bg-surface)" stroke="' + metTone + '" stroke-width="3" />' +
    '<text x="22" y="52" font-size="8" font-weight="700" fill="var(--accent-coral)">&lt;30 Stop Metformin</text>' +
    '<text x="' + cut45X.toFixed(1) + '" y="52" text-anchor="middle" font-size="8" font-weight="700" fill="var(--text-muted)">30-44 Maks 1000mg</text>' +
    '<text x="458" y="52" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-primary)">&ge;45 Dosis Penuh</text>' +

    // Organ Tier Matrix (2 columns)
    // Left Box: Rekomendasi Utama
    '<rect x="20" y="65" width="215" height="120" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="84" font-size="9" font-weight="800" fill="var(--accent-primary)">PILIHAN LINI 1 BERBASIS ORGAN</text>' +
    '<text x="32" y="104" font-size="11.5" font-weight="800" fill="var(--text-primary)">' + tier1Drug + '</text>' +
    '<text x="32" y="122" font-size="8.2" font-weight="600" fill="var(--text-secondary)">' + tier1Evidence + '</text>' +
    '<rect x="32" y="132" width="190" height="20" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="40" y="146" font-size="8" font-weight="700" fill="' + metTone + '">' + metLabel + '</text>' +
    '<text x="32" y="172" font-size="7.8" font-weight="600" fill="var(--text-muted)">Independen dari HbA1c awal pasien!</text>' +

    // Right Box: Peringatan & Kontraindikasi
    '<rect x="245" y="65" width="215" height="120" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="84" font-size="9" font-weight="800" fill="var(--accent-coral)">PERINGATAN & KONTRAINDIKASI</text>' +
    '<text x="257" y="104" font-size="10" font-weight="800" fill="' + (comorbidKey === "hfref" || isMetforminContra ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + avoidDrug + '</text>' +
    '<text x="257" y="124" font-size="8.2" font-weight="600" fill="var(--text-primary)">DPP-4i Ginjal: Linagliptin 5 mg</text>' +
    '<text x="257" y="140" font-size="7.8" font-weight="600" fill="var(--text-muted)">Linagliptin ekskresi empedu (no adj)</text>' +
    '<text x="257" y="158" font-size="8" font-weight="700" fill="' + (isSglt2Contra ? "var(--accent-coral)" : "var(--text-secondary)") + '">' + (isSglt2Contra ? "SGLT2i: Stop inisiasi jika eLFG <20" : "SGLT2i aman diteruskan s/d eLFG 20") + '</text>' +
    '<text x="257" y="174" font-size="7.8" font-weight="600" fill="var(--text-muted)">Pioglitazone: picu retensi cairan HF</text>' +

    // Footer summary
    '<rect x="20" y="193" width="440" height="30" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="212" font-size="8.8" font-weight="700" fill="var(--text-primary)">Kombinasi dini jika HbA1c &ge;7.5%</text>' +
  '</svg>';
}

function getEndoOadInfo(comorbidKey, egfr) {
  var isMetContra = egfr < 30;
  var isMetReduce = egfr >= 30 && egfr < 45;

  var title = "Algoritma Terapi DM: " + ENDO_OAD_COMORBIDS[comorbidKey].label;
  var c1Label = "Paduan Terapi Terpilih";
  var c1Body = "";
  var c2Label = "Keamanan Dosis Ginjal (eLFG " + egfr + ")";
  var c2Body = "";

  if (isMetContra) {
    c2Body = "<span class=\"text-[var(--accent-coral)] font-bold\">METFORMIN KONTRAINDIKASI MUTLAK!</span> Hentikan Metformin segera karena risiko fatal Asidosis Laktat. Pilih DPP-4i Linagliptin 5 mg atau Insulin.";
  } else if (isMetReduce) {
    c2Body = "Metformin aman dengan <strong>penurunan dosis maksimal 1000 mg/hari</strong>. Monitor fungsi ginjal dan hidrasi berkala.";
  } else {
    c2Body = "Metformin dapat diberikan dosis penuh (hingga 2000 mg/hari) bersama terapi organ-protektif.";
  }

  if (comorbidKey === "ascvd") {
    c1Body = "Prioritas mutlak: <strong>GLP-1 RA dengan bukti kardiovaskular</strong> (Semaglutide / Liraglutide) atau <strong>SGLT2i</strong> (Empagliflozin / Dapagliflozin) untuk reduksi MACE 3-point.";
  } else if (comorbidKey === "hfref") {
    c1Body = "Prioritas mutlak: <strong>SGLT2i (Dapagliflozin 10 mg / Empagliflozin 10 mg)</strong> terbukti menurunkan rawat inap gagal jantung & mortalitas CV. <strong>Pioglitazone (TZD) KONTRAINDIKASI MUTLAK!</strong>";
  } else if (comorbidKey === "ckd") {
    c1Body = "Prioritas: <strong>SGLT2i</strong> (terbukti menunda progresi penyakit ginjal tahap akhir / ESKD pada eLFG &ge;20). Tambahkan non-steroidal MRA (Finerenon) bila albuminuria menetap.";
  } else if (comorbidKey === "obesity") {
    c1Body = "Prioritas efikasi penurunan BB sangat tinggi: <strong>Tirzepatide (dual GIP/GLP-1) atau Semaglutide SC</strong>. Hindari Sulfonilurea & Insulin jika memungkinkan.";
  } else {
    c1Body = "Lini pertama: Metformin + modifikasi gaya hidup. Bila butuh terapi kombinasi hemat biaya, pilih Sulfonilurea generasi baru (Glimepirid / Gliklazid MR). Hindari Glibenklamid.";
  }

  return {
    tone: isMetContra ? "danger" : (comorbidKey === "hfref" || comorbidKey === "ascvd" ? "warning" : "info"),
    rKey: "oad_" + comorbidKey + "_" + egfr,
    title: title,
    c1Label: c1Label,
    c1Body: c1Body,
    c2Label: c2Label,
    c2Body: c2Body
  };
}

function updateEndoOadOrganViz(comorbidVal, egfrVal) {
  if (comorbidVal && ENDO_OAD_COMORBIDS[comorbidVal]) endoVizState.oadComorbid = comorbidVal;
  if (egfrVal !== null && egfrVal !== undefined) endoVizState.oadEgfr = clampNum(egfrVal, 15, 95, endoVizState.oadEgfr);

  var com = endoVizState.oadComorbid;
  var egfr = endoVizState.oadEgfr;

  syncEndoTabByMatch("viz-endo-oad-tabs", "'" + com + "'");
  syncSliderAndPill("endo-oad-egfr", "endo-oad-egfr-pill", egfr, egfr + " mL/min");
  swapVizSvgFrame("viz-endoOad-frame", buildEndoOadOrganSvg(com, egfr));

  var info = getEndoOadInfo(com, egfr);
  updateVizReadout(
    "viz-endoOad-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoOadOrganWidget() {
  var com = endoVizState.oadComorbid;
  var egfr = endoVizState.oadEgfr;
  var info = getEndoOadInfo(com, egfr);

  var controlsTop = '<div class="mb-2.5">' +
    renderCardioTabRow("viz-endo-oad-tabs", Object.entries(ENDO_OAD_COMORBIDS).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoOadOrganViz('" + e[0] + "', null)" };
    }), com) +
  '</div>';

  var controlsBottom = '<div class="mt-2.5">' +
    '<div class="viz-slider-row">' +
      '<label for="endo-oad-egfr" class="viz-slider-label">Simulasi Fungsi Ginjal (eLFG Pasien):</label>' +
      '<span id="endo-oad-egfr-pill" class="viz-value-pill">' + egfr + ' mL/min</span>' +
    '</div>' +
    '<input type="range" id="endo-oad-egfr" class="viz-range" min="15" max="95" step="1" value="' + egfr + '" oninput="window.InternaApp.updateEndoOadOrganViz(null, this.value)" />' +
    '<div class="viz-presets mt-2" id="viz-endo-oad-presets">' +
      '<button type="button" class="viz-pill-btn ' + (egfr === 22 ? "active" : "") + '" onclick="window.InternaApp.updateEndoOadOrganViz(null, 22)">CKD 4 (22 mL/min)</button>' +
      '<button type="button" class="viz-pill-btn ' + (egfr === 38 ? "active" : "") + '" onclick="window.InternaApp.updateEndoOadOrganViz(null, 38)">CKD 3b (38 mL/min)</button>' +
      '<button type="button" class="viz-pill-btn ' + (egfr === 55 ? "active" : "") + '" onclick="window.InternaApp.updateEndoOadOrganViz(null, 55)">CKD 3a (55 mL/min)</button>' +
      '<button type="button" class="viz-pill-btn ' + (egfr === 85 ? "active" : "") + '" onclick="window.InternaApp.updateEndoOadOrganViz(null, 85)">Normal (85 mL/min)</button>' +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoOad",
    title: "Algoritma Pemilihan OAD & Proteksi Organ Komorbid",
    tag: "PERKENI &bull; ADA 2024",
    controlsTop: controlsTop,
    svgHtml: buildEndoOadOrganSvg(com, egfr),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W3. INSULIN PK & DAWN VS SOMOGYI (endo-1-3) - rAF: endoInsulin
// =========================================================================
var ENDO_INSULIN_MODES = {
  pk_profile: { label: "Profil PK Basal-Bolus", tone: "info" },
  dawn: { label: "Fenomena Dawn", tone: "warning" },
  somogyi: { label: "Efek Somogyi (Rebound)", tone: "danger" }
};

function getInsulinCurveValues(mode, hour) {
  var h = clampNum(hour, 0, 24, 6.0);
  var bg = 110;
  var ins = 15;

  if (mode === "dawn") {
    // Dawn: 00:00=115, 03:00=118 (normal), 05:00=150, 06:00=195, 08:00=220, then drops
    if (h <= 3) bg = 115 + h;
    else if (h <= 8) bg = 118 + Math.pow(h - 3, 1.8) * 11;
    else if (h <= 14) bg = 220 - (h - 8) * 12;
    else bg = 148 - (h - 14) * 3;
    ins = 12 + Math.sin(h / 3.8) * 4;
  } else if (mode === "somogyi") {
    // Somogyi: 00:00=110, 03:00=48 (hypo!), 05:00=120, 06:00=210, 08:00=245
    if (h <= 3) bg = 110 - (h / 3) * 62; // dips to 48
    else if (h <= 8) bg = 48 + Math.pow(h - 3, 2.1) * 8; // rebounds to 245
    else if (h <= 14) bg = 245 - (h - 8) * 15;
    else bg = 155 - (h - 14) * 4;
    ins = h <= 4 ? 28 : (h <= 8 ? 8 : 14); // high nocturnal insulin causing hypo
  } else {
    // Basal-Bolus PK: Basal plateau ~18, spikes at breakfast (07:30), lunch (12:30), dinner (19:00)
    var b1 = Math.exp(-Math.pow(h - 7.5, 2) / 1.8) * 45;
    var b2 = Math.exp(-Math.pow(h - 12.5, 2) / 1.8) * 45;
    var b3 = Math.exp(-Math.pow(h - 19.0, 2) / 1.8) * 45;
    ins = 16 + b1 + b2 + b3;
    bg = 95 + b1 * 1.4 + b2 * 1.4 + b3 * 1.4 - (ins - 16) * 0.4;
  }

  return { bg: Math.round(clampNum(bg, 35, 300, 110)), ins: Math.round(clampNum(ins, 5, 80, 20)) };
}

function buildEndoInsulinPkSvg(modeKey, hourVal) {
  var h = clampNum(hourVal, 0, 24, 6.0);
  var cur = getInsulinCurveValues(modeKey, h);

  // SVG dimensions: x=30..450 (width 420 for 24h), y=25..185 (height 160)
  var curX = 30 + (h / 24) * 420;
  // BG scale: 0..300 mg/dL -> y: 185 - (bg/300)*150
  var curBgY = 185 - (cur.bg / 300) * 150;

  // Generate path points every 0.5h
  var bgPoints = [];
  var insPoints = [];
  for (var t = 0; t <= 24; t += 0.5) {
    var vals = getInsulinCurveValues(modeKey, t);
    var px = 30 + (t / 24) * 420;
    var pyBg = 185 - (vals.bg / 300) * 150;
    var pyIns = 185 - (vals.ins / 80) * 75;
    bgPoints.push(px.toFixed(1) + "," + pyBg.toFixed(1));
    insPoints.push(px.toFixed(1) + "," + pyIns.toFixed(1));
  }

  var bgPathD = "M" + bgPoints.join(" L");
  var insPathD = "M" + insPoints.join(" L");

  // Night shading rect (00:00 to 06:00 -> x=30 to x=30+105=135)
  var calloutHtml = "";
  if (modeKey === "dawn") {
    calloutHtml = '<rect x="135" y="32" width="160" height="34" rx="8" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="1.2" />' +
      '<text x="142" y="46" font-size="8" font-weight="800" fill="var(--accent-secondary)">03:00 Normal(118) &bull; 06:00 Naik(195)</text>' +
      '<text x="142" y="58" font-size="7.6" font-weight="600" fill="var(--text-muted)">Hormon subuh naik: GH &amp; kortisol</text>';
  } else if (modeKey === "somogyi") {
    calloutHtml = '<rect x="50" y="115" width="165" height="34" rx="8" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="1.5" />' +
      '<text x="58" y="129" font-size="8.2" font-weight="800" fill="var(--accent-coral)">03:00 HIPOGLIKEMIA (48 mg/dL)!</text>' +
      '<text x="58" y="141" font-size="7.6" font-weight="600" fill="var(--text-muted)">Rebound pagi (245 mg/dL)!</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Simulasi Kurva Insulin & Glukosa 24 Jam">' +
    // Background Grid
    '<rect x="30" y="25" width="420" height="160" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    // Shaded night zone (00:00 to 06:00)
    '<rect x="30" y="25" width="105" height="160" fill="var(--text-muted)" fill-opacity="0.12" />' +
    '<text x="35" y="38" font-size="8" font-weight="700" fill="var(--text-muted)">Zona Nokturnal (Tidur)</text>' +

    // Horizontal threshold lines
    '<line x1="30" y1="' + (185 - (200/300)*150).toFixed(1) + '" x2="450" y2="' + (185 - (200/300)*150).toFixed(1) + '" stroke="var(--accent-coral)" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.4" />' +
    '<text x="446" y="' + (181 - (200/300)*150).toFixed(1) + '" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">Target Atas 200</text>' +

    '<line x1="30" y1="' + (185 - (70/300)*150).toFixed(1) + '" x2="450" y2="' + (185 - (70/300)*150).toFixed(1) + '" stroke="var(--accent-coral)" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.6" />' +
    '<text x="446" y="' + (193 - (70/300)*150).toFixed(1) + '" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-coral)">Hipoglikemia &lt;70</text>' +

    // Time ticks at bottom
    '<text x="30" y="196" font-size="7.8" font-weight="700" fill="var(--text-muted)">00:00</text>' +
    '<text x="82.5" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-coral)">03:00</text>' +
    '<text x="135" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-secondary)">06:00</text>' +
    '<text x="240" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">12:00</text>' +
    '<text x="345" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">18:00</text>' +
    '<text x="450" y="196" text-anchor="end" font-size="7.8" font-weight="700" fill="var(--text-muted)">24:00</text>' +

    // Insulin & Glucose Curves
    '<path d="' + insPathD + '" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4,2" />' +
    '<path d="' + bgPathD + '" fill="none" stroke="var(--accent-coral)" stroke-width="3" />' +

    // Moving Hour Cursor Line
    '<line x1="' + curX.toFixed(1) + '" y1="25" x2="' + curX.toFixed(1) + '" y2="185" stroke="var(--text-primary)" stroke-width="1.8" />' +
    '<circle cx="' + curX.toFixed(1) + '" cy="' + curBgY.toFixed(1) + '" r="5.5" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.5" />' +

    calloutHtml +

    // Bottom Legend & Readout bar
    '<rect x="30" y="202" width="420" height="26" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<circle cx="45" cy="215" r="4" fill="var(--accent-coral)" />' +
    '<text x="54" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">Glukosa: ' + cur.bg + ' mg/dL</text>' +
    '<circle cx="160" cy="215" r="4" fill="var(--accent-primary)" />' +
    '<text x="169" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">Insulin Aktif: ' + cur.ins + ' &mu;U/mL</text>' +
    '<text x="440" y="218" text-anchor="end" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">Jam ' + formatClockTime(h) + '</text>' +
  '</svg>';
}

function formatClockTime(h) {
  var hr = Math.floor(h);
  var min = Math.round((h - hr) * 60);
  if (min < 10) min = "0" + min;
  if (hr < 10) hr = "0" + hr;
  return hr + ":" + min;
}

function getEndoInsulinInfo(modeKey, hour) {
  var h = clampNum(hour, 0, 24, 6.0);
  var cur = getInsulinCurveValues(modeKey, h);

  if (modeKey === "dawn") {
    return {
      tone: "warning",
      rKey: "dawn_" + h.toFixed(1),
      title: "Fenomena Dawn (Pelepasan Hormon Kontra-Regulasi Fisiologis Pagi)",
      c1Label: "Temuan Nokturnal Jam 03:00 vs 06:00",
      c1Body: "GDS jam 03:00 subuh <strong>NORMAL/TINGGI (~118 mg/dL)</strong>, kemudian melonjak di jam 06:00-08:00 (" + cur.bg + " mg/dL) akibat lonjakan GH, kortisol, dan glukagon fajar.",
      c2Label: "Solusi Tatalaksana PERKENI",
      c2Body: "<strong>NAIKKAN dosis insulin basal malam</strong> (Glargine / Detemir) ATAU mundurkan waktu injeksi NPH ke menjelang tidur (jam 22:00) agar puncaknya pas menutupi lonjakan fajar."
    };
  }

  if (modeKey === "somogyi") {
    return {
      tone: "danger",
      rKey: "somogyi_" + h.toFixed(1),
      title: "Efek Somogyi (Rebound Hiperglikemia Pasca Hipoglikemia Subuh)",
      c1Label: "Temuan Nokturnal Jam 03:00 vs 06:00",
      c1Body: "GDS jam 03:00 subuh <strong>HIPOGLIKEMIA BERAT (~48 mg/dL)</strong>, memicu pelepasan katekolamin masif yang menghasilkan hiperglikemia rebound pagi (" + cur.bg + " mg/dL).",
      c2Label: "Solusi Tatalaksana (Jebakan Ujian!)",
      c2Body: "<strong>JANGAN NAIKKAN INSULIN!</strong> Solusinya adalah <strong>TURUNKAN dosis insulin basal malam</strong> atau berikan camilan karbohidrat kompleks sebelum tidur (bedtime snack)."
    };
  }

  return {
    tone: "info",
    rKey: "pk_" + h.toFixed(1),
    title: "Profil Farmakokinetik Regimen Basal-Bolus Fisiologis",
    c1Label: "Komponen Basal vs Prandial",
    c1Body: "Insulin basal (Glargine U-100 / Degludec) memberikan kurva datar tanpa puncak selama 24 jam. Insulin prandial kerja cepat (Aspart/Lispro) mengontrol lonjakan post-prandial makan pagi, siang, dan malam.",
    c2Label: "Status Jam " + formatClockTime(h),
    c2Body: "Kadar glukosa " + cur.bg + " mg/dL dengan kadar insulin aktif " + cur.ins + " &mu;U/mL. Titrasi basal berdasarkan GDP, titrasi prandial berdasarkan GD 2 jam post-prandial."
  };
}

function updateEndoInsulinPkViz(hourVal, modeVal, fromUser) {
  if (fromUser && hourVal !== null && hourVal !== undefined && typeof cancelAllVizAnimations === "function") {
    cancelAllVizAnimations();
  }
  if (hourVal !== null && hourVal !== undefined) endoVizState.insulinHour = clampNum(hourVal, 0, 24, 6);
  if (modeVal) endoVizState.insulinMode = modeVal;

  var h = endoVizState.insulinHour;
  var mode = endoVizState.insulinMode;

  syncEndoTabByMatch("viz-endo-insulin-tabs", "'" + mode + "'");
  syncSliderAndPill("viz-endoInsulin-slider", "viz-endoInsulin-pill", h, "Jam " + formatClockTime(h));
  syncVizPresets("viz-endoInsulin-presets", [Math.abs(h - 3.0) < 0.5, Math.abs(h - 6.0) < 0.5, Math.abs(h - 12.5) < 0.5, Math.abs(h - 19.0) < 0.5]);

  swapVizSvgFrame("viz-endoInsulin-frame", buildEndoInsulinPkSvg(mode, h));

  var info = getEndoInsulinInfo(mode, h);
  updateVizReadout(
    "viz-endoInsulin-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoInsulinPkWidget() {
  var h = endoVizState.insulinHour;
  var mode = endoVizState.insulinMode;
  var info = getEndoInsulinInfo(mode, h);

  var controlsTop = '<div class="mb-2.5">' +
    renderCardioTabRow("viz-endo-insulin-tabs", Object.entries(ENDO_INSULIN_MODES).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoInsulinPkViz(null, '" + e[0] + "', false)" };
    }), mode) +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "endoInsulin",
    label: "Simulasi Waktu 24 Jam (Jam 00:00 s/d 24:00):",
    pillText: "Jam " + formatClockTime(h),
    min: 0,
    max: 24,
    step: 0.1,
    value: h,
    trackBg: "linear-gradient(90deg, rgba(30,41,59,0.5) 0% 25%, rgba(16,185,129,0.3) 25% 75%, rgba(30,41,59,0.5) 75% 100%)",
    oninput: "window.InternaApp.updateEndoInsulinPkViz(this.value, null, true)",
    presets: [
      { val: 3.0, label: "03:00 (Nokturnal)", active: Math.abs(h - 3.0) < 0.5 },
      { val: 6.0, label: "06:00 (Bangun Pagi)", active: Math.abs(h - 6.0) < 0.5 },
      { val: 12.5, label: "12:30 (Siang)", active: Math.abs(h - 12.5) < 0.5 },
      { val: 19.0, label: "19:00 (Malam)", active: Math.abs(h - 19.0) < 0.5 }
    ]
  });

  return renderCardioWidgetCard({
    key: "endoInsulin",
    title: "Simulasi Profil Insulin 24 Jam & Fenomena Dawn vs Somogyi",
    tag: "PERKENI &bull; ADA 2024",
    controlsTop: controlsTop,
    svgHtml: buildEndoInsulinPkSvg(mode, h),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W4. PROTOKOL KAD VS HHS & GERBANG KALIUM (endo-2-1) - rAF: endoDka
// =========================================================================
var ENDO_DKA_SYNDROMES = {
  dka: { label: "KAD (Ketoasidosis Diabetik)", tone: "danger" },
  hhs: { label: "HHS (Status Hiperosmolar)", tone: "warning" }
};

var ENDO_K_GATES = {
  low: { label: "K <3.3 (BAHAYA: STOP INSULIN!)", tone: "danger" },
  normal: { label: "K 3.3-5.2 (Insulin + KCl Aman)", tone: "info" },
  high: { label: "K >5.2 (Insulin Jalan, Tahan KCl)", tone: "warning" }
};

function getDkaHhsTrajectory(syndrome, kGate, hour) {
  var h = clampNum(hour, 0, 12, 2.0);
  var isKLow = kGate === "low";

  // Initial values
  var initialBg = syndrome === "dka" ? 480 : 820;
  var bgDropPerHour = syndrome === "dka" ? 55 : 65;

  var currentBg = initialBg;
  var fluidType = "NaCl 0.9% (1000 mL/jam)";
  var insulinRate = "0.10 U/kg/jam";

  if (isKLow) {
    // If K < 3.3, insulin is STOPPED!
    insulinRate = "0 U/jam (DITUNDA KARENA K <3.3!)";
    // BG drops very slowly due to rehydration only
    currentBg = Math.max(initialBg - h * 18, syndrome === "dka" ? 380 : 680);
    fluidType = "NaCl 0.9% + KCl 20-30 mEq/jam Piggyback";
  } else {
    // Normal / High K: Insulin running
    currentBg = Math.max(initialBg - h * bgDropPerHour, syndrome === "dka" ? 170 : 260);

    var targetThreshold = syndrome === "dka" ? 200 : 300;
    if (currentBg <= targetThreshold) {
      fluidType = "D5% + 0.45% NaCl (Transisi Glukosa)";
      insulinRate = "0.02-0.05 U/kg/jam (Titrasi Turun)";
    } else {
      fluidType = h <= 1 ? "NaCl 0.9% (1-1.5 L/jam)" : "NaCl 0.45% / 0.9% (250-500 mL/jam)";
      insulinRate = "0.10 U/kg/jam IV Kontinu";
    }
  }

  return {
    bg: Math.round(currentBg),
    fluid: fluidType,
    insulin: insulinRate,
    isCrossover: currentBg <= (syndrome === "dka" ? 200 : 300) && !isKLow
  };
}

function buildEndoDkaHhsSvg(syndromeKey, kGateKey, hourVal) {
  var h = clampNum(hourVal, 0, 12, 2.0);
  var traj = getDkaHhsTrajectory(syndromeKey, kGateKey, h);
  var isKLow = kGateKey === "low";

  var gateColor = isKLow ? "var(--accent-coral)" : (kGateKey === "normal" ? "var(--accent-primary)" : "var(--accent-secondary)");
  var gateText = isKLow ? "GERBANG KALIUM TERKUNCI! INSULIN STOP" : (kGateKey === "normal" ? "GERBANG AMAN: INSULIN + KCL BERJALAN" : "KALIUM TINGGI: INSULIN JALAN, TAHAN KCL");

  // Pipeline x-axis (Hour 0 to 12 -> x=30 to 450)
  var curX = 30 + (h / 12) * 420;

  var crossoverX = syndromeKey === "dka" ? (30 + (5.1 / 12) * 420) : (30 + (8.0 / 12) * 420);

  return '<svg class="viz-svg" viewBox="0 0 480 240" role="img" aria-label="Simulator Protokol KAD vs HHS">' +
    // Top Gate Banner
    '<rect x="20" y="12" width="440" height="34" rx="11" fill="var(--bg-surface)" stroke="' + gateColor + '" stroke-width="2" />' +
    '<circle cx="38" cy="29" r="8" fill="' + gateColor + '" />' +
    '<text x="54" y="33" font-size="9" font-weight="800" fill="' + gateColor + '">' + gateText + '</text>' +

    // Hour Pipeline Axis (x=30..450, y=70..140)
    '<rect x="20" y="55" width="440" height="90" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="72" font-size="8.5" font-weight="800" fill="var(--text-muted)">RESUSITASI JAM-KE-JAM (0-12 JAM)</text>' +

    // Crossover line at BG <= 200 (DKA) / 300 (HHS)
    '<line x1="' + crossoverX.toFixed(1) + '" y1="78" x2="' + crossoverX.toFixed(1) + '" y2="135" stroke="var(--accent-secondary)" stroke-width="1.8" stroke-dasharray="4,3" />' +
    '<text x="' + crossoverX.toFixed(1) + '" y="90" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">Titik Transisi D5%</text>' +

    // Moving timeline marker
    '<line x1="30" y1="105" x2="450" y2="105" stroke="var(--border-subtle)" stroke-width="4" />' +
    '<line x1="30" y1="105" x2="' + curX.toFixed(1) + '" y2="105" stroke="' + gateColor + '" stroke-width="4" />' +
    '<circle cx="' + curX.toFixed(1) + '" cy="105" r="9" fill="var(--bg-surface)" stroke="' + gateColor + '" stroke-width="3" />' +
    '<text x="' + curX.toFixed(1) + '" y="108" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--text-primary)">' + h.toFixed(1) + '</text>' +

    // Tick labels
    '<text x="30" y="128" font-size="7.5" font-weight="700" fill="var(--text-muted)">Jam 0</text>' +
    '<text x="' + (30 + 35).toFixed(1) + '" y="128" font-size="7.5" font-weight="700" fill="var(--text-muted)">J1: NaCl 0.9%</text>' +
    '<text x="240" y="128" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">J4-J6: Monitor Keton/Osm</text>' +
    '<text x="450" y="128" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--text-muted)">J12: Resolusi</text>' +

    // Current State Meters (2 boxes)
    '<rect x="20" y="153" width="215" height="74" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="171" font-size="8.5" font-weight="800" fill="var(--text-muted)">GLUKOSA DARAH ESTIMASI</text>' +
    '<text x="32" y="193" font-size="15" font-weight="800" fill="' + (traj.bg <= 200 ? "var(--accent-secondary)" : "var(--accent-coral)") + '">' + traj.bg + ' mg/dL</text>' +
    '<text x="32" y="213" font-size="7.8" font-weight="700" fill="' + (traj.isCrossover ? "var(--accent-secondary)" : "var(--text-muted)") + '">' + (traj.isCrossover ? "Mencapai Target Glikemik! Tambah D5%" : "Target: Turun 50-75 mg/dL/jam") + '</text>' +

    '<rect x="245" y="153" width="215" height="74" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="171" font-size="8.5" font-weight="800" fill="var(--text-muted)">CAIRAN & INSULIN AKTIF</text>' +
    '<text x="257" y="189" font-size="9.5" font-weight="800" fill="var(--text-primary)">' + traj.insulin + '</text>' +
    '<text x="257" y="206" font-size="8" font-weight="600" fill="var(--text-secondary)">' + traj.fluid + '</text>' +
    '<text x="257" y="220" font-size="7.5" font-weight="700" fill="' + gateColor + '">' + (isKLow ? "AWAS: Insulin picu henti jantung asistol!" : "Kalium dipertahankan 4.0-5.0 mEq/L") + '</text>' +
  '</svg>';
}

function getEndoDkaInfo(syndromeKey, kGateKey, hour) {
  var h = clampNum(hour, 0, 12, 2.0);
  var traj = getDkaHhsTrajectory(syndromeKey, kGateKey, h);
  var isKLow = kGateKey === "low";

  if (isKLow) {
    return {
      tone: "danger",
      rKey: "dka_k_low_" + h.toFixed(1),
      title: "GERBANG KALIUM: K+ <3.3 mEq/L &bull; TUNDA INSULIN SEGERA!",
      c1Label: "Peringatan Bahaya Letal",
      c1Body: "Insulin memasukkan kalium ke dalam sel (intraseluler). Memberikan insulin saat K &lt;3.3 mEq/L memicu <strong>Aritmia Letal dan Henti Jantung Asistol</strong>!",
      c2Label: "Instruksi Protokol CITO",
      c2Body: "Berikan <strong>KCl 20-30 mEq/jam</strong> dalam infus IV hingga kalium serum mencapai &ge;3.3 mEq/L. Setelah kalium &ge;3.3 mEq/L, baru insulin reguler 0.1 U/kg/jam boleh dimulai."
    };
  }

  if (traj.isCrossover) {
    var cut = syndromeKey === "dka" ? "200" : "300";
    return {
      tone: "warning",
      rKey: "dka_crossover_" + h.toFixed(1),
      title: "Titik Crossover: Glukosa Darah &le;" + cut + " mg/dL (Jam " + h.toFixed(1) + ")",
      c1Label: "Perubahan Resep Cairan",
      c1Body: "Ganti cairan hidrasi menjadi <strong>D5% + 0.45% NaCl</strong> (atau D10% bila perlu) untuk mencegah hipoglikemia mendadak dan edema serebri saat osmolaritas turun cepat.",
      c2Label: "Penyesuaian Insulin",
      c2Body: "Turunkan laju insulin menjadi <strong>0.02-0.05 U/kg/jam</strong>. Pertahankan target glukosa " + (syndromeKey === "dka" ? "150-200 mg/dL" : "200-300 mg/dL") + " hingga asidosis/HHS teratasi sempurna."
    };
  }

  return {
    tone: "info",
    rKey: "dka_running_" + h.toFixed(1),
    title: "Fase Aktif Resusitasi Jam ke-" + h.toFixed(1) + " (" + ENDO_DKA_SYNDROMES[syndromeKey].label + ")",
    c1Label: "Rehidrasi & Insulin",
    c1Body: "Infus NaCl 0.9% / 0.45% kecepatan 250-500 mL/jam + Insulin Reguler 0.10 U/kg/jam. Glukosa darah saat ini " + traj.bg + " mg/dL (target penurunan 50-75 mg/dL/jam).",
    c2Label: "Kriteria Resolusi KAD",
    c2Body: "GDS &lt;200 mg/dL DITAMBAH 2 dari: serum Bikarbonat &ge;15 mEq/L, pH vena &gt;7.30, dan Anion Gap kembali normal (&le;12 mEq/L)."
  };
}

function updateEndoDkaHhsViz(hourVal, synVal, kGateVal, fromUser) {
  if (fromUser && hourVal !== null && hourVal !== undefined && typeof cancelAllVizAnimations === "function") {
    cancelAllVizAnimations();
  }
  if (hourVal !== null && hourVal !== undefined) endoVizState.dkaHour = clampNum(hourVal, 0, 12, 2);
  if (synVal) endoVizState.dkaSyndrome = synVal;
  if (kGateVal) endoVizState.dkaKGate = kGateVal;

  var h = endoVizState.dkaHour;
  var syn = endoVizState.dkaSyndrome;
  var kg = endoVizState.dkaKGate;

  syncEndoTabByMatch("viz-endo-dka-syn-tabs", "'" + syn + "'");
  syncEndoTabByMatch("viz-endo-dka-kgate-tabs", "'" + kg + "'");
  syncSliderAndPill("viz-endoDka-slider", "viz-endoDka-pill", h, "Jam ke-" + h.toFixed(1));
  syncVizPresets("viz-endoDka-presets", [Math.abs(h - 1.0) < 0.3, Math.abs(h - 3.0) < 0.3, Math.abs(h - 5.2) < 0.3, Math.abs(h - 10.0) < 0.3]);

  swapVizSvgFrame("viz-endoDka-frame", buildEndoDkaHhsSvg(syn, kg, h));

  var info = getEndoDkaInfo(syn, kg, h);
  updateVizReadout(
    "viz-endoDka-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoDkaHhsWidget() {
  var h = endoVizState.dkaHour;
  var syn = endoVizState.dkaSyndrome;
  var kg = endoVizState.dkaKGate;
  var info = getEndoDkaInfo(syn, kg, h);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-dka-syn-tabs", Object.entries(ENDO_DKA_SYNDROMES).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoDkaHhsViz(null, '" + e[0] + "', null, false)" };
    }), syn) +
    '<div class="pt-1.5 border-t border-[var(--border-subtle)]">' +
      '<span class="text-xs font-bold text-[var(--text-muted)] block mb-1">Status Gerbang Kalium (K+ Serum):</span>' +
      renderCardioTabRow("viz-endo-dka-kgate-tabs", Object.entries(ENDO_K_GATES).map(function(e) {
        return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoDkaHhsViz(null, null, '" + e[0] + "', false)" };
      }), kg) +
    '</div>' +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "endoDka",
    label: "Simulasi Jam Resusitasi Jam 0 s/d 12:",
    pillText: "Jam ke-" + h.toFixed(1),
    min: 0,
    max: 12,
    step: 0.1,
    value: h,
    trackBg: "linear-gradient(90deg, rgba(239,68,68,0.3) 0% 30%, rgba(245,158,11,0.3) 30% 60%, rgba(16,185,129,0.3) 60% 100%)",
    oninput: "window.InternaApp.updateEndoDkaHhsViz(this.value, null, null, true)",
    presets: [
      { val: 1.0, label: "Jam 1: NaCl 0.9%", active: Math.abs(h - 1.0) < 0.3 },
      { val: 3.0, label: "Jam 3: Evaluasi K+", active: Math.abs(h - 3.0) < 0.3 },
      { val: 5.2, label: "Jam 5: Crossover D5%", active: Math.abs(h - 5.2) < 0.3 },
      { val: 10.0, label: "Jam 10: Menuju Resolusi", active: Math.abs(h - 10.0) < 0.3 }
    ]
  });

  return renderCardioWidgetCard({
    key: "endoDka",
    title: "Simulator Protokol Jam-ke-Jam KAD/HHS & Gerbang Kalium",
    tag: "PERKENI &bull; ADA 2024",
    controlsTop: controlsTop,
    svgHtml: buildEndoDkaHhsSvg(syn, kg, h),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W5. HIPOGLIKEMIA PROTOKOL D40% & TRIAS WHIPPLE (endo-2-2)
// =========================================================================
var ENDO_HYPO_DIFF = {
  insulinoma: {
    label: "Insulinoma (Tumor Sel Beta)",
    tone: "danger",
    ins: "Tinggi (>3 &mu;U/mL saat hipo)",
    cpep: "Tinggi (>0.6 ng/mL)",
    proins: "Tinggi (>5 pmol/L)",
    suScreen: "Negatif",
    desc: "Sekresi insulin otonom tanpa supresi oleh hipoglikemia; rasio insulin/glukosa >0.3."
  },
  exogenous: {
    label: "Insulin Eksogen (Faktisius)",
    tone: "warning",
    ins: "Sangat Tinggi (>100 &mu;U/mL)",
    cpep: "TERSUPRESI (<0.2 ng/mL)!",
    proins: "Rendah / Normal",
    suScreen: "Negatif",
    desc: "C-peptida ditekan oleh umpan balik negatif insulin eksogen. Patognomonik!"
  },
  sulfonylurea: {
    label: "Sulfonilurea Tersembunyi",
    tone: "danger",
    ins: "Tinggi",
    cpep: "Tinggi",
    proins: "Normal / Sedikit Tinggi",
    suScreen: "POSITIF DALAM URIN/SERUM",
    desc: "Merangsang pelepasan insulin & C-peptida endogen secara simultan; screening obat positif."
  }
};

function buildEndoHypoglycemiaD40Svg(modeKey, gdsVal, consciousKey, diffKey) {
  var gds = clampNum(gdsVal, 20, 75, 42);
  var isUnconscious = consciousKey === "unconscious";

  if (modeKey === "whipple_diff") {
    var diff = ENDO_HYPO_DIFF[diffKey] || ENDO_HYPO_DIFF.insulinoma;
    return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Matriks Trias Whipple & Diferensial C-Peptida">' +
      '<rect x="20" y="14" width="440" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="32" font-size="9" font-weight="800" fill="var(--accent-primary)">TRIAS WHIPPLE HIPOGLIKEMIA SPONTAN</text>' +
      '<text x="32" y="43" font-size="7.5" font-weight="600" fill="var(--text-secondary)">1. Trias: GDS &lt;55 saat gejala hipo</text>' +
      '<text x="32" y="54" font-size="7.5" font-weight="600" fill="var(--text-secondary)">3. Gejala hilang pasca glukosa</text>' +

      '<rect x="20" y="65" width="215" height="150" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="84" font-size="9" font-weight="800" fill="var(--text-muted)">PROFIL KADAR LABORATORIUM</text>' +
      '<text x="32" y="104" font-size="8" font-weight="700" fill="var(--text-muted)">Insulin Serum:</text>' +
      '<text x="32" y="119" font-size="10" font-weight="800" fill="var(--accent-primary)">' + diff.ins + '</text>' +
      '<text x="32" y="137" font-size="8" font-weight="700" fill="var(--text-muted)">C-Peptida Serum:</text>' +
      '<text x="32" y="152" font-size="10" font-weight="800" fill="' + (diffKey === "exogenous" ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + diff.cpep + '</text>' +
      '<text x="32" y="170" font-size="8" font-weight="700" fill="var(--text-muted)">Skrining Sulfonilurea Urin:</text>' +
      '<text x="32" y="185" font-size="9.5" font-weight="800" fill="' + (diffKey === "sulfonylurea" ? "var(--accent-coral)" : "var(--text-primary)") + '">' + diff.suScreen + '</text>' +

      '<rect x="245" y="65" width="215" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="257" y="84" font-size="9" font-weight="800" fill="' + (diff.tone === "danger" ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + diff.label.toUpperCase() + '</text>' +
      '<text x="257" y="105" font-size="8.2" font-weight="600" fill="var(--text-primary)">' + diff.desc + '</text>' +
      '<rect x="257" y="125" width="190" height="30" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="264" y="142" font-size="8" font-weight="700" fill="var(--accent-primary)">Golden Test: 72-Hour Fasting Test</text>' +
      '<text x="257" y="178" font-size="7.6" font-weight="600" fill="var(--text-muted)">Eksogen: C-peptida tersupresi!</text>' +
      '<text x="257" y="196" font-size="7.6" font-weight="600" fill="var(--text-muted)">Sulfonilurea: skrining urin (+)</text>' +
    '</svg>';
  }

  // Mode: d40_calc
  var flacons = 1;
  var mlD40 = 25;
  var gramGlu = 10;
  if (gds < 30) { flacons = 3; mlD40 = 75; gramGlu = 30; }
  else if (gds < 60) { flacons = 2; mlD40 = 50; gramGlu = 20; }

  var flacon1Fill = "var(--accent-coral)";
  var flacon2Fill = flacons >= 2 ? "var(--accent-coral)" : "var(--bg-surface-subtle)";
  var flacon3Fill = flacons >= 3 ? "var(--accent-coral)" : "var(--bg-surface-subtle)";

  var actionText = isUnconscious
    ? "BOLUS D40% " + flacons + " FLACON (" + mlD40 + " mL = " + gramGlu + "g Glukosa IV)"
    : "SADAR: ATURAN 15 (15-20g Karbohidrat Murni Oral)";

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Kalkulator Protokol D40% Aturan 3-2-1">' +
    // Top GDS Meter Bar
    '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">KADAR GLUKOSA DARAH SAAT INI (GDS)</text>' +
    '<text x="458" y="18" text-anchor="end" font-size="12" font-weight="800" fill="var(--accent-coral)">' + gds + ' mg/dL (HIPOGLIKEMIA)</text>' +
    '<rect x="20" y="24" width="440" height="12" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="24" width="' + (((gds - 20) / 55) * 440).toFixed(1) + '" height="12" fill="var(--accent-coral)" fill-opacity="0.8" />' +

    // Visual Flacons 3-2-1
    '<rect x="20" y="46" width="440" height="135" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="66" font-size="9" font-weight="800" fill="var(--text-muted)">PROTOKOL D40% (ATURAN 3-2-1 PERKENI)</text>' +

    // Flacon 1
    '<rect x="40" y="78" width="60" height="75" rx="11" fill="' + flacon1Fill + '" fill-opacity="0.25" stroke="' + flacon1Fill + '" stroke-width="2" />' +
    '<rect x="58" y="72" width="24" height="6" rx="2" fill="' + flacon1Fill + '" />' +
    '<text x="70" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="' + flacon1Fill + '">1</text>' +
    '<text x="70" y="132" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">GDS 60-70</text>' +

    // Flacon 2
    '<rect x="120" y="78" width="60" height="75" rx="11" fill="' + flacon2Fill + '" fill-opacity="0.25" stroke="' + (flacons >= 2 ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="2" />' +
    '<rect x="138" y="72" width="24" height="6" rx="2" fill="' + (flacons >= 2 ? "var(--accent-coral)" : "var(--border-subtle)") + '" />' +
    '<text x="150" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="' + (flacons >= 2 ? "var(--accent-coral)" : "var(--text-muted)") + '">2</text>' +
    '<text x="150" y="132" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">GDS 30-59</text>' +

    // Flacon 3
    '<rect x="200" y="78" width="60" height="75" rx="11" fill="' + flacon3Fill + '" fill-opacity="0.25" stroke="' + (flacons >= 3 ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="2" />' +
    '<rect x="218" y="72" width="24" height="6" rx="2" fill="' + (flacons >= 3 ? "var(--accent-coral)" : "var(--border-subtle)") + '" />' +
    '<text x="230" y="112" text-anchor="middle" font-size="12" font-weight="800" fill="' + (flacons >= 3 ? "var(--accent-coral)" : "var(--text-muted)") + '">3</text>' +
    '<text x="230" y="132" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-muted)">GDS &lt;30</text>' +

    // Right action instruction panel
    '<rect x="280" y="78" width="168" height="92" rx="11" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="290" y="96" font-size="8" font-weight="800" fill="var(--accent-primary)">DOSIS BOLUS DIREKOMENDASIKAN</text>' +
    '<text x="290" y="116" font-size="11" font-weight="800" fill="var(--accent-coral)">' + (isUnconscious ? flacons + ' Flacon D40%' : '15-20g Karbo Oral') + '</text>' +
    '<text x="290" y="132" font-size="7.8" font-weight="600" fill="var(--text-primary)">' + (isUnconscious ? '(' + mlD40 + ' mL IV bolus cepat)' : '2 sdm gula / 1 teh manis') + '</text>' +
    '<text x="290" y="150" font-size="7.5" font-weight="700" fill="var(--accent-secondary)">Rumatan: D10% 25 tpm (makro)</text>' +
    '<text x="290" y="163" font-size="7.5" font-weight="600" fill="var(--text-muted)">Evaluasi GDS tiap 15-30 menit!</text>' +

    // Footer banner
    '<rect x="20" y="190" width="440" height="30" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="209" font-size="8.5" font-weight="800" fill="var(--text-primary)">' + actionText + '</text>' +
  '</svg>';
}

function getEndoHypoInfo(modeKey, gds, consciousKey, diffKey) {
  if (modeKey === "whipple_diff") {
    var diff = ENDO_HYPO_DIFF[diffKey] || ENDO_HYPO_DIFF.insulinoma;
    return {
      tone: diff.tone,
      rKey: "whipple_" + diffKey,
      title: "Diferensial Etiologi Hipoglikemia: " + diff.label,
      c1Label: "C-Peptida & Skrining Obat",
      c1Body: "Insulin: <strong>" + diff.ins + "</strong> &bull; C-Peptida: <strong>" + diff.cpep + "</strong> &bull; Skrining SU: <strong>" + diff.suScreen + "</strong>.",
      c2Label: "Mekanisme & Penegakan Diagnosis",
      c2Body: diff.desc + " Lakukan uji puasa 72 jam terawasi (72-hour fasting test) bila curiga tumor neuroendokrin pankreas."
    };
  }

  var isUnconscious = consciousKey === "unconscious";
  var flacons = gds < 30 ? 3 : (gds < 60 ? 2 : 1);
  var ml = flacons * 25;
  var gram = flacons * 10;

  if (isUnconscious) {
    return {
      tone: "danger",
      rKey: "hypo_unconscious_" + gds,
      title: "Hipoglikemia Berat Tak Sadar / Derajat 3 (GDS " + gds + " mg/dL)",
      c1Label: "Tatalaksana CITO (Aturan 3-2-1 D40%)",
      c1Body: "Berikan <strong>" + flacons + " Flacon Dekstrosa 40% IV Bolus</strong> (" + ml + " mL = " + gram + " g glukosa). Segera pasang infus rumatan <strong>D10% 6 jam/kolf (~28 tpm makro)</strong>.",
      c2Label: "Pemantauan Ketat PERKENI",
      c2Body: "Periksa GDS ulang <strong>setiap 15-30 menit</strong> hingga GDS &gt;100 mg/dL. Bila belum naik, ulang bolus D40%. Jangan beri makanan/minuman per oral pada pasien penurunan kesadaran (risiko aspirasi letal!)."
    };
  }

  return {
    tone: "warning",
    rKey: "hypo_conscious_" + gds,
    title: "Hipoglikemia Ringan-Sedang Sadar / Derajat 1-2 (GDS " + gds + " mg/dL)",
    c1Label: "Aturan 15 (Rule of 15)",
    c1Body: "Berikan <strong>15-20 gram karbohidrat murni cepat serap per oral</strong>: 1 gelas teh manis / 2 sdm sirup / 4 tablet dekstrosa.",
    c2Label: "Re-evaluasi 15 Menit",
    c2Body: "Cek GDS 15 menit pasca asupan. Jika masih &lt;70 mg/dL, ulangi pemberian 15g karbohidrat. Setelah pulih &ge;70 mg/dL, berikan makanan utama / snack untuk mencegah rekurensi."
  };
}

function updateEndoHypoglycemiaD40Viz(gdsVal, consciousVal, modeVal, diffVal) {
  if (gdsVal !== null && gdsVal !== undefined) endoVizState.hypoGds = Number(gdsVal);
  if (consciousVal) endoVizState.hypoConscious = consciousVal;
  if (modeVal) endoVizState.hypoMode = modeVal;
  if (diffVal) endoVizState.hypoDiffCase = diffVal;

  var gds = endoVizState.hypoGds;
  var con = endoVizState.hypoConscious;
  var mode = endoVizState.hypoMode;
  var diff = endoVizState.hypoDiffCase;

  if (modeVal) { rerenderEndoCard("viz-endoHypo-card", renderEndoHypoglycemiaD40Widget()); return; }
  syncEndoTabByMatch("viz-endo-hypo-mode-tabs", "'" + mode + "'");
  syncEndoTabByMatch("viz-endo-hypo-diff-tabs", "'" + diff + "'");
  syncSliderAndPill("endo-hypo-gds", "endo-hypo-gds-pill", gds, gds + " mg/dL");
  swapVizSvgFrame("viz-endoHypo-frame", buildEndoHypoglycemiaD40Svg(mode, gds, con, diff));

  var info = getEndoHypoInfo(mode, gds, con, diff);
  updateVizReadout(
    "viz-endoHypo-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoHypoglycemiaD40Widget() {
  var gds = endoVizState.hypoGds;
  var con = endoVizState.hypoConscious;
  var mode = endoVizState.hypoMode;
  var diff = endoVizState.hypoDiffCase;
  var info = getEndoHypoInfo(mode, gds, con, diff);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-hypo-mode-tabs", [
      { key: "d40_calc", label: "Kalkulator Protokol D40% (3-2-1)", onclick: "window.InternaApp.updateEndoHypoglycemiaD40Viz(null, null, 'd40_calc', null)" },
      { key: "whipple_diff", label: "Matriks Trias Whipple & C-Peptida", onclick: "window.InternaApp.updateEndoHypoglycemiaD40Viz(null, null, 'whipple_diff', null)" }
    ], mode) +
  '</div>';

  var controlsBottom = "";
  if (mode === "d40_calc") {
    controlsBottom = '<div class="space-y-2 mt-2.5">' +
      '<div class="viz-slider-row">' +
        '<label for="endo-hypo-gds" class="viz-slider-label">Kadar Glukosa Darah Saat Ini (GDS):</label>' +
        '<span id="endo-hypo-gds-pill" class="viz-value-pill">' + gds + ' mg/dL</span>' +
      '</div>' +
      '<input type="range" id="endo-hypo-gds" class="viz-range" min="20" max="75" step="1" value="' + gds + '" oninput="window.InternaApp.updateEndoHypoglycemiaD40Viz(this.value, null, null, null)" />' +
      '<div class="viz-presets mt-1" id="viz-endo-hypo-presets">' +
        '<button type="button" class="viz-pill-btn ' + (gds === 24 ? "active" : "") + '" onclick="window.InternaApp.updateEndoHypoglycemiaD40Viz(24, null, null, null)">GDS 24 (3 Flacon)</button>' +
        '<button type="button" class="viz-pill-btn ' + (gds === 45 ? "active" : "") + '" onclick="window.InternaApp.updateEndoHypoglycemiaD40Viz(45, null, null, null)">GDS 45 (2 Flacon)</button>' +
        '<button type="button" class="viz-pill-btn ' + (gds === 65 ? "active" : "") + '" onclick="window.InternaApp.updateEndoHypoglycemiaD40Viz(65, null, null, null)">GDS 65 (1 Flacon)</button>' +
      '</div>' +
      '<div class="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">' +
        '<span class="text-xs font-bold text-[var(--text-muted)]">Status Kesadaran:</span>' +
        '<div class="flex gap-2">' +
          '<button type="button" class="viz-pill-btn ' + (con === "conscious" ? "active" : "") + '" onclick="window.InternaApp.updateEndoHypoglycemiaD40Viz(null, \'conscious\', null, null)">Sadar (Oral)</button>' +
          '<button type="button" class="viz-pill-btn ' + (con === "unconscious" ? "active" : "") + '" onclick="window.InternaApp.updateEndoHypoglycemiaD40Viz(null, \'unconscious\', null, null)">Tak Sadar (D40% IV)</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  } else {
    controlsBottom = '<div class="mt-2.5">' +
      '<label class="viz-slider-label block mb-1">Pilih Kasus Hipoglikemia Non-Diabetik:</label>' +
      renderCardioTabRow("viz-endo-hypo-diff-tabs", Object.entries(ENDO_HYPO_DIFF).map(function(e) {
        return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoHypoglycemiaD40Viz(null, null, null, '" + e[0] + "')" };
      }), diff) +
    '</div>';
  }

  return renderCardioWidgetCard({
    key: "endoHypo",
    title: "Kalkulator Protokol D40% Aturan 3-2-1 & Matriks Trias Whipple",
    tag: "PERKENI &bull; KEGAWATDARURATAN",
    controlsTop: controlsTop,
    svgHtml: buildEndoHypoglycemiaD40Svg(mode, gds, con, diff),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W6. KAKI DIABETIK WAGNER, PEDIS & ABI (endo-2-3)
// =========================================================================
var ENDO_WAGNER_DATA = {
  0: { label: "Wagner 0", title: "Wagner 0: Kaki Berisiko (Kulit Intak)", depth: "Kulit intak, deformitas charcot/kalus", tone: "info", rx: "Edukasi, sepatu ortotik khusus, hindari beban" },
  1: { label: "Wagner 1", title: "Wagner 1: Ulkus Superfisial", depth: "Ulkus terbatas pada dermis/subkutan", tone: "warning", rx: "Debridement kalus, balutan luka lembab, offloading" },
  2: { label: "Wagner 2", title: "Wagner 2: Ulkus Dalam (Tendon/Ligamen)", depth: "Menembus tendon, kapsul sendi (tanpa abses/tulang)", tone: "warning", rx: "Debridement bedah tajam, kultur dasar luka, antibiotik" },
  3: { label: "Wagner 3", title: "Wagner 3: Abses Dalam / Osteomielitis", depth: "Osteitis, abses fasial dalam, osteomielitis", tone: "danger", rx: "Insisi & drainase abses, antibiotik IV 4-6 minggu" },
  4: { label: "Wagner 4", title: "Wagner 4: Gangren Terlokalisasi", depth: "Gangren fokal jari kaki / tumit (forefoot)", tone: "danger", rx: "Amputasi minor (jari/transmetatarsal) + cek vaskular" },
  5: { label: "Wagner 5", title: "Wagner 5: Gangren Luas Seluruh Kaki", depth: "Gangren ekstensif seluruh pedis", tone: "danger", rx: "Amputasi mayor (BKA/AKA) penyelamat nyawa" }
};

function buildEndoDiabeticFootSvg(wagnerGrade, abiVal, probeBone, sirs) {
  var w = clampNum(wagnerGrade, 0, 5, 3);
  var abi = clampNum(abiVal, 0.3, 1.35, 0.65);
  var wData = ENDO_WAGNER_DATA[w];

  var abiTone = abi > 1.3 ? "var(--text-muted)" : (abi >= 0.9 ? "var(--accent-primary)" : (abi >= 0.4 ? "var(--accent-secondary)" : "var(--accent-coral)"));
  var abiLabel = abi > 1.3 ? "Arteri Kaku / Kalsifikasi (>1.3)" : (abi >= 0.9 ? "Perfusi Normal (0.9-1.3)" : (abi >= 0.4 ? "PAD Sedang (0.4-0.89)" : "ISKEMIA KRITIS / CLTI (<0.4)!"));

  // Foot anatomy & Wagner depth graphic (x=20..230)
  var lesionHeight = w * 18;
  var probeSvg = probeBone
    ? '<line x1="125" y1="35" x2="125" y2="152" stroke="#ffffff" stroke-width="3" />' +
      '<circle cx="125" cy="152" r="5" fill="var(--accent-coral)" stroke="#ffffff" stroke-width="1.5" />' +
      '<text x="135" y="45" font-size="7.5" font-weight="800" fill="var(--accent-coral)">PROBE-TO-BONE (+)</text>'
    : '';

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Simulator Kaki Diabetik Wagner & ABI">' +
    // Left Box: Anatomi Lapisan Ulkus
    '<rect x="20" y="14" width="215" height="175" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">KEDALAMAN LESI (WAGNER ' + w + ')</text>' +

    // Tissue layers
    '<rect x="35" y="48" width="180" height="22" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="62" font-size="7.5" font-weight="700" fill="var(--text-muted)">1. Epidermis / Kulit</text>' +

    '<rect x="35" y="72" width="180" height="24" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="87" font-size="7.5" font-weight="700" fill="var(--text-muted)">2. Subkutan / Lemak</text>' +

    '<rect x="35" y="98" width="180" height="26" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="114" font-size="7.5" font-weight="700" fill="var(--text-muted)">3. Tendon / Fascia Sendi</text>' +

    '<rect x="35" y="126" width="180" height="30" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="42" y="145" font-size="7.5" font-weight="800" fill="var(--text-primary)">4. Korteks Tulang Metatarsal</text>' +

    // Ulcer cavity
    (w > 0 ? '<path d="M105,48 Q125,' + (48 + lesionHeight) + ' 145,48 Z" fill="var(--accent-coral)" fill-opacity="0.4" stroke="var(--accent-coral)" stroke-width="2" />' : '') +
    probeSvg +

    '<text x="32" y="176" font-size="7.8" font-weight="700" fill="var(--text-secondary)">' + wData.depth + '</text>' +

    // Right Box: Vaskular ABI & Infeksi
    '<rect x="245" y="14" width="215" height="175" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">ANKLE-BRACHIAL INDEX (ABI)</text>' +
    '<text x="257" y="52" font-size="14" font-weight="800" fill="' + abiTone + '">ABI = ' + abi.toFixed(2) + '</text>' +
    '<text x="257" y="68" font-size="8.5" font-weight="700" fill="' + abiTone + '">' + abiLabel + '</text>' +

    // ABI bar
    '<rect x="257" y="78" width="190" height="10" rx="3" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="257" y="78" width="' + (((abi - 0.3) / 1.05) * 190).toFixed(1) + '" height="10" rx="3" fill="' + abiTone + '" />' +

    // Infection / SIRS badges
    '<rect x="257" y="98" width="190" height="38" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="265" y="113" font-size="8" font-weight="800" fill="' + (probeBone ? "var(--accent-coral)" : "var(--text-muted)") + '">' + (probeBone ? "PROBE-TO-BONE (+): OSTEOMIELITIS >85%" : "Probe (-): Belum sentuh tulang") + '</text>' +
    '<text x="265" y="128" font-size="7.8" font-weight="700" fill="' + (sirs ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + (sirs ? "TOKSISITAS SISTEMIK / SIRS (+)" : "Infeksi Lokal (Tanpa SIRS)") + '</text>' +

    '<text x="257" y="152" font-size="8.5" font-weight="800" fill="var(--accent-primary)">TATA LAKSANA UTAMA:</text>' +
    '<text x="257" y="168" font-size="8" font-weight="600" fill="var(--text-primary)">' + wData.rx + '</text>' +

    // Footer banner
    '<rect x="20" y="196" width="440" height="28" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="214" font-size="8.8" font-weight="700" fill="var(--text-primary)">Abx Empiris: ' + (w >= 3 || sirs || probeBone ? 'Ampisilin-Sulbaktam IV +/- Vankomisin' : 'Co-Amoxiclav / Cipro+Clinda oral') + '</text>' +
  '</svg>';
}

function getEndoFootInfo(wagner, abi, probeBone, sirs) {
  var wData = ENDO_WAGNER_DATA[wagner];
  var isCLTI = abi < 0.4;
  var isOsteo = probeBone || wagner >= 3;

  var title = wData.title + (isCLTI ? " + ISKEMIA KRITIS (CLTI)" : "");
  var c1Label = "Evaluasi Vaskular & Bedah";
  var c1Body = "ABI " + abi.toFixed(2) + " (" + (isCLTI ? "<span class=\"text-[var(--accent-coral)] font-bold\">Iskemia Kritis Kaki / CLTI! Konsultasi bedah vaskular CITO untuk revaskularisasi (PTA/Bypass) sebelum luka membusuk.</span>" : "Perfusi distal memadai") + "). Indikasi tindakan: " + wData.rx + ".";

  var c2Label = "Regimen Antibiotik & Offloading";
  var c2Body = "";
  if (isOsteo || sirs) {
    c2Body = "<strong>Infeksi Berat / Osteomielitis:</strong> Rawat inap, antibiotik parenteral broad-spectrum (<strong>Ampicillin-sulbactam 3x1.5g IV ATAU Piperacillin-tazobactam 3x4.5g IV</strong> +/- Vankomisin bila risiko MRSA) selama 4-6 minggu bila tulang tidak direseksi. Wajib <strong>Total Contact Cast / Non-weight bearing</strong>.";
  } else {
    c2Body = "Infeksi superfisial: <strong>Amoxicillin-clavulanate 3x625 mg oral ATAU Ciprofloxacin 2x500 mg + Klindamisin 3x300 mg</strong> selama 1-2 minggu + debridement kalus berkala.";
  }

  return {
    tone: wagner >= 3 || isCLTI || sirs ? "danger" : "warning",
    rKey: "foot_" + wagner + "_" + abi.toFixed(2) + "_" + (probeBone ? "1" : "0") + "_" + (sirs ? "1" : "0"),
    title: title,
    c1Label: c1Label,
    c1Body: c1Body,
    c2Label: c2Label,
    c2Body: c2Body
  };
}

function updateEndoDiabeticFootViz(wagnerVal, abiVal, probeVal, sirsVal) {
  if (wagnerVal !== null && wagnerVal !== undefined) endoVizState.footWagner = Math.round(clampNum(wagnerVal, 0, 5, endoVizState.footWagner));
  if (abiVal !== null && abiVal !== undefined) endoVizState.footAbi = clampNum(abiVal, 0.3, 1.35, endoVizState.footAbi);
  if (probeVal !== null && probeVal !== undefined) endoVizState.footProbeBone = Boolean(probeVal);
  if (sirsVal !== null && sirsVal !== undefined) endoVizState.footSirs = Boolean(sirsVal);

  var w = endoVizState.footWagner;
  var abi = endoVizState.footAbi;
  var pb = endoVizState.footProbeBone;
  var sirs = endoVizState.footSirs;

  syncEndoTabByMatch("viz-endo-foot-wagner-tabs", "(" + w + ",");
  syncSliderAndPill("endo-foot-abi", "endo-foot-abi-pill", abi, "ABI = " + abi.toFixed(2));
  swapVizSvgFrame("viz-endoFoot-frame", buildEndoDiabeticFootSvg(w, abi, pb, sirs));

  var info = getEndoFootInfo(w, abi, pb, sirs);
  updateVizReadout(
    "viz-endoFoot-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoDiabeticFootWidget() {
  var w = endoVizState.footWagner;
  var abi = endoVizState.footAbi;
  var pb = endoVizState.footProbeBone;
  var sirs = endoVizState.footSirs;
  var info = getEndoFootInfo(w, abi, pb, sirs);

  var controlsTop = '<div class="mb-2.5">' +
    '<span class="text-xs font-bold text-[var(--text-muted)] block mb-1">Klasifikasi Derajat Wagner (0 s/d 5):</span>' +
    renderCardioTabRow("viz-endo-foot-wagner-tabs", [0, 1, 2, 3, 4, 5].map(function(idx) {
      return { key: String(idx), label: "Wagner " + idx, onclick: "window.InternaApp.updateEndoDiabeticFootViz(" + idx + ", null, null, null)" };
    }), String(w)) +
  '</div>';

  var controlsBottom = '<div class="space-y-2 mt-2.5">' +
    '<div class="viz-slider-row">' +
      '<label for="endo-foot-abi" class="viz-slider-label">Nilai Ankle-Brachial Index (ABI):</label>' +
      '<span id="endo-foot-abi-pill" class="viz-value-pill">ABI = ' + abi.toFixed(2) + '</span>' +
    '</div>' +
    '<input type="range" id="endo-foot-abi" class="viz-range" min="0.30" max="1.35" step="0.05" value="' + abi + '" oninput="window.InternaApp.updateEndoDiabeticFootViz(null, this.value, null, null)" />' +
    '<div class="viz-presets mt-1" id="viz-endo-foot-presets">' +
      '<button type="button" class="viz-pill-btn ' + (abi < 0.4 ? "active" : "") + '" onclick="window.InternaApp.updateEndoDiabeticFootViz(null, 0.35, null, null)">Iskemia Kritis (&lt;0.4)</button>' +
      '<button type="button" class="viz-pill-btn ' + (abi >= 0.4 && abi < 0.9 ? "active" : "") + '" onclick="window.InternaApp.updateEndoDiabeticFootViz(null, 0.65, null, null)">PAD Sedang (0.65)</button>' +
      '<button type="button" class="viz-pill-btn ' + (abi >= 0.9 && abi <= 1.3 ? "active" : "") + '" onclick="window.InternaApp.updateEndoDiabeticFootViz(null, 1.05, null, null)">Normal (1.05)</button>' +
    '</div>' +
    '<div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)]">' +
      '<label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">' +
        '<input type="checkbox" id="endo-foot-pb" ' + (pb ? "checked" : "") + ' onchange="window.InternaApp.updateEndoDiabeticFootViz(null, null, this.checked, null)" />' +
        'Probe-to-Bone Positif (+)' +
      '</label>' +
      '<label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">' +
        '<input type="checkbox" id="endo-foot-sirs" ' + (sirs ? "checked" : "") + ' onchange="window.InternaApp.updateEndoDiabeticFootViz(null, null, null, this.checked)" />' +
        'Tanda Toksisitas / SIRS (+)' +
      '</label>' +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoFoot",
    title: "Simulator Derajat Kaki Diabetik (Wagner, PEDIS & Matriks ABI)",
    tag: "PERKENI &bull; IWGDF 2023",
    controlsTop: controlsTop,
    svgHtml: buildEndoDiabeticFootSvg(w, abi, pb, sirs),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W7. POROS HPT & TIROIDITIS VS GRAVES (endo-3-1)
// =========================================================================
var ENDO_THYROID_DISEASES = {
  graves: {
    label: "Penyakit Graves",
    tone: "danger",
    tsh: "<0.01 mIU/L (Tersupresi)",
    ft4: "Tinggi (>2.5 ng/dL)",
    trab: "POSITIF KUAT (>95%)",
    raiu: "Ambilan Difus Sangat Tinggi (50-80%)",
    rxStandard: "Tiamazol (Metimazol) 10-30 mg/hari ATAU Tiroidektomi / RAI",
    rxPregT1: "PTU 100-300 mg/hari (Metimazol teratogenik: aplasia kutis!)",
    rxPregT23: "GANTI KE METIMAZOL (Cegah hepatotoksisitas berat maternal akibat PTU)"
  },
  subacute: {
    label: "Tiroiditis Subakut de Quervain",
    tone: "warning",
    tsh: "<0.05 mIU/L (Fase Lisis)",
    ft4: "Tinggi Ringan-Sedang",
    trab: "Negatif",
    raiu: "TERSUSPRESI MUTLAK (<1-2%)!",
    rxStandard: "NSAID / Prednison + Propranolol (OAD Tiroid TIDAK EFEKTIF!)",
    rxPregT1: "Analgesik Parasetamol / Propranolol dosis rendah bila perlu",
    rxPregT23: "Analgesik Parasetamol / Prednison dosis rendah jangka pendek"
  },
  adenoma: {
    label: "Adenoma Toksik Plummer",
    tone: "danger",
    tsh: "<0.01 mIU/L",
    ft4: "Tinggi",
    trab: "Negatif",
    raiu: "Nodul Panas Fokal (Hot Nodule)",
    rxStandard: "Ablasi Iodium Radioaktif (RAI-131) atau Reseksi Bedah",
    rxPregT1: "PTU untuk kontrol eutiroid -> Lobektomi elektif trimester 2",
    rxPregT23: "Metimazol dosis terendah -> Pembedahan trimester 2 aman"
  },
  tshoma: {
    label: "TSHoma Pituitari (Hipertiroid Sentral)",
    tone: "danger",
    tsh: "TINGGI / NORMAL TINGGI (Inappropriate!)",
    ft4: "Tinggi",
    trab: "Negatif",
    raiu: "Difus Tinggi (Terdorong TSH sentral)",
    rxStandard: "Reseksi Bedah Transsfenoidal Adenoma Pituitari + Somatostatin",
    rxPregT1: "Agonis Somatostatin / Pantau lapang pandang optik",
    rxPregT23: "Evaluasi dekompresi kiasma optikum bila tumor mendesak"
  }
};

function buildEndoThyroidAxisSvg(disKey, pregKey) {
  var d = ENDO_THYROID_DISEASES[disKey] || ENDO_THYROID_DISEASES.graves;
  var isPreg = pregKey !== "none";

  var pregBadge = "";
  if (pregKey === "trim1") {
    pregBadge = '<rect x="245" y="152" width="215" height="38" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--accent-coral)" stroke-width="1.2" />' +
      '<text x="255" y="168" font-size="8" font-weight="800" fill="var(--accent-coral)">TRIMESTER 1: PILIH PTU SEGERA!</text>' +
      '<text x="255" y="182" font-size="7.5" font-weight="600" fill="var(--text-primary)">Metimazol hindari: aplasia kutis</text>';
  } else if (pregKey === "trim2_3") {
    pregBadge = '<rect x="245" y="152" width="215" height="38" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--accent-secondary)" stroke-width="1.2" />' +
      '<text x="255" y="168" font-size="8" font-weight="800" fill="var(--accent-secondary)">TRIMESTER 2-3: GANTI KE METIMAZOL!</text>' +
      '<text x="255" y="182" font-size="7.5" font-weight="600" fill="var(--text-primary)">PTU stop: hindari hepatotoksik</text>';
  }

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Simulator Poros HPT & Etiologi Hipertiroid">' +
    // Left Box: Poros HPT Loop (x=20..230)
    '<rect x="20" y="14" width="215" height="175" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="9" font-weight="800" fill="var(--text-muted)">POROS HIPOTALAMUS-PITUITARI-TIROID</text>' +

    // Pituitary
    '<rect x="40" y="46" width="175" height="30" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="48" y="60" font-size="8.2" font-weight="800" fill="var(--text-primary)">Pituitari Anterior</text>' +
    '<text x="48" y="71" font-size="7.6" font-weight="700" fill="' + (disKey === "tshoma" ? "var(--accent-coral)" : "var(--accent-primary)") + '">TSH: ' + d.tsh + '</text>' +

    // Connecting Arrow
    '<line x1="127" y1="76" x2="127" y2="98" stroke="var(--accent-primary)" stroke-width="2" />' +
    '<polygon points="127,103 123,95 131,95" fill="var(--accent-primary)" />' +

    // Thyroid Gland
    '<rect x="40" y="105" width="175" height="42" rx="11" fill="var(--bg-surface)" stroke="' + (disKey === "subacute" ? "var(--accent-secondary)" : "var(--accent-coral)") + '" stroke-width="1.8" />' +
    '<text x="48" y="121" font-size="8.5" font-weight="800" fill="var(--text-primary)">Kelenjar Tiroid &bull; fT4 / fT3</text>' +
    '<text x="48" y="133" font-size="7.6" font-weight="700" fill="var(--accent-coral)">fT4: ' + d.ft4 + '</text>' +
    '<text x="48" y="143" font-size="7.2" font-weight="600" fill="var(--text-muted)">TRAb: ' + d.trab + '</text>' +

    // Negative feedback line
    (disKey !== "tshoma"
      ? '<path d="M40,126 Q28,126 28,61 L40,61" fill="none" stroke="var(--accent-coral)" stroke-width="1.5" stroke-dasharray="3,2" />' +
        '<text x="24" y="95" font-size="6.5" font-weight="800" fill="var(--accent-coral)" transform="rotate(-90 24 95)">SUPRESI UMPAN BALIK</text>'
      : '<text x="40" y="165" font-size="7.5" font-weight="800" fill="var(--accent-coral)">Umpan Balik Negatif Gagal / TSHoma!</text>') +

    // Right Box: Skintigrafi RAIU & Panduan Terapi (x=245..460)
    '<rect x="245" y="14" width="215" height="130" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="30" font-size="8.4" font-weight="800" fill="var(--text-muted)">SKINTIGRAFI TIROID (RAIU)</text>' +
    '<text x="257" y="45" font-size="8.2" font-weight="800" fill="' + (disKey === "subacute" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + d.raiu.slice(0, 30) + '</text>' +
    '<text x="257" y="64" font-size="8.2" font-weight="800" fill="var(--accent-primary)">TATALAKSANA LINI 1:</text>' +
    '<text x="257" y="79" font-size="7.6" font-weight="600" fill="var(--text-primary)">' + d.rxStandard.slice(0, 31) + '</text>' +
    '<text x="257" y="92" font-size="7.6" font-weight="600" fill="var(--text-primary)">' + d.rxStandard.slice(31, 62) + '</text>' +
    '<text x="257" y="110" font-size="7.2" font-weight="600" fill="var(--text-muted)">' + (disKey === "subacute" ? "Subakut: lisis folikel!" : "Kontrol eutiroid sebelum bedah") + '</text>' +
    '<text x="257" y="126" font-size="7.2" font-weight="700" fill="' + (isPreg ? "var(--accent-secondary)" : "var(--text-muted)") + '">' + (isPreg ? "Mode Kehamilan: Lihat Bawah" : "Populasi Umum Non-Hamil") + '</text>' +

    pregBadge +

    // Footer summary
    '<rect x="20" y="196" width="440" height="28" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="206" font-size="8" font-weight="700" fill="var(--text-primary)">RAIU: Rendah pada tiroiditis vs</text>' +
    '<text x="32" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">difus tinggi pada Graves</text>' +
  '</svg>';
}

function getEndoThyroidInfo(disKey, pregKey) {
  var d = ENDO_THYROID_DISEASES[disKey] || ENDO_THYROID_DISEASES.graves;
  var isT1 = pregKey === "trim1";
  var isT23 = pregKey === "trim2_3";

  var title = "Diagnosis: " + d.label + (isT1 ? " (Hamil Trimester 1)" : (isT23 ? " (Hamil Trimester 2-3)" : ""));
  var c1Label = "Pola Laboratorium & RAIU";
  var c1Body = "TSH: <strong>" + d.tsh + "</strong> &bull; fT4: <strong>" + d.ft4 + "</strong> &bull; TRAb: <strong>" + d.trab + "</strong>. RAIU skintigrafi: <strong>" + d.raiu + "</strong>.";

  var c2Label = "Rekomendasi Farmakoterapi";
  var c2Body = d.rxStandard;
  if (isT1) c2Body = "<strong>Kehamilan Trimester 1:</strong> " + d.rxPregT1;
  else if (isT23) c2Body = "<strong>Kehamilan Trimester 2-3:</strong> " + d.rxPregT23;

  return {
    tone: d.tone,
    rKey: "thyroid_" + disKey + "_" + pregKey,
    title: title,
    c1Label: c1Label,
    c1Body: c1Body,
    c2Label: c2Label,
    c2Body: c2Body
  };
}

function updateEndoThyroidAxisViz(disVal, pregVal) {
  if (disVal) endoVizState.thyroidDisease = disVal;
  if (pregVal) endoVizState.thyroidPreg = pregVal;

  var dis = endoVizState.thyroidDisease;
  var preg = endoVizState.thyroidPreg;

  syncEndoTabByMatch("viz-endo-thyroid-dis-tabs", "'" + dis + "'");
  syncEndoTabByMatch("viz-endo-thyroid-preg-tabs", "'" + preg + "'");
  swapVizSvgFrame("viz-endoThyroid-frame", buildEndoThyroidAxisSvg(dis, preg));

  var info = getEndoThyroidInfo(dis, preg);
  updateVizReadout(
    "viz-endoThyroid-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoThyroidAxisWidget() {
  var dis = endoVizState.thyroidDisease;
  var preg = endoVizState.thyroidPreg;
  var info = getEndoThyroidInfo(dis, preg);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-thyroid-dis-tabs", Object.entries(ENDO_THYROID_DISEASES).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoThyroidAxisViz('" + e[0] + "', null)" };
    }), dis) +
    '<div class="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between">' +
      '<span class="text-xs font-bold text-[var(--text-muted)]">Status Kehamilan:</span>' +
      renderCardioTabRow("viz-endo-thyroid-preg-tabs", [
        { key: "none", label: "Tidak Hamil", onclick: "window.InternaApp.updateEndoThyroidAxisViz(null, 'none')" },
        { key: "trim1", label: "Hamil Trimester 1 (PTU)", onclick: "window.InternaApp.updateEndoThyroidAxisViz(null, 'trim1')" },
        { key: "trim2_3", label: "Hamil Trimester 2-3 (Metimazol)", onclick: "window.InternaApp.updateEndoThyroidAxisViz(null, 'trim2_3')" }
      ], preg) +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoThyroid",
    title: "Simulator Poros HPT: Graves vs Tiroiditis vs Adenoma vs TSHoma",
    tag: "ATA 2016 &bull; PERKENI",
    controlsTop: controlsTop,
    svgHtml: buildEndoThyroidAxisSvg(dis, preg),
    controlsBottom: "",
    info: info
  });
}

// =========================================================================
// W8. KALKULATOR DOSIS LEVOTIROKSIN & KOMA MIKSEDEMA (endo-3-2)
// =========================================================================
var ENDO_LT4_PROFILES = {
  young: { label: "Dewasa Muda Sehat", tone: "info", rate: 1.6, desc: "Dosis pengganti penuh 1.6 mcg/kgBB/hari" },
  elderly_cad: { label: "Lansia (>60 th) / PJK", tone: "warning", rate: 0.3, desc: "Start low, go slow: 12.5-25 mcg/hari" },
  pregnant: { label: "Wanita Hamil Hipotiroid", tone: "info", rate: 2.1, desc: "Kebutuhan meningkat +25-30% sejak Trimester 1" },
  myxedema: { label: "Koma Miksedema (Gawat Darurat)", tone: "danger", rate: 4.0, desc: "EMERGENCY: Hidrokortison IV DULU sebelum Levotiroksin!" }
};

function buildEndoHypothyroidLt4Svg(weightVal, profileKey) {
  var kg = clampNum(weightVal, 40, 120, 60);
  var prof = ENDO_LT4_PROFILES[profileKey] || ENDO_LT4_PROFILES.young;

  var doseDaily = Math.round(kg * prof.rate);
  if (profileKey === "elderly_cad") doseDaily = 25; // fixed start dose
  if (profileKey === "myxedema") doseDaily = 300; // loading dose mcg IV

  var unitText = profileKey === "myxedema" ? "mcg IV Loading" : "mcg / hari PO";
  var tabletDesc = profileKey === "myxedema"
    ? "Ampul IV 200-400 mcg loading pelan"
    : (doseDaily >= 100 ? "Tablet 100 mcg x " + (doseDaily / 100).toFixed(1) + "/hari" : "Tablet 50 mcg x " + (doseDaily / 50).toFixed(1) + "/hari");

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Kalkulator Levotiroksin & Koma Miksedema">' +
    // Left Box: Dosis Hasil Hitung (x=20..230)
    '<rect x="20" y="14" width="215" height="175" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">DOSIS AWAL LEVOTIROKSIN (T4)</text>' +
    '<text x="32" y="65" font-size="24" font-weight="800" fill="' + (profileKey === "myxedema" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + doseDaily + '</text>' +
    '<text x="32" y="82" font-size="9" font-weight="700" fill="var(--text-secondary)">' + unitText + '</text>' +

    '<rect x="32" y="95" width="190" height="30" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="40" y="113" font-size="8" font-weight="700" fill="var(--text-primary)">Sediaan: ' + tabletDesc + '</text>' +

    '<text x="32" y="145" font-size="7.8" font-weight="700" fill="var(--text-muted)">Prinsip Minum Obat:</text>' +
    '<text x="32" y="158" font-size="7.5" font-weight="600" fill="var(--text-primary)">Perut kosong pagi 30-60 mnt sblm mkn</text>' +
    '<text x="32" y="171" font-size="7.5" font-weight="600" fill="var(--accent-coral)">Jauhkan kalsium, besi, PPI &ge;4 jam!</text>' +

    // Right Box: Profil & Koma Miksedema Warning (x=245..460)
    '<rect x="245" y="14" width="215" height="175" rx="8" fill="var(--bg-surface-subtle)" stroke="' + (profileKey === "myxedema" ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (profileKey === "myxedema" ? "2" : "1") + '" />' +
    '<text x="257" y="32" font-size="8.8" font-weight="800" fill="' + (profileKey === "myxedema" ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + prof.label.toUpperCase() + '</text>' +

    (profileKey === "myxedema"
      ? '<rect x="257" y="44" width="190" height="78" rx="9" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="1.5" />' +
        '<text x="264" y="60" font-size="8.5" font-weight="800" fill="var(--accent-coral)">URUTAN RESUSITASI MUTLAK:</text>' +
        '<text x="264" y="76" font-size="7.8" font-weight="800" fill="var(--text-primary)">1. HIDROKORTISON 100 mg IV DULU!</text>' +
        '<text x="264" y="90" font-size="7.5" font-weight="600" fill="var(--text-secondary)">2. Loading T4 200-400 mcg IV</text>' +
        '<text x="264" y="104" font-size="7.2" font-weight="600" fill="var(--accent-coral)">T4 tanpa steroid = Krisis Adrenal!</text>' +
        '<text x="257" y="138" font-size="7.5" font-weight="700" fill="var(--text-primary)">3. Passive warming (selimut hangat)</text>' +
        '<text x="257" y="152" font-size="7.2" font-weight="600" fill="var(--text-muted)">Hindari active warming (cegah syok)</text>'
      : '<text x="257" y="55" font-size="8" font-weight="700" fill="var(--text-primary)">' + prof.desc + '</text>' +
        '<rect x="257" y="70" width="190" height="50" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
        '<text x="265" y="86" font-size="8" font-weight="800" fill="var(--accent-primary)">Target TSH Evaluasi:</text>' +
        '<text x="265" y="102" font-size="8" font-weight="600" fill="var(--text-primary)">Target TSH: 0.5-2.5 mIU/L (6-8 mgg)</text>' +
        '<text x="257" y="138" font-size="7.5" font-weight="600" fill="var(--text-muted)">Lansia: titrasi tiap 4-6 minggu</text>' +
        '<text x="257" y="152" font-size="7.5" font-weight="600" fill="var(--text-muted)">Hamil: TSH T1 &lt;2.5, T2-3 &lt;3.0</text>') +

    // Footer summary
    '<rect x="20" y="196" width="440" height="26" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="213" font-size="8.5" font-weight="700" fill="var(--text-primary)">Berat Badan: ' + kg + ' kg &bull; Rumus: ' + prof.rate + ' mcg/kgBB/hari</text>' +
  '</svg>';
}

function calcEndoHypothyroidLt4(weightVal, profileKey) {
  if (weightVal !== null && weightVal !== undefined) endoVizState.lt4Weight = Number(weightVal);
  if (profileKey) endoVizState.lt4Profile = profileKey;

  var kg = endoVizState.lt4Weight;
  var profKey = endoVizState.lt4Profile;
  var prof = ENDO_LT4_PROFILES[profKey] || ENDO_LT4_PROFILES.young;

  syncEndoTabByMatch("viz-endo-lt4-prof-tabs", "'" + profKey + "'");
  syncSliderAndPill("endo-lt4-weight", "endo-lt4-weight-pill", kg, kg + " kg");
  swapVizSvgFrame("viz-endoLt4-frame", buildEndoHypothyroidLt4Svg(kg, profKey));

  var dose = Math.round(kg * prof.rate);
  if (profKey === "elderly_cad") dose = 25;
  if (profKey === "myxedema") dose = 300;

  var title = "Dosis Terapi: " + prof.label + " (" + dose + " mcg)";
  var c1Label = "Rekomendasi Dosis Awal";
  var c1Body = "Dosis: <strong>" + dose + " mcg " + (profKey === "myxedema" ? "IV loading" : "/hari oral") + "</strong>. " + prof.desc + ".";

  var c2Label = "Peringatan Klinis Krusial";
  var c2Body = "";
  if (profKey === "myxedema") {
    c2Body = "<span class=\"text-[var(--accent-coral)] font-bold\">HIDROKORTISON IV 100 mg HARUS DIBERIKAN SEBELUM ATAU BERSAMAAN DENGAN T4!</span> Pemberian hormon tiroid murni mempercepat klirens kortisol dan dapat memicu <strong>Krisis Adrenal Akut Fatal</strong>.";
  } else if (profKey === "elderly_cad") {
    c2Body = "Pada lansia atau riwayat PJK, mulai dengan dosis rendah <strong>12.5-25 mcg/hari</strong> untuk mencegah presipitasi angina pektoris, infark miokard, atau aritmia atrial fibrilasi.";
  } else if (profKey === "pregnant") {
    c2Body = "Segera naikkan dosis <strong>+25-30% (tambah 2 tablet/minggu)</strong> saat konfirmasi kehamilan. Evaluasi TSH setiap 4 minggu untuk memastikan perkembangan neurologis janin optimal.";
  } else {
    c2Body = "Minum 1x sehari pagi saat perut kosong dengan air putih, 30-60 menit sebelum sarapan. Pantau TSH setelah 6-8 minggu.";
  }

  updateVizReadout(
    "viz-endoLt4-readout",
    prof.tone,
    formatVizReadoutHtml(title, c1Label, c1Body, c2Label, c2Body, ""),
    "lt4_" + profKey + "_" + kg
  );
}

function renderEndoHypothyroidLt4Widget() {
  var kg = endoVizState.lt4Weight;
  var profKey = endoVizState.lt4Profile;
  var prof = ENDO_LT4_PROFILES[profKey] || ENDO_LT4_PROFILES.young;

  var dose = Math.round(kg * prof.rate);
  if (profKey === "elderly_cad") dose = 25;
  if (profKey === "myxedema") dose = 300;

  var info = {
    tone: prof.tone,
    rKey: "lt4_init",
    title: "Dosis Terapi: " + prof.label + " (" + dose + " mcg)",
    c1Label: "Rekomendasi Dosis Awal",
    c1Body: "Dosis: <strong>" + dose + " mcg " + (profKey === "myxedema" ? "IV loading" : "/hari oral") + "</strong>. " + prof.desc + ".",
    c2Label: "Instruksi Klinis",
    c2Body: "Minum pagi hari saat perut kosong 30-60 menit sebelum sarapan dengan air putih. Pantau TSH 6-8 minggu."
  };

  var controlsTop = '<div class="mb-2.5">' +
    renderCardioTabRow("viz-endo-lt4-prof-tabs", Object.entries(ENDO_LT4_PROFILES).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.calcEndoHypothyroidLt4(null, '" + e[0] + "')" };
    }), profKey) +
  '</div>';

  var controlsBottom = '<div class="mt-2.5">' +
    '<div class="viz-slider-row">' +
      '<label for="endo-lt4-weight" class="viz-slider-label">Berat Badan Pasien (kg):</label>' +
      '<span id="endo-lt4-weight-pill" class="viz-value-pill">' + kg + ' kg</span>' +
    '</div>' +
    '<input type="range" id="endo-lt4-weight" class="viz-range" min="40" max="120" step="1" value="' + kg + '" oninput="window.InternaApp.calcEndoHypothyroidLt4(this.value, null)" />' +
    '<div class="viz-presets mt-2" id="viz-endo-lt4-presets">' +
      '<button type="button" class="viz-pill-btn ' + (kg === 50 ? "active" : "") + '" onclick="window.InternaApp.calcEndoHypothyroidLt4(50, null)">50 kg</button>' +
      '<button type="button" class="viz-pill-btn ' + (kg === 60 ? "active" : "") + '" onclick="window.InternaApp.calcEndoHypothyroidLt4(60, null)">60 kg</button>' +
      '<button type="button" class="viz-pill-btn ' + (kg === 75 ? "active" : "") + '" onclick="window.InternaApp.calcEndoHypothyroidLt4(75, null)">75 kg</button>' +
      '<button type="button" class="viz-pill-btn ' + (kg === 90 ? "active" : "") + '" onclick="window.InternaApp.calcEndoHypothyroidLt4(90, null)">90 kg</button>' +
    '</div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoLt4",
    title: "Kalkulator Dosis Levotiroksin & Sekuens Koma Miksedema",
    tag: "ATA 2016 &bull; PERKENI",
    controlsTop: controlsTop,
    svgHtml: buildEndoHypothyroidLt4Svg(kg, profKey),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W9. BURCH-WARTOFSKY KRISIS TIROID & SEKUEN PTU-LUGOL (endo-3-3)
// =========================================================================
function buildEndoBurchWartofskySvg(scoreVal) {
  var score = clampNum(scoreVal, 0, 140, 45);
  var toneColor = score >= 45 ? "var(--accent-coral)" : (score >= 25 ? "var(--accent-secondary)" : "var(--accent-primary)");
  var scoreLabel = score >= 45 ? "KRISIS TIROID PASTI (&ge;45)" : (score >= 25 ? "IMPENDING STORM (25-44)" : "Krisis Tiroid Tidak Mungkin (<25)");

  // Gauge bar (0..100, span=100)
  var barPct = clampNum(score / 90, 0, 1, 0);
  var needleX = 20 + barPct * 440;
  var cut25X = 20 + (25 / 90) * 440; // 142.2
  var cut45X = 20 + (45 / 90) * 440; // 240.0

  return '<svg class="viz-svg" viewBox="0 0 480 240" role="img" aria-label="Kalkulator Skor Burch-Wartofsky & Sekuens PTU-Lugol">' +
    // Top Gauge Score Bar
    '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">BURCH-WARTOFSKY POINT SCALE (BWPS)</text>' +
    '<text x="458" y="18" text-anchor="end" font-size="12" font-weight="800" fill="' + toneColor + '">' + score + ' POIN &bull; ' + (score >= 45 ? 'THYROID STORM' : (score >= 25 ? 'IMPENDING' : 'UNLIKELY')) + '</text>' +
    '<rect x="20" y="25" width="440" height="14" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="25" width="' + (cut25X - 20).toFixed(1) + '" height="14" fill="var(--accent-primary)" fill-opacity="0.3" />' +
    '<rect x="' + cut25X.toFixed(1) + '" y="25" width="' + (cut45X - cut25X).toFixed(1) + '" height="14" fill="var(--accent-secondary)" fill-opacity="0.35" />' +
    '<rect x="' + cut45X.toFixed(1) + '" y="25" width="' + (460 - cut45X).toFixed(1) + '" height="14" fill="var(--accent-coral)" fill-opacity="0.35" />' +
    '<circle cx="' + needleX.toFixed(1) + '" cy="32" r="7.5" fill="var(--bg-surface)" stroke="' + toneColor + '" stroke-width="3" />' +
    '<text x="22" y="52" font-size="7.8" font-weight="700" fill="var(--accent-primary)">&lt;25 Tidak Mungkin</text>' +
    '<text x="' + ((cut25X + cut45X) / 2).toFixed(1) + '" y="52" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-secondary)">25-44 Impending</text>' +
    '<text x="458" y="52" text-anchor="end" font-size="7.8" font-weight="700" fill="var(--accent-coral)">&ge;45 Krisis Pasti</text>' +

    // 4 Pillars Chronological Resuscitation Timeline (x=20..460, y=65..190)
    '<rect x="20" y="60" width="440" height="130" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="78" font-size="9" font-weight="800" fill="var(--accent-primary)">4 PILAR RESUSITASI SEKUENS KRUSIAL</text>' +

    // T=0 Minute Box (3 drugs simultaneously)
    '<rect x="30" y="88" width="220" height="92" rx="11" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="40" y="104" font-size="8.2" font-weight="800" fill="var(--accent-primary)">T = 0 MENIT (SEGERA SERENTAK):</text>' +
    '<text x="40" y="120" font-size="7.8" font-weight="700" fill="var(--text-primary)">1. PTU 500-1000 mg loading (PO/NGT)</text>' +
    '<text x="40" y="132" font-size="7.2" font-weight="600" fill="var(--text-muted)">(PTU blok sintesis &amp; T4-&gt;T3)</text>' +
    '<text x="40" y="148" font-size="7.8" font-weight="700" fill="var(--text-primary)">2. Propranolol 60-80 mg tiap 4-6 jam</text>' +
    '<text x="40" y="160" font-size="7.2" font-weight="600" fill="var(--text-muted)">(Kontrol takikardia &amp; blok T4-&gt;T3)</text>' +
    '<text x="40" y="174" font-size="7.8" font-weight="700" fill="var(--text-primary)">3. Hidrokortison 100 mg IV / 8 jam</text>' +

    // Delay Arrow (>=60 min)
    '<line x1="252" y1="134" x2="274" y2="134" stroke="var(--accent-coral)" stroke-width="2.5" />' +
    '<polygon points="278,134 270,130 270,138" fill="var(--accent-coral)" />' +
    '<text x="264" y="126" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">&ge;60 MNT</text>' +

    // T>=60 Minute Box: Lugol Solution
    '<rect x="280" y="88" width="170" height="92" rx="11" fill="var(--bg-surface-subtle)" stroke="var(--accent-coral)" stroke-width="1.8" />' +
    '<text x="290" y="104" font-size="8.2" font-weight="800" fill="var(--accent-coral)">T &ge; 60 MENIT (WAJIB JEDA!):</text>' +
    '<text x="290" y="122" font-size="8.8" font-weight="800" fill="var(--text-primary)">4. Solusio Lugol</text>' +
    '<text x="290" y="136" font-size="7.8" font-weight="700" fill="var(--accent-coral)">5-10 tetes tiap 8 jam PO</text>' +
    '<text x="290" y="152" font-size="7.2" font-weight="600" fill="var(--text-muted)">Efek Wolff-Chaikoff blok rilis</text>' +
    '<text x="290" y="165" font-size="7.2" font-weight="700" fill="var(--accent-coral)">Jika tanpa jeda: Iodium jadi</text>' +
    '<text x="290" y="175" font-size="7.2" font-weight="700" fill="var(--accent-coral)">substrat baru badai tiroid!</text>' +

    // Footer summary
    '<rect x="20" y="196" width="440" height="28" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="214" font-size="8.5" font-weight="800" fill="' + toneColor + '">' + scoreLabel + '</text>' +
  '</svg>';
}

function calcEndoBurchWartofsky() {
  var t = Number(document.getElementById("endo-bw-temp") ? document.getElementById("endo-bw-temp").value : endoVizState.bwTemp);
  var cns = Number(document.getElementById("endo-bw-cns") ? document.getElementById("endo-bw-cns").value : endoVizState.bwCns);
  var gi = Number(document.getElementById("endo-bw-gi") ? document.getElementById("endo-bw-gi").value : endoVizState.bwGi);
  var hr = Number(document.getElementById("endo-bw-hr") ? document.getElementById("endo-bw-hr").value : endoVizState.bwHr);
  var chf = Number(document.getElementById("endo-bw-chf") ? document.getElementById("endo-bw-chf").value : endoVizState.bwChf);
  var af = Number(document.getElementById("endo-bw-af") ? document.getElementById("endo-bw-af").value : endoVizState.bwAf);
  var precip = Number(document.getElementById("endo-bw-precip") ? document.getElementById("endo-bw-precip").value : endoVizState.bwPrecip);

  endoVizState.bwTemp = t;
  endoVizState.bwCns = cns;
  endoVizState.bwGi = gi;
  endoVizState.bwHr = hr;
  endoVizState.bwChf = chf;
  endoVizState.bwAf = af;
  endoVizState.bwPrecip = precip;

  var total = t + cns + gi + hr + chf + af + precip;
  swapVizSvgFrame("viz-endoBw-frame", buildEndoBurchWartofskySvg(total));

  var tone = total >= 45 ? "danger" : (total >= 25 ? "warning" : "info");
  var title = "Skor Burch-Wartofsky = " + total + " Poin (" + (total >= 45 ? "Krisis Tiroid Pasti" : (total >= 25 ? "Impending Thyroid Storm" : "Krisis Tiroid Tidak Mungkin")) + ")";

  var c1Label = "Stratifikasi Risiko Mortalitas";
  var c1Body = "";
  if (total >= 45) {
    c1Body = "Skor &ge;45 mengonfirmasi <strong>Krisis Tiroid Fulminan (Thyroid Storm)</strong> dengan mortalitas 10-30%. Pasien wajib dirawat di ICU/HCU segera!";
  } else if (total >= 25) {
    c1Body = "Skor 25-44 menunjukkan <strong>Impending Thyroid Storm</strong>. Memerlukan observasi ketat dan inisiasi terapi agresif sebelum dekompensasi organ multipel.";
  } else {
    c1Body = "Skor &lt;25: Tirotoksikosis terkompensasi tanpa tanda kegagalan termoregulasi atau dekompensasi kardiovaskular mayor.";
  }

  var c2Label = "Urutan Sekuens Terapi 4 Pilar";
  var c2Body = "<strong>1. T=0 mnt:</strong> PTU 500-1000 mg PO/NGT + Propranolol 60-80 mg PO + Hidrokortison 100 mg IV.<br/><strong>2. T &ge;60 mnt:</strong> Berikan Solusio Lugol 5-10 tetes tiap 8 jam. <em>Jangan beri Lugol sebelum PTU bekerja minimal 1 jam untuk mencegah penumpukan substrat hormon baru (Jod-Basedow)!</em>";

  updateVizReadout(
    "viz-endoBw-readout",
    tone,
    formatVizReadoutHtml(title, c1Label, c1Body, c2Label, c2Body, ""),
    "bw_" + total
  );
}

function applyEndoBwPreset(presetType) {
  if (presetType === "unlikely") {
    endoVizState.bwTemp = 5; endoVizState.bwCns = 0; endoVizState.bwGi = 0; endoVizState.bwHr = 5; endoVizState.bwChf = 0; endoVizState.bwAf = 0; endoVizState.bwPrecip = 10;
  } else if (presetType === "impending") {
    endoVizState.bwTemp = 15; endoVizState.bwCns = 10; endoVizState.bwGi = 10; endoVizState.bwHr = 15; endoVizState.bwChf = 0; endoVizState.bwAf = 0; endoVizState.bwPrecip = 10;
  } else {
    endoVizState.bwTemp = 20; endoVizState.bwCns = 20; endoVizState.bwGi = 10; endoVizState.bwHr = 20; endoVizState.bwChf = 10; endoVizState.bwAf = 10; endoVizState.bwPrecip = 10;
  }

  var g = function(id) { return document.getElementById(id); };
  if (g("endo-bw-temp")) g("endo-bw-temp").value = endoVizState.bwTemp;
  if (g("endo-bw-cns")) g("endo-bw-cns").value = endoVizState.bwCns;
  if (g("endo-bw-gi")) g("endo-bw-gi").value = endoVizState.bwGi;
  if (g("endo-bw-hr")) g("endo-bw-hr").value = endoVizState.bwHr;
  if (g("endo-bw-chf")) g("endo-bw-chf").value = endoVizState.bwChf;
  if (g("endo-bw-af")) g("endo-bw-af").value = endoVizState.bwAf;
  if (g("endo-bw-precip")) g("endo-bw-precip").value = endoVizState.bwPrecip;

  calcEndoBurchWartofsky();
}

function renderEndoBurchWartofskyWidget() {
  var total = endoVizState.bwTemp + endoVizState.bwCns + endoVizState.bwGi + endoVizState.bwHr + endoVizState.bwChf + endoVizState.bwAf + endoVizState.bwPrecip;
  var tone = total >= 45 ? "danger" : (total >= 25 ? "warning" : "info");

  var info = {
    tone: tone,
    rKey: "bw_init",
    title: "Skor Burch-Wartofsky = " + total + " Poin (" + (total >= 45 ? "Krisis Tiroid Pasti" : "Impending Thyroid Storm") + ")",
    c1Label: "Stratifikasi Klinis",
    c1Body: "Skor &ge;45 mengonfirmasi <strong>Krisis Tiroid Fulminan</strong>. Indikasi rawat intensif (ICU/HCU).",
    c2Label: "Sekuens Terapi 4 Pilar",
    c2Body: "Mulai PTU, Propranolol, dan Hidrokortison segera saat T=0. Tunda Solusio Lugol hingga &ge;60 menit pasca PTU!"
  };

  var controlsTop = '<div class="viz-presets mb-2.5" id="viz-endo-bw-presets">' +
    '<button type="button" class="viz-pill-btn" onclick="window.InternaApp.applyEndoBwPreset(\'unlikely\')">Tirotoksikosis Biasa (&lt;25)</button>' +
    '<button type="button" class="viz-pill-btn" onclick="window.InternaApp.applyEndoBwPreset(\'impending\')">Impending Storm (35 Poin)</button>' +
    '<button type="button" class="viz-pill-btn active" onclick="window.InternaApp.applyEndoBwPreset(\'storm\')">Krisis Tiroid Pasti (60 Poin)</button>' +
  '</div>';

  var controlsBottom = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">' +
    '<div><label for="endo-bw-temp" class="viz-slider-label block mb-1">Suhu Tubuh (&deg;C):</label><select id="endo-bw-temp" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="5" ' + (endoVizState.bwTemp===5?'selected':'') + '>37.2 - 37.7 &deg;C (5)</option><option value="10" ' + (endoVizState.bwTemp===10?'selected':'') + '>37.8 - 38.2 &deg;C (10)</option><option value="15" ' + (endoVizState.bwTemp===15?'selected':'') + '>38.3 - 38.8 &deg;C (15)</option><option value="20" ' + (endoVizState.bwTemp===20?'selected':'') + '>38.9 - 39.3 &deg;C (20)</option><option value="25" ' + (endoVizState.bwTemp===25?'selected':'') + '>39.4 - 39.9 &deg;C (25)</option><option value="30" ' + (endoVizState.bwTemp===30?'selected':'') + '>&ge;40.0 &deg;C (30)</option></select></div>' +
    '<div><label for="endo-bw-cns" class="viz-slider-label block mb-1">Gejala SSP (CNS):</label><select id="endo-bw-cns" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwCns===0?'selected':'') + '>Normal (0)</option><option value="10" ' + (endoVizState.bwCns===10?'selected':'') + '>Ringan / Agitasi (10)</option><option value="20" ' + (endoVizState.bwCns===20?'selected':'') + '>Sedang / Delirium / Psikosis (20)</option><option value="30" ' + (endoVizState.bwCns===30?'selected':'') + '>Berat / Koma / Kejang (30)</option></select></div>' +
    '<div><label for="endo-bw-gi" class="viz-slider-label block mb-1">Disfungsi GI-Hepar:</label><select id="endo-bw-gi" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwGi===0?'selected':'') + '>Tidak Ada (0)</option><option value="10" ' + (endoVizState.bwGi===10?'selected':'') + '>Diare / Mual / Nyeri Perut (10)</option><option value="20" ' + (endoVizState.bwGi===20?'selected':'') + '>Ikterus Tanpa Sebab Jelas (20)</option></select></div>' +
    '<div><label for="endo-bw-hr" class="viz-slider-label block mb-1">Laju Jantung (HR bpm):</label><select id="endo-bw-hr" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwHr===0?'selected':'') + '>&lt;100 bpm (0)</option><option value="5" ' + (endoVizState.bwHr===5?'selected':'') + '>100 - 109 bpm (5)</option><option value="10" ' + (endoVizState.bwHr===10?'selected':'') + '>110 - 119 bpm (10)</option><option value="15" ' + (endoVizState.bwHr===15?'selected':'') + '>120 - 129 bpm (15)</option><option value="20" ' + (endoVizState.bwHr===20?'selected':'') + '>130 - 139 bpm (20)</option><option value="25" ' + (endoVizState.bwHr===25?'selected':'') + '>&ge;140 bpm (25)</option></select></div>' +
    '<div><label for="endo-bw-chf" class="viz-slider-label block mb-1">Gagal Jantung (CHF):</label><select id="endo-bw-chf" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwChf===0?'selected':'') + '>Tidak Ada (0)</option><option value="5" ' + (endoVizState.bwChf===5?'selected':'') + '>Ringan / Edema Perifer (5)</option><option value="10" ' + (endoVizState.bwChf===10?'selected':'') + '>Sedang / Ronki Paru (10)</option><option value="15" ' + (endoVizState.bwChf===15?'selected':'') + '>Berat / Edema Paru Akut (15)</option></select></div>' +
    '<div><label for="endo-bw-af" class="viz-slider-label block mb-1">Atrial Fibrilasi (AF):</label><select id="endo-bw-af" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwAf===0?'selected':'') + '>Tidak Ada (0)</option><option value="10" ' + (endoVizState.bwAf===10?'selected':'') + '>Ada Fibrilasi Atrium (10)</option></select></div>' +
    '<div class="sm:col-span-2"><label for="endo-bw-precip" class="viz-slider-label block mb-1">Faktor Pencetus (Infeksi / Operasi / Putus Obat / Iodium):</label><select id="endo-bw-precip" class="viz-calc-input w-full" onchange="window.InternaApp.calcEndoBurchWartofsky()"><option value="0" ' + (endoVizState.bwPrecip===0?'selected':'') + '>Negatif (0)</option><option value="10" ' + (endoVizState.bwPrecip===10?'selected':'') + '>Ada Faktor Pencetus Teridentifikasi (+10)</option></select></div>' +
  '</div>';

  return renderCardioWidgetCard({
    key: "endoBw",
    title: "Kalkulator Skor Burch-Wartofsky Krisis Tiroid & Sekuens Lugol",
    tag: "ATA &bull; BWPS KRISIS",
    controlsTop: controlsTop,
    svgHtml: buildEndoBurchWartofskySvg(total),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W10. ACR TI-RADS NODUL TIROID & BETHESDA (endo-3-4)
// =========================================================================
var ENDO_BETHESDA_DATA = {
  1: { rom: "1-4%", risk: "Non-Diagnostik / Kista", rx: "Ulang FNAB dengan panduan USG" },
  2: { rom: "0-3%", risk: "Jinak (Benign / Koloid)", rx: "Follow up klinis & USG berkala (tanpa operasi)" },
  3: { rom: "10-30%", risk: "AUS / FLUS (Atipia)", rx: "Ulang FNAB atau pemeriksaan panel molekular" },
  4: { rom: "25-40%", risk: "Neoplasma Folikular (FN)", rx: "Lobektomi tiroid diagnostik bedah" },
  5: { rom: "70-75%", risk: "Curiga Malignansi (SUSP)", rx: "Tiroidektomi hampir total / total" },
  6: { rom: "97-100%", risk: "Malignan (Papiler/Medular)", rx: "Tiroidektomi total + diseksi kelenjar getah bening" }
};

function buildEndoTiradsBethesdaSvg(modeKey, ptsVal, sizeVal, bClass) {
  if (modeKey === "bethesda") {
    var b = ENDO_BETHESDA_DATA[bClass] || ENDO_BETHESDA_DATA[5];
    var bTone = bClass >= 5 ? "var(--accent-coral)" : (bClass >= 3 ? "var(--accent-secondary)" : "var(--accent-primary)");
    return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Atlas Sitopatologi Bethesda FNAB Tiroid">' +
      '<rect x="20" y="14" width="440" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="32" font-size="9" font-weight="800" fill="var(--text-muted)">SISTEM SITOPATOLOGI BETHESDA</text>' +
      '<text x="32" y="47" font-size="10.5" font-weight="800" fill="' + bTone + '">KATEGORI BETHESDA ' + bClass + ': ' + b.risk.toUpperCase() + '</text>' +

      '<rect x="20" y="65" width="215" height="150" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="84" font-size="8.8" font-weight="800" fill="var(--text-muted)">RISIKO KEGANASAN (ROM)</text>' +
      '<text x="32" y="115" font-size="22" font-weight="800" fill="' + bTone + '">' + b.rom + '</text>' +
      '<text x="32" y="132" font-size="8" font-weight="700" fill="var(--text-secondary)">Risk of Malignancy (ROM)</text>' +
      '<rect x="32" y="145" width="190" height="52" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="40" y="163" font-size="7.8" font-weight="700" fill="var(--text-primary)">Korelasi Histopatologi:</text>' +
      '<text x="40" y="177" font-size="7.2" font-weight="600" fill="var(--text-muted)">Karsinoma Papiler (~85%), Folikular,</text>' +
      '<text x="40" y="189" font-size="7.2" font-weight="600" fill="var(--text-muted)">Medular (kalsitonin), Anaplastik.</text>' +

      '<rect x="245" y="65" width="215" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="257" y="84" font-size="8.8" font-weight="800" fill="var(--accent-primary)">REKOMENDASI TATALAKSANA:</text>' +
      '<text x="257" y="106" font-size="10" font-weight="800" fill="var(--text-primary)">' + b.rx + '</text>' +
      '<text x="257" y="132" font-size="7.8" font-weight="600" fill="var(--text-muted)">Bethesda III-IV: tes molekular</text>' +
      '<text x="257" y="146" font-size="7.8" font-weight="600" fill="var(--text-muted)">genetik mutasi BRAF V600E / RET-PTC.</text>' +
      '<rect x="257" y="160" width="190" height="40" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="265" y="176" font-size="7.5" font-weight="800" fill="' + bTone + '">Ambang Bedah: Bethesda V-VI</text>' +
      '<text x="265" y="190" font-size="7.2" font-weight="600" fill="var(--text-muted)">Indikasi operasi definitif.</text>' +
    '</svg>';
  }

  // Mode: TIRADS
  var pts = clampNum(ptsVal, 0, 14, 7);
  var sz = clampNum(sizeVal, 0.5, 4.5, 1.8);

  var tr = "TR1";
  var trName = "Jinak (0 Poin)";
  var fnaCut = 99; // no fna
  var trTone = "var(--accent-primary)";

  if (pts >= 7) { tr = "TR5"; trName = "Kecurigaan Tinggi (TR5 &ge;7 Poin)"; fnaCut = 1.0; trTone = "var(--accent-coral)"; }
  else if (pts >= 4) { tr = "TR4"; trName = "Kecurigaan Sedang (TR4: 4-6 Poin)"; fnaCut = 1.5; trTone = "var(--accent-secondary)"; }
  else if (pts === 3) { tr = "TR3"; trName = "Kecurigaan Ringan (TR3: 3 Poin)"; fnaCut = 2.5; trTone = "var(--accent-primary)"; }
  else if (pts === 2) { tr = "TR2"; trName = "Tidak Mencurigakan (TR2: 2 Poin)"; fnaCut = 99; trTone = "var(--accent-primary)"; }

  var needsFna = sz >= fnaCut;

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Atlas USG ACR TI-RADS Nodul Tiroid">' +
    // Top Score Banner
    '<rect x="20" y="14" width="440" height="38" rx="11" fill="var(--bg-surface)" stroke="' + trTone + '" stroke-width="1.8" />' +
    '<text x="32" y="30" font-size="8.8" font-weight="800" fill="var(--text-muted)">ACR TI-RADS 2017 &bull; TOTAL POIN USG = ' + pts + '</text>' +
    '<text x="32" y="44" font-size="11" font-weight="800" fill="' + trTone + '">' + trName + '</text>' +
    '<text x="458" y="38" text-anchor="end" font-size="12" font-weight="800" fill="' + (needsFna ? 'var(--accent-coral)' : 'var(--text-secondary)') + '">' + (needsFna ? 'INDIKASI FNAB (BIOPSI)!' : 'FOLLOW-UP USG') + '</text>' +

    // Left Box: Ilustrasi Nodul USG (x=20..230)
    '<rect x="20" y="60" width="215" height="155" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="78" font-size="8.5" font-weight="800" fill="var(--text-muted)">REPRESENTASI USG NODUL TIROID</text>' +

    // Thyroid lobe background
    '<ellipse cx="127" cy="135" rx="75" ry="48" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +

    // Nodule inside lobe (taller than wide if TR5)
    '<ellipse cx="127" cy="135" rx="' + (pts >= 7 ? 22 : 32) + '" ry="' + (pts >= 7 ? 35 : 24) + '" fill="var(--bg-surface-subtle)" stroke="' + trTone + '" stroke-width="2.5" />' +

    // Microcalcifications dots if TR5
    (pts >= 7
      ? '<circle cx="120" cy="125" r="1.8" fill="#ffffff" /><circle cx="132" cy="132" r="1.8" fill="#ffffff" /><circle cx="124" cy="144" r="1.8" fill="#ffffff" />' +
        '<text x="127" y="158" text-anchor="middle" font-size="6.8" font-weight="800" fill="var(--accent-coral)">MIKROKALSIFIKASI</text>'
      : '') +

    '<text x="32" y="198" font-size="7.5" font-weight="700" fill="var(--text-secondary)">Diameter Nodule: ' + sz.toFixed(1) + ' cm</text>' +

    // Right Box: Kriteria Tindakan & FNAB Cutoff (x=245..460)
    '<rect x="245" y="60" width="215" height="155" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="78" font-size="8.5" font-weight="800" fill="var(--accent-primary)">AMBANG UKURAN BIOPSI FNAB:</text>' +

    '<rect x="257" y="90" width="190" height="26" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="265" y="106" font-size="8" font-weight="800" fill="var(--text-primary)">Cutoff FNAB: ' + (fnaCut === 99 ? 'Tidak Perlu Biopsi' : '&ge; ' + fnaCut.toFixed(1) + ' cm') + '</text>' +

    '<text x="257" y="132" font-size="8" font-weight="700" fill="var(--text-muted)">Status Nodul Saat Ini (' + sz.toFixed(1) + ' cm):</text>' +
    '<text x="257" y="148" font-size="9" font-weight="800" fill="' + (needsFna ? 'var(--accent-coral)' : 'var(--accent-secondary)') + '">' + (needsFna ? 'UKURAN &ge; CUTOFF &rarr; BIOPSI FNAB!' : 'Ukuran &lt; Cutoff &rarr; Monitor USG') + '</text>' +

    '<text x="257" y="172" font-size="7.5" font-weight="600" fill="var(--text-muted)">Tanda Ganas Spesifik:</text>' +
    '<text x="257" y="184" font-size="7.2" font-weight="700" fill="var(--accent-coral)">1. Taller-than-wide (3 pt)</text>' +
    '<text x="257" y="196" font-size="7.2" font-weight="700" fill="var(--accent-coral)">2. Mikrokalsifikasi pungtata (3 pt)</text>' +
  '</svg>';
}

function getEndoTiradsInfo(modeKey, pts, size, bClass) {
  if (modeKey === "bethesda") {
    var b = ENDO_BETHESDA_DATA[bClass] || ENDO_BETHESDA_DATA[5];
    return {
      tone: bClass >= 5 ? "danger" : (bClass >= 3 ? "warning" : "info"),
      rKey: "beth_" + bClass,
      title: "Klasifikasi Sitopatologi: Bethesda " + bClass + " (" + b.risk + ")",
      c1Label: "Risiko Malignansi (ROM)",
      c1Body: "Estimasi risiko keganasan: <strong>" + b.rom + "</strong>. Kategori Bethesda memandu keputusan operasi vs surveilans berkala.",
      c2Label: "Rekomendasi Tindakan Bedah",
      c2Body: "<strong>" + b.rx + "</strong>. Pada Bethesda V-VI, rujuk ke konsultan bedah onkologi/onkologi kepala leher untuk tiroidektomi total."
    };
  }

  var tr = pts >= 7 ? "TR5" : (pts >= 4 ? "TR4" : (pts === 3 ? "TR3" : "TR1-TR2"));
  var fnaCut = pts >= 7 ? 1.0 : (pts >= 4 ? 1.5 : (pts === 3 ? 2.5 : 99));
  var needsFna = size >= fnaCut;

  return {
    tone: pts >= 7 ? "danger" : (pts >= 4 ? "warning" : "info"),
    rKey: "tirads_" + pts + "_" + size.toFixed(1),
    title: "Kategori USG: ACR TI-RADS " + tr + " (" + pts + " Poin)",
    c1Label: "Rekomendasi Tindakan (Ukuran " + size.toFixed(1) + " cm)",
    c1Body: needsFna
      ? "<span class=\"text-[var(--accent-coral)] font-bold\">INDIKASI BIOPSI ASPIRASI JARUM HALUS (FNAB)!</span> Ukuran nodul (&ge;" + fnaCut + " cm) telah melampaui batas ambang risiko keganasan kategori " + tr + "."
      : "Belum memenuhi ambang FNAB (&ge;" + fnaCut + " cm). Lakukan <strong>surveilans USG berkala</strong> setiap 12-24 bulan untuk mengevaluasi pertumbuhan nodul.",
    c2Label: "Karakteristik Curiga Ganas",
    c2Body: "Bentuk <em>taller-than-wide</em>, hipoekoik berat, margin irreguler/ekstratiroid, dan fokus mikrokalsifikasi pungtata (psammoma bodies) memiliki spesifisitas keganasan tertinggi."
  };
}

function updateEndoTiradsBethesdaViz(modeVal, compVal, echoVal, shapeVal, marginVal, fociVal, sizeVal, bClassVal) {
  if (modeVal) endoVizState.tiradsMode = modeVal;
  if (compVal !== null && compVal !== undefined) endoVizState.tiradsComp = Number(compVal);
  if (echoVal !== null && echoVal !== undefined) endoVizState.tiradsEcho = Number(echoVal);
  if (shapeVal !== null && shapeVal !== undefined) endoVizState.tiradsShape = Number(shapeVal);
  if (marginVal !== null && marginVal !== undefined) endoVizState.tiradsMargin = Number(marginVal);
  if (fociVal !== null && fociVal !== undefined) endoVizState.tiradsFoci = Number(fociVal);
  if (sizeVal !== null && sizeVal !== undefined) endoVizState.tiradsSize = Number(sizeVal);
  if (bClassVal !== null && bClassVal !== undefined) endoVizState.bethesdaClass = Number(bClassVal);

  var mode = endoVizState.tiradsMode;
  var pts = endoVizState.tiradsComp + endoVizState.tiradsEcho + endoVizState.tiradsShape + endoVizState.tiradsMargin + endoVizState.tiradsFoci;
  var sz = endoVizState.tiradsSize;
  var bc = endoVizState.bethesdaClass;

  if (modeVal) { rerenderEndoCard("viz-endoTirads-card", renderEndoTiradsBethesdaWidget()); return; }
  syncEndoTabByMatch("viz-endo-tirads-mode-tabs", "'" + mode + "'");
  syncEndoTabByMatch("viz-endo-bethesda-tabs", ", " + bc + ")");
  syncSliderAndPill("endo-tirads-size", "endo-tirads-size-pill", sz, sz.toFixed(1) + " cm");
  swapVizSvgFrame("viz-endoTirads-frame", buildEndoTiradsBethesdaSvg(mode, pts, sz, bc));

  var info = getEndoTiradsInfo(mode, pts, sz, bc);
  updateVizReadout(
    "viz-endoTirads-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoTiradsBethesdaWidget() {
  var mode = endoVizState.tiradsMode;
  var pts = endoVizState.tiradsComp + endoVizState.tiradsEcho + endoVizState.tiradsShape + endoVizState.tiradsMargin + endoVizState.tiradsFoci;
  var sz = endoVizState.tiradsSize;
  var bc = endoVizState.bethesdaClass;
  var info = getEndoTiradsInfo(mode, pts, sz, bc);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-tirads-mode-tabs", [
      { key: "tirads", label: "Kalkulator ACR TI-RADS USG", onclick: "window.InternaApp.updateEndoTiradsBethesdaViz('tirads', null, null, null, null, null, null, null)" },
      { key: "bethesda", label: "Atlas Sitopatologi Bethesda (I-VI)", onclick: "window.InternaApp.updateEndoTiradsBethesdaViz('bethesda', null, null, null, null, null, null, null)" }
    ], mode) +
  '</div>';

  var controlsBottom = "";
  if (mode === "tirads") {
    controlsBottom = '<div class="space-y-2 mt-2.5">' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
        '<div><label for="endo-tr-comp" class="viz-slider-label block mb-1">1. Komposisi:</label><select id="endo-tr-comp" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoTiradsBethesdaViz(null, this.value, null, null, null, null, null, null)"><option value="0" ' + (endoVizState.tiradsComp===0?'selected':'') + '>Kistik / Spongiform (0 pt)</option><option value="1" ' + (endoVizState.tiradsComp===1?'selected':'') + '>Campuran Padat-Kistik (1 pt)</option><option value="2" ' + (endoVizState.tiradsComp===2?'selected':'') + '>Padat / Hampir Seluruh Padat (2 pt)</option></select></div>' +
        '<div><label for="endo-tr-echo" class="viz-slider-label block mb-1">2. Ekogenisitas:</label><select id="endo-tr-echo" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoTiradsBethesdaViz(null, null, this.value, null, null, null, null, null)"><option value="0" ' + (endoVizState.tiradsEcho===0?'selected':'') + '>Anekoik (0 pt)</option><option value="1" ' + (endoVizState.tiradsEcho===1?'selected':'') + '>Hiperekoik / Isoekoik (1 pt)</option><option value="2" ' + (endoVizState.tiradsEcho===2?'selected':'') + '>Hipoekoik (2 pt)</option><option value="3" ' + (endoVizState.tiradsEcho===3?'selected':'') + '>Sangat Hipoekoik (3 pt)</option></select></div>' +
        '<div><label for="endo-tr-shape" class="viz-slider-label block mb-1">3. Bentuk (Shape):</label><select id="endo-tr-shape" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoTiradsBethesdaViz(null, null, null, this.value, null, null, null, null)"><option value="0" ' + (endoVizState.tiradsShape===0?'selected':'') + '>Wider-than-tall (0 pt)</option><option value="3" ' + (endoVizState.tiradsShape===3?'selected':'') + '>Taller-than-wide (3 pt - Curiga Ganas!)</option></select></div>' +
        '<div><label for="endo-tr-margin" class="viz-slider-label block mb-1">4. Margin:</label><select id="endo-tr-margin" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoTiradsBethesdaViz(null, null, null, null, this.value, null, null, null)"><option value="0" ' + (endoVizState.tiradsMargin===0?'selected':'') + '>Halus / Tidak Tegas (0 pt)</option><option value="2" ' + (endoVizState.tiradsMargin===2?'selected':'') + '>Berlobus / Irreguler (2 pt)</option><option value="3" ' + (endoVizState.tiradsMargin===3?'selected':'') + '>Ekstensi Ekstratiroid (3 pt)</option></select></div>' +
        '<div class="sm:col-span-2"><label for="endo-tr-foci" class="viz-slider-label block mb-1">5. Fokus Ekogenik:</label><select id="endo-tr-foci" class="viz-calc-input w-full" onchange="window.InternaApp.updateEndoTiradsBethesdaViz(null, null, null, null, null, this.value, null, null)"><option value="0" ' + (endoVizState.tiradsFoci===0?'selected':'') + '>Tidak Ada / Ekor Komet Besar (0 pt)</option><option value="1" ' + (endoVizState.tiradsFoci===1?'selected':'') + '>Makrokalsifikasi (1 pt)</option><option value="2" ' + (endoVizState.tiradsFoci===2?'selected':'') + '>Kalsifikasi Tepi Perifer (2 pt)</option><option value="3" ' + (endoVizState.tiradsFoci===3?'selected':'') + '>Mikrokalsifikasi Pungtata (3 pt - Psammoma!)</option></select></div>' +
      '</div>' +
      '<div class="viz-slider-row mt-2">' +
        '<label for="endo-tirads-size" class="viz-slider-label">Diameter Maksimal Nodul (cm):</label>' +
        '<span id="endo-tirads-size-pill" class="viz-value-pill">' + sz.toFixed(1) + ' cm</span>' +
      '</div>' +
      '<input type="range" id="endo-tirads-size" class="viz-range" min="0.5" max="4.5" step="0.1" value="' + sz + '" oninput="window.InternaApp.updateEndoTiradsBethesdaViz(null, null, null, null, null, null, this.value, null)" />' +
    '</div>';
  } else {
    controlsBottom = '<div class="mt-2.5">' +
      '<span class="text-xs font-bold text-[var(--text-muted)] block mb-1">Pilih Kategori Sitopatologi Bethesda (I s/d VI):</span>' +
      renderCardioTabRow("viz-endo-bethesda-tabs", [1, 2, 3, 4, 5, 6].map(function(idx) {
        return { key: String(idx), label: "Bethesda " + idx, onclick: "window.InternaApp.updateEndoTiradsBethesdaViz(null, null, null, null, null, null, null, " + idx + ")" };
      }), String(bc)) +
    '</div>';
  }

  return renderCardioWidgetCard({
    key: "endoTirads",
    title: "Kalkulator Atlas ACR TI-RADS USG Nodul Tiroid & Bethesda I–VI",
    tag: "ACR 2017 &bull; BETHESDA",
    controlsTop: controlsTop,
    svgHtml: buildEndoTiradsBethesdaSvg(mode, pts, sz, bc),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W11. CUSHING VS ADDISON & KURVA KORTISOL (endo-4-1) - rAF: endoCortisol
// =========================================================================
var ENDO_CORTISOL_DISEASES = {
  normal: {
    label: "Normal (Ritme Sirkadian Intak)",
    tone: "info",
    acth: "Normal (15-60 pg/mL)",
    dst1mg: "Tersupresi Normal (<1.8 &mu;g/dL)",
    hddst: "Normal",
    desc: "Puncak kortisol pagi hari (06:00-08:00) dan palung terendah malam hari tengah malam (<1.8 &mu;g/dL)."
  },
  cushing_pit: {
    label: "Penyakit Cushing (Adenoma Pituitari)",
    tone: "danger",
    acth: "Normal-Tinggi / Tidak Tersupresi (25-80 pg/mL)",
    dst1mg: "GAGAL SUPRESI (>1.8 &mu;g/dL)",
    hddst: "TERSUPRESI >50% (Sensitif HDDST 8 mg)!",
    desc: "Adenoma hipofisis otonom parsial; masih merespon supresi pada pemberian deksametason dosis tinggi 8 mg."
  },
  cushing_adrenal: {
    label: "Tumor Adrenal (Adenoma / Ca)",
    tone: "danger",
    acth: "TERSUPRESI MUTLAK (<5 pg/mL)!",
    dst1mg: "GAGAL SUPRESI",
    hddst: "GAGAL SUPRESI (<50%)",
    desc: "Kortisol disekresi mandiri oleh adrenal; ACTH tersupresi kuat akibat umpan balik negatif intak."
  },
  cushing_ectopic: {
    label: "ACTH Ektopik (SCLC Paru / Karsinoid)",
    tone: "danger",
    acth: "SANGAT TINGGI (>150-500 pg/mL)!",
    dst1mg: "GAGAL SUPRESI",
    hddst: "GAGAL SUPRESI (Otonom Total)",
    desc: "Sekresi ACTH ektopik ganas otonom total; sering disertai hiperpigmentasi berat dan hipokalemia alkalosis."
  },
  addison: {
    label: "Penyakit Addison (Krisis Adrenal)",
    tone: "danger",
    acth: "SANGAT TINGGI (>100 pg/mL)",
    dst1mg: "Kortisol basal sangat rendah (<3 &mu;g/dL)",
    hddst: "Tidak diindikasikan (Cek ACTH stim)",
    desc: "Destruksi korteks adrenal autoimun; hilangnya kortisol memicu lonjakan masif ACTH (hiperpigmentasi)."
  }
};

function getCortisolCurveVal(disKey, hour) {
  var h = clampNum(hour, 0, 24, 8.0);
  var cort = 12;
  var acth = 25;

  if (disKey === "normal") {
    // Normal: peak at 07:00 (~18), trough at 23:00-00:00 (~1.5)
    cort = 9 + 8 * Math.cos(((h - 7) / 24) * 2 * Math.PI);
    acth = 22 + 18 * Math.cos(((h - 7) / 24) * 2 * Math.PI);
  } else if (disKey === "cushing_pit") {
    // Cushing Disease: flat elevated curve ~16, night cortisol remains high ~14!
    cort = 16 + 2 * Math.cos(((h - 8) / 24) * 2 * Math.PI);
    acth = 45 + 5 * Math.cos(((h - 8) / 24) * 2 * Math.PI);
  } else if (disKey === "cushing_adrenal") {
    cort = 24 + 1.5 * Math.sin(h / 3);
    acth = 3; // suppressed
  } else if (disKey === "cushing_ectopic") {
    cort = 38 + 2 * Math.sin(h / 4);
    acth = 180;
  } else if (disKey === "addison") {
    cort = 2.2; // flat bottom
    acth = 140;
  }

  return { cort: Number(clampNum(cort, 0.5, 45, 12).toFixed(1)), acth: Math.round(acth) };
}

function buildEndoCushingAddisonSvg(disKey, hourVal, stepVal) {
  var h = clampNum(hourVal, 0, 24, 8.0);
  var cur = getCortisolCurveVal(disKey, h);
  var d = ENDO_CORTISOL_DISEASES[disKey] || ENDO_CORTISOL_DISEASES.cushing_pit;

  // Grid x=30..450 (width 420 for 24h), y=25..185
  var curX = 30 + (h / 24) * 420;
  var curY = 185 - (cur.cort / 45) * 150;

  var points = [];
  for (var t = 0; t <= 24; t += 0.5) {
    var vals = getCortisolCurveVal(disKey, t);
    var px = 30 + (t / 24) * 420;
    var py = 185 - (vals.cort / 45) * 150;
    points.push(px.toFixed(1) + "," + py.toFixed(1));
  }
  var pathD = "M" + points.join(" L");

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Stepper Diagnostik & Kurva Sirkadian Kortisol">' +
    // Top Background Grid
    '<rect x="30" y="25" width="420" height="160" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    // Night zone (23:00 to 06:00)
    '<rect x="30" y="25" width="105" height="160" fill="var(--text-muted)" fill-opacity="0.1" />' +
    '<rect x="432" y="25" width="18" height="160" fill="var(--text-muted)" fill-opacity="0.1" />' +

    // Normal Cutoff line (<1.8 at midnight)
    '<line x1="30" y1="' + (185 - (1.8 / 45) * 150).toFixed(1) + '" x2="450" y2="' + (185 - (1.8 / 45) * 150).toFixed(1) + '" stroke="var(--accent-primary)" stroke-width="1.2" stroke-dasharray="3,3" />' +
    '<text x="445" y="' + (180 - (1.8 / 45) * 150).toFixed(1) + '" text-anchor="end" font-size="7.5" font-weight="700" fill="var(--accent-primary)">Normal Malam &lt;1.8 &mu;g/dL</text>' +

    // Normal Curve Comparison if disease
    (disKey !== "normal"
      ? '<path d="M30,175 Q152,35 240,115 T450,175" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4,3" stroke-opacity="0.5" />' +
        '<text x="140" y="45" font-size="7.2" font-weight="600" fill="var(--text-muted)">Ritme Normal Fisiologis</text>'
      : '') +

    // Current Condition Curve
    '<path d="' + pathD + '" fill="none" stroke="' + (disKey === "normal" ? "var(--accent-primary)" : "var(--accent-coral)") + '" stroke-width="3" />' +

    // Moving Hour Cursor Line
    '<line x1="' + curX.toFixed(1) + '" y1="25" x2="' + curX.toFixed(1) + '" y2="185" stroke="var(--text-primary)" stroke-width="1.8" />' +
    '<circle cx="' + curX.toFixed(1) + '" cy="' + curY.toFixed(1) + '" r="5.5" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="2.5" />' +

    // Ticks
    '<text x="30" y="196" font-size="7.8" font-weight="700" fill="var(--text-muted)">00:00</text>' +
    '<text x="152" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-primary)">07:00 (Peak)</text>' +
    '<text x="240" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">12:00</text>' +
    '<text x="345" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">18:00</text>' +
    '<text x="450" y="196" text-anchor="end" font-size="7.8" font-weight="700" fill="var(--accent-coral)">24:00 (Trough)</text>' +

    // Bottom Status Readout Bar
    '<rect x="30" y="202" width="420" height="26" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<circle cx="45" cy="215" r="4" fill="var(--accent-coral)" />' +
    '<text x="54" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">Kortisol: ' + cur.cort + ' &mu;g/dL</text>' +
    '<circle cx="160" cy="215" r="4" fill="var(--accent-primary)" />' +
    '<text x="169" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">ACTH: ' + cur.acth + ' pg/mL</text>' +
    '<text x="440" y="218" text-anchor="end" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">Jam ' + formatClockTime(h) + '</text>' +
  '</svg>';
}

function getEndoCushingInfo(disKey, hour) {
  var d = ENDO_CORTISOL_DISEASES[disKey] || ENDO_CORTISOL_DISEASES.cushing_pit;
  var cur = getCortisolCurveVal(disKey, hour);

  return {
    tone: d.tone,
    rKey: "cort_" + disKey + "_" + hour.toFixed(1),
    title: "Evaluasi: " + d.label,
    c1Label: "Hasil Stepper Diagnostik 3 Langkah",
    c1Body: "1. Low-dose DST 1 mg: <strong>" + d.dst1mg + "</strong>.<br/>2. ACTH Plasma: <strong>" + d.acth + "</strong>.<br/>3. High-dose HDDST 8 mg: <strong>" + d.hddst + "</strong>.",
    c2Label: "Status Sirkadian Jam " + formatClockTime(hour),
    c2Body: "Kortisol: <strong>" + cur.cort + " &mu;g/dL</strong> &bull; ACTH: <strong>" + cur.acth + " pg/mL</strong>. " + d.desc
  };
}

function updateEndoCushingAddisonViz(hourVal, disVal, stepVal, fromUser) {
  if (fromUser && hourVal !== null && hourVal !== undefined && typeof cancelAllVizAnimations === "function") {
    cancelAllVizAnimations();
  }
  if (hourVal !== null && hourVal !== undefined) endoVizState.cortisolHour = clampNum(hourVal, 0, 24, 8);
  if (disVal) endoVizState.cortisolDisease = disVal;
  if (stepVal) endoVizState.cortisolStep = Number(stepVal);

  var h = endoVizState.cortisolHour;
  var dis = endoVizState.cortisolDisease;
  var st = endoVizState.cortisolStep;

  syncEndoTabByMatch("viz-endo-cort-dis-tabs", "'" + dis + "'");
  syncSliderAndPill("viz-endoCortisol-slider", "viz-endoCortisol-pill", h, "Jam " + formatClockTime(h));
  syncVizPresets("viz-endoCortisol-presets", [Math.abs(h - 7.0) < 0.5, Math.abs(h - 12.0) < 0.5, Math.abs(h - 18.0) < 0.5, Math.abs(h - 23.5) < 0.5]);

  swapVizSvgFrame("viz-endoCortisol-frame", buildEndoCushingAddisonSvg(dis, h, st));

  var info = getEndoCushingInfo(dis, h);
  updateVizReadout(
    "viz-endoCortisol-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoCushingAddisonWidget() {
  var h = endoVizState.cortisolHour;
  var dis = endoVizState.cortisolDisease;
  var st = endoVizState.cortisolStep;
  var info = getEndoCushingInfo(dis, h);

  var controlsTop = '<div class="mb-2.5">' +
    renderCardioTabRow("viz-endo-cort-dis-tabs", Object.entries(ENDO_CORTISOL_DISEASES).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoCushingAddisonViz(null, '" + e[0] + "', null, false)" };
    }), dis) +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "endoCortisol",
    label: "Simulasi Waktu Sirkadian (00:00 s/d 24:00):",
    pillText: "Jam " + formatClockTime(h),
    min: 0,
    max: 24,
    step: 0.1,
    value: h,
    trackBg: "linear-gradient(90deg, rgba(30,41,59,0.5) 0% 25%, rgba(239,68,68,0.3) 25% 75%, rgba(30,41,59,0.5) 75% 100%)",
    oninput: "window.InternaApp.updateEndoCushingAddisonViz(this.value, null, null, true)",
    presets: [
      { val: 7.0, label: "07:00 (Puncak Pagi)", active: Math.abs(h - 7.0) < 0.5 },
      { val: 12.0, label: "12:00 (Siang)", active: Math.abs(h - 12.0) < 0.5 },
      { val: 18.0, label: "18:00 (Sore)", active: Math.abs(h - 18.0) < 0.5 },
      { val: 23.5, label: "23:30 (Palung Malam)", active: Math.abs(h - 23.5) < 0.5 }
    ]
  });

  return renderCardioWidgetCard({
    key: "endoCortisol",
    title: "Stepper DST–ACTH–HDDST & Kurva Sirkadian Kortisol 24 Jam",
    tag: "ENDOCRINE SOCIETY 2024",
    controlsTop: controlsTop,
    svgHtml: buildEndoCushingAddisonSvg(dis, h, st),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W12. FEOKROMOSITOMA (ALFA->BETA) & CONN ARR (endo-4-2)
// =========================================================================
function buildEndoPheoConnSvg(modeKey, seqKey, pacVal, praVal) {
  if (modeKey === "conn") {
    var pac = clampNum(pacVal, 5, 60, 32);
    var pra = clampNum(praVal, 0.1, 5.0, 0.8);
    var arr = pac / pra;
    var isArrPos = arr >= 20 && pac >= 10;
    var connTone = isArrPos ? "var(--accent-coral)" : "var(--accent-primary)";

    return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Kalkulator Rasio ARR Sindrom Conn">' +
      '<rect x="20" y="14" width="440" height="42" rx="11" fill="var(--bg-surface)" stroke="' + connTone + '" stroke-width="1.8" />' +
      '<text x="32" y="30" font-size="8.8" font-weight="800" fill="var(--text-muted)">ALDOSTERONE-TO-RENIN RATIO (ARR)</text>' +
      '<text x="32" y="47" font-size="13" font-weight="800" fill="' + connTone + '">ARR = ' + arr.toFixed(1) + ' (' + (isArrPos ? 'SKRINING POSITIF CONN &ge;20!' : 'Skrining Negatif (<20)') + ')</text>' +

      '<rect x="20" y="65" width="215" height="150" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="84" font-size="8.8" font-weight="800" fill="var(--text-muted)">PARAMETRI HORMONAL</text>' +
      '<text x="32" y="104" font-size="8" font-weight="700" fill="var(--text-muted)">Plasma Aldosteron (PAC):</text>' +
      '<text x="32" y="120" font-size="11" font-weight="800" fill="var(--accent-coral)">' + pac + ' ng/dL (Normal &lt;15)</text>' +
      '<text x="32" y="140" font-size="8" font-weight="700" fill="var(--text-muted)">Plasma Renin Activity (PRA):</text>' +
      '<text x="32" y="156" font-size="11" font-weight="800" fill="var(--accent-primary)">' + pra.toFixed(1) + ' ng/mL/jam (Tersupresi)</text>' +
      '<text x="32" y="184" font-size="7.5" font-weight="600" fill="var(--text-secondary)">Trias Conn: HT resisten + Hipokalemia + Alkalosis</text>' +

      '<rect x="245" y="65" width="215" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="257" y="84" font-size="8.8" font-weight="800" fill="var(--accent-primary)">ALUR DIAGNOSTIK CONN:</text>' +
      '<text x="257" y="104" font-size="8" font-weight="700" fill="var(--text-primary)">1. Konfirmasi: Uji Infus Salin 2L IV</text>' +
      '<text x="257" y="117" font-size="7.5" font-weight="600" fill="var(--text-muted)">(Aldosteron gagal supresi &lt;5)</text>' +
      '<text x="257" y="134" font-size="8" font-weight="700" fill="var(--text-primary)">2. Lokalisasi: CT Scan Adrenal</text>' +
      '<text x="257" y="150" font-size="8" font-weight="700" fill="var(--accent-coral)">3. Adrenal Venous Sampling (AVS)</text>' +
      '<text x="257" y="163" font-size="7.2" font-weight="600" fill="var(--text-muted)">Unilateral &rarr; Adrenalektomi bedah</text>' +
      '<text x="257" y="174" font-size="7.2" font-weight="600" fill="var(--text-muted)">Bilateral &rarr; Spironolakton oral</text>' +
      '<text x="257" y="196" font-size="7.2" font-weight="700" fill="var(--accent-secondary)">Stop Spirono 4-6 mgg sblm ARR!</text>' +
    '</svg>';
  }

  // Mode: pheo
  var isCorrect = seqKey === "correct_alpha_first";
  var lumenR = isCorrect ? 36 : 10; // constricted lumen if fatal beta first
  var bpText = isCorrect ? "125/80 mmHg (TERKONTROL)" : "250/145 mmHg (KRISIS MALIGNA!)";
  var tone = isCorrect ? "var(--accent-primary)" : "var(--accent-coral)";

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Simulator Urutan Blokade Reseptor Feokromositoma">' +
    // Top Warning Banner
    '<rect x="20" y="14" width="440" height="42" rx="11" fill="var(--bg-surface)" stroke="' + tone + '" stroke-width="2" />' +
    '<text x="32" y="30" font-size="8.8" font-weight="800" fill="var(--text-muted)">FEOKROMOSITOMA: TONUS VASKULAR</text>' +
    '<text x="32" y="47" font-size="12" font-weight="800" fill="' + tone + '">TEKANAN DARAH: ' + bpText + '</text>' +

    // Left Box: Visualisasi Lumen Pembuluh Darah (x=20..230)
    '<rect x="20" y="65" width="215" height="150" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="84" font-size="8.8" font-weight="800" fill="var(--text-muted)">DIAMETER LUMEN ARTERIOL PERIFER</text>' +

    // Outer vessel wall
    '<circle cx="127" cy="140" r="48" fill="var(--bg-surface)" stroke="var(--border-subtle)" stroke-width="3" />' +
    // Inner lumen
    '<circle cx="127" cy="140" r="' + lumenR + '" fill="' + tone + '" fill-opacity="0.3" stroke="' + tone + '" stroke-width="3" />' +

    (isCorrect
      ? '<text x="127" y="144" text-anchor="middle" font-size="8" font-weight="800" fill="var(--accent-primary)">LUMEN DILATASI</text>' +
        '<text x="127" y="202" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--accent-primary)">Resistensi Vaskular Sistemik Normal</text>'
      : '<text x="127" y="144" text-anchor="middle" font-size="7" font-weight="800" fill="var(--accent-coral)">SPASME!</text>' +
        '<text x="127" y="202" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">UNOPPOSED ALPHA VASOCONSTRICTION!</text>') +

    // Right Box: Aturan Emas Reseptor (x=245..460)
    '<rect x="245" y="65" width="215" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="84" font-size="8.8" font-weight="800" fill="' + tone + '">' + (isCorrect ? 'SEKUEN BENAR (ALFA DULU):' : 'KESALAHAN FATAL (BETA DULU):') + '</text>' +

    (isCorrect
      ? '<text x="257" y="104" font-size="8" font-weight="700" fill="var(--text-primary)">1. Alfa-blocker (Fenoksibenzamin)</text>' +
        '<text x="257" y="117" font-size="7.5" font-weight="600" fill="var(--text-muted)">Berikan minimal 10-14 hari pre-op.</text>' +
        '<text x="257" y="132" font-size="8" font-weight="700" fill="var(--text-primary)">2. Rehidrasi cairan (NaCl 0.9%)</text>' +
        '<text x="257" y="145" font-size="7.5" font-weight="600" fill="var(--text-muted)">Ekspansi volume intravaskular.</text>' +
        '<text x="257" y="160" font-size="8" font-weight="700" fill="var(--text-primary)">3. Beta-blocker (Propranolol)</text>' +
        '<text x="257" y="173" font-size="7.5" font-weight="600" fill="var(--accent-primary)">Hanya diberikan 2-3 hari pra-bedah!</text>' +
        '<text x="257" y="198" font-size="7.2" font-weight="700" fill="var(--accent-primary)">Aman dari krisis hipertensi letal.</text>'
      : '<text x="257" y="104" font-size="8" font-weight="800" fill="var(--accent-coral)">BETA-BLOCKER DIBERIKAN DULU!</text>' +
        '<text x="257" y="120" font-size="7.5" font-weight="600" fill="var(--text-primary)">Beta-2 vasodilatasi terblokir!</text>' +
        '<text x="257" y="136" font-size="7.5" font-weight="700" fill="var(--accent-coral)">Katekolamin masif menstimulasi</text>' +
        '<text x="257" y="148" font-size="7.5" font-weight="700" fill="var(--accent-coral)">reseptor Alfa-1 tanpa tandingan!</text>' +
        '<text x="257" y="168" font-size="7.2" font-weight="700" fill="var(--text-primary)">Akibat: Edema paru akut, stroke</text>' +
        '<text x="257" y="179" font-size="7.2" font-weight="700" fill="var(--text-primary)">stroke perdarahan &amp; infark jantung!</text>' +
        '<text x="257" y="198" font-size="7.2" font-weight="800" fill="var(--accent-coral)">JANGAN PERNAH BERI BETA TANPA ALFA!</text>') +
  '</svg>';
}

function getEndoPheoInfo(modeKey, seqKey, pac, pra) {
  if (modeKey === "conn") {
    var arr = pac / pra;
    var isPos = arr >= 20 && pac >= 10;
    return {
      tone: isPos ? "danger" : "info",
      rKey: "conn_" + arr.toFixed(1),
      title: "Skrining Hiperaldosteronisme Primer (ARR = " + arr.toFixed(1) + ")",
      c1Label: "Interpretasi Rasio Aldosteron-Renin",
      c1Body: isPos
        ? "ARR &ge;20 dengan PAC &ge;10 ng/dL mengindikasikan <strong>Skrining Positif Sindrom Conn</strong>. Lanjutkan uji konfirmasi infus salin 2L IV dalam 4 jam."
        : "ARR &lt;20: Hiperaldosteronisme primer tidak terbukti. Evaluasi penyebab lain hipertensi sekunder.",
      c2Label: "Langkah Penentuan Terapi Definitif",
      c2Body: "Lakukan <strong>Adrenal Venous Sampling (AVS)</strong>: Adenoma unilateral diterapi <strong>Adrenalektomi Laparoskopik Kuratif</strong>; Hiperplasia bilateral diterapi medikamentosa seumur hidup (<strong>Spironolakton 25-100 mg/hari</strong>)."
    };
  }

  var isCorrect = seqKey === "correct_alpha_first";
  if (!isCorrect) {
    return {
      tone: "danger",
      rKey: "pheo_fatal",
      title: "MALAPROTEKSI FATAL: Beta-Blocker Diberikan Tanpa Blokade Alfa!",
      c1Label: "Patofisiologi Bencana Hemodinamik",
      c1Body: "Blokade beta-2 menghilangkan efek vasodilatasi fisiologis. Katekolamin sirkulasi dalam jumlah masif akan mengikat reseptor alfa-1 tanpa perlawanan (<strong>Unopposed Alpha-1 Vasoconstriction</strong>).",
      c2Label: "Komplikasi Mengancam Nyawa",
      c2Body: "Lonjakan tekanan darah ekstrem (&gt;250/140 mmHg), edema paru akut fulminan, diseksi aorta, infark miokard, ensefalopati hipertensi, dan kematian mendadak!"
    };
  }

  return {
    tone: "info",
    rKey: "pheo_correct",
    title: "Urutan Aman Blokade Reseptor Feokromositoma (Alfa &rarr; Beta)",
    c1Label: "Aturan Waktu Persiapan Bedah",
    c1Body: "1. <strong>Fenoksibenzamin 10 mg 2x/hari</strong> (atau Doksazosin) selama <strong>10-14 HARI</strong>.<br/>2. Rehidrasi natrium tinggi (NaCl 0.9%) untuk mengisi kembali volume intravaskular pasca vasodilatasi.<br/>3. Beta-blocker baru ditambahkan <strong>2-3 HARI sebelum operasi</strong> bila ada takikardia refrakter.",
    c2Label: "Target Stabilitas Pre-Operatif",
    c2Body: "Tekanan darah &lt;130/80 mmHg saat duduk, tekanan sistolik &gt;90 mmHg saat berdiri, dan tidak ada perubahan ST-T iskemik pada EKG selama minimal 1 minggu sebelum adrenalektomi."
  };
}

function updateEndoPheoConnViz(modeVal, seqVal, pacVal, praVal) {
  if (modeVal) endoVizState.pheoMode = modeVal;
  if (seqVal) endoVizState.pheoSequence = seqVal;
  if (pacVal !== null && pacVal !== undefined) endoVizState.connPac = Number(pacVal);
  if (praVal !== null && praVal !== undefined) endoVizState.connPra = Number(praVal);

  var mode = endoVizState.pheoMode;
  var seq = endoVizState.pheoSequence;
  var pac = endoVizState.connPac;
  var pra = endoVizState.connPra;

  if (modeVal) { rerenderEndoCard("viz-endoPheo-card", renderEndoPheoConnWidget()); return; }
  syncEndoTabByMatch("viz-endo-pheo-mode-tabs", "'" + mode + "'");
  syncEndoTabByMatch("viz-endo-pheo-seq-tabs", "'" + seq + "'");
  syncSliderAndPill("endo-conn-pac", "endo-conn-pac-pill", pac, pac + " ng/dL");
  syncSliderAndPill("endo-conn-pra", "endo-conn-pra-pill", pra, pra.toFixed(1) + " ng/mL/h");

  swapVizSvgFrame("viz-endoPheo-frame", buildEndoPheoConnSvg(mode, seq, pac, pra));

  var info = getEndoPheoInfo(mode, seq, pac, pra);
  updateVizReadout(
    "viz-endoPheo-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoPheoConnWidget() {
  var mode = endoVizState.pheoMode;
  var seq = endoVizState.pheoSequence;
  var pac = endoVizState.connPac;
  var pra = endoVizState.connPra;
  var info = getEndoPheoInfo(mode, seq, pac, pra);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-pheo-mode-tabs", [
      { key: "pheo", label: "Feokromositoma: Alfa &rarr; Beta Blocker", onclick: "window.InternaApp.updateEndoPheoConnViz('pheo', null, null, null)" },
      { key: "conn", label: "Hiperaldosteronisme Primer (ARR & Conn)", onclick: "window.InternaApp.updateEndoPheoConnViz('conn', null, null, null)" }
    ], mode) +
  '</div>';

  var controlsBottom = "";
  if (mode === "pheo") {
    controlsBottom = '<div class="mt-2.5">' +
      '<span class="text-xs font-bold text-[var(--text-muted)] block mb-1">Simulasi Sekuens Terapi Farmakologi:</span>' +
      renderCardioTabRow("viz-endo-pheo-seq-tabs", [
        { key: "correct_alpha_first", label: "Urutan Benar: Alfa Dulu (10-14 Hari) &rarr; Baru Beta", onclick: "window.InternaApp.updateEndoPheoConnViz(null, 'correct_alpha_first', null, null)" },
        { key: "fatal_beta_first", label: "KESALAHAN FATAL: Beta Dulu Tanpa Alfa!", onclick: "window.InternaApp.updateEndoPheoConnViz(null, 'fatal_beta_first', null, null)" }
      ], seq) +
    '</div>';
  } else {
    controlsBottom = '<div class="space-y-2 mt-2.5">' +
      '<div class="viz-slider-row">' +
        '<label for="endo-conn-pac" class="viz-slider-label">Plasma Aldosterone Concentration (PAC ng/dL):</label>' +
        '<span id="endo-conn-pac-pill" class="viz-value-pill">' + pac + ' ng/dL</span>' +
      '</div>' +
      '<input type="range" id="endo-conn-pac" class="viz-range" min="5" max="60" step="1" value="' + pac + '" oninput="window.InternaApp.updateEndoPheoConnViz(null, null, this.value, null)" />' +

      '<div class="viz-slider-row mt-2">' +
        '<label for="endo-conn-pra" class="viz-slider-label">Plasma Renin Activity (PRA ng/mL/jam):</label>' +
        '<span id="endo-conn-pra-pill" class="viz-value-pill">' + pra.toFixed(1) + ' ng/mL/h</span>' +
      '</div>' +
      '<input type="range" id="endo-conn-pra" class="viz-range" min="0.1" max="5.0" step="0.1" value="' + pra + '" oninput="window.InternaApp.updateEndoPheoConnViz(null, null, null, this.value)" />' +
    '</div>';
  }

  return renderCardioWidgetCard({
    key: "endoPheo",
    title: "Simulator Urutan Blokade Feokromositoma & Rasio ARR Conn",
    tag: "ENDOCRINE SOCIETY &bull; PERKENI",
    controlsTop: controlsTop,
    svgHtml: buildEndoPheoConnSvg(mode, seq, pac, pra),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W13. UJI DEPRIVASI AIR & DESMOPRESIN DI SENTRAL VS NEFROGENIK (endo-4-3) - rAF: endoDi
// =========================================================================
var ENDO_DI_CONDITIONS = {
  normal: {
    label: "Fisiologis Normal",
    tone: "info",
    h6Uo: "840 mOsm/kg (Pekat)",
    ddavpResp: "Kenaikan minimal (<10%)",
    rx: "Tidak butuh intervensi",
    desc: "Osmolalitas urin naik progresif &gt;800 mOsm/kg saat deprivasi air; respon DDAVP minimal karena AVP endogen sudah maksimal."
  },
  polydipsia: {
    label: "Polidipsia Primer (Psikogenik)",
    tone: "warning",
    h6Uo: "620 mOsm/kg (Terkonsentrasi)",
    ddavpResp: "Kenaikan kecil (<10%)",
    rx: "Restriksi asupan cairan bertahap",
    desc: "Ginjal dan neurohipofisis intak; pasca deprivasi cairan terawasi, ginjal mampu memekatkan urin &gt;500-600 mOsm/kg."
  },
  central_di: {
    label: "DI Sentral (Defisiensi AVP-D)",
    tone: "danger",
    h6Uo: "165 mOsm/kg (Encer Abnormal!)",
    ddavpResp: "LONJAKAN DRASTIS &gt;50-100% (&gt;650 mOsm/kg)!",
    rx: "Desmopresin (DDAVP oral / spray)",
    desc: "Defisiensi sintesis/sekresi ADH. Uji DDAVP eksogen memicu lonjakan dramatis osmolalitas urin &gt;50-100% (Responsif Sempurna)."
  },
  nephrogenic_di: {
    label: "DI Nefrogenik (Resistensi AVP-R)",
    tone: "danger",
    h6Uo: "145 mOsm/kg (Encer)",
    ddavpResp: "TETAP ENCER / KENAIKAN &lt;10-20%!",
    rx: "Tiazid + Amiloride + Restriksi Na",
    desc: "Tubulus kolektivus resisten terhadap ADH (mutasi V2R / efek Litium). DDAVP eksogen GAGAL memekatkan urin (Respon &lt;50%)."
  }
};

function getDiCurveVal(condKey, hour) {
  var h = clampNum(hour, 0, 8, 6.0);
  var uo = 200;
  var po = 285;

  if (condKey === "normal") {
    // Hour 0=350, Hour 6=840, Hour 8=870
    if (h <= 6) uo = 350 + (h / 6) * 490;
    else uo = 840 + ((h - 6) / 2) * 30;
    po = 285 + h * 1.2;
  } else if (condKey === "polydipsia") {
    if (h <= 6) uo = 180 + (h / 6) * 440; // reaches 620
    else uo = 620 + ((h - 6) / 2) * 25;
    po = 278 + h * 1.5;
  } else if (condKey === "central_di") {
    // Deprivation (0..6): remains dilute ~165; DDAVP at h=6 jumps steeply to 680!
    if (h <= 6) uo = 120 + (h / 6) * 45; // 165
    else uo = 165 + Math.pow((h - 6) / 2, 0.7) * 515; // jumps to 680
    po = 290 + (h <= 6 ? h * 2.8 : 16.8 - (h - 6) * 3);
  } else if (condKey === "nephrogenic_di") {
    // Deprivation (0..6): remains dilute ~145; DDAVP at h=6 flatlines ~170 (<20% increase)
    if (h <= 6) uo = 110 + (h / 6) * 35; // 145
    else uo = 145 + ((h - 6) / 2) * 25; // only 170
    po = 292 + h * 2.6;
  }

  return { uo: Math.round(uo), po: Math.round(po) };
}

function buildEndoPituitaryDiSvg(condKey, hourVal) {
  var h = clampNum(hourVal, 0, 8, 6.0);
  var cur = getDiCurveVal(condKey, h);
  var c = ENDO_DI_CONDITIONS[condKey] || ENDO_DI_CONDITIONS.central_di;

  // Grid x=30..450 (width 420 for 8h), y=25..185 (height 160)
  // Osmolality scale: 0..1000 mOsm/kg
  var curX = 30 + (h / 8) * 420;
  var curUoY = 185 - (cur.uo / 1000) * 150;
  var ddavpX = 30 + (6 / 8) * 420; // 345.0

  var points = [];
  for (var t = 0; t <= 8; t += 0.25) {
    var val = getDiCurveVal(condKey, t);
    var px = 30 + (t / 8) * 420;
    var py = 185 - (val.uo / 1000) * 150;
    points.push(px.toFixed(1) + "," + py.toFixed(1));
  }
  var pathD = "M" + points.join(" L");

  return '<svg class="viz-svg" viewBox="0 0 480 235" role="img" aria-label="Simulator Uji Deprivasi Air & Desmopresin">' +
    // Background Grid
    '<rect x="30" y="25" width="420" height="160" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +

    // Phase 1: Water deprivation (0 to 6h)
    '<rect x="30" y="25" width="' + (ddavpX - 30).toFixed(1) + '" height="160" fill="var(--text-muted)" fill-opacity="0.08" />' +
    '<text x="35" y="38" font-size="8" font-weight="700" fill="var(--text-muted)">FASE 1: DEPRIVASI AIR (0 - 6 JAM)</text>' +

    // Phase 2: Post-DDAVP (6 to 8h)
    '<rect x="' + ddavpX.toFixed(1) + '" y="25" width="' + (450 - ddavpX).toFixed(1) + '" height="160" fill="var(--accent-secondary)" fill-opacity="0.08" />' +
    '<text x="' + (ddavpX + 6).toFixed(1) + '" y="38" font-size="8" font-weight="700" fill="var(--accent-secondary)">FASE 2: PASCA DDAVP</text>' +

    // Vertical line at Jam 6: Injeksi DDAVP
    '<line x1="' + ddavpX.toFixed(1) + '" y1="25" x2="' + ddavpX.toFixed(1) + '" y2="185" stroke="var(--accent-coral)" stroke-width="2" stroke-dasharray="4,2" />' +
    '<rect x="' + (ddavpX - 52).toFixed(1) + '" y="50" width="104" height="20" rx="3" fill="var(--bg-surface)" stroke="var(--accent-coral)" stroke-width="1.2" />' +
    '<text x="' + ddavpX.toFixed(1) + '" y="63" text-anchor="middle" font-size="7.5" font-weight="800" fill="var(--accent-coral)">INJEKSI DDAVP 2&mu;g</text>' +

    // Reference threshold line (>300 and >600 mOsm/kg)
    '<line x1="30" y1="' + (185 - (300 / 1000) * 150).toFixed(1) + '" x2="450" y2="' + (185 - (300 / 1000) * 150).toFixed(1) + '" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3,3" />' +
    '<text x="445" y="' + (181 - (300 / 1000) * 150).toFixed(1) + '" text-anchor="end" font-size="7.2" font-weight="600" fill="var(--text-muted)">Ambang Encer 300 mOsm/kg</text>' +

    // Curve
    '<path d="' + pathD + '" fill="none" stroke="' + (condKey === "central_di" || condKey === "nephrogenic_di" ? "var(--accent-coral)" : "var(--accent-primary)") + '" stroke-width="3" />' +

    // Moving Cursor
    '<line x1="' + curX.toFixed(1) + '" y1="25" x2="' + curX.toFixed(1) + '" y2="185" stroke="var(--text-primary)" stroke-width="1.8" />' +
    '<circle cx="' + curX.toFixed(1) + '" cy="' + curUoY.toFixed(1) + '" r="5.5" fill="var(--bg-surface)" stroke="' + (condKey === "central_di" ? "var(--accent-coral)" : "var(--accent-primary)") + '" stroke-width="2.5" />' +

    // Ticks
    '<text x="30" y="196" font-size="7.8" font-weight="700" fill="var(--text-muted)">0 Jam</text>' +
    '<text x="' + (30 + 105).toFixed(1) + '" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">2 Jam</text>' +
    '<text x="' + (30 + 210).toFixed(1) + '" y="196" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--text-muted)">4 Jam</text>' +
    '<text x="' + ddavpX.toFixed(1) + '" y="196" text-anchor="middle" font-size="7.8" font-weight="800" fill="var(--accent-coral)">6 Jam (DDAVP)</text>' +
    '<text x="450" y="196" text-anchor="end" font-size="7.8" font-weight="700" fill="var(--text-muted)">8 Jam</text>' +

    // Bottom Readout Bar
    '<rect x="30" y="202" width="420" height="26" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<circle cx="45" cy="215" r="4" fill="var(--accent-coral)" />' +
    '<text x="54" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">Urin: ' + cur.uo + ' mOsm/kg</text>' +
    '<circle cx="170" cy="215" r="4" fill="var(--accent-primary)" />' +
    '<text x="179" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">Plasma: ' + cur.po + ' mOsm/kg</text>' +
    '<text x="440" y="218" text-anchor="end" font-size="8.5" font-weight="800" fill="var(--accent-secondary)">Jam ke-' + h.toFixed(1) + '</text>' +
  '</svg>';
}

function getEndoDiInfo(condKey, hour) {
  var c = ENDO_DI_CONDITIONS[condKey] || ENDO_DI_CONDITIONS.central_di;
  var cur = getDiCurveVal(condKey, hour);

  return {
    tone: c.tone,
    rKey: "di_" + condKey + "_" + hour.toFixed(1),
    title: "Hasil Evaluasi: " + c.label,
    c1Label: "Osmolalitas Jam ke-" + hour.toFixed(1),
    c1Body: "Urin: <strong>" + cur.uo + " mOsm/kg</strong> &bull; Plasma: <strong>" + cur.po + " mOsm/kg</strong>. Respon pasca DDAVP: <strong>" + c.ddavpResp + "</strong>.",
    c2Label: "Tatalaksana PERKENI",
    c2Body: c.desc + " Terapi terpilih: <strong>" + c.rx + "</strong>."
  };
}

function updateEndoPituitaryDiViz(hourVal, condVal, fromUser) {
  if (fromUser && hourVal !== null && hourVal !== undefined && typeof cancelAllVizAnimations === "function") {
    cancelAllVizAnimations();
  }
  if (hourVal !== null && hourVal !== undefined) endoVizState.diHour = clampNum(hourVal, 0, 8, 2);
  if (condVal) endoVizState.diCondition = condVal;

  var h = endoVizState.diHour;
  var cond = endoVizState.diCondition;

  syncEndoTabByMatch("viz-endo-di-cond-tabs", "'" + cond + "'");
  syncSliderAndPill("viz-endoDi-slider", "viz-endoDi-pill", h, "Jam ke-" + h.toFixed(1));
  syncVizPresets("viz-endoDi-presets", [Math.abs(h - 2.0) < 0.3, Math.abs(h - 5.8) < 0.3, Math.abs(h - 6.5) < 0.3, Math.abs(h - 8.0) < 0.3]);

  swapVizSvgFrame("viz-endoDi-frame", buildEndoPituitaryDiSvg(cond, h));

  var info = getEndoDiInfo(cond, h);
  updateVizReadout(
    "viz-endoDi-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoPituitaryDiWidget() {
  var h = endoVizState.diHour;
  var cond = endoVizState.diCondition;
  var info = getEndoDiInfo(cond, h);

  var controlsTop = '<div class="mb-2.5">' +
    renderCardioTabRow("viz-endo-di-cond-tabs", Object.entries(ENDO_DI_CONDITIONS).map(function(e) {
      return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoPituitaryDiViz(null, '" + e[0] + "', false)" };
    }), cond) +
  '</div>';

  var controlsBottom = renderCardioSliderBlock({
    key: "endoDi",
    label: "Simulasi Jam Uji Deprivasi Air (Jam 0 s/d 8):",
    pillText: "Jam ke-" + h.toFixed(1),
    min: 0,
    max: 8,
    step: 0.1,
    value: h,
    trackBg: "linear-gradient(90deg, rgba(30,41,59,0.4) 0% 75%, rgba(16,185,129,0.4) 75% 100%)",
    oninput: "window.InternaApp.updateEndoPituitaryDiViz(this.value, null, true)",
    presets: [
      { val: 2.0, label: "Jam 2 (Deprivasi Awal)", active: Math.abs(h - 2.0) < 0.3 },
      { val: 5.8, label: "Jam 5.8 (Pra-DDAVP)", active: Math.abs(h - 5.8) < 0.3 },
      { val: 6.5, label: "Jam 6.5 (Pasca DDAVP)", active: Math.abs(h - 6.5) < 0.3 },
      { val: 8.0, label: "Jam 8 (Hasil Akhir)", active: Math.abs(h - 8.0) < 0.3 }
    ]
  });

  return renderCardioWidgetCard({
    key: "endoDi",
    title: "Simulator Uji Deprivasi Air & Uji DDAVP Diabetes Insipidus",
    tag: "ENDOCRINE SOCIETY &bull; AVP",
    controlsTop: controlsTop,
    svgHtml: buildEndoPituitaryDiSvg(cond, h),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W14. MATRIKS KALSIUM-PTH & DXA T-SCORE (endo-5-1)
// =========================================================================
var ENDO_CALCIUM_CONDITIONS = {
  primary_hpt: {
    label: "HPT Primer (Adenoma)",
    tone: "danger",
    ca: "TINGGI (&gt;10.5 mg/dL)",
    po4: "Rendah / Normal Rendah (&lt;2.5 mg/dL)",
    pth: "TINGGI / Inappropriately Normal (&gt;65 pg/mL)",
    vitd: "Normal / Sedikit Turun",
    rx: "Paratiroidektomi Eksisi Adenoma Kuratif"
  },
  secondary_hpt: {
    label: "HPT Sekunder (CKD / Vit D)",
    tone: "warning",
    ca: "Rendah / Normal Rendah (&lt;8.5 mg/dL)",
    po4: "TINGGI (CKD) / Rendah (Defisiensi Vit D)",
    pth: "TINGGI SEBAGAI RESPON KOMPENSASI",
    vitd: "Sangat Rendah (Defisiensi / Gagal Ginjal)",
    rx: "Kalsitriol / Analog Vit D + Pengikat Fosfat"
  },
  tertiary_hpt: {
    label: "HPT Tersier (CKD Lama / Post-Tx)",
    tone: "danger",
    ca: "TINGGI (&gt;10.5 mg/dL)",
    po4: "Tinggi / Normal",
    pth: "SANGAT TINGGI OTONOM (&gt;300-800 pg/mL)",
    vitd: "Bervariasi",
    rx: "Kalsimimetik (Cinacalcet) / Subtotal Paratiroidektomi"
  },
  malignancy_pthrp: {
    label: "Hiperkalsemia Keganasan (PTHrP)",
    tone: "danger",
    ca: "SANGAT TINGGI EKSTREM (&gt;13-15 mg/dL)",
    po4: "Rendah (&lt;2.5 mg/dL)",
    pth: "TERSUSPRESI MUTLAK (&lt;10-15 pg/mL)!",
    vitd: "Normal / Rendah (PTHrP Positif)",
    rx: "Rehidrasi NaCl 0.9% + Asam Zoledronat IV / Denosumab"
  },
  vitd_def: {
    label: "Defisiensi Vitamin D Murni",
    tone: "info",
    ca: "Normal / Borderline Rendah",
    po4: "Rendah (&lt;2.5 mg/dL)",
    pth: "Naik Ringan-Sedang (Kompensasi)",
    vitd: "SANGAT RENDAH (&lt;20 ng/mL)",
    rx: "Kolekalsiferol (Vit D3) 50.000 IU/minggu x 8 minggu"
  },
  hypo_parathyroid: {
    label: "Hipoparatiroidisme Pasca Bedah",
    tone: "danger",
    ca: "SANGAT RENDAH (&lt;7.5 mg/dL - Tetani!)",
    po4: "TINGGI (&gt;4.5 mg/dL)",
    pth: "RENDAH / TIDAK TERDETEKSI (&lt;10 pg/mL)",
    vitd: "Normal",
    rx: "Kalsium Glukonas 10% IV + Kalsitriol PO seumur hidup"
  }
};

function buildEndoCalciumDxaSvg(modeKey, condKey, tScoreVal, measuredCaVal, albVal) {
  if (modeKey === "dxa") {
    var tScore = clampNum(tScoreVal, -4.0, 1.5, -2.8);
    var caRaw = clampNum(measuredCaVal, 6.5, 15.0, 11.2);
    var alb = clampNum(albVal, 1.5, 5.0, 3.2);

    // Payne formula: Corrected Ca = Measured Ca + 0.8 * (4.0 - Albumin)
    var caCorr = caRaw + 0.8 * (4.0 - alb);

    var dxaTone = tScore <= -2.5 ? "var(--accent-coral)" : (tScore < -1.0 ? "var(--accent-secondary)" : "var(--accent-primary)");
    var dxaLabel = tScore <= -2.5 ? "OSTEOPOROSIS (T &le; -2.5 SD)" : (tScore < -1.0 ? "OSTEOPENIA (-1.0 s/d -2.5 SD)" : "NORMAL T-SCORE (&ge; -1.0 SD)");

    // T-Score bar: -4.0 to +1.5 -> width 440 (span 5.5)
    var tPct = clampNum((tScore - (-4.0)) / 5.5, 0, 1, 0);
    var tX = 20 + tPct * 440;
    var cut25X = 20 + ((-2.5 - (-4.0)) / 5.5) * 440; // 120.0
    var cut10X = 20 + ((-1.0 - (-4.0)) / 5.5) * 440; // 240.0

    return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Kalkulator DXA T-Score & Kalsium Terkoreksi">' +
      // Top T-Score Gauge Bar
      '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">1. DXA BONE MINERAL DENSITY (BMD)</text>' +
      '<text x="458" y="18" text-anchor="end" font-size="11" font-weight="800" fill="' + dxaTone + '">T-Score = ' + tScore.toFixed(1) + ' SD</text>' +
      '<rect x="20" y="25" width="440" height="14" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<rect x="20" y="25" width="' + (cut25X - 20).toFixed(1) + '" height="14" fill="var(--accent-coral)" fill-opacity="0.32" />' +
      '<rect x="' + cut25X.toFixed(1) + '" y="25" width="' + (cut10X - cut25X).toFixed(1) + '" height="14" fill="var(--accent-secondary)" fill-opacity="0.32" />' +
      '<rect x="' + cut10X.toFixed(1) + '" y="25" width="' + (460 - cut10X).toFixed(1) + '" height="14" fill="var(--accent-primary)" fill-opacity="0.25" />' +
      '<circle cx="' + tX.toFixed(1) + '" cy="32" r="7.5" fill="var(--bg-surface)" stroke="' + dxaTone + '" stroke-width="3" />' +
      '<text x="22" y="52" font-size="7.8" font-weight="700" fill="var(--accent-coral)">&le; -2.5 Osteoporosis</text>' +
      '<text x="' + ((cut25X + cut10X) / 2).toFixed(1) + '" y="52" text-anchor="middle" font-size="7.8" font-weight="700" fill="var(--accent-secondary)">Osteopenia</text>' +
      '<text x="458" y="52" text-anchor="end" font-size="7.8" font-weight="700" fill="var(--accent-primary)">&ge; -1.0 Normal</text>' +

      // Bottom Corrected Calcium Calculation Box (x=20..460)
      '<rect x="20" y="65" width="440" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
      '<text x="32" y="84" font-size="9" font-weight="800" fill="var(--accent-primary)">2. KALSIUM TERKOREKSI (PAYNE)</text>' +
      '<text x="32" y="112" font-size="20" font-weight="800" fill="' + (caCorr > 10.5 ? "var(--accent-coral)" : (caCorr < 8.5 ? "var(--accent-secondary)" : "var(--accent-primary)")) + '">' + caCorr.toFixed(2) + ' mg/dL</text>' +
      '<text x="32" y="130" font-size="8" font-weight="700" fill="var(--text-muted)">Ca Terukur: ' + caRaw.toFixed(1) + ' mg/dL &bull; Albumin Serum: ' + alb.toFixed(1) + ' g/dL</text>' +
      '<rect x="32" y="142" width="415" height="26" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
      '<text x="42" y="159" font-size="8" font-weight="700" fill="var(--text-primary)">Formula: Ca Terkoreksi = Ca Terukur + 0.8 &times; (4.0 - Albumin)</text>' +
      '<text x="32" y="188" font-size="7.8" font-weight="600" fill="var(--text-secondary)">' + dxaLabel + '</text>' +
      '<text x="32" y="202" font-size="7.5" font-weight="600" fill="var(--accent-coral)">Fraktur fragilitas = Osteo Berat!</text>' +
    '</svg>';
  }

  // Mode: matrix
  var c = ENDO_CALCIUM_CONDITIONS[condKey] || ENDO_CALCIUM_CONDITIONS.primary_hpt;

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Matriks Diagnostik Kalsium, Fosfat & PTH">' +
    '<rect x="20" y="14" width="440" height="42" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">MATRIKS METABOLISME TULANG &amp; MINERAL</text>' +
    '<text x="32" y="47" font-size="11" font-weight="800" fill="' + (c.tone === "danger" ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + c.label.toUpperCase() + '</text>' +

    '<rect x="20" y="65" width="215" height="150" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="84" font-size="8.8" font-weight="800" fill="var(--text-muted)">KADAR LABORATORIUM KUNCI</text>' +
    '<text x="32" y="103" font-size="7.8" font-weight="700" fill="var(--text-muted)">Kalsium Serum (Ca):</text>' +
    '<text x="32" y="117" font-size="9" font-weight="800" fill="var(--text-primary)">' + c.ca + '</text>' +
    '<text x="32" y="133" font-size="7.8" font-weight="700" fill="var(--text-muted)">Fosfat Anorganik (PO4):</text>' +
    '<text x="32" y="147" font-size="9" font-weight="800" fill="var(--text-primary)">' + c.po4 + '</text>' +
    '<text x="32" y="163" font-size="7.8" font-weight="700" fill="var(--text-muted)">Hormon Paratiroid (PTH Intak):</text>' +
    '<text x="32" y="177" font-size="9" font-weight="800" fill="' + (condKey === "malignancy_pthrp" ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + c.pth + '</text>' +
    '<text x="32" y="193" font-size="7.8" font-weight="700" fill="var(--text-muted)">25-OH Vitamin D: ' + c.vitd + '</text>' +

    '<rect x="245" y="65" width="215" height="150" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="84" font-size="8.8" font-weight="800" fill="var(--accent-primary)">REKOMENDASI TERAPI:</text>' +
    '<text x="257" y="106" font-size="10" font-weight="800" fill="var(--text-primary)">' + c.rx + '</text>' +
    '<text x="257" y="132" font-size="7.8" font-weight="600" fill="var(--text-muted)">Pembeda Keganasan vs HPT Primer:</text>' +
    '<text x="257" y="146" font-size="7.8" font-weight="700" fill="var(--accent-coral)">Keganasan: PTH tersupresi &lt;10 pg/mL!</text>' +
    '<text x="257" y="160" font-size="7.8" font-weight="700" fill="var(--accent-primary)">HPT Primer: PTH tidak supresi</text>' +
    '<rect x="257" y="174" width="190" height="30" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="265" y="192" font-size="7.2" font-weight="700" fill="var(--text-primary)">Gejala: Stones, Bones, Groans, Moans</text>' +
  '</svg>';
}

function getEndoCalciumInfo(modeKey, condKey, tScore, caRaw, alb) {
  if (modeKey === "dxa") {
    var caCorr = caRaw + 0.8 * (4.0 - alb);
    var dxaClass = tScore <= -2.5 ? "Osteoporosis" : (tScore < -1.0 ? "Osteopenia" : "Normal");
    return {
      tone: tScore <= -2.5 ? "danger" : (tScore < -1.0 ? "warning" : "info"),
      rKey: "dxa_" + tScore.toFixed(1) + "_" + caCorr.toFixed(1),
      title: "Interpretasi DXA: " + dxaClass + " (T-Score " + tScore.toFixed(1) + " SD)",
      c1Label: "Kalsium Terkoreksi (Formula Payne)",
      c1Body: "Kalsium terukur " + caRaw.toFixed(1) + " mg/dL pada albumin " + alb.toFixed(1) + " g/dL menghasilkan <strong>Kalsium Terkoreksi " + caCorr.toFixed(2) + " mg/dL</strong> (" + (caCorr > 10.5 ? "Hiperkalsemia" : (caCorr < 8.5 ? "Hipokalsemia" : "Normal")) + ").",
      c2Label: "Panduan Terapi Osteoporosis",
      c2Body: tScore <= -2.5
        ? "Indikasi terapi antiresorptif: <strong>Bisfosfonat (Alendronat 70 mg/minggu atau Asam Zoledronat 5 mg IV/tahun) ATAU Denosumab 60 mg SC/6 bulan</strong> + suplementasi Kalsium 1000-1200 mg & Vitamin D3 1000-2000 IU/hari."
        : "Pertahankan asupan kalsium adekuat, olahraga weight-bearing rutin, evaluasi skor FRAX 10-year fracture risk."
    };
  }

  var c = ENDO_CALCIUM_CONDITIONS[condKey] || ENDO_CALCIUM_CONDITIONS.primary_hpt;
  return {
    tone: c.tone,
    rKey: "ca_mat_" + condKey,
    title: "Matriks Mineral: " + c.label,
    c1Label: "Profil Laboratorium Patognomonik",
    c1Body: "Ca: <strong>" + c.ca + "</strong> &bull; PO4: <strong>" + c.po4 + "</strong> &bull; PTH: <strong>" + c.pth + "</strong> &bull; Vit D: <strong>" + c.vitd + "</strong>.",
    c2Label: "Tata Laksana Spesifik",
    c2Body: "<strong>" + c.rx + "</strong>. Kunci diagnostik: Hiperkalsemia dengan PTH tersupresi mutlak menunjukkan hiperkalsemia humoral akibat keganasan (PTHrP positif)."
  };
}

function updateEndoCalciumDxaViz(modeVal, condVal, tScoreVal, caVal, albVal) {
  if (modeVal) endoVizState.calciumMode = modeVal;
  if (condVal) endoVizState.calciumCondition = condVal;
  if (tScoreVal !== null && tScoreVal !== undefined) endoVizState.dxaTScore = Number(tScoreVal);
  if (caVal !== null && caVal !== undefined) endoVizState.dxaMeasuredCa = Number(caVal);
  if (albVal !== null && albVal !== undefined) endoVizState.dxaAlbumin = Number(albVal);

  var mode = endoVizState.calciumMode;
  var cond = endoVizState.calciumCondition;
  var ts = endoVizState.dxaTScore;
  var ca = endoVizState.dxaMeasuredCa;
  var alb = endoVizState.dxaAlbumin;

  if (modeVal) { rerenderEndoCard("viz-endoCalcium-card", renderEndoCalciumDxaWidget()); return; }
  syncEndoTabByMatch("viz-endo-ca-mode-tabs", "'" + mode + "'");
  syncEndoTabByMatch("viz-endo-ca-cond-tabs", "'" + cond + "'");
  syncSliderAndPill("endo-dxa-tscore", "endo-dxa-tscore-pill", ts, ts.toFixed(1) + " SD");
  syncSliderAndPill("endo-dxa-ca", "endo-dxa-ca-pill", ca, ca.toFixed(1) + " mg/dL");
  syncSliderAndPill("endo-dxa-alb", "endo-dxa-alb-pill", alb, alb.toFixed(1) + " g/dL");

  swapVizSvgFrame("viz-endoCalcium-frame", buildEndoCalciumDxaSvg(mode, cond, ts, ca, alb));

  var info = getEndoCalciumInfo(mode, cond, ts, ca, alb);
  updateVizReadout(
    "viz-endoCalcium-readout",
    info.tone,
    formatVizReadoutHtml(info.title, info.c1Label, info.c1Body, info.c2Label, info.c2Body, ""),
    info.rKey
  );
}

function renderEndoCalciumDxaWidget() {
  var mode = endoVizState.calciumMode;
  var cond = endoVizState.calciumCondition;
  var ts = endoVizState.dxaTScore;
  var ca = endoVizState.dxaMeasuredCa;
  var alb = endoVizState.dxaAlbumin;
  var info = getEndoCalciumInfo(mode, cond, ts, ca, alb);

  var controlsTop = '<div class="space-y-2 mb-2.5">' +
    renderCardioTabRow("viz-endo-ca-mode-tabs", [
      { key: "matrix", label: "Matriks Diagnostik Ca-PO4-PTH", onclick: "window.InternaApp.updateEndoCalciumDxaViz('matrix', null, null, null, null)" },
      { key: "dxa", label: "Kalkulator DXA & Ca Terkoreksi", onclick: "window.InternaApp.updateEndoCalciumDxaViz('dxa', null, null, null, null)" }
    ], mode) +
  '</div>';

  var controlsBottom = "";
  if (mode === "matrix") {
    controlsBottom = '<div class="mt-2.5">' +
      '<span class="text-xs font-bold text-[var(--text-muted)] block mb-1">Pilih Kondisi Gangguan Mineral:</span>' +
      renderCardioTabRow("viz-endo-ca-cond-tabs", Object.entries(ENDO_CALCIUM_CONDITIONS).map(function(e) {
        return { key: e[0], label: e[1].label, onclick: "window.InternaApp.updateEndoCalciumDxaViz(null, '" + e[0] + "', null, null, null)" };
      }), cond) +
    '</div>';
  } else {
    controlsBottom = '<div class="space-y-2 mt-2.5">' +
      '<div class="viz-slider-row">' +
        '<label for="endo-dxa-tscore" class="viz-slider-label">T-Score DXA (Lumbar Spine / Total Hip):</label>' +
        '<span id="endo-dxa-tscore-pill" class="viz-value-pill">' + ts.toFixed(1) + ' SD</span>' +
      '</div>' +
      '<input type="range" id="endo-dxa-tscore" class="viz-range" min="-4.0" max="1.5" step="0.1" value="' + ts + '" oninput="window.InternaApp.updateEndoCalciumDxaViz(null, null, this.value, null, null)" />' +

      '<div class="viz-slider-row mt-2">' +
        '<label for="endo-dxa-ca" class="viz-slider-label">Kalsium Terukur Total (mg/dL):</label>' +
        '<span id="endo-dxa-ca-pill" class="viz-value-pill">' + ca.toFixed(1) + ' mg/dL</span>' +
      '</div>' +
      '<input type="range" id="endo-dxa-ca" class="viz-range" min="6.5" max="15.0" step="0.1" value="' + ca + '" oninput="window.InternaApp.updateEndoCalciumDxaViz(null, null, null, this.value, null)" />' +

      '<div class="viz-slider-row mt-2">' +
        '<label for="endo-dxa-alb" class="viz-slider-label">Albumin Serum Pasien (g/dL):</label>' +
        '<span id="endo-dxa-alb-pill" class="viz-value-pill">' + alb.toFixed(1) + ' g/dL</span>' +
      '</div>' +
      '<input type="range" id="endo-dxa-alb" class="viz-range" min="1.5" max="5.0" step="0.1" value="' + alb + '" oninput="window.InternaApp.updateEndoCalciumDxaViz(null, null, null, null, this.value)" />' +
    '</div>';
  }

  return renderCardioWidgetCard({
    key: "endoCalcium",
    title: "Matriks Diagnostik Ca–PO4–PTH & Kalkulator DXA T-Score",
    tag: "WHO &bull; ENDOCRINE SOCIETY",
    controlsTop: controlsTop,
    svgHtml: buildEndoCalciumDxaSvg(mode, cond, ts, ca, alb),
    controlsBottom: controlsBottom,
    info: info
  });
}

// =========================================================================
// W15. EXTRA 1: ANION GAP, KATZ & OSMOLALITAS KAD/HHS (endo-dka-anion-calc)
// =========================================================================
function buildEndoDkaAnionSvg(ag, naCorr, effOsm, deltaRatio) {
  var isHhsOsm = effOsm > 320;
  var isHighAg = ag > 12;

  // Dual gauge SVG: AG bar (0..35) + Osm bar (270..360)
  var agPct = clampNum(ag / 35, 0, 1, 0);
  var osmPct = clampNum((effOsm - 270) / 90, 0, 1, 0);

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Kalkulator Anion Gap & Natrium Terkoreksi Katz">' +
    // Top Bar 1: Anion Gap
    '<text x="22" y="18" font-size="9.5" font-weight="800" fill="var(--text-muted)">1. SERUM ANION GAP (AG = Na - [Cl + HCO3])</text>' +
    '<text x="458" y="18" text-anchor="end" font-size="11" font-weight="800" fill="' + (isHighAg ? "var(--accent-coral)" : "var(--accent-primary)") + '">AG = ' + ag.toFixed(1) + ' mEq/L (' + (isHighAg ? "HIGH AG" : "Normal AG") + ')</text>' +
    '<rect x="20" y="25" width="440" height="14" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="25" width="' + ((12 / 35) * 440).toFixed(1) + '" height="14" fill="var(--accent-primary)" fill-opacity="0.3" />' +
    '<rect x="' + ((12 / 35) * 440).toFixed(1) + '" y="25" width="' + (((35 - 12) / 35) * 440).toFixed(1) + '" height="14" fill="var(--accent-coral)" fill-opacity="0.35" />' +
    '<circle cx="' + (20 + agPct * 440).toFixed(1) + '" cy="32" r="7.5" fill="var(--bg-surface)" stroke="' + (isHighAg ? "var(--accent-coral)" : "var(--accent-primary)") + '" stroke-width="3" />' +
    '<text x="22" y="52" font-size="8" font-weight="700" fill="var(--accent-primary)">Normal 8-12 mEq/L</text>' +
    '<text x="458" y="52" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">KAD / Asidosis &gt;12 mEq/L</text>' +

    // Top Bar 2: Osmolalitas Efektif
    '<text x="22" y="80" font-size="9.5" font-weight="800" fill="var(--text-muted)">2. OSMOLALITAS EFEKTIF (2&times;Na + Glukosa/18)</text>' +
    '<text x="458" y="80" text-anchor="end" font-size="11" font-weight="800" fill="' + (isHhsOsm ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + effOsm.toFixed(1) + ' mOsm/kg (' + (isHhsOsm ? "HHS MUTLAK >320" : "Normal <295") + ')</text>' +
    '<rect x="20" y="87" width="440" height="14" rx="9" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="20" y="87" width="' + (((320 - 270) / 90) * 440).toFixed(1) + '" height="14" fill="var(--accent-primary)" fill-opacity="0.25" />' +
    '<rect x="' + (20 + ((320 - 270) / 90) * 440).toFixed(1) + '" y="87" width="' + (((360 - 320) / 90) * 440).toFixed(1) + '" height="14" fill="var(--accent-coral)" fill-opacity="0.35" />' +
    '<circle cx="' + (20 + osmPct * 440).toFixed(1) + '" cy="94" r="7.5" fill="var(--bg-surface)" stroke="' + (isHhsOsm ? "var(--accent-coral)" : "var(--accent-primary)") + '" stroke-width="3" />' +
    '<text x="22" y="114" font-size="8" font-weight="700" fill="var(--text-muted)">Normal 275-295</text>' +
    '<text x="458" y="114" text-anchor="end" font-size="8" font-weight="700" fill="var(--accent-coral)">Kriteria HHS &gt;320 mOsm/kg</text>' +

    // Bottom Summary Boxes (Na Katz & Delta Ratio)
    '<rect x="20" y="130" width="215" height="85" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="148" font-size="8.8" font-weight="800" fill="var(--text-muted)">NATRIUM TERKOREKSI KATZ</text>' +
    '<text x="32" y="172" font-size="16" font-weight="800" fill="' + (naCorr >= 135 ? "var(--accent-secondary)" : "var(--accent-primary)") + '">' + naCorr.toFixed(1) + ' mEq/L</text>' +
    '<text x="32" y="190" font-size="7.5" font-weight="700" fill="var(--text-primary)">Cairan: ' + (naCorr >= 135 ? "Gunakan NaCl 0.45% (Cegah hiperNa)" : "Gunakan NaCl 0.9% Normal Saline") + '</text>' +
    '<text x="32" y="204" font-size="7.2" font-weight="600" fill="var(--text-muted)">Na + 0.016 &times; (Glukosa - 100)</text>' +

    '<rect x="245" y="130" width="215" height="85" rx="11" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="257" y="148" font-size="8.8" font-weight="800" fill="var(--text-muted)">DELTA RATIO (&Delta;AG/&Delta;HCO3)</text>' +
    '<text x="257" y="172" font-size="16" font-weight="800" fill="var(--accent-primary)">' + (deltaRatio > 0 ? deltaRatio.toFixed(2) : "N/A") + '</text>' +
    '<text x="257" y="190" font-size="7.5" font-weight="700" fill="var(--text-primary)">' + (deltaRatio > 2.0 ? "KAD + Alkalosis Metabolik (Muntah)" : (deltaRatio < 0.8 ? "KAD + Normal AG Asidosis (Diare)" : "Asidosis KAD Murni (0.8 - 2.0)")) + '</text>' +
    '<text x="257" y="204" font-size="7.2" font-weight="600" fill="var(--text-muted)">&Delta;AG=AG-12; &Delta;HCO3=24-HCO3</text>' +
  '</svg>';
}

function calcEndoDkaAnion() {
  var g = function(id, min, max, fb) { var el = document.getElementById(id); return clampNum(el ? el.value : fb, min, max, fb); };
  var gluc = g("endo-dka-calc-gluc", 50, 2000, endoVizState.dkaCalcGluc);
  var na = g("endo-dka-calc-na", 90, 200, endoVizState.dkaCalcNa);
  var k = g("endo-dka-calc-k", 1.5, 9.0, endoVizState.dkaCalcK);
  var cl = g("endo-dka-calc-cl", 50, 160, endoVizState.dkaCalcCl);
  var hco3 = g("endo-dka-calc-hco3", 2, 50, endoVizState.dkaCalcHco3);
  var bun = g("endo-dka-calc-bun", 2, 200, endoVizState.dkaCalcBun);
  var alb = g("endo-dka-calc-alb", 1.0, 6.0, endoVizState.dkaCalcAlb);

  endoVizState.dkaCalcGluc = gluc;
  endoVizState.dkaCalcNa = na;
  endoVizState.dkaCalcK = k;
  endoVizState.dkaCalcCl = cl;
  endoVizState.dkaCalcHco3 = hco3;
  endoVizState.dkaCalcBun = bun;
  endoVizState.dkaCalcAlb = alb;

  var ag = na - (cl + hco3);
  var agCorr = ag + 2.5 * (4.0 - alb);
  var naCorr = na + 0.016 * (gluc - 100);
  var effOsm = 2 * na + (gluc / 18);
  var totalOsm = effOsm + (bun / 2.8);

  var deltaAg = agCorr - 12;
  var deltaHco3 = 24 - hco3;
  var deltaRatio = deltaHco3 > 0 ? (deltaAg / deltaHco3) : 1.0;

  swapVizSvgFrame("viz-endoDkaAnion-frame", buildEndoDkaAnionSvg(agCorr, naCorr, effOsm, deltaRatio));

  var isHhs = effOsm > 320;
  var isKAD = agCorr > 12 && hco3 <= 18;

  var tone = isHhs || isKAD ? "danger" : "info";
  var diag = isHhs && isKAD ? "Mixed KAD + HHS" : (isHhs ? "Status Hiperosmolar Hiperglikemik (HHS)" : (isKAD ? "Ketoasidosis Diabetik (KAD High AG)" : "Hiperglikemia Tanpa Krisis Asidosis/HHS"));

  var fluidChoice = naCorr >= 135 ? "NaCl 0.45% (Half-Normal Saline) 250-500 mL/jam" : "NaCl 0.9% (Normal Saline) 250-500 mL/jam";

  var res = document.getElementById("widget-endo-dka-result");
  if (res) {
    updateCalcReadoutTone(
      res,
      tone,
      "dka_calc_" + gluc + "_" + agCorr.toFixed(1) + "_" + bun,
      '<p class="font-bold text-[var(--text-primary)]">' + diag + ' &bull; AG Terkoreksi = ' + agCorr.toFixed(1) + ' mEq/L &bull; Osm Efektif = ' + effOsm.toFixed(1) + ' (Total = ' + totalOsm.toFixed(1) + ') mOsm/kg</p>' +
      '<div class="viz-readout-grid mt-1">' +
        '<p>&bull; <strong>Natrium Terkoreksi Katz: ' + naCorr.toFixed(1) + ' mEq/L:</strong> Pilihan cairan jam ke-2 dst adalah <strong>' + fluidChoice + '</strong>.</p>' +
        '<p>&bull; <strong>Delta Ratio: ' + deltaRatio.toFixed(2) + ':</strong> ' + (deltaRatio > 2.0 ? 'KAD disertai alkalosis metabolik akibat muntah.' : (deltaRatio < 0.8 ? 'KAD campuran normal anion gap asidosis (diare/RTA).' : 'KAD High Anion Gap metabolik asidosis murni.')) + '</p>' +
      '</div>' +
      '<p class="mt-1 text-xs text-[var(--text-secondary)]">Gerbang kalium K+ = ' + k + ' mEq/L: ' + (k < 3.3 ? '<span class="text-[var(--accent-coral)] font-bold">K &lt; 3.3 STOP INSULIN, BERIKAN KCL 20-30 mEq/jam DULU!</span>' : 'Aman untuk pemberian insulin reguler.') + '</p>'
    );
  }
}

function applyEndoDkaCalcPreset(pType) {
  var g = function(id) { return document.getElementById(id); };
  if (pType === "kad_berat") {
    endoVizState.dkaCalcGluc = 480; endoVizState.dkaCalcNa = 132; endoVizState.dkaCalcK = 4.8; endoVizState.dkaCalcCl = 94; endoVizState.dkaCalcHco3 = 10; endoVizState.dkaCalcBun = 38; endoVizState.dkaCalcAlb = 3.6;
  } else if (pType === "hhs_murni") {
    endoVizState.dkaCalcGluc = 860; endoVizState.dkaCalcNa = 142; endoVizState.dkaCalcK = 4.6; endoVizState.dkaCalcCl = 102; endoVizState.dkaCalcHco3 = 22; endoVizState.dkaCalcBun = 64; endoVizState.dkaCalcAlb = 3.8;
  } else {
    endoVizState.dkaCalcGluc = 510; endoVizState.dkaCalcNa = 130; endoVizState.dkaCalcK = 3.8; endoVizState.dkaCalcCl = 86; endoVizState.dkaCalcHco3 = 18; endoVizState.dkaCalcBun = 42; endoVizState.dkaCalcAlb = 3.5;
  }

  if (g("endo-dka-calc-gluc")) g("endo-dka-calc-gluc").value = endoVizState.dkaCalcGluc;
  if (g("endo-dka-calc-na")) g("endo-dka-calc-na").value = endoVizState.dkaCalcNa;
  if (g("endo-dka-calc-k")) g("endo-dka-calc-k").value = endoVizState.dkaCalcK;
  if (g("endo-dka-calc-cl")) g("endo-dka-calc-cl").value = endoVizState.dkaCalcCl;
  if (g("endo-dka-calc-hco3")) g("endo-dka-calc-hco3").value = endoVizState.dkaCalcHco3;
  if (g("endo-dka-calc-bun")) g("endo-dka-calc-bun").value = endoVizState.dkaCalcBun;
  if (g("endo-dka-calc-alb")) g("endo-dka-calc-alb").value = endoVizState.dkaCalcAlb;

  calcEndoDkaAnion();
}

function renderEndoDkaAnionWidget() {
  return '<div class="viz-widget" id="viz-calc-endo-dka-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator Anion Gap Terkoreksi, Natrium Katz & Osmolalitas</span>' +
      '<span class="viz-tag">KAD &bull; HHS &bull; KKI 4</span>' +
    '</div>' +
    '<div class="viz-presets mb-2.5" id="viz-endo-dka-calc-presets">' +
      '<button type="button" class="viz-pill-btn active" onclick="window.InternaApp.applyEndoDkaCalcPreset(\'kad_berat\')">KAD Berat Klasik</button>' +
      '<button type="button" class="viz-pill-btn" onclick="window.InternaApp.applyEndoDkaCalcPreset(\'hhs_murni\')">HHS Murni (Osm &gt;320)</button>' +
      '<button type="button" class="viz-pill-btn" onclick="window.InternaApp.applyEndoDkaCalcPreset(\'kad_muntah\')">KAD + Muntah (&Delta;&Delta; &gt;2)</button>' +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-gluc">Glukosa Darah (mg/dL)</label><input type="number" id="endo-dka-calc-gluc" value="480" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-na">Natrium Na+ (mEq/L)</label><input type="number" id="endo-dka-calc-na" value="132" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-k">Kalium K+ (mEq/L)</label><input type="number" id="endo-dka-calc-k" step="0.1" value="4.8" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-cl">Klorida Cl- (mEq/L)</label><input type="number" id="endo-dka-calc-cl" value="94" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-hco3">Bikarbonat HCO3-</label><input type="number" id="endo-dka-calc-hco3" value="10" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-bun">BUN (mg/dL)</label><input type="number" id="endo-dka-calc-bun" value="38" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-dka-calc-alb">Albumin (g/dL)</label><input type="number" id="endo-dka-calc-alb" step="0.1" value="3.6" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoDkaAnion()" /></div>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-endoDkaAnion-frame">' +
      buildEndoDkaAnionSvg(29.0, 138.1, 290.7, 1.21) +
    '</div>' +
    '<div id="widget-endo-dka-result" class="viz-readout" data-tone="danger" data-last-key="dka_init">' +
      '<p class="font-bold text-[var(--text-primary)]">Ketoasidosis Diabetik (KAD Berat) &bull; AG Terkoreksi = 29.0 mEq/L</p>' +
      '<p class="mt-1 text-xs text-[var(--text-secondary)]">Na terkoreksi Katz = 138.1 mEq/L (&ge;135) &rarr; Rekomendasi cairan jam ke-2 adalah <strong>NaCl 0.45%</strong> untuk mencegah hipernatremia.</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// W16. EXTRA 2: HOMA-IR, DUTCH FH & PANKREATITIS TG (endo-homa-dxa-calc)
// =========================================================================
function buildEndoHomaDxaSvg(homaVal, fhScore, tgVal) {
  var homa = clampNum(homaVal, 0.5, 15.0, 5.3);
  var tg = clampNum(tgVal, 50, 2000, 620);

  var isIr = homa >= 2.0;
  var isTgSevere = tg >= 1000;
  var isFhDefinite = fhScore >= 8;

  var tgTone = tg >= 1000 ? "var(--accent-coral)" : (tg >= 500 ? "var(--accent-secondary)" : "var(--accent-primary)");

  return '<svg class="viz-svg" viewBox="0 0 480 230" role="img" aria-label="Kalkulator HOMA-IR, Dutch FH & Risiko Pankreatitis TG">' +
    // Box 1: HOMA-IR (x=20..155)
    '<rect x="20" y="14" width="135" height="175" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="30" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">1. HOMA-IR</text>' +
    '<text x="30" y="65" font-size="22" font-weight="800" fill="' + (isIr ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + homa.toFixed(1) + '</text>' +
    '<text x="30" y="82" font-size="8.5" font-weight="700" fill="' + (isIr ? "var(--accent-coral)" : "var(--accent-primary)") + '">' + (isIr ? "Resistensi Insulin!" : "Sensitif Insulin") + '</text>' +
    '<rect x="30" y="98" width="115" height="10" rx="3" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<rect x="30" y="98" width="' + (clampNum(homa / 8, 0, 1, 0) * 115).toFixed(1) + '" height="10" rx="3" fill="' + (isIr ? "var(--accent-coral)" : "var(--accent-primary)") + '" />' +
    '<text x="30" y="125" font-size="7.5" font-weight="600" fill="var(--text-muted)">Ambang IR &ge;2.0</text>' +
    '<text x="30" y="140" font-size="7.5" font-weight="600" fill="var(--text-muted)">Sindrom Metabolik /</text>' +
    '<text x="30" y="152" font-size="7.5" font-weight="600" fill="var(--text-muted)">Risiko MASLD &amp; DM2</text>' +

    // Box 2: Dutch Lipid Clinic FH Score (x=165..315)
    '<rect x="165" y="14" width="150" height="175" rx="8" fill="var(--bg-surface-subtle)" stroke="var(--border-subtle)" />' +
    '<text x="175" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">2. DUTCH CLINIC (FH)</text>' +
    '<text x="175" y="65" font-size="22" font-weight="800" fill="' + (isFhDefinite ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + fhScore + ' Poin</text>' +
    '<text x="175" y="82" font-size="8.5" font-weight="700" fill="' + (isFhDefinite ? "var(--accent-coral)" : "var(--accent-secondary)") + '">' + (isFhDefinite ? "DEFINITE FH (>8)" : (fhScore >= 6 ? "PROBABLE FH (6-8)" : (fhScore >= 3 ? "POSSIBLE FH (3-5)" : "UNLIKELY FH (<3)"))) + '</text>' +
    '<rect x="175" y="98" width="130" height="10" rx="3" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<rect x="175" y="98" width="' + (clampNum(fhScore / 12, 0, 1, 0) * 130).toFixed(1) + '" height="10" rx="3" fill="' + (isFhDefinite ? "var(--accent-coral)" : "var(--accent-secondary)") + '" />' +
    '<text x="175" y="125" font-size="7.5" font-weight="600" fill="var(--text-muted)">Xanthoma Tendon: +6</text>' +
    '<text x="175" y="140" font-size="7.5" font-weight="600" fill="var(--text-muted)">Arcus Kornea &lt;45th: +4</text>' +
    '<text x="175" y="152" font-size="7.5" font-weight="600" fill="var(--text-muted)">Target LDL Statin + Ezetimib</text>' +

    // Box 3: TG Pancreatitis Risk (x=325..460)
    '<rect x="325" y="14" width="135" height="175" rx="8" fill="var(--bg-surface)" stroke="' + (isTgSevere ? "var(--accent-coral)" : "var(--border-subtle)") + '" stroke-width="' + (isTgSevere ? "2" : "1") + '" />' +
    '<text x="335" y="32" font-size="8.8" font-weight="800" fill="var(--text-muted)">3. RISIKO PANKREATITIS</text>' +
    '<text x="335" y="65" font-size="20" font-weight="800" fill="' + tgTone + '">' + tg + '</text>' +
    '<text x="335" y="78" font-size="7.5" font-weight="700" fill="var(--text-muted)">mg/dL Trigliserida</text>' +
    '<text x="335" y="94" font-size="8.5" font-weight="800" fill="' + tgTone + '">' + (isTgSevere ? "EKSTREM (&ge;1000)!" : (tg >= 500 ? "SANGAT TINGGI" : (tg >= 150 ? "Batas Tinggi" : "Normal (<150)"))) + '</text>' +
    '<text x="335" y="125" font-size="7.5" font-weight="700" fill="' + (isTgSevere ? "var(--accent-coral)" : "var(--text-primary)") + '">' + (isTgSevere ? "RISIKO TINGGI PANKREATITIS!" : (tg >= 500 ? "Mulai Fibrat Segera" : "Statin Kardioprotektif")) + '</text>' +
    '<text x="335" y="140" font-size="7.2" font-weight="600" fill="var(--text-muted)">Kilomikronemia sindrom</text>' +
    '<text x="335" y="152" font-size="7.2" font-weight="600" fill="var(--text-muted)">Infus Insulin / Plasmaferesis</text>' +

    // Footer summary banner
    '<rect x="20" y="196" width="440" height="26" rx="9" fill="var(--bg-surface)" stroke="var(--border-subtle)" />' +
    '<text x="32" y="206" font-size="8" font-weight="700" fill="var(--text-primary)">Skrining: Resisten Insulin &bull; Mutasi</text>' +
    '<text x="32" y="218" font-size="8" font-weight="700" fill="var(--text-primary)">LDLR &bull; Bahaya Pankreatitis Akut</text>' +
  '</svg>';
}

function calcEndoHomaDxa() {
  var g = function(id, min, max, fb) { var el = document.getElementById(id); return clampNum(el ? el.value : fb, min, max, fb); };
  var c = function(id) { var el = document.getElementById(id); return el ? el.checked : false; };

  var glu = g("endo-homa-glu", 20, 1000, endoVizState.homaGlu);
  var ins = g("endo-homa-ins", 0.5, 300, endoVizState.homaIns);
  var ldl = g("endo-fh-ldl", 20, 1000, endoVizState.fhLdl);
  var tg = g("endo-tg-val", 20, 5000, endoVizState.tgVal);

  var hasXanthoma = c("endo-fh-xanthoma");
  var hasArcus = c("endo-fh-arcus");
  var hasCad = c("endo-fh-cad");

  endoVizState.homaGlu = glu;
  endoVizState.homaIns = ins;
  endoVizState.fhLdl = ldl;
  endoVizState.tgVal = tg;
  endoVizState.fhXanthoma = hasXanthoma;
  endoVizState.fhArcus = hasArcus;
  endoVizState.fhCadFamily = hasCad;

  // HOMA-IR = (Glu * Ins) / 405
  var homa = (glu * ins) / 405;

  // Dutch Lipid Clinic Score
  var fhScore = 0;
  if (ldl >= 330) fhScore += 8;
  else if (ldl >= 250) fhScore += 5;
  else if (ldl >= 190) fhScore += 3;
  else if (ldl >= 155) fhScore += 1;

  if (hasXanthoma) fhScore += 6;
  if (hasArcus) fhScore += 4;
  if (hasCad) fhScore += 1;

  swapVizSvgFrame("viz-endoHomaDxa-frame", buildEndoHomaDxaSvg(homa, fhScore, tg));

  var isTgSevere = tg >= 1000;
  var isFhDefinite = fhScore >= 8;
  var tone = isTgSevere || isFhDefinite ? "danger" : (homa >= 2.0 || tg >= 500 ? "warning" : "info");

  var res = document.getElementById("widget-endo-homa-result");
  if (res) {
    updateCalcReadoutTone(
      res,
      tone,
      "homa_" + homa.toFixed(1) + "_" + fhScore + "_" + tg,
      '<p class="font-bold text-[var(--text-primary)]">HOMA-IR = ' + homa.toFixed(2) + ' &bull; Skor Dutch FH = ' + fhScore + ' Poin &bull; Trigliserida = ' + tg + ' mg/dL</p>' +
      '<div class="viz-readout-grid mt-1">' +
        '<p>&bull; <strong>HOMA-IR: ' + (homa >= 2.0 ? '<span class="text-[var(--accent-coral)] font-bold">Resistensi Insulin Bermakna (&ge;2.0)!</span>' : 'Sensitivitas insulin normal.') + '</strong> Terkait kuat dengan sindrom metabolik dan steatosis hepar (MASLD).</p>' +
        '<p>&bull; <strong>Dutch FH: ' + (isFhDefinite ? '<span class="text-[var(--accent-coral)] font-bold">Definite Familial Hypercholesterolemia!</span>' : (fhScore >= 6 ? 'Probable FH' : 'Possible / Unlikely FH')) + ':</strong> Target agresif reduksi LDL &ge;50% dengan Statin Potensi Tinggi + Ezetimib +/- PCSK9i.</p>' +
      '</div>' +
      '<p class="mt-1 text-xs text-[var(--text-secondary)]">' + (isTgSevere ? '<span class="text-[var(--accent-coral)] font-bold">KADAR TRIGLISERIDA &ge;1000 mg/dL: RISIKO TINGGI PANKREATITIS AKUT!</span> Rawat inap, puasa, hidrasi agresif, infus insulin reguler kontinu + dekstrosa, dan pertimbangkan plasmaferesis bila refrakter.' : (tg >= 500 ? 'TG &ge;500 mg/dL: Indikasi segera terapi Fibrat (Fenofibrat 145-160 mg/hari) untuk mencegah pankreatitis.' : 'TG terkontrol (&lt;150 mg/dL).')) + '</p>'
    );
  }
}

function renderEndoHomaDxaWidget() {
  return '<div class="viz-widget" id="viz-calc-endo-homa-card">' +
    '<div class="viz-header">' +
      '<span class="viz-title">Kalkulator HOMA-IR, Dutch FH & Risiko Pankreatitis Trigliserida</span>' +
      '<span class="viz-tag">METABOLIK &bull; DISLIPIDEMIA</span>' +
    '</div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2" style="align-items:end;">' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-homa-glu">GDP (mg/dL)</label><input type="number" id="endo-homa-glu" value="118" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoHomaDxa()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-homa-ins">Insulin Puasa (&mu;U/mL)</label><input type="number" id="endo-homa-ins" step="0.5" value="18.5" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoHomaDxa()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-fh-ldl">Kadar LDL-C (mg/dL)</label><input type="number" id="endo-fh-ldl" value="260" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoHomaDxa()" /></div>' +
      '<div style="min-width:0;"><label class="viz-slider-label block mb-1" for="endo-tg-val">Trigliserida (mg/dL)</label><input type="number" id="endo-tg-val" value="620" class="viz-calc-input w-full" oninput="window.InternaApp.calcEndoHomaDxa()" /></div>' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 p-2 bg-[var(--bg-surface-subtle)] rounded border border-[var(--border-subtle)]">' +
      '<label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><input type="checkbox" id="endo-fh-xanthoma" checked onchange="window.InternaApp.calcEndoHomaDxa()" /> Xanthoma Tendon (+6)</label>' +
      '<label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><input type="checkbox" id="endo-fh-arcus" checked onchange="window.InternaApp.calcEndoHomaDxa()" /> Arcus Kornea &lt;45th (+4)</label>' +
      '<label class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><input type="checkbox" id="endo-fh-cad" checked onchange="window.InternaApp.calcEndoHomaDxa()" /> Riwayat CAD Keluarga Dini (+1)</label>' +
    '</div>' +
    '<div class="viz-svg-frame" id="viz-endoHomaDxa-frame">' +
      buildEndoHomaDxaSvg(5.39, 16, 620) +
    '</div>' +
    '<div id="widget-endo-homa-result" class="viz-readout" data-tone="danger" data-last-key="homa_init">' +
      '<p class="font-bold text-[var(--text-primary)]">HOMA-IR = 5.39 (Resisten Insulin) &bull; Dutch FH = 16 Poin (Definite FH)</p>' +
      '<p class="mt-1 text-xs text-[var(--text-secondary)]">Kadar Trigliserida 620 mg/dL (&ge;500): Indikasi Fibrat (Fenofibrat) segera untuk mencegah perburukan menjadi sindrom kilomikronemia / pankreatitis akut.</p>' +
    '</div>' +
  '</div>';
}

// =========================================================================
// ENDO MODULE WIDGET DISPATCHER
// =========================================================================
function renderEndoModuleWidget(type) {
  if (type === "endo-dm-criteria-viz") return renderEndoDmCriteriaWidget();
  if (type === "endo-oad-organ-viz") return renderEndoOadOrganWidget();
  if (type === "endo-insulin-pk-viz") return renderEndoInsulinPkWidget();
  if (type === "endo-dka-hhs-viz") return renderEndoDkaHhsWidget();
  if (type === "endo-hypoglycemia-d40-viz") return renderEndoHypoglycemiaD40Widget();
  if (type === "endo-diabetic-foot-viz") return renderEndoDiabeticFootWidget();
  if (type === "endo-thyroid-axis-viz") return renderEndoThyroidAxisWidget();
  if (type === "endo-hypothyroid-lt4-viz") return renderEndoHypothyroidLt4Widget();
  if (type === "endo-burch-wartofsky-calc") return renderEndoBurchWartofskyWidget();
  if (type === "endo-tirads-bethesda-viz") return renderEndoTiradsBethesdaWidget();
  if (type === "endo-cushing-addison-viz") return renderEndoCushingAddisonWidget();
  if (type === "endo-pheo-conn-viz") return renderEndoPheoConnWidget();
  if (type === "endo-pituitary-di-viz") return renderEndoPituitaryDiWidget();
  if (type === "endo-calcium-dxa-viz") return renderEndoCalciumDxaWidget();
  if (type === "endo-dka-anion-calc") return renderEndoDkaAnionWidget();
  if (type === "endo-homa-dxa-calc") return renderEndoHomaDxaWidget();
  return "";
}





  R.registerWidgetRenderer(function (type) {
    if (!type || !type.startsWith("endo-")) return null;
    return renderEndoModuleWidget(type) || null;
  });
  R.registerMotionProvider(getEndoVizMotionSpec);

  Object.assign(R.handlers, { getEndoVizMotionSpec, updateEndoDmCriteriaViz, applyEndoDmPreset, renderEndoDmCriteriaWidget, updateEndoOadOrganViz, renderEndoOadOrganWidget, updateEndoInsulinPkViz, renderEndoInsulinPkWidget, updateEndoDkaHhsViz, renderEndoDkaHhsWidget, updateEndoHypoglycemiaD40Viz, renderEndoHypoglycemiaD40Widget, updateEndoDiabeticFootViz, renderEndoDiabeticFootWidget, updateEndoThyroidAxisViz, renderEndoThyroidAxisWidget, calcEndoHypothyroidLt4, renderEndoHypothyroidLt4Widget, calcEndoBurchWartofsky, applyEndoBwPreset, renderEndoBurchWartofskyWidget, updateEndoTiradsBethesdaViz, renderEndoTiradsBethesdaWidget, updateEndoCushingAddisonViz, renderEndoCushingAddisonWidget, updateEndoPheoConnViz, renderEndoPheoConnWidget, updateEndoPituitaryDiViz, renderEndoPituitaryDiWidget, updateEndoCalciumDxaViz, renderEndoCalciumDxaWidget, calcEndoDkaAnion, applyEndoDkaCalcPreset, renderEndoDkaAnionWidget, calcEndoHomaDxa, renderEndoHomaDxaWidget, renderEndoModuleWidget });
})(window);
